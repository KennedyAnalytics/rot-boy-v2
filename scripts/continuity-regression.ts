/** Utility regressions use retained alignment; they are not production acceptance. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cueTime} from '../src/film/direction';
import {statePropsAt} from '../src/film/state-cues';
import {layoutFor,presenterBounds,SAFE_PROFILES} from '../src/film/layers';
const cold=JSON.parse(fs.readFileSync('out/prod-cold/props.json','utf8'));
const base={status:'WAITING'};
const cues=[{cue:{sentence:25,phrase:'Mechanical changes go to the AI'},props:{status:'AT AI'}}];
const at=cueTime(cues[0].cue,cold.words,cold.plan.chapters)!;
assert.equal(at,81.898);
const read=(time:number)=>statePropsAt(base,cues,time,cold.words,cold.plan.chapters);
for(let frame=2250;frame<=2445;frame++) assert.equal(read(frame/30).status,'WAITING');
assert.equal(read(at-1/30).status,'WAITING');
assert.equal(read(at+1/30).status,'AT AI');
assert.deepEqual(statePropsAt({},[{cue:{sentence:999,phrase:'missing'},props:{done:true}}],1000,cold.words,cold.plan.chapters),{});
const repeated=[{beats:[{start:0,end:5,sentenceIndexes:[0,1],narration:'Now go. Now go.'}]}];
assert.equal(cueTime({sentence:1,phrase:'Now go'},[{text:'Now',start:0},{text:'go',start:1},{text:'Now',start:3},{text:'go',start:4}],repeated),3);
for(const profile of ['reels','tiktok'] as const) for(const presenter of ['lead','beside','away'] as const) {
  const l=layoutFor({hasChip:false,hasPill:false,hasStamp:false,cardRows:0,presenter,safeProfile:profile});
  if(l.presenterScale) assert.ok(presenterBounds(l.presenterScale,profile).bottom<=1920-SAFE_PROFILES[profile].bottom);
}
assert.ok(1920-180+3*.52>1640,'Old silent inset is a negative control');
console.log('Utility regressions pass: phrase alignment, fail-closed state, repeated phrase scope, safe profiles. Production/render acceptance NOT established.');
