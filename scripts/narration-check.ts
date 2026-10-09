/**
 * Intelligibility check of a recording against the supplied script.
 * Transcribes the audio with a real speech model and diffs words, mapping each
 * disagreement to the recording's aligned word times. Disagreements are
 * candidates for listening review, not proven defects.
 *
 *   npx tsx scripts/narration-check.ts <audio> <props.json> <out.json> [label]
 */
import fs from 'node:fs';
import path from 'node:path';

const [audioPath, propsPath, outPath, label = 'narration'] = process.argv.slice(2);
const props = JSON.parse(fs.readFileSync(propsPath, 'utf8'));
const words: { text: string; start: number; end: number }[] = props.words;
const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error('OPENAI_API_KEY missing');
const model = process.env.TRANSCRIBE_MODEL || 'gpt-4o-transcribe';

const form = new FormData();
form.append('model', model);
form.append('response_format', 'json');
form.append('file', new Blob([fs.readFileSync(audioPath)]), path.basename(audioPath));
const response = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
const body = (await response.json()) as any;
if (!response.ok) throw new Error(`transcription HTTP ${response.status}: ${body.error?.message}`);
const heard: string = body.text;

// Numbers are spoken as words; compare on a shared normal form.
const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const spell = (n: number): string => (n < 20 ? ones[n] : n < 100 ? `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ''}` : n < 1000 ? `${ones[Math.floor(n / 100)]} hundred${n % 100 ? ` ${spell(n % 100)}` : ''}` : `${spell(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${spell(n % 1000)}` : ''}`);
const norm = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\$?(\d[\d,]*)/g, (_, d) => spell(Number(d.replace(/,/g, ''))))
    .replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
const want = words.flatMap((w, i) => norm(w.text).map((token) => ({ token, i })));
const got = norm(heard);

// Levenshtein alignment over tokens.
const n = want.length;
const m = got.length;
const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
for (let i = 0; i <= n; i += 1) dp[i][0] = i;
for (let j = 0; j <= m; j += 1) dp[0][j] = j;
for (let i = 1; i <= n; i += 1) for (let j = 1; j <= m; j += 1) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (want[i - 1].token === got[j - 1] ? 0 : 1));
const ops: { kind: 'sub' | 'del' | 'ins'; expected?: string; heard?: string; wordIndex: number }[] = [];
let i = n;
let j = m;
while (i > 0 || j > 0) {
  if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (want[i - 1].token === got[j - 1] ? 0 : 1)) {
    if (want[i - 1].token !== got[j - 1]) ops.push({ kind: 'sub', expected: want[i - 1].token, heard: got[j - 1], wordIndex: want[i - 1].i });
    i -= 1;
    j -= 1;
  } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
    ops.push({ kind: 'del', expected: want[i - 1].token, wordIndex: want[i - 1].i });
    i -= 1;
  } else {
    ops.push({ kind: 'ins', heard: got[j - 1], wordIndex: want[Math.max(0, i - 1)]?.i ?? 0 });
    j -= 1;
  }
}
ops.reverse();
const context = (k: number) => words.slice(Math.max(0, k - 4), k + 5).map((w) => w.text).join(' ');
const findings = ops.map((op) => ({ ...op, time: Number(words[op.wordIndex].start.toFixed(2)), context: context(op.wordIndex) }));
const report = { label, audio: audioPath, model, tokens: n, transcribedTokens: m, wordErrorRate: Number((dp[n][m] / n).toFixed(4)), disagreements: findings.length, findings, transcript: heard };
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`${label}: WER ${(100 * report.wordErrorRate).toFixed(2)}% over ${n} tokens, ${findings.length} disagreements`);
for (const f of findings.slice(0, 40)) console.log(`  ${f.time}s ${f.kind} expected=${f.expected ?? '-'} heard=${f.heard ?? '-'} | ${f.context}`);
