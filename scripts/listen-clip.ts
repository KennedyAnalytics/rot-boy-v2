/**
 * Targeted listening: cuts a clip from an audio/video file and asks a real
 * audio-input model what is actually heard. Keeps the raw response.
 *
 *   npx tsx scripts/listen-clip.ts <media> <start> <end> <out.json> "<question>"
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const [media, start, end, out, question] = process.argv.slice(2);
const clip = out.replace(/\.json$/, '.wav');
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', start, '-to', end, '-i', media, '-vn', '-ac', '1', '-ar', '24000', clip]);
const model = process.env.AUDIO_MODEL || 'gpt-audio-1.5';
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
  body: JSON.stringify({
    model,
    modalities: ['text'],
    messages: [
      { role: 'system', content: 'You are an audio QA engineer. Listen carefully. Report only what is audible. Return JSON.' },
      { role: 'user', content: [{ type: 'text', text: question }, { type: 'input_audio', input_audio: { data: fs.readFileSync(clip).toString('base64'), format: 'wav' } }] },
    ],
  }),
});
const body = (await response.json()) as any;
if (!response.ok) throw new Error(`audio HTTP ${response.status}: ${body.error?.message}`);
const text = body.choices?.[0]?.message?.content ?? '';
fs.writeFileSync(out, JSON.stringify({ media, start: Number(start), end: Number(end), model: body.model, requestId: body.id, question, answer: text }, null, 2));
console.log(`${start}-${end}s ${body.model}: ${text}`);
