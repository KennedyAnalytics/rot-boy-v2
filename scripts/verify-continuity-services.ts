import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {loadEnv, llmProvider} from '../server/env';
import {complete} from '../server/llm';

loadEnv();
const out = path.resolve('out/continuity-v1/service-verification.json');
const require = createRequire(import.meta.url);
const report: Record<string, unknown> = {checkedAt: new Date().toISOString(), networkDisabled: process.env.CODEX_SANDBOX_NETWORK_DISABLED === '1'};
const checks = await Promise.allSettled([
  (async () => {
    const result = await complete('Return JSON with available:true.', 'Verify this authenticated production direction request.', 800);
    if (!result.text.includes('true')) throw new Error('Direction request did not return its expected usable JSON response.');
    return {service:'direction', provider:llmProvider(), model:llmProvider()==='anthropic' ? process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5' : process.env.OPENAI_MODEL || 'gpt-4.1', ...result};
  })(),
  (async () => {
    const file = 'out/continuity-v1/before/larkspur-75-79.png';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', signal:AbortSignal.timeout(60000),
      headers:{'x-api-key':process.env.ANTHROPIC_API_KEY || '', 'anthropic-version':'2023-06-01','content-type':'application/json'},
      body:JSON.stringify({model:process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',max_tokens:100,messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:'image/png',data:fs.readFileSync(file).toString('base64')}},{type:'text',text:'Describe one visible detail in this image to verify image input works.'}]}]})
    });
    const body = await response.json() as {content?:unknown;error?:{message?:string}};
    if (!response.ok) throw new Error(`Vision HTTP ${response.status}: ${body.error?.message}`);
    return {service:'vision',status:response.status,model:process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',content:body.content};
  })(),
  (async () => {
    const files: unknown[] = [];
    for (const [name, weights] of [['Archivo',['400','500','600','700','800']],['IBMPlexMono',['500','600']]] as const) {
      const info = require(`@remotion/google-fonts/${name}`).getInfo();
      for (const weight of weights) {
        const url = info.fonts.normal[weight].latin;
        const response = await fetch(url,{signal:AbortSignal.timeout(15000)});
        const bytes = (await response.arrayBuffer()).byteLength;
        if (!response.ok || !bytes) throw new Error(`Font ${name}/${weight}: HTTP ${response.status}`);
        files.push({name,weight,url,status:response.status,bytes});
      }
    }
    return {service:'production-fonts',files};
  })()
]);
report.checks = checks.map((c,i)=>c.status==='fulfilled' ? {ok:true,...c.value} : {ok:false,service:['direction','vision','production-fonts'][i],error:String(c.reason),causeCode:c.reason?.cause?.code});
report.ok = checks.every(c=>c.status==='fulfilled');
fs.writeFileSync(out,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if (!report.ok) process.exitCode=1;
