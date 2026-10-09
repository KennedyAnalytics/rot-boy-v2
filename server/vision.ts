import {loadEnv} from './env';
import {responsesComplete} from './openai-responses';

export type VisionProvider = 'anthropic' | 'openai';
export type VisionContent = {type:'text';text:string} | {type:'image';source:{type:'base64';media_type:string;data:string}};

/** Real image-input providers only. Errors never become a passing critique. */
export const completeVision = async (system:string, content:VisionContent[], maxTokens:number, provider:VisionProvider='anthropic',schema?:Record<string,unknown>) => {
  loadEnv();
  const model=provider==='openai' ? process.env.OPENAI_MODEL||'gpt-4.1' : process.env.ANTHROPIC_MODEL||'claude-sonnet-5-5';
  const key=provider==='openai' ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY;
  if(!key)throw new Error(`Real ${provider} vision key is missing`);
  const openai=provider==='openai';
  if(openai && process.env.OPENAI_REASONING_EFFORT){
    const r=await responsesComplete({
      system,
      content:content.map(c=>c.type==='text'?{type:'input_text' as const,text:c.text}:{type:'input_image' as const,image_url:`data:${c.source.media_type};base64,${c.source.data}`,detail:'high' as const}),
      maxOutputTokens:maxTokens,
      format:schema?{type:'json_schema',name:'visual_review',schema,strict:true}:{type:'json_object'},
      purpose:'vision',
    });
    return {text:r.text,provider,model:r.model,requestId:r.requestId,stopReason:r.status,usage:r.usage,reasoningEffort:r.effort};
  }
  const response=await fetch(openai?'https://api.openai.com/v1/chat/completions':'https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:openai?{Authorization:`Bearer ${key}`,'content-type':'application/json'}:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json'},
    body:JSON.stringify(openai?{
      model,max_tokens:maxTokens,response_format:schema?{type:'json_schema',json_schema:{name:'visual_review',strict:true,schema}}:{type:'json_object'},
      messages:[{role:'system',content:system},{role:'user',content:content.map(c=>c.type==='text'?c:{type:'image_url',image_url:{url:`data:${c.source.media_type};base64,${c.source.data}`,detail:'high'}})}],
    }:{model,max_tokens:maxTokens,system,messages:[{role:'user',content}]}),
  });
  const body=await response.json() as any;
  if(!response.ok)throw new Error(`${provider} vision HTTP ${response.status}: ${body.error?.message??'request failed'}`);
  const text=openai?body.choices?.[0]?.message?.content:body.content?.filter((b:any)=>b.type==='text').map((b:any)=>b.text).join('\n');
  const stopReason=openai?body.choices?.[0]?.finish_reason:body.stop_reason;
  if(!text || ['length','max_tokens'].includes(stopReason))throw new Error(`${provider} vision returned empty/truncated evidence`);
  return {text,provider,model,requestId:body.id,stopReason,usage:body.usage};
};

export const visionProviderFromArgs = (args:string[]):VisionProvider => {
  const provider=args.find(a=>a.startsWith('--vision-provider='))?.split('=')[1]??'anthropic';
  if(provider!=='anthropic'&&provider!=='openai')throw new Error('Unknown real vision provider');
  return provider;
};
