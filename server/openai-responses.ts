/**
 * OpenAI Responses API with reasoning effort, used when OPENAI_REASONING_EFFORT
 * is set. Runs as a background response and polls, so long high-effort calls
 * are not cut off by HTTP header timeouts. Every call can append provenance to
 * LLM_PROVENANCE_LOG (JSON lines). Failures throw; nothing is substituted.
 */
import fs from 'node:fs';
import path from 'node:path';

export type ResponsesInput = { type: 'input_text'; text: string } | { type: 'input_image'; image_url: string; detail: 'high' | 'low' | 'auto' };
export type ResponsesFormat = { type: 'json_object' } | { type: 'json_schema'; name: string; schema: Record<string, unknown>; strict: boolean };
export type ResponsesResult = { text: string; model: string; requestId: string; status: string; incomplete: string | null; usage: unknown; effort: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const record = (entry: Record<string, unknown>) => {
  const file = process.env.LLM_PROVENANCE_LOG;
  if (!file) return;
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.appendFileSync(path.resolve(file), `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
};

export const responsesComplete = async (opts: { system: string; content: ResponsesInput[]; maxOutputTokens: number; format?: ResponsesFormat; purpose: string }): Promise<ResponsesResult> => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is missing');
  const model = process.env.OPENAI_MODEL || 'gpt-4.1';
  const effort = process.env.OPENAI_REASONING_EFFORT || 'high';
  // Reasoning tokens count against max_output_tokens; reserve room for them.
  const reserve = Number(process.env.OPENAI_REASONING_RESERVE || 48000);
  const headers = { Authorization: `Bearer ${key}`, 'content-type': 'application/json' };
  const created = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      instructions: opts.system,
      // json_object requires the word in the input itself, not only the instructions.
      input: [{ role: 'user', content: (opts.format ?? { type: 'json_object' }).type === 'json_object' ? [...opts.content, { type: 'input_text', text: 'Respond with one JSON object.' }] : opts.content }],
      reasoning: { effort },
      max_output_tokens: opts.maxOutputTokens + reserve,
      text: { format: opts.format ?? { type: 'json_object' } },
      background: true,
      store: true,
    }),
  });
  let body = (await created.json()) as any;
  if (!created.ok) throw new Error(`OpenAI responses HTTP ${created.status}: ${body.error?.message ?? 'request failed'}`);
  const started = Date.now();
  while (body.status === 'queued' || body.status === 'in_progress') {
    if (Date.now() - started > 45 * 60 * 1000) throw new Error(`OpenAI response ${body.id} exceeded 45 minutes`);
    await sleep(3000);
    const polled = await fetch(`https://api.openai.com/v1/responses/${body.id}`, { headers });
    body = await polled.json();
    if (!polled.ok) throw new Error(`OpenAI responses poll HTTP ${polled.status}: ${body.error?.message ?? 'poll failed'}`);
  }
  const text = (body.output ?? [])
    .filter((item: any) => item.type === 'message')
    .flatMap((item: any) => item.content ?? [])
    .filter((part: any) => part.type === 'output_text')
    .map((part: any) => part.text)
    .join('');
  const result: ResponsesResult = { text, model: body.model ?? model, requestId: body.id, status: body.status, incomplete: body.incomplete_details?.reason ?? null, usage: body.usage, effort };
  record({ purpose: opts.purpose, provider: 'openai', api: 'responses', model: result.model, requestedModel: model, effort, requestId: result.requestId, status: result.status, incomplete: result.incomplete, usage: result.usage, seconds: Math.round((Date.now() - started) / 1000) });
  if (body.status !== 'completed' || !text) throw new Error(`OpenAI response ${body.id} ${body.status}${result.incomplete ? ` (${result.incomplete})` : ''}: ${body.error?.message ?? 'no output text'}`);
  return result;
};
