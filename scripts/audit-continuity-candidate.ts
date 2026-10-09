import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {cueTime,directionFrom} from '../src/film/direction';
import {statePropsAt} from '../src/film/state-cues';
import {splitSentences} from '../src/timing';
import {piecesFrom} from '../src/film/normalize';

const file=process.argv[2];
const baselineFile=process.argv[3];
const out=path.dirname(file);
const props=JSON.parse(fs.readFileSync(file,'utf8'));
const baseline=JSON.parse(fs.readFileSync(baselineFile,'utf8'));
const script=fs.readFileSync(path.join(out,'input-script.txt'),'utf8');
assert.equal(script,fs.readFileSync(path.join(path.dirname(baselineFile),'input-script.txt'),'utf8'));
assert.deepEqual(props.words,baseline.words);
assert.equal(props.audioFile,baseline.audioFile);
assert.ok(fs.existsSync(path.join('public',props.audioFile)));
const sha=(file:string)=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report:Record<string,unknown>={scriptPreserved:true,alignmentUnchanged:true,narrationUnchanged:true,audioSha256:sha(path.join('public',props.audioFile)),baselineVideoSha256:sha(path.join(path.dirname(baselineFile),'film.mp4'))};
const direction=props.plan.direction;
if(direction) {
  directionFrom(direction,props.plan,splitSentences(script));
  report.alignedDirection={objects:direction.objects.map((o:any)=>({id:o.id,at:cueTime(o.introduced,props.words,props.plan.chapters)})),events:direction.events.map((e:any)=>({...e,at:cueTime(e.cue,props.words,props.plan.chapters)})),shots:direction.shots.map((s:any)=>({...s,at:cueTime(s.cue,props.words,props.plan.chapters)}))};
}
const pieces=props.plan.chapters.flatMap((c:any)=>c.pieces.map((p:any,i:number)=>({chapter:c.id,pieceIndex:i,piece:p})));
const cueAudit=pieces.filter((p:any)=>p.piece.stateCues?.length).map((p:any)=>({...p,cues:p.piece.stateCues.map((s:any)=>({...s,at:cueTime(s.cue,props.words,props.plan.chapters)}))}));
report.componentCues=cueAudit;
const board=pieces.find((p:any)=>p.piece.source==='library' && p.piece.component==='kanban-move');
if(board) {
  const read=(time:number)=>statePropsAt(board.piece.props,board.piece.stateCues,time,props.words,props.plan.chapters);
  const checked=[];
  for(let frame=2250;frame<=2400;frame++) {
    const at=frame/30;
    const state=read(at);
    assert.ok((state.cards as any[]).every(c=>c.column===0 && c.moveTo===undefined));
    checked.push({frame,time:at,columns:(state.cards as any[]).map(c=>c.column)});
  }
  const first=cueTime(board.piece.stateCues[0].cue,props.words,props.plan.chapters)!;
  assert.ok((read(first-1/30).cards as any[]).every(c=>c.column===0));
  assert.ok((read(first+1/30).cards as any[]).some(c=>c.column!==0));
  report.frameByFrame={range:'75–80 seconds, inclusive',frames:checked.length,firstAssignmentCue:first,before:read(first-1/30),after:read(first+1/30),checked};
}
// Empty entry state must survive normalization instead of being replaced by future facts.
const emptyCue={cue:{phrase:'future result',sentence:0},props:{rows:[{key:'Result',value:'Done'}]}};
const normalized=piecesFrom({pieces:[{source:'procedural',graphic:'record',props:{title:'Initial',rows:[]},stateCues:[emptyCue]}]},new Set(),['Result: Done'],'');
assert.deepEqual(normalized[0].props.rows,[]);
assert.equal(normalized[0].stateCues?.length,1);
report.emptyInitialStateNormalization=true;
if(direction) {
  const sentence=splitSentences(script).findIndex(s=>s.includes("the shop's return policy"));
  if(sentence>=0){
    const beat=props.plan.chapters.flatMap((c:any)=>c.beats).find((b:any)=>b.sentenceIndexes.includes(sentence));
    const words=props.words.filter((w:any)=>w.start>=beat.start && w.start<=beat.end);
    const index=words.findIndex((w:any)=>w.text.toLowerCase().replace(/[^a-z0-9]/g,'')==='shops');
    assert.ok(index>0);
    const expected=words[index-1].start;
    assert.equal(cueTime({sentence,phrase:"the shop's return policy"},props.words,props.plan.chapters),expected);
    report.exactPhraseRegression={phrase:"the shop's return policy",expectedStart:expected,earlierThe:words.find((w:any)=>w.text.toLowerCase()==='the')?.start};
    // The final Mara fixture must contain the real model's added sent event;
    // losing a misplaced additions array otherwise leaves the reply writing forever.
    const timed=direction.events.map((e:any)=>({...e,at:cueTime(e.cue,props.words,props.plan.chapters)}));
    const sent=timed.find((e:any)=>e.objectId==='reply' && e.mode==='actual' && e.state==='sent');
    assert.ok(sent && sent.at!==null,'Mara reply must become sent at the answered cue');
    const ledger=(id:string,time:number)=>timed.filter((e:any)=>e.objectId===id && e.mode==='actual' && e.at<=time).sort((a:any,b:any)=>a.at-b.at).at(-1)?.state;
    assert.equal(ledger('reply',sent.at-1/30),'writing back');
    assert.equal(ledger('reply',sent.at+1/30),'sent');
    assert.equal(ledger('email',133),'answered');
    assert.equal(ledger('email',158),'answered');
    report.actualLedgerRegression={replySentCue:sent.at,before:'writing back',after:'sent',hypotheticalActualEmail:'answered',recapActualEmail:'answered'};
  }
}
fs.writeFileSync(path.join(out,'continuity-audit.json'),JSON.stringify(report,null,2));
console.log('Candidate audit passed: supplied script, retained narration/alignment, cue data, initial-state normalization');
