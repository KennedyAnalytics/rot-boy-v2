/**
 * Tier 3. Real vision comparison of motion choreography on ordered
 * before/after frame sequences. Evidence, not an oracle; raw responses kept.
 *
 *   npx tsx scripts/compare-motion.ts out/motion-v1/mara/evidence/motion-sequences --vision-provider=openai
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from '../server/env';
import { completeVision, visionProviderFromArgs } from '../server/vision';

loadEnv();
const folder = process.argv[2];
const out = path.join(folder, 'critic');
const provider = visionProviderFromArgs(process.argv);
fs.mkdirSync(out, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(folder, 'manifest.json'), 'utf8'));

const criteria = [
  ['physicality', 'causal actions read as physical: something visibly travels, crosses, is stopped, collects or returns'],
  ['continuity', 'objects move continuously between states and compositions instead of cutting between snapshots'],
  ['activation', 'at phone scale it is obvious which object the narration is about right now'],
  ['transform', 'a changed state is visibly the same object changing (what changed is legible)'],
  ['carry', 'objects carried across a boundary are recognizably the same thing continuing'],
  ['hierarchy', 'one primary motion at a time; supporting motion and held context stay subordinate'],
  ['premium', 'the motion and composition feel professionally choreographed rather than mechanically assembled'],
  ['snapshot', 'state changes are performed rather than swapped'],
  ['truth', 'no result appears before its cause; hypothetical and recap states are distinguishable from actual'],
  ['readability', 'essential labels remain legible at 330px; motion does not add clutter'],
] as const;
const verdicts = ['improved', 'same', 'regressed', 'insufficient'];
const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['moment', 'criteria', 'remainingDefects', 'distracting', 'notes'],
  properties: {
    moment: { type: 'string' },
    criteria: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['criterion', 'comparison', 'evidence'],
        properties: { criterion: { type: 'string', enum: criteria.map((c) => c[0]) }, comparison: { type: 'string', enum: verdicts }, evidence: { type: 'string' } },
      },
    },
    remainingDefects: { type: 'array', items: { type: 'string' } },
    distracting: { type: 'boolean' },
    notes: { type: 'string' },
  },
};

const judge = async (m: any) => {
  const responseFile = path.join(out, `${m.name}.response.txt`);
  const requestFile = path.join(out, `${m.name}.request.json`);
  if (fs.existsSync(responseFile) && fs.existsSync(requestFile) && JSON.parse(fs.readFileSync(requestFile, 'utf8')).provider === provider) {
    return { ...JSON.parse(fs.readFileSync(responseFile, 'utf8')), provider, model: JSON.parse(fs.readFileSync(requestFile, 'utf8')).model };
  }
  const data = fs.readFileSync(path.join(folder, m.file)).toString('base64');
  const response = await completeVision(
    'You review explainer motion choreography for a vertical phone film. You see ordered frames of ONE moment: the top row is BEFORE (retained baseline), the bottom row is AFTER (new candidate), at identical timestamps, 330px wide. Judge only what these frames show. Ordered frames are evidence of motion sequence, not continuous playback; say so when a judgement needs playback. Compare AFTER relative to BEFORE for each criterion. Do not reward motion for its own sake: motion must reveal state, cause, hierarchy, continuity or attention. The persistent spine, through-line heading and caption engine are fixed by contract. Captions show short aligned phrase chunks by design. Return only the requested JSON.',
    [
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data } },
      { type: 'text', text: `Moment "${m.name}": narration says ${m.what}. Frame times: ${m.times.map((t: number) => t.toFixed(2)).join(', ')}s. Criteria (return every one): ${criteria.map(([k, v]) => `${k} = ${v}`).join('; ')}. List concrete remaining defects in AFTER (clipping, crowding, collisions, confusing motion, state shown too early, anything distracting).` },
    ],
    3000,
    provider,
    schema,
  );
  fs.writeFileSync(responseFile, response.text);
  fs.writeFileSync(requestFile, JSON.stringify({ ...response, text: undefined }, null, 2));
  return { ...JSON.parse(response.text), provider: response.provider, model: response.model };
};

const findings: any[] = [];
try {
  for (let i = 0; i < manifest.moments.length; i += 4) {
    const batch = manifest.moments.slice(i, i + 4);
    console.log(`judge ${batch.map((m: any) => m.name).join(', ')}`);
    const results = await Promise.allSettled(batch.map(judge));
    for (const r of results) if (r.status === 'fulfilled') findings.push(r.value);
    const error = results.find((r) => r.status === 'rejected');
    if (error?.status === 'rejected') throw error.reason;
  }
} catch (error) {
  fs.writeFileSync(path.join(out, 'motion-comparison.json'), JSON.stringify({ status: 'failed', complete: false, error: String(error), findings }, null, 2));
  throw error;
}
const tally: Record<string, Record<string, number>> = {};
for (const f of findings) for (const c of f.criteria) {
  tally[c.criterion] ??= {};
  tally[c.criterion][c.comparison] = (tally[c.criterion][c.comparison] ?? 0) + 1;
}
fs.writeFileSync(path.join(out, 'motion-comparison.json'), JSON.stringify({ status: 'complete', complete: true, provider, candidateSha256: manifest.candidateSha256, baselineSha256: manifest.baselineSha256, moments: findings.length, tally, distracting: findings.filter((f) => f.distracting).map((f) => f.moment), findings }, null, 2));
console.log(JSON.stringify(tally));
