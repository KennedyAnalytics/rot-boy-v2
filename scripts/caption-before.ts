/**
 * Measures the retired sliding-window caption (Motion v1 and earlier) with the
 * same per-frame checks as audit-captions.ts, for before/after evidence.
 *
 *   npx tsx scripts/caption-before.ts <props.json> <out.json>
 */
import fs from 'node:fs';

type W = { text: string; start: number; end: number };
const props = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const words: W[] = props.words;

// Verbatim logic of the previous CaptionPill.
const oldPhrase = (time: number) => {
  let index = words.findIndex((word) => time >= word.start && time < word.end + 0.04);
  if (index < 0) {
    const next = words.findIndex((word) => word.start > time);
    index = next < 0 ? words.length - 1 : Math.max(0, next - 1);
  }
  let start = index;
  let width = words[index]?.text.length ?? 0;
  while (start > 0 && index - start < 4 && width < 28 && !/[.!?]$/.test(words[start - 1].text)) {
    start -= 1;
    width += words[start].text.length + 1;
  }
  const phrase = [words[start]];
  let end = start;
  while (end + 1 < words.length && phrase.length < 5 && width < 34 && !/[.!?]$/.test(words[end].text)) {
    end += 1;
    width += words[end].text.length + 1;
    phrase.push(words[end]);
  }
  return phrase;
};

let spoken = 0;
let missing = 0;
let changes = 0;
let last = '';
const examples: string[] = [];
for (let frame = 0; frame < Math.ceil(props.plan.durationSec * 30); frame += 1) {
  const t = frame / 30;
  const phrase = oldPhrase(t);
  const key = phrase.map((w) => w.start).join(',');
  if (key !== last) changes += 1;
  last = key;
  const speaking = words.find((w) => t >= w.start && t < w.end);
  if (!speaking) continue;
  spoken += 1;
  if (!phrase.includes(speaking)) {
    missing += 1;
    if (examples.length < 12) examples.push(`${t.toFixed(2)}s '${speaking.text}' spoken, caption shows '${phrase.map((w) => w.text).join(' ')}'`);
  }
}
const report = { words: words.length, spokenFrames: spoken, spokenWordMissingFrames: missing, missingShare: Number((missing / spoken).toFixed(4)), captionStateChanges: changes, examples };
fs.writeFileSync(process.argv[3], JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
