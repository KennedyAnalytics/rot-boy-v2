/**
 * Targeted FilmDirection repair. Applies a recorded patch to a film's
 * direction, validates the result with the same contract as the director
 * (directionFrom), and writes new props beside a copy of the patch. Narration,
 * words, beats and stages are untouched.
 *
 *   npx tsx scripts/repair-direction.ts <props.json> <patch.json> <out dir>
 *
 * Patch: { provenance, objects?: { upsert?: Object[] }, events?: { remove?: Match[],
 *   patch?: { match: Match, set: Partial<Event> }[], add?: Event[] },
 *   shots?: { remove?: { sentence: number; phrase?: string }[], add?: Shot[] } }
 * A Match is { objectId, sentence, state }; every match must hit exactly one event.
 */
import fs from 'node:fs';
import path from 'node:path';
import { directionFrom, type DirectionEvent, type DirectionObject, type DirectionShot, type FilmDirection } from '../src/film/direction';
import { splitSentences } from '../src/timing';

type Match = { objectId: string; sentence: number; state: string };
type Patch = {
  provenance: Record<string, unknown>;
  objects?: { upsert?: DirectionObject[] };
  events?: { remove?: Match[]; patch?: { match: Match; set: Partial<DirectionEvent> }[]; add?: DirectionEvent[] };
  shots?: { remove?: { sentence: number; phrase?: string }[]; add?: DirectionShot[] };
};

const [propsPath, patchPath, outDir] = process.argv.slice(2);
const props = JSON.parse(fs.readFileSync(propsPath, 'utf8'));
const patch: Patch = JSON.parse(fs.readFileSync(patchPath, 'utf8'));
const before: FilmDirection = props.plan.direction;
const d: FilmDirection = JSON.parse(JSON.stringify(before));

const find = (m: Match) => {
  const hits = d.events.filter((e) => e.objectId === m.objectId && e.cue.sentence === m.sentence && e.state === m.state);
  if (hits.length !== 1) throw new Error(`event match ${JSON.stringify(m)} hit ${hits.length}`);
  return hits[0];
};

for (const o of patch.objects?.upsert ?? []) {
  const i = d.objects.findIndex((x) => x.id === o.id);
  if (i >= 0) d.objects[i] = o;
  else d.objects.push(o);
}
for (const m of patch.events?.remove ?? []) d.events.splice(d.events.indexOf(find(m)), 1);
for (const { match, set } of patch.events?.patch ?? []) Object.assign(find(match), set);
d.events.push(...(patch.events?.add ?? []));
for (const r of patch.shots?.remove ?? []) {
  const hits = d.shots.filter((s) => s.cue.sentence === r.sentence && (!r.phrase || s.cue.phrase === r.phrase));
  if (hits.length !== 1) throw new Error(`shot match ${JSON.stringify(r)} hit ${hits.length}`);
  d.shots.splice(d.shots.indexOf(hits[0]), 1);
}
d.shots.push(...(patch.shots?.add ?? []));
d.shots.sort((a, b) => a.cue.sentence - b.cue.sentence);
d.events.sort((a, b) => a.cue.sentence - b.cue.sentence);
// An object no event, shot or introduction refers to is dropped, never left dangling.
const used = new Set([...d.events.flatMap((e) => [e.objectId, e.from]), ...d.shots.flatMap((s) => s.objectIds)]);
d.objects = d.objects.filter((o) => used.has(o.id));

const script = fs.readFileSync(path.join(path.dirname(propsPath), 'input-script.txt'), 'utf8').trim();
const repaired = directionFrom(d, props.plan, splitSentences(script));
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(patchPath, path.join(outDir, 'direction-repair.json'));
fs.copyFileSync(path.join(path.dirname(propsPath), 'input-script.txt'), path.join(outDir, 'input-script.txt'));
fs.writeFileSync(path.join(outDir, 'film-direction.json'), JSON.stringify(repaired, null, 2));
fs.writeFileSync(path.join(outDir, 'props.json'), JSON.stringify({ ...props, plan: { ...props.plan, direction: repaired } }, null, 2));
console.log(`direction repaired: objects ${before.objects.length}→${repaired.objects.length}, events ${before.events.length}→${repaired.events.length}, shots ${before.shots.length}→${repaired.shots.length}`);
