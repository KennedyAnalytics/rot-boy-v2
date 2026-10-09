import fs from 'node:fs';
import path from 'node:path';
import {loadEnv} from '../server/env';
import {complete} from '../server/llm';
import {extractJson} from '../src/director/normalize';
import {cueTime} from '../src/film/direction';
import {splitSentences} from '../src/timing';
import type {StateCue} from '../src/film/state-cues';

loadEnv();
const source = process.argv[2];
const out = process.argv[3];
fs.mkdirSync(out,{recursive:true});
const props = JSON.parse(fs.readFileSync(source,'utf8'));
const script = fs.readFileSync(path.join(path.dirname(source),'input-script.txt'),'utf8');
const sentences = splitSentences(script);
const input = {sentences:sentences.map((text,sentence)=>({sentence,text})),chapters:props.plan.chapters.map((c:any)=>({id:c.id,sentenceIndexes:c.sentenceIndexes,pieces:c.pieces,beats:c.beats}))};
const system = `Repair internal mutable-component state in this retained production plan. Return JSON {repairs:[{chapterId,pieceIndex,baseProps,stateCues:[{cue:{phrase,sentence},props}]}]}. These are shallow prop patches consumed at exact ElevenLabs aligned phrases. Every library piece requires at least one cue. Also repair any procedural piece whose initial props expose a later completed result. Preserve the component and visual construction; preserve script and facts. Freeze stops autonomous clocks at frame 30, so initial baseProps must be truthful and complete with NO timers that imply future states. For kanban, remove moveTo/moveAtSeconds, use small dealStaggerSeconds:0, and change columns by replacing the complete cards array at the narrated handler cue; do not mark a result complete until narrated. Use complete card titles, not chopped fragments. The initial Requests column may show the requests already established by Split, but AI/Designer columns must remain empty until the appropriate spoken phrase. Do not show a draft or completed result at the start of Apply. A procedural draft summary should have empty items and truthful title until the draft cue. Comparison rows must appear individually at their narrated phrases. Keep readable complete essential labels and concise visual text. BaseProps includes all static props; cue props patch only changed values. Never use a chapter name as a renderer rule. Copy exact contiguous phrases from zero-based numbered sentences. Do not add unsupported facts. Output only JSON.`;
let correction='';
for(let attempt=1;attempt<=3;attempt++) {
  const response=await complete(system,JSON.stringify(input)+correction,9000);
  fs.writeFileSync(path.join(out,`component-state-response-${attempt}.txt`),response.text);
  try {
    const raw=extractJson(response.text) as {repairs:{chapterId:string;pieceIndex:number;baseProps:Record<string,unknown>;stateCues:StateCue[]}[]};
    if(!Array.isArray(raw.repairs)) throw new Error('Missing repairs');
    for(const repair of raw.repairs) {
      const c=props.plan.chapters.find((c:any)=>c.id===repair.chapterId);
      if(!c?.pieces[repair.pieceIndex] || !repair.baseProps || !repair.stateCues.length) throw new Error('Invalid piece repair');
      for(const item of repair.stateCues) {
        if(!c.sentenceIndexes.includes(item.cue.sentence) || !sentences[item.cue.sentence]?.includes(item.cue.phrase) || cueTime(item.cue,props.words,props.plan.chapters)===null) throw new Error(`Unaligned state cue ${JSON.stringify(item.cue)}`);
      }
      c.pieces[repair.pieceIndex].props=repair.baseProps;
      c.pieces[repair.pieceIndex].stateCues=repair.stateCues;
    }
    for(const c of props.plan.chapters) for(const p of c.pieces) if(p.source==='library' && !p.stateCues?.length) throw new Error('Every library piece needs authoritative cues');
    props.plan.safeProfile='reels';
    fs.writeFileSync(path.join(out,'component-state.json'),JSON.stringify(raw,null,2));
    fs.writeFileSync(path.join(out,'props.json'),JSON.stringify(props,null,2));
    fs.writeFileSync(path.join(out,'input-script.txt'),script);
    console.log(`Generated ${raw.repairs.length} cue-gated piece repairs`);
    break;
  } catch(error) {correction=`\nCorrect this validation error in a complete JSON: ${String(error)}`;if(attempt===3) throw error;}
}
