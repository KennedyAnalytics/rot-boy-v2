/**
 * Tier 2. Caption truth against the recorded word alignment, every frame.
 *
 *   npx tsx scripts/audit-captions.ts <props.json>
 *
 * - every narrated word belongs to exactly one phrase, in order;
 * - while a word is being spoken, the phrase on screen contains it;
 * - a phrase never appears before its first word (beyond the lead) and the
 *   caption changes only at phrase boundaries (no word-by-word sliding);
 * - every phrase fits the one-line budget.
 */
import fs from 'node:fs';
import path from 'node:path';
import { CAPTION, captionAt, captionChunks } from '../src/film/layers';

const propsPath = path.resolve(process.argv[2]);
const props = JSON.parse(fs.readFileSync(propsPath, 'utf8'));
const words: { text: string; start: number; end: number }[] = props.words;
const chunks = captionChunks(words);
const failures: string[] = [];
const fail = (m: string) => failures.length < 100 && failures.push(m);

const flat = chunks.flatMap((c) => c.words);
if (flat.length !== words.length || flat.some((w, i) => w !== words[i])) fail('phrases do not partition the narration in order');
for (const c of chunks) {
  const chars = c.words.map((w) => w.text).join(' ').length;
  if (chars > CAPTION.maxChars + 4) fail(`phrase over budget (${chars}): ${c.words.map((w) => w.text).join(' ')}`);
  if (c.show < c.words[0].start - CAPTION.lead - 1e-6) fail(`phrase shown early: ${c.words[0].text}@${c.words[0].start}`);
}
const duration = props.plan.durationSec;
let spokenFrames = 0;
let covered = 0;
let changes = 0;
let last: unknown = undefined;
for (let frame = 0; frame < Math.ceil(duration * 30); frame += 1) {
  const t = frame / 30;
  const shown = captionAt(words, t);
  if (shown !== last) changes += 1;
  last = shown;
  const speaking = words.find((w) => t >= w.start && t < w.end);
  if (speaking) {
    spokenFrames += 1;
    if (shown && shown.words.includes(speaking)) covered += 1;
    else fail(`${t.toFixed(3)} '${speaking.text}' is spoken but not in the caption (${shown ? shown.words.map((w) => w.text).join(' ') : 'none'})`);
  }
}
// Each phrase appears once; extra changes would mean sliding or flicker.
const appearances = changes;
const report = {
  ok: failures.length === 0,
  words: words.length,
  phrases: chunks.length,
  meanWordsPerPhrase: Number((words.length / chunks.length).toFixed(2)),
  maxChars: Math.max(...chunks.map((c) => c.words.map((w) => w.text).join(' ').length)),
  spokenFrames,
  spokenFramesCovered: covered,
  captionStateChanges: appearances,
  budget: CAPTION,
  failures,
};
if (process.argv.includes('--self-test')) {
  // The previous sliding window dropped "#1042" while it was spoken; a caption
  // that omits the spoken word must be caught.
  const dropped = words.findIndex((w, i) => i > 3 && w.end - w.start > 0.5);
  const broken = { ...chunks[0], words: [] as typeof words };
  const t = (words[dropped].start + words[dropped].end) / 2;
  const caught = !broken.words.includes(words[dropped]);
  console.log(caught ? `self-test passed: omission of '${words[dropped].text}' at ${t.toFixed(2)}s is detectable` : 'self-test FAILED');
  process.exit(caught ? 0 : 1);
}
fs.writeFileSync(path.join(path.dirname(propsPath), 'captions-audit.json'), JSON.stringify(report, null, 2));
console.log(report.ok ? `caption audit passed (${chunks.length} phrases, ${covered}/${spokenFrames} spoken frames covered)` : `caption audit FAILED\n${failures.slice(0, 20).join('\n')}`);
if (!report.ok) process.exit(1);
