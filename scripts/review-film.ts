/**
 * Manual multi-strip review. The production path uses scripts/compact-review.ts:
 * one call after Tier 1/2, not a strip loop.
 *
 * Tier 3. Real vision review of a film from its rendered phone-scale strips
 * (scripts/film-evidence.py). Evidence, not an oracle. Raw responses and
 * provenance are kept beside the result.
 *
 *   npx tsx scripts/review-film.ts <film dir> <review dir> --vision-provider=openai
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from '../server/env';
import { completeVision, visionProviderFromArgs } from '../server/vision';

loadEnv();
const folder = process.argv[2];
const out = process.argv[3];
const provider = visionProviderFromArgs(process.argv);
fs.mkdirSync(out, { recursive: true });
const evidence = path.join(folder, 'evidence');
const manifest = JSON.parse(fs.readFileSync(path.join(evidence, 'manifest.json'), 'utf8'));
const props = JSON.parse(fs.readFileSync(path.join(folder, 'props.json'), 'utf8'));
const words: { text: string; start: number; end: number }[] = props.words;
const chapters = props.plan.chapters as { name: string; start: number }[];

const criteria = [
  ['G01', 'visible explanatory action'], ['G02', 'object persistence and state progression'], ['G03', 'clear attention hierarchy'],
  ['G04', 'phone-readable teaching scale'], ['G05', 'annotations clarify a referent'], ['G06', 'causal motion: cause, action, consequence'],
  ['G07', 'intentional reframing'], ['G08', 'complete legible labels, no clipping or crowding'], ['G09', 'purposeful semantic color'],
  ['G10', 'presenter supports attention'], ['G11', 'recap retrieves established objects'], ['G12', 'captions faithful, legible, synchronized'],
  ['G13', 'state truth: actual, hypothetical, recap distinct; nothing before its cue'],
  ['hook', 'the first 2-3 seconds establish meaningful visual tension that explains the narration'],
  ['progression', 'the first 30 seconds show meaningful visual progression, not static presenter plus isolated objects'],
  ['teaching', 'the picture teaches the mechanism: why steps matter, where leverage comes from, what can go wrong'],
  ['motivation', 'motivation comes from understanding rather than motivational filler'],
  ['premium', 'feels professionally art-directed and publishable'],
] as const;
const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['strip', 'verdicts', 'defects', 'publishable', 'notes'],
  properties: {
    strip: { type: 'string' },
    verdicts: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['criterion', 'rating', 'evidence'], properties: { criterion: { type: 'string', enum: criteria.map((c) => c[0]) }, rating: { type: 'string', enum: ['strong', 'adequate', 'weak', 'failing', 'not-applicable'] }, evidence: { type: 'string' } } } },
    defects: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['time', 'severity', 'category', 'issue', 'repair'], properties: { time: { type: 'number' }, severity: { type: 'string', enum: ['blocking', 'major', 'minor'] }, category: { type: 'string' }, issue: { type: 'string' }, repair: { type: 'string' } } } },
    publishable: { type: 'boolean' },
    notes: { type: 'string' },
  },
};

const heard = (a: number, b: number) => words.filter((w) => w.start >= a && w.start < b).map((w) => w.text).join(' ');
const spanOf = (strip: string): [number, number] => {
  if (strip === 'hook-0-3s') return [0, 3.2];
  if (strip === 'first-30s') return [0, 31];
  const m = strip.match(/^chapter-(\d+)$/);
  if (m) {
    const n = Number(m[1]) - 1;
    return [chapters[n].start, chapters[n + 1]?.start ?? props.plan.durationSec];
  }
  return [0, props.plan.durationSec];
};

const review = async (strip: string) => {
  const responseFile = path.join(out, `${strip}.response.txt`);
  const requestFile = path.join(out, `${strip}.request.json`);
  if (fs.existsSync(responseFile) && fs.existsSync(requestFile)) return { ...JSON.parse(fs.readFileSync(responseFile, 'utf8')), ...JSON.parse(fs.readFileSync(requestFile, 'utf8')) };
  const [a, b] = spanOf(strip);
  const data = fs.readFileSync(path.join(evidence, `${strip}.png`)).toString('base64');
  const response = await completeVision(
    'You are the visual-quality reviewer for a vertical (9:16) educational motion-graphics film for TikTok/Reels. You see ordered 330px-wide phone-scale frames from the actual render, with timestamps. Judge only what the frames show; ordered frames are evidence of sequence, not continuous playback, so say when a judgement needs playback. Use the rubric exactly. The persistent top chapter rail, the status chip and the through-line heading are fixed house chrome. Captions intentionally show one short aligned phrase at a time. Flag concrete, repairable defects with timestamps: clipping, crowding, collisions (presenter, caption, rail vs teaching text), unclear referent, text too small at 330px, state shown before narration, motion or composition that confuses, empty or static stretches, anything that would stop the film being publishable. Do not reward motion for its own sake. Return only the JSON.',
    [
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data } },
      { type: 'text', text: `Strip "${strip}" covers ${a.toFixed(1)}-${b.toFixed(1)}s. Narration spoken in this span: "${heard(a, b)}". Rubric: ${criteria.map(([k, v]) => `${k} = ${v}`).join('; ')}. Rate every criterion (not-applicable where the span cannot show it, e.g. recap outside the recap).` },
    ],
    6000,
    provider,
    schema,
  );
  fs.writeFileSync(responseFile, response.text);
  fs.writeFileSync(requestFile, JSON.stringify({ ...response, text: undefined }, null, 2));
  return { ...JSON.parse(response.text), provider: response.provider, model: response.model, requestId: response.requestId };
};

const strips: string[] = manifest.strips.filter((s: string) => !s.startsWith('contact-'));
const results: any[] = [];
for (let i = 0; i < strips.length; i += 3) {
  const batch = strips.slice(i, i + 3);
  console.log(`review ${batch.join(', ')}`);
  const settled = await Promise.allSettled(batch.map(review));
  settled.forEach((r, k) => {
    if (r.status === 'fulfilled') results.push(r.value);
    else throw new Error(`${batch[k]}: ${String(r.reason)}`);
  });
}
const tally: Record<string, Record<string, number>> = {};
for (const r of results) for (const v of r.verdicts) {
  tally[v.criterion] ??= {};
  tally[v.criterion][v.rating] = (tally[v.criterion][v.rating] ?? 0) + 1;
}
const defects = results.flatMap((r) => r.defects.map((d: any) => ({ strip: r.strip, ...d }))).sort((x, y) => x.time - y.time);
fs.writeFileSync(path.join(out, 'review.json'), JSON.stringify({ status: 'complete', film: manifest.film, filmSha256: manifest.filmSha256, provider, models: [...new Set(results.map((r) => r.model))], strips: results.length, publishable: results.map((r) => ({ strip: r.strip, publishable: r.publishable })), tally, defects, results }, null, 2));
console.log(JSON.stringify({ tally, blocking: defects.filter((d) => d.severity === 'blocking').length, major: defects.filter((d) => d.severity === 'major').length, minor: defects.filter((d) => d.severity === 'minor').length }));
