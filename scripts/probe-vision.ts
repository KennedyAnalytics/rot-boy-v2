/**
 * Authenticated provider probe with a real image. Records provenance only.
 *
 *   npx tsx scripts/probe-vision.ts <image.png> <out.json>
 */
import fs from 'node:fs';
import { completeVision, type VisionProvider } from '../server/vision';

const image = fs.readFileSync(process.argv[2]).toString('base64');
const results: Record<string, unknown> = {};
for (const provider of ['anthropic', 'openai'] as VisionProvider[]) {
  try {
    const r = await completeVision('Return JSON {"seen": string} describing the image in five words.', [
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: image } },
      { type: 'text', text: 'Describe it.' },
    ], 200, provider);
    results[provider] = { ok: true, model: r.model, requestId: r.requestId, text: r.text };
  } catch (error) {
    results[provider] = { ok: false, error: String(error) };
  }
}
fs.writeFileSync(process.argv[3], JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
console.log(JSON.stringify(results, null, 2));
