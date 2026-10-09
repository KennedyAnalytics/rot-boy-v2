/**
 * Tier 2. Deterministic motion/choreography truth for a directed film.
 * Samples the exact per-frame scene the renderer draws. Not a vision critic.
 *
 *   npx tsx scripts/audit-motion.ts out/motion-v1/mara/props.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildChoreography, presenterAt, sceneAt, type ChoreoEvent } from '../src/film/choreography';
import { holdAt } from '../src/film/hold';
import { presenterBounds, SAFE_PROFILES } from '../src/film/layers';

const propsPath = path.resolve(process.argv[2]);
const props = JSON.parse(fs.readFileSync(propsPath, 'utf8'));
const plan = props.plan;
if (!plan.direction) {
  console.log('No FilmDirection: motion audit not applicable');
  process.exit(0);
}
const profile = (plan.safeProfile ?? 'reels') as keyof typeof SAFE_PROFILES;
const safe = SAFE_PROFILES[profile];
const c = buildChoreography(plan.direction, props.words, plan.chapters, { safeProfile: profile, durationSec: plan.durationSec });
// --self-test: land one causal action 0.6 s before its cue; the audit must fail.
const selfTest = process.argv.includes('--self-test');
if (selfTest) {
  // A target already on stage before the cue, so an early landing would be displayed.
  const victim = c.events.find((e) => e.from && e.mode === 'actual' && holdAt(c.epochs, e.at - 0.6)?.slots.has(e.objectId) && c.byId.get(e.objectId)!.at < e.at - 2)!;
  victim.launch = victim.at - 1.2;
  victim.land = victim.at - 0.6;
  console.log(`self-test: ${victim.objectId} '${victim.state}' forced to land at ${victim.land.toFixed(3)} (cue ${victim.at.toFixed(3)})`);
}
const failures: string[] = [];
const fail = (m: string) => {
  if (failures.length < 200) failures.push(m);
};
const f3 = (n: number) => Number(n.toFixed(3));

/* 1. Event timing: actions never precede their cue; consequences never overrun the next change. */
const events = c.events;
for (const e of events) {
  if (e.launch < e.at - 1e-6) fail(`${e.objectId} '${e.state}' launches ${f3(e.launch)} before cue ${f3(e.at)}`);
  if (e.land < e.launch - 1e-6) fail(`${e.objectId} '${e.state}' lands before it launches`);
  const next = events.find((x) => x.objectId === e.objectId && x.at > e.at + 0.01);
  if (next && e.land >= next.at) fail(`${e.objectId} '${e.state}' lands ${f3(e.land)} after next cue ${f3(next.at)}`);
}

/* 2. Shape prerequisites. */
const ancestors = (id: string, before: number) => {
  const seen = new Set<string>();
  const walk = (x: string) => {
    for (const e of events) if (e.mode === 'actual' && e.at < before && e.objectId === x && e.from && !seen.has(e.from)) {
      seen.add(e.from);
      walk(e.from);
    }
  };
  walk(id);
  return seen;
};
const shapes: Record<string, number> = {};
for (const e of events) {
  shapes[e.shape] = (shapes[e.shape] ?? 0) + 1;
  if (e.shape === 'return' && e.action !== 'return' && !ancestors(e.from!, e.at).has(e.objectId)) fail(`return ${e.from}->${e.objectId} has no causal origin`);
  if (e.shape === 'accumulate') {
    if (e.contributors.length < 2) fail(`accumulate into ${e.objectId} has <2 contributors`);
    for (const k of e.contributors) if (!events.some((x) => x.objectId === k && x.mode === 'actual' && x.land <= e.launch + 1e-6)) fail(`accumulate contributor ${k} has no actual state at launch`);
  }
  if (e.shape === 'block' && e.outcome !== 'refused') fail(`block on ${e.objectId} without refusal`);
}

/* 3–7. Frame by frame. */
const frames = Math.ceil(plan.durationSec * 30);
const prev = new Map<string, { x: number; y: number }>();
const maxStep: Record<string, { px: number; time: number }> = {};
let stateChecks = 0;
let presenterSamples = 0;
const presenterExtremes = { minTop: Infinity, maxBottom: -Infinity, maxRight: -Infinity, minLeft: Infinity };
const ledgerAt = (id: string, t: number) => events.filter((e) => e.objectId === id && e.mode === 'actual' && e.at <= t).at(-1);
const firstEpoch = c.epochs[0]?.start ?? 0;
for (let frame = 0; frame < frames; frame += 1) {
  const t = frame / 30;
  const scene = sceneAt(c, t, plan.chapters);
  const chapter = holdAt(plan.chapters, t) as any;
  const beat = chapter ? holdAt(chapter.beats, t) as any : undefined;
  const window = c.hypothetical.find((w) => t >= w.start && t < w.end);
  for (const v of scene.objects) {
    const o = c.byId.get(v.id)!;
    if (o.at > t + 1e-6) fail(`${t.toFixed(3)} ${v.id} visible before introduction ${f3(o.at)}`);
    if (v.state) {
      stateChecks += 1;
      const owner = events.filter((e) => e.objectId === v.id && e.state === v.state!.text && e.land <= t + 1e-6);
      if (!owner.length) fail(`${t.toFixed(3)} ${v.id} shows '${v.state.text}' with no landed event`);
      if (owner.every((e) => e.at > t)) fail(`${t.toFixed(3)} ${v.id} shows '${v.state.text}' before its cue`);
      if (v.state.tag === null) {
        const shown = owner.filter((e) => e.mode === 'actual');
        if (!shown.length) fail(`${t.toFixed(3)} ${v.id} shows non-actual '${v.state.text}' as actual`);
        const cue = ledgerAt(v.id, t);
        if (!cue) fail(`${t.toFixed(3)} ${v.id} shows state with empty cue ledger`);
        // The display may trail the cue ledger by an in-flight action, never lead it.
        const shownEvent = shown.at(-1);
        if (cue && shownEvent && shownEvent.at > cue.at + 1e-6) fail(`${t.toFixed(3)} ${v.id} display leads the ledger`);
      }
      if (v.state.tag === 'RECAP' && beat?.mode !== 'recap') fail(`${t.toFixed(3)} ${v.id} RECAP state outside a recap beat`);
    }
    // Sheet rows are states too: each must belong to an actual event already cued.
    for (const row of v.rows) {
      stateChecks += 1;
      const ev = events.find((e) => `${e.index}` === row.key);
      if (!ev || ev.objectId !== v.id || ev.mode !== 'actual') fail(`${t.toFixed(3)} ${v.id} row '${row.text}' has no actual event`);
      else if (ev.at > t + 1e-6 || ev.land > t + 1e-6) fail(`${t.toFixed(3)} ${v.id} row '${row.text}' shown before its cue`);
    }
    const p = prev.get(v.id);
    if (p && t > firstEpoch + 0.05) {
      const step = Math.hypot(v.x - p.x, v.y - p.y);
      if (!maxStep[v.id] || step > maxStep[v.id].px) maxStep[v.id] = { px: Number(step.toFixed(1)), time: f3(t) };
      if (step > 160) fail(`${t.toFixed(3)} ${v.id} jumps ${step.toFixed(0)}px in one frame`);
    }
  }
  for (const g of scene.ghosts) {
    const tail = c.hypothetical.find((w) => t >= w.start && t < w.end + 0.6);
    if (!tail) fail(`${t.toFixed(3)} hypothetical copy of ${g.id} outside a branch`);
    if (g.state && g.state.tag !== 'IF') fail(`${t.toFixed(3)} ghost ${g.id} shows an untagged state`);
    if (g.state && !events.some((e) => e.objectId === g.id && e.mode === 'hypothetical' && e.state === g.state!.text && e.at <= t)) fail(`${t.toFixed(3)} ghost ${g.id} IF state before its cue`);
    for (const row of g.rows) {
      const ev = events.find((e) => `${e.index}` === row.key);
      if (!ev || ev.mode !== 'hypothetical' || ev.at > t + 1e-6) fail(`${t.toFixed(3)} ghost ${g.id} IF row '${row.text}' not a cued hypothetical`);
    }
  }
  if (window === undefined && scene.inBranch) fail(`${t.toFixed(3)} branch flag outside hypothetical window`);
  // The case chip never leads the case ledger.
  if (scene.status) {
    const shown = events.filter((e) => e.objectId === c.caseObjectId && e.mode === 'actual' && e.state === scene.status && e.at <= t);
    if (!shown.length) fail(`${t.toFixed(3)} case chip '${scene.status}' before its cue`);
  }
  // Carry: objects present on both sides of a boundary never vanish across it.
  prev.clear();
  for (const v of scene.objects) prev.set(v.id, { x: v.x, y: v.y });
  // Presenter bounds while visible.
  for (const layer of presenterAt(c, t, profile)) {
    if (layer.opacity < 0.02) continue;
    presenterSamples += 1;
    const b = presenterBounds(layer.scale, profile);
    const top = b.top + layer.dy;
    const bottom = b.bottom + layer.dy;
    const right = b.right + layer.dx;
    const left = b.left + layer.dx;
    presenterExtremes.minTop = Math.min(presenterExtremes.minTop, top);
    presenterExtremes.maxBottom = Math.max(presenterExtremes.maxBottom, bottom);
    presenterExtremes.maxRight = Math.max(presenterExtremes.maxRight, right);
    presenterExtremes.minLeft = Math.min(presenterExtremes.minLeft, left);
    if (top < safe.top || bottom > 1920 - safe.bottom + 26 || right > 1080 - safe.right) fail(`${t.toFixed(3)} presenter outside ${profile} safe area`);
  }
}

/* Carry identity across boundaries. */
const carries: { at: number; ids: string[] }[] = [];
for (let i = 1; i < c.epochs.length; i += 1) {
  const a = c.epochs[i - 1];
  const b = c.epochs[i];
  const ids = [...b.slots.keys()].filter((id) => a.slots.has(id) && c.byId.get(id)!.at < b.start);
  carries.push({ at: f3(b.start), ids });
  for (let t = b.start - 0.1; t < b.start + 1.2; t += 1 / 30) {
    const scene = sceneAt(c, t, plan.chapters);
    for (const id of ids) if (!scene.objects.some((v) => v.id === id && v.opacity > 0.5)) fail(`${t.toFixed(3)} carried ${id} lost identity across boundary ${f3(b.start)}`);
  }
}

const report = {
  ok: failures.length === 0,
  frames,
  stateChecks,
  presenterSamples,
  presenterExtremes,
  shapes,
  events: events.map((e: ChoreoEvent) => ({ objectId: e.objectId, from: e.from, mode: e.mode, state: e.state, cue: f3(e.at), launch: f3(e.launch), land: f3(e.land), shape: e.shape, outcome: e.outcome, contributors: e.contributors, born: e.born, crossesBoundary: e.passThrough, fallback: e.fallback })),
  carries,
  maxFrameStep: maxStep,
  failures,
};
if (selfTest) {
  const caught = failures.some((f) => f.includes('before its cue')) && failures.some((f) => f.includes('launches'));
  fs.writeFileSync(path.join(path.dirname(propsPath), 'motion-audit-selftest.json'), JSON.stringify({ caught, failures: failures.slice(0, 20) }, null, 2));
  console.log(caught ? 'self-test passed: premature state detected' : 'self-test FAILED: mutation not detected');
  process.exit(caught ? 0 : 1);
}
fs.writeFileSync(path.join(path.dirname(propsPath), 'motion-audit.json'), JSON.stringify(report, null, 2));
console.log(report.ok ? `motion audit passed (${frames} frames, ${stateChecks} state checks, ${carries.length} boundaries)` : `motion audit FAILED\n${failures.slice(0, 30).join('\n')}`);
if (!report.ok) process.exit(1);
