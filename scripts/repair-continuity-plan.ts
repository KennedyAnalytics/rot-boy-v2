import fs from 'node:fs';
import path from 'node:path';
import {loadEnv} from '../server/env';
import {complete} from '../server/llm';
import {extractJson} from '../src/director/normalize';
import {cueTime,directionFrom} from '../src/film/direction';
import {splitSentences} from '../src/timing';

loadEnv();
const source=process.argv[2], criticFile=process.argv[3], out=process.argv[4];
fs.mkdirSync(out,{recursive:true});
const original=JSON.parse(fs.readFileSync(source,'utf8'));
const script=fs.readFileSync(path.join(path.dirname(source),'input-script.txt'),'utf8');
const critic=JSON.parse(fs.readFileSync(criticFile,'utf8'));
if(critic.complete!==true) throw new Error('Repair requires completed real vision critique');
const system=`Repair this specific film using the supplied real vision findings. Return JSON {chapterRepairs:[],directionRepairs:{objects:[],events:[],shots:[]},notes:string}. chapterRepairs items are {chapterId,presenter:lead|beside|away,pieces:[complete existing FilmPiece data],annotations:[{beatIndex,pill:existing shape|null,card:existing shape|null,stamp:existing shape|null}]}. Keep scripts, timing, voice, captions, spine and character identity. Keep library component identities, especially kanban-move; this is a mutable-component regression, so do not bypass it with another renderer. You may remove redundant supporting pieces to give a single teaching object the full StageSlot. Prefer presenter away for a detailed reading stage. Remove competing callout/pill/stamp annotations when they squeeze the main stage; slots remain available but need not be filled. Do not change supplied captions or add invented facts. The stage renderer uses stateCues props patches at exact sentence-scoped phrases; library clocks freeze at frame 30. In comparison-table set startAtSeconds:0,rowStaggerSeconds:0,speed:1 so explicit row patch results are fully visible at frame 30. Kanban base has dealStaggerSeconds:0, three existing requests in column 0, no movement timers; columns update only at the existing mechanical and taste handler cues. Supporting draft panel should be removed to give the board full width; integrate completion/waiting into card meta only at the narrated draft/result cues. Never show 'Draft' in an entry title before the draft cue. A single library StageSlot receives the full-width portrait reference box, which makes its labels much larger than a stacked miniature. Preserve all stateCues; you may add exact aligned cues, but no future result in initial props. For bespoke/procedural retained pieces, fix complete labels and remove overlapping annotation furniture; do not invent narration. Recap nodes must not be hidden by atBeat indexes that exceed the real beat count: retrieve the actual earlier steps; phrase cues can reveal the nodes. Use atBeat:0 and concise narrated labels with empty or narration-supported details to avoid semantic filters hiding essential recap content. directionRepairs only apply when FilmDirection exists: objects items {id,label?,detail?}, events items {index,state?,detail?,cue?,from?,action?}, shots items {index,boundary?,composition?,objectIds?,focus?,presenter?,recapRefs?,cue?}. Do not add unsupported fields. Keep the same recurring objects and actual history. Fix illegible contextual detail by simplifying/reflowing, changing shot focus or fewer objects, not shrinking type. Vision judges visual quality, not deterministic alignment; reject a critic suggestion if it contradicts supplied narration or asks to edit captions. Return only the minimal repairs required.`;
const repairPlan=original.plan.direction ? {...original.plan,chapters:original.plan.chapters.map((c:any)=>({id:c.id,name:c.name,sentenceIndexes:c.sentenceIndexes,start:c.start,end:c.end,beats:c.beats.map((b:any)=>({sentenceIndexes:b.sentenceIndexes,narration:b.narration,mode:b.mode,start:b.start,end:b.end}))}))} : original.plan;
const input={script:splitSentences(script).map((text,sentence)=>({sentence,text})),plan:repairPlan,findings:critic.findings.filter((f:any)=>f.premature||f.contradictory||f.clipped||f.crowded||f.collision),reviewNotes:critic.adjudication??null,renderer:'Single library pieces use full-width StageSlot. Supporting pieces are stacked and significantly shrink the board. layoutFor determines safe placement. When FilmDirection exists, DirectedStage replaces chapter pieces and annotations: repair direction only. Current DirectedStage shows detail only for focus, larger context labels/states, opaque text backgrounds protecting text from connectors, and RECAP labels on recalled states. All geometry stays renderer-owned.'};
const directionConstraints=` Additional implemented repair channels: object edits may change introduced:{phrase,sentence}; event edits may change objectId. Optional addObjects, addEvents, addShots arrays append complete entries in the existing FilmDirection schema. Use these only to correct narrative identity or visible causal action. The original purchase and a NEW replacement order are distinct records; do not relabel order #1042 as the replacement. Ensure every action's source and target are in the active shot at its cue and have already been introduced, so the action visibly renders. Initial object detail must contain only facts already narrated at its introduced cue; later damage/desired fix facts require later events. A recap retrieves actual final states and may identify an earlier state as RECAP without changing actual history. Keep labels <=28 chars, states <=26, detail <=70; prefer concise readable teaching text. Do not delete continuity or make every shot identical to clear critic flags.`;
let correction='';
const savedArg=process.argv.find(a=>a.startsWith('--repair-json='));
const savedRepairs=savedArg ? JSON.parse(fs.readFileSync(savedArg.slice('--repair-json='.length),'utf8')).repairs : null;
for(let attempt=1;attempt<=3;attempt++) {
  const response=savedRepairs ? {text:JSON.stringify(savedRepairs),stopReason:null} : await complete(system+directionConstraints,JSON.stringify(input)+correction,16000);
  if(!savedRepairs)fs.writeFileSync(path.join(out,`repair-response-${attempt}.txt`),response.text);
  try {
    if(response.stopReason==='max_tokens') throw new Error('Truncated JSON; return fewer concise repairs');
    const repairs=extractJson(response.text) as any;
    // Some real responses put complete additions beside directionRepairs.
    // Normalize that supported shape rather than silently losing an event.
    repairs.directionRepairs ??= {};
    for (const field of ['addObjects','addEvents','addShots']) if (field in repairs) {
      if (!Array.isArray(repairs[field]) || field in repairs.directionRepairs) throw new Error(`Ambiguous direction additions: ${field}`);
      repairs.directionRepairs[field]=repairs[field];
      delete repairs[field];
    }
    const props=structuredClone(original);
    for(const r of repairs.chapterRepairs??[]) {
      const chapter=props.plan.chapters.find((c:any)=>c.id===r.chapterId);
      if(!chapter || !['lead','beside','away'].includes(r.presenter)) throw new Error('Invalid chapter repair');
      chapter.presenter=r.presenter;
      if(r.pieces) {
        if(!r.pieces.length || r.pieces.length>2) throw new Error('Invalid piece count');
        for(const p of r.pieces) if(p.source==='library' && !chapter.pieces.some((old:any)=>old.component===p.component)) throw new Error('Library component identity changed');
        chapter.pieces=r.pieces.map((p:any,index:number)=>{
          const prior=chapter.pieces.find((old:any)=>old.source===p.source && (p.source!=='library' || old.component===p.component)) ?? chapter.pieces[index];
          if(!prior)throw new Error('No existing piece metadata for repair');
          return {...prior,...p};
        });
      }
      for(const a of r.annotations??[]) {
        if(!chapter.beats[a.beatIndex]) throw new Error('Invalid annotation beat');
        for(const field of ['pill','card','stamp']) if(field in a) chapter.beats[a.beatIndex][field]=a[field];
      }
    }
    if(props.plan.direction) {
      const d=props.plan.direction;
      for(const r of repairs.directionRepairs?.objects??[]) {const o=d.objects.find((o:any)=>o.id===r.id);if(!o)throw new Error('Unknown object');for(const k of ['label','detail','introduced'])if(k in r)o[k]=r[k];}
      for(const [field,keys] of [['events',['objectId','state','detail','cue','from','action']],['shots',['boundary','composition','objectIds','focus','presenter','recapRefs','cue']]] as const) for(const r of repairs.directionRepairs?.[field]??[]) {if(!d[field][r.index])throw new Error('Unknown direction index');for(const k of keys)if(k in r)d[field][r.index][k]=r[k];}
      d.objects.push(...(repairs.directionRepairs?.addObjects??[]));
      d.events.push(...(repairs.directionRepairs?.addEvents??[]));
      d.shots.push(...(repairs.directionRepairs?.addShots??[]));
      directionFrom(d,props.plan,splitSentences(script));
      for(const cue of [...d.objects.map((o:any)=>o.introduced),...d.events.map((e:any)=>e.cue),...d.shots.map((s:any)=>s.cue)]) if(cueTime(cue,props.words,props.plan.chapters)===null) throw new Error('Unaligned direction repair');
      fs.writeFileSync(path.join(out,'film-direction.json'),JSON.stringify(d,null,2));
    }
    for(const c of props.plan.chapters) for(const p of c.pieces) {
      if(!props.plan.direction && p.source==='library' && !p.stateCues?.length)throw new Error('Repair lost library state cues');
      for(const s of p.stateCues??[])if(cueTime(s.cue,props.words,props.plan.chapters)===null)throw new Error('Unaligned component repair');
    }
    fs.writeFileSync(path.join(out,'repair.json'),JSON.stringify({criticFile,reusedRealModelRepair:savedArg?.slice('--repair-json='.length)??null,repairs},null,2));
    fs.writeFileSync(path.join(out,'props.json'),JSON.stringify(props,null,2));
    fs.writeFileSync(path.join(out,'input-script.txt'),script);
    console.log(`Applied ${repairs.chapterRepairs?.length??0} chapter repairs from real vision findings`);
    break;
  } catch(error){correction=`\nCorrect this validation error in a complete JSON: ${String(error)}`;if(attempt===3)throw error;}
}
