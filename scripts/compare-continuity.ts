import fs from 'node:fs';
import path from 'node:path';
import {loadEnv} from '../server/env';
import {extractJson} from '../src/director/normalize';
import {completeVision,visionProviderFromArgs} from '../server/vision';

loadEnv();
const folder=process.argv[2];
const out=process.argv[3] || path.join(folder,'comparison-critic');
const provider=visionProviderFromArgs(process.argv);
fs.mkdirSync(out,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));
const rules=[
  ['G01','visible explanatory action',[31.2,31.6,32.27,84.43,84.9,85.53,95.2,95.63,96.27]],
  ['G02','recognizable object persistence and state progression',[33.8,47,70,99.4]],
  ['G03','clear attention hierarchy',[47,70,96,141]],
  ['G04','phone-readable teaching scale',[17.8,70,96,141]],
  ['G05','annotations clarify their referent and avoid duplication',[17.8,110,125]],
  ['G06','causal movement with visible cause, action and consequence',[84.4,84.9,85.53,88.2,89,92,92.4,93.07,95.2,95.63,96.27]],
  ['G07','intentional reframing with retained orientation',[46.85,47.6,53.1,53.9]],
  ['G08','complete essential labels without clipping/crowding',[17.8,70,133,141]],
  ['G09','purposeful semantic color, no premature success',[96,125,133]],
  ['G10','presenter supports attention, placement and disappearance',[11,31.2,47,70,96,141,150,173]],
  ['G11','recap retrieves familiar objects and supported final history',[150,158,173]],
  ['G12','faithful legible captions support the visual explanation',[11,70,125,158]],
  ['G13','truthful actual case and distinctly labeled hypothetical',[128.8,133,141,158]],
] as const;
const findings:any[]=[];
const validate=(text:string,rule:string)=>{
  const result=extractJson(text) as any;
  if(String(result.rule).match(/^G\d{2}\b/)?.[0]!==rule || !['improved','same','regressed','insufficient'].includes(result.comparison) || !Array.isArray(result.evidence) || typeof result.acceptanceMet!=='boolean')throw new Error(`Invalid ${rule} comparison`);
  return {...result,ruleCode:rule};
};
const judge=async ([rule,meaning,times]: typeof rules[number])=>{
  const responsePath=path.join(out,`${rule}.response.txt`);
  if(fs.existsSync(responsePath)) {
    try{return validate(fs.readFileSync(responsePath,'utf8'),rule);}
    catch{fs.copyFileSync(responsePath,`${responsePath}.rejected-${Date.now()}`);}
  }
  const indexes=[...new Set(times.map(t=>manifest.times.reduce((best:number,at:number,i:number)=>Math.abs(at-t)<Math.abs(manifest.times[best]-t)?i:best,0)))];
  const content:any[]=[{type:'text',text:`Compare ${rule}: ${meaning}. Each time has BEFORE (retained operational baseline) then AFTER (new production candidate). Judge only these actual 330px phone frames/sequences. State the precise visible evidence and limitations; do not infer deterministic cue/bounds compliance. Evaluate improvement relative to baseline, not whether either film is perfect. Retained history alongside later states is legitimate. IF labels identify conditional branches. Contract constraints: the through-line label, spine and caption engine persist. Judge stage-local reframing rather than demanding a different through-line heading for every chapter. Captions intentionally show short aligned phrase chunks; only physically cropped glyphs are clipping. Presenter lead/beside/away decisions should support attention and reading space; continuous presenter motion is not required. Its absence is not automatically a defect. Return JSON {rule,comparison:improved|same|regressed|insufficient,evidence:[{time,observation}],remainingDefects:[string],acceptanceMet:boolean}. For G01/G06/G07 the ordered entry/action/result frames support sequence inspection, but do not claim continuous audiovisual review.`}];
  for(const i of indexes)for(const kind of ['before','after']){
    const t=manifest.times[i];
    const file=path.join(folder,`${kind}-${String(i).padStart(3,'0')}-${Number(t).toFixed(3)}.png`);
    content.push({type:'text',text:`${kind.toUpperCase()} ${t.toFixed(3)}s`},{type:'image',source:{type:'base64',media_type:'image/png',data:fs.readFileSync(file).toString('base64')}});
  }
  const response=await completeVision('Return only the requested JSON. Use exactly the supplied G-rule code for rule. comparison must be exactly improved, same, regressed, or insufficient. acceptanceMet must be boolean.',content,4000,provider);
  const text=response.text;
  fs.writeFileSync(responsePath,text);
  fs.writeFileSync(path.join(out,`${rule}.request.json`),JSON.stringify({...response,text:undefined},null,2));
  return {...validate(text,rule),provider:response.provider,model:response.model};
};
try{
  for(let offset=0;offset<rules.length;offset+=3){
    console.log(`Compare ${rules.slice(offset,offset+3).map(r=>r[0]).join(', ')}`);
    const results=await Promise.allSettled(rules.slice(offset,offset+3).map(judge));
    for(const r of results)if(r.status==='fulfilled')findings.push(r.value);
    const error=results.find(r=>r.status==='rejected');
    if(error?.status==='rejected')throw error.reason;
    fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify({status:'running',complete:false,findings},null,2));
  }
}catch(error){fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify({status:'failed',complete:false,error:String(error),findings},null,2));throw error;}
fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify({status:'complete',complete:true,baseline:manifest.baseline,candidate:manifest.candidate,phoneWidth:330,findings},null,2));
console.log(`Complete G01–G13 comparison: ${findings.filter(f=>f.comparison==='improved').length} improved`);
