/**
 * Authenticated probe of the configured OpenAI production model through the
 * Responses API: text JSON and image input, with reasoning effort. Records
 * provenance only.
 *
 *   npx tsx scripts/probe-model.ts <image.png> <out.json>
 */
import fs from 'node:fs';
import { completeVision } from '../server/vision';
import { complete } from '../server/llm';

const results: Record<string, unknown> = { model: process.env.OPENAI_MODEL, effort: process.env.OPENAI_REASONING_EFFORT };
try {
  const t = await complete('Return JSON {"ok":true,"why":string}.', 'Say why paper and ink suit an explainer in eight words.', 2000);
  results.text = t;
} catch (error) {
  results.text = { error: String(error) };
}
try {
  const image = fs.readFileSync(process.argv[2]).toString('base64');
  const v = await completeVision('Return JSON {"seen": string}.', [
    { type: 'image', source: { type: 'base64', media_type: 'image/png', data: image } },
    { type: 'text', text: 'Describe the frame in ten words.' },
  ], 3000, 'openai');
  results.vision = { ...v };
} catch (error) {
  results.vision = { error: String(error) };
}
fs.writeFileSync(process.argv[3], JSON.stringify({ at: new Date().toISOString(), ...results }, null, 2));
console.log(JSON.stringify(results, null, 2));
