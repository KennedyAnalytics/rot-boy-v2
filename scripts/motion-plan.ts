/**
 * Prints the derived motion plan for a directed film.
 *
 *   npx tsx scripts/motion-plan.ts out/motion-v1/mara/props.json
 */
import fs from 'node:fs';
import { buildChoreography } from '../src/film/choreography';

const props = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const c = buildChoreography(props.plan.direction, props.words, props.plan.chapters, { safeProfile: props.plan.safeProfile, durationSec: props.plan.durationSec });
const f = (n: number) => n.toFixed(2).padStart(7);
console.log('EVENTS');
for (const e of c.events) console.log(`${f(e.at)} launch ${f(e.launch)} land ${f(e.land)}  ${e.mode.padEnd(12)} ${e.shape.padEnd(10)} ${e.outcome.padEnd(8)} ${String(e.from ?? '-').padStart(8)} -> ${e.objectId.padEnd(12)} '${e.state}'${e.born ? ' BORN' : ''}${e.passThrough ? ' CROSS' : ''}${e.contributors.length > 1 ? ` [${e.contributors}]` : ''}${e.fallback ? `  (${e.fallback})` : ''}`);
console.log('EPOCHS');
for (const ep of c.epochs) console.log(`${f(ep.start)} ${ep.shot.composition.padEnd(10)} ${ep.shot.presenter.padEnd(6)} lanes=${ep.lanes ? 1 : 0} ${[...ep.slots].map(([id, s]) => `${id}@${Math.round(s.x)},${Math.round(s.y)}x${s.s.toFixed(2)}${s.tier[0]}`).join('  ')}${ep.ghostSlots.size ? `  ghosts: ${[...ep.ghostSlots].map(([id, s]) => `${id}@${Math.round(s.x)},${Math.round(s.y)}`).join(' ')}` : ''}`);
console.log('REGION', c.region);
