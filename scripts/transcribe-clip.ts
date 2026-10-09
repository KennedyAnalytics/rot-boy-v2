/**
 * Transcribes one clip with several speech models side by side, for
 * adjudicating a disputed narration span. Keeps every raw answer.
 *
 *   npx tsx scripts/transcribe-clip.ts <media> <start> <end> <out.json>
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const [media, start, end, out] = process.argv.slice(2);
const clip = out.replace(/\.json$/, '.mp3');
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', start, '-to', end, '-i', media, '-vn', '-ac', '1', '-b:a', '128k', clip]);
const results: Record<string, string> = {};
for (const model of ['gpt-4o-transcribe', 'whisper-1', 'gpt-4o-mini-transcribe']) {
  const form = new FormData();
  form.append('model', model);
  form.append('file', new Blob([fs.readFileSync(clip)]), 'clip.mp3');
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form });
  const b = (await r.json()) as any;
  results[model] = r.ok ? b.text : `ERROR ${b.error?.message}`;
  console.log(`${model}: ${results[model]}`);
}
fs.writeFileSync(out, JSON.stringify({ media, start: Number(start), end: Number(end), results }, null, 2));
