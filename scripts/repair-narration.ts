/**
 * Bounded narration repair. Re-voices only the named sentences with the
 * production voice and settings (with neighbouring text as context), verifies
 * each take word-for-word with a real transcription model, splices it into the
 * silent sentence breaks of the original recording on lossless PCM, merges the
 * take's own ElevenLabs alignment, and re-times the plan from the result.
 *
 *   npx tsx scripts/repair-narration.ts <props.json> <outName> "<sentence start>" ["<sentence start>" ...]
 *
 * Writes public/jobs/<outName>/voice.wav, words.json, repair.json, and
 * <props dir>/props-narration-repaired.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { synthesizeSegment } from '../server/voice';
import { splitSentences, timeChapters } from '../src/timing';
import type { Word } from '../src/types';

const [propsPath, outName, ...targets] = process.argv.slice(2);
const props = JSON.parse(fs.readFileSync(propsPath, 'utf8'));
const script = fs.readFileSync(path.join(path.dirname(propsPath), 'input-script.txt'), 'utf8').trim();
const sentences = splitSentences(script);
const outDir = path.resolve('public', 'jobs', outName);
fs.mkdirSync(outDir, { recursive: true });
const SR = 44100;
const norm = (t: string) => t.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);

// Decode a media file to mono 16-bit PCM at SR.
const pcm = (file: string) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, '-f', 's16le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1024 * 1024 * 1024 }) as Buffer;
const at = (seconds: number) => Math.max(0, Math.round(seconds * SR)) * 2;

// Two independent transcribers must both hear exactly the script.
const VERIFIERS = ['whisper-1', 'gpt-4o-mini-transcribe'];
const transcribe = async (wav: string, model: string) => {
  const form = new FormData();
  form.append('model', model);
  form.append('file', new Blob([fs.readFileSync(wav)]), path.basename(wav));
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form });
  const b = (await r.json()) as any;
  if (!r.ok) throw new Error(`transcription HTTP ${r.status}: ${b.error?.message}`);
  return b.text as string;
};
const writeWav = (file: string, data: Buffer) => {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8); header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, data]));
};

let audio = pcm(path.resolve('public', props.audioFile));
let words: Word[] = props.words.map((w: Word) => ({ ...w }));
// Word i is script token i: alignment comes from the same whitespace tokens.
const spans: [number, number][] = [];
let cursor = 0;
for (const s of sentences) {
  const n = s.split(/\s+/).filter(Boolean).length;
  spans.push([cursor, cursor + n - 1]);
  cursor += n;
}
if (cursor !== words.length) throw new Error(`token/word mismatch: script ${cursor}, alignment ${words.length}`);

// A target is one sentence ("Prefix") or a contiguous run ("First..Last"),
// re-voiced as one take so a parallel passage keeps one continuous delivery.
const find = (prefix: string) => {
  const k = sentences.findIndex((s) => s.startsWith(prefix));
  if (k < 0) throw new Error(`no sentence starts with "${prefix}"`);
  return k;
};
const runs = targets.map((target) => {
  const [first, last] = target.split('..');
  const a = find(first);
  return [a, last ? find(last) : a] as [number, number];
}).sort((x, y) => x[0] - y[0]);
const groupSpans = runs.map(([s0, s1]) => [spans[s0][0], spans[s1][1]] as [number, number]);

const log: any[] = [];
let shift = 0;
for (const [runIndex, [k, kLast]] of runs.entries()) {
  // Earlier repairs shift later words but never change counts, so spans hold.
  const [a, b] = groupSpans[runIndex];
  const text = sentences.slice(k, kLast + 1).join(' ');
  const wa = words[a];
  const wb = words[b];
  const cutStart = a > 0 ? (words[a - 1].end + wa.start) / 2 : 0;
  const cutEnd = b + 1 < words.length ? (wb.end + words[b + 1].start) / 2 : wb.end + 0.3;
  let take: Awaited<ReturnType<typeof synthesizeSegment>> | null = null;
  let heard = '';
  const attempts: string[] = [];
  for (let attempt = 1; attempt <= 4 && !take; attempt += 1) {
    // Shaped exactly like the production narration: a 0.4 s break between sentences.
    const spoken = sentences.slice(k, kLast + 1).join(' <break time="0.4s" /> ');
    const t = await synthesizeSegment(spoken, sentences.slice(Math.max(0, k - 2), k).join(' '), sentences.slice(kLast + 1, kLast + 3).join(' '));
    const mp3 = path.join(outDir, `take-s${k}-${attempt}.mp3`);
    fs.writeFileSync(mp3, t.audio);
    const wav = mp3.replace(/\.mp3$/, '.wav');
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', mp3, '-ac', '1', '-ar', String(SR), wav]);
    const want = norm(text).join(' ').replace(/\$?(\d[\d,]*)/g, '');
    const verdicts = [];
    for (const model of VERIFIERS) {
      const said = await transcribe(wav, model);
      verdicts.push({ model, said, exact: norm(said).join(' ').replace(/\$?(\d[\d,]*)/g, '') === want });
    }
    heard = verdicts.map((v) => `${v.model}: ${v.said}`).join(' || ');
    attempts.push(heard);
    if (verdicts.every((v) => v.exact)) take = t;
    else console.log(`  s${k} take ${attempt} rejected: ${heard}`);
  }
  if (!take) throw new Error(`sentences ${k}-${kLast} never verified: ${attempts.join(' | ')}`);
  const takePcm = pcm(path.join(outDir, `take-s${k}-${attempts.length}.mp3`));
  const tw = take.words;
  if (tw.length !== b - a + 1) throw new Error(`take alignment has ${tw.length} words, sentence has ${b - a + 1}`);
  const trimStart = Math.max(0, tw[0].start - 0.03);
  const trimEnd = tw.at(-1)!.end + 0.08;
  const speech = takePcm.subarray(at(trimStart), at(trimEnd));
  const padA = Buffer.alloc(at(wa.start - cutStart));
  const padB = Buffer.alloc(at(Math.max(0.05, cutEnd - wb.end - 0.08)));
  const middle = Buffer.concat([padA, speech, padB]);
  const oldLength = (cutEnd - cutStart);
  const newLength = middle.length / 2 / SR;
  audio = Buffer.concat([audio.subarray(0, at(cutStart)), middle, audio.subarray(at(cutEnd))]);
  const delta = newLength - oldLength;
  const base = cutStart + padA.length / 2 / SR - trimStart;
  const replaced = tw.map((w, i) => ({ text: words[a + i].text, start: w.start + base, end: w.end + base }));
  words = [...words.slice(0, a), ...replaced, ...words.slice(b + 1).map((w) => ({ ...w, start: w.start + delta, end: w.end + delta }))];
  shift += delta;
  log.push({ sentences: [k, kLast], text, cut: [Number(cutStart.toFixed(3)), Number(cutEnd.toFixed(3))], delta: Number(delta.toFixed(3)), attempts, verifiedTranscript: heard, voiceId: take.voiceId });
  console.log(`s${k}-${kLast} repaired (${attempts.length} take(s)), Δ ${delta.toFixed(3)}s: ${heard}`);
}
writeWav(path.join(outDir, 'voice.wav'), audio);
fs.writeFileSync(path.join(outDir, 'words.json'), JSON.stringify(words, null, 2));
const timed = timeChapters(props.plan.chapters, words);
if (timed.clock !== 'alignment') throw new Error('re-timing fell back to estimate');
const repaired = { ...props, audioFile: `jobs/${outName}/voice.wav`, words: timed.words, plan: { ...props.plan, chapters: timed.chapters, durationSec: timed.durationSec } };
fs.writeFileSync(path.join(path.dirname(propsPath), 'props-narration-repaired.json'), JSON.stringify(repaired, null, 2));
fs.writeFileSync(path.join(outDir, 'repair.json'), JSON.stringify({ source: props.audioFile, sampleRate: SR, totalShift: Number(shift.toFixed(3)), repairs: log, durationSec: timed.durationSec }, null, 2));
console.log(`wrote public/jobs/${outName}/voice.wav, total shift ${shift.toFixed(3)}s, duration ${timed.durationSec.toFixed(2)}s`);
