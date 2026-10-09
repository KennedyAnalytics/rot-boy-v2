import fs from 'node:fs';
import path from 'node:path';
import {loadEnv} from '../server/env';
import {complete} from '../server/llm';
import {extractJson} from '../src/director/normalize';
import {directionFrom,directionSystem,cueTime} from '../src/film/direction';
import {splitSentences} from '../src/timing';
import type {StructuredFilmProps} from '../src/film/structure-types';
loadEnv();
const source=process.argv[2] || 'out/prod-harden/props.json';
const out=process.argv[3] || 'out/continuity-v1/mara';
fs.mkdirSync(out,{recursive:true});
const props:StructuredFilmProps=JSON.parse(fs.readFileSync(source,'utf8'));
const script=fs.readFileSync(path.join(path.dirname(source),'input-script.txt'),'utf8');
const sentences=splitSentences(script);
const input={script:sentences.map((text,sentence)=>({sentence,text})),structure:{title:props.plan.title,spine:props.plan.spine,example:props.plan.example,chapters:props.plan.chapters.map(c=>({id:c.id,name:c.name,sentenceIndexes:c.sentenceIndexes,stage:c.stage,recap:c.recap}))}};
let error='';
for(let attempt=0;attempt<3;attempt++) {
  const response=await complete(directionSystem,JSON.stringify(input)+error,24000).catch((failure:Error & {cause?:{code?:string}})=>{
    fs.writeFileSync(path.join(out,'execution-failure.json'),JSON.stringify({status:'blocked',stage:'real direction API',error:failure.message,causeCode:failure.cause?.code??null,networkDisabled:process.env.CODEX_SANDBOX_NETWORK_DISABLED==='1',completed:false},null,2));
    throw failure;
  });
  fs.writeFileSync(path.join(out,`direction-response-${attempt+1}.txt`),response.text);
  fs.writeFileSync(path.join(out,`direction-completion-${attempt+1}.json`),JSON.stringify({stopReason:response.stopReason,outputTokens:response.outputTokens},null,2));
  try {
    if(response.stopReason==='max_tokens') throw new Error('Direction output was truncated. Return a concise complete JSON, limiting objects to eight and events to essential causal changes.');
    const direction=directionFrom(extractJson(response.text),props.plan,sentences);
    for(const cue of [...direction.objects.map(o=>o.introduced),...direction.events.map(e=>e.cue),...direction.shots.map(s=>s.cue)]) if(cueTime(cue,props.words,props.plan.chapters)===null) throw new Error(`No word alignment for ${JSON.stringify(cue)}`);
    props.plan.direction=direction;
    props.plan.safeProfile='reels';
    fs.writeFileSync(path.join(out,'film-direction.json'),JSON.stringify(direction,null,2));
    fs.writeFileSync(path.join(out,'props.json'),JSON.stringify(props,null,2));
    fs.writeFileSync(path.join(out,'input-script.txt'),script);
    console.log(`Directed ${direction.objects.length} persistent objects, ${direction.events.length} states, ${direction.shots.length} shots`);
    break;
  } catch(e) {error=`\nCorrect this validation failure in a complete new JSON: ${String(e)}`; if(attempt===2) throw e;}
}
