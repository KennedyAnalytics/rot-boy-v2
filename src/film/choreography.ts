/**
 * Motion choreography for the directed stage.
 *
 * FilmDirection decides WHAT persists, transforms, carries and resets. This
 * module decides HOW those decisions physically perform. It derives a typed,
 * timed motion plan from the direction and the recorded word alignment, lays
 * objects out from shot intent (never model coordinates), and answers one
 * question per frame: `sceneAt(choreography, time)`.
 *
 * It is pure so the renderer draws exactly what Tier 2 audits frame by frame.
 *
 * State truth: nothing here can show a state before its aligned cue. A causal
 * action launches at or after its cue and the consequence lands on arrival.
 */
import { spring } from 'remotion';
import { cueTime, type DirectionEvent, type DirectionObject, type DirectionShot, type FilmDirection } from './direction';
import { holdAt } from './hold';
import { layoutFor, presenterBounds, GRID } from './layers';
import type { Presenter, TimedChapter } from './structure-types';
import type { Word } from '../types';

export type Kind = DirectionObject['kind'];

/** How an event physically performs. Derived from typed event structure. */
export type MotionShape = 'traverse' | 'return' | 'transform' | 'block' | 'accumulate';
/** What the landed state means for the object. */
export type Outcome = 'progress' | 'complete' | 'refused';
export type Tier = 'primary' | 'secondary' | 'ghost';

/** `detail: false` drops the explanatory line where it cannot fit the band. */
export type Slot = { x: number; y: number; s: number; tier: Tier; width: number; detail?: boolean };

export type ChoreoObject = DirectionObject & { at: number; home: number };
export type ChoreoShot = DirectionShot & { index: number; start: number; end: number };
export type ChoreoEvent = DirectionEvent & {
  index: number;
  at: number;
  shape: MotionShape;
  outcome: Outcome;
  /** When the action leaves its source. Never before `at`. */
  launch: number;
  /** When the consequence reaches its object. The state changes here. */
  land: number;
  contributors: string[];
  /** The event's own object is born travelling out of the source. */
  born: boolean;
  /** The target is a boundary the action crosses rather than stops at. */
  passThrough: boolean;
  /** Recorded when a declared source could not physically act. */
  fallback: string | null;
  /** Arc bow per source, chosen once from settled slots so the path clears labels. */
  bows: Record<string, number>;
};
export type Window = { start: number; end: number };
export type Epoch = {
  start: number;
  end: number;
  shot: ChoreoShot;
  window: Window | null;
  lanes: boolean;
  slots: Map<string, Slot>;
  ghostSlots: Map<string, Slot>;
  order: string[];
  /** Boundary staging: departures clear first, carried objects rearrange, arrivals land last. */
  moveDelay: number;
  entryDelay: number;
};
export type Region = { x0: number; x1: number; y0: number; y1: number };

export type Choreography = {
  objects: ChoreoObject[];
  byId: Map<string, ChoreoObject>;
  events: ChoreoEvent[];
  shots: ChoreoShot[];
  hypothetical: Window[];
  recap: Window[];
  epochs: Epoch[];
  region: Region;
  chapters: number;
  durationSec: number;
  /** Object whose actual state is the case chip: authored, else the first message. */
  caseObjectId: string | null;
};

/* ------------------------------------------------------------- semantics */

// Outcome polarity reads the typed state text. Negation is preserved by the
// direction contract, so refusal is explicit in the words the film shows.
const REFUSED = /\b(not|no|never|cannot|can't|won't|denied|blocked|held|refused|rejected)\b/i;
const COMPLETE = /\b(closed|answered|sent|confirmed|resolved|done|complete|completed|approved)\b/i;
export const outcomeOf = (state: string): Outcome => (REFUSED.test(state) ? 'refused' : COMPLETE.test(state) ? 'complete' : 'progress');

/* ------------------------------------------------------------ typography */

export const TYPE = {
  primary: { label: 54, state: 42, detail: 34 },
  secondary: { label: 42, state: 35, detail: 0 },
  ghost: { label: 40, state: 40, detail: 34 },
} as const;
export const PLATE = 92;

/** Approximate wrapped line count for Archivo at a weight. Only spacing depends on it. */
export const lineCount = (text: string, size: number, width: number, weight = 800) => {
  if (!text) return 0;
  const em = weight >= 800 ? 0.57 : weight >= 700 ? 0.55 : 0.51;
  const space = size * 0.28;
  let lines = 1;
  let used = 0;
  for (const word of text.split(/\s+/)) {
    const w = word.length * size * em;
    if (used && used + space + w > width) {
      lines += 1;
      used = w;
    } else used += (used ? space : 0) + w;
  }
  return lines;
};

const blockBelow = (o: DirectionObject, tier: Tier, s: number, width: number) => {
  const t = TYPE[tier];
  const label = Math.min(2, lineCount(o.label, t.label, width)) * t.label * 1.08;
  const state = 2 * t.state * 1.12;
  const detail = t.detail ? 10 + 2 * t.detail * 1.2 : 0;
  return PLATE * s + 16 + label + 8 + state + detail;
};

/* ---------------------------------------------------------------- layout */

type KeepOut = { x: number; y: number } | null;

const keepOutFor = (presenter: Presenter, safeProfile: 'reels' | 'tiktok'): KeepOut => {
  const scale = layoutFor({ hasChip: true, hasStamp: false, hasPill: false, cardRows: 0, presenter, safeProfile, directed: true }).presenterScale;
  if (!scale) return null;
  const b = presenterBounds(scale, safeProfile);
  return { x: b.right + 22, y: b.top + 24 };
};

/** One row of objects inside a vertical band, clear of the presenter. */
const row = (ids: string[], objects: Map<string, DirectionObject>, tierOf: (id: string) => Tier, band: [number, number], region: Region, keep: KeepOut, sMax: number, xs?: [number, number], anchor = 0.5) => {
  const out = new Map<string, Slot>();
  if (!ids.length) return out;
  const [ya, yb] = band;
  const scaleOf = (id: string, base: number) => (tierOf(id) === 'primary' && ids.length > 1 ? base * 1.14 : base);
  const fit = (xa: number, xb: number) => {
    const cell = (xb - xa) / ids.length;
    let s = Math.min(sMax, (cell - 30) / (PLATE * 2 * (ids.length > 1 ? 1.14 : 1)));
    const height = (k: number) => Math.max(...ids.map((id) => PLATE * scaleOf(id, k) + blockBelow(objects.get(id)!, tierOf(id), scaleOf(id, k), cell - 16)));
    while (s > 0.55 && height(s) > yb - ya) s -= 0.04;
    return { xa, xb, cell, s, h: height(s) };
  };
  // Prefer lifting the row clear of the presenter over squeezing it sideways,
  // so objects keep their size and column when the presenter comes and goes.
  let f = fit(xs ? xs[0] : region.x0, xs ? xs[1] : region.x1);
  let top = ya + (yb - ya - f.h) * anchor;
  if (keep && !xs && top + f.h > keep.y) {
    const lifted = Math.max(ya, keep.y - f.h - 10);
    if (lifted + f.h <= keep.y) top = lifted;
    else {
      f = fit(Math.max(region.x0, keep.x), region.x1);
      top = ya + (yb - ya - f.h) / 2;
    }
  }
  const { xa, cell, s } = f;
  ids.forEach((id, i) => {
    const k = scaleOf(id, s);
    out.set(id, { x: xa + cell * (i + 0.5), y: top + PLATE * Math.max(...ids.map((x) => scaleOf(x, s))), s: k, tier: tierOf(id), width: Math.min(tierOf(id) === 'primary' ? 600 : 340, cell - 16) });
  });
  return out;
};

/** Rows of at most three, balanced: 4 → 2+2, 5 → 3+2, 6 → 3+3. */
const rowsOf = (ids: string[]) => {
  if (ids.length <= 3) return [ids];
  const first = Math.ceil(ids.length / 2);
  return [ids.slice(0, first), ids.slice(first)];
};

const grid = (ids: string[], objects: Map<string, DirectionObject>, tierOf: (id: string) => Tier, region: Region, keep: KeepOut, sMax: number, snake = false) => {
  const rows = rowsOf(ids);
  const out = new Map<string, Slot>();
  const h = (region.y1 - region.y0) / rows.length;
  rows.forEach((r, i) => {
    const ordered = snake && i % 2 ? [...r].reverse() : r;
    // A reversed short row keeps its columns aligned with the row above.
    const cols = Math.max(...rows.map((x) => x.length));
    let xs: [number, number] | undefined;
    if (rows.length > 1 && r.length < cols) {
      const blocked = keep && region.y0 + h * (i + 1) > keep.y;
      const xa = blocked ? Math.max(region.x0, keep!.x) : region.x0;
      const cell = (region.x1 - xa) / cols;
      xs = snake && i % 2 ? [region.x1 - cell * r.length, region.x1] : [xa, xa + cell * r.length];
    }
    // A single row keeps one eye line across shots, with or without the presenter.
    row(ordered, objects, tierOf, [region.y0 + h * i, region.y0 + h * (i + 1)], region, keep, sMax, xs, rows.length === 1 ? 0.3 : 0.5).forEach((v, k) => out.set(k, v));
  });
  return out;
};

const single = (id: string, objects: Map<string, DirectionObject>, band: [number, number], region: Region, keep: KeepOut, sMax: number) => {
  const o = objects.get(id)!;
  // A table needs its width: a sheet takes the column, other objects a label measure.
  const measure = (xa: number) => (o.kind === 'sheet' ? region.x1 - xa - 30 : Math.min(600, region.x1 - xa - 30));
  let s = sMax;
  let xa = region.x0;
  const fits = () => PLATE * s + blockBelow(o, 'primary', s, measure(xa)) <= band[1] - band[0];
  while (s > 0.8 && !fits()) s -= 0.05;
  const h = PLATE * s + blockBelow(o, 'primary', s, measure(xa));
  const top = band[0] + (band[1] - band[0] - h) / 2;
  // A presenter beside the object: the gesture points into the open column.
  if (keep && top + h > keep.y) xa = Math.max(region.x0, keep.x);
  return { id, slot: { x: (xa + region.x1) / 2, y: top + PLATE * s, s, tier: 'primary' as Tier, width: measure(xa) } };
};

/* -------------------------------------------------------------- building */

const spineDot = (index: number, count: number) => {
  const inner = 1080 - GRID.gutter * 2 - 28;
  return { x: GRID.gutter + 14 + (inner / count) * index + 17, y: GRID.spineTop + GRID.spineHeight / 2 };
};

export const buildChoreography = (
  direction: FilmDirection,
  words: Word[],
  chapters: TimedChapter[],
  opts: { safeProfile?: 'reels' | 'tiktok'; durationSec: number },
): Choreography => {
  const safe = opts.safeProfile ?? 'reels';
  const at = (cue: DirectionEvent['cue']) => cueTime(cue, words, chapters) ?? Infinity;
  const objects: ChoreoObject[] = direction.objects.map((o) => ({ ...o, at: at(o.introduced), home: Math.max(0, chapters.findIndex((c) => c.sentenceIndexes.includes(o.introduced.sentence))) }));
  const byId = new Map(objects.map((o) => [o.id, o]));
  const shots: ChoreoShot[] = direction.shots
    .map((s, index) => ({ ...s, index, start: at(s.cue), end: Infinity }))
    .filter((s) => Number.isFinite(s.start))
    .sort((a, b) => a.start - b.start);
  shots.forEach((s, i) => (s.end = shots[i + 1]?.start ?? Infinity));

  const beats = chapters.flatMap((c) => c.beats).sort((a, b) => a.start - b.start);
  const windowsOf = (mode: string) => beats.flatMap((b, i) => (b.mode === mode ? [{ start: b.start, end: beats[i + 1]?.start ?? opts.durationSec }] : []));
  const hypothetical = windowsOf('hypothetical');
  const recap = windowsOf('recap');

  const region: Region = (() => {
    const l = layoutFor({ hasChip: true, hasStamp: false, hasPill: false, cardRows: 0, presenter: 'away', safeProfile: safe, directed: true });
    return { x0: GRID.gutter, x1: 1080 - 120, y0: l.stageTop + 84, y1: l.stageTop + l.stageHeight - 14 };
  })();

  const raw = direction.events.map((e, index) => ({ ...e, index, at: at(e.cue) })).filter((e) => Number.isFinite(e.at)).sort((a, b) => a.at - b.at || a.index - b.index);

  /* Flow order: sources sit before the objects they act on. */
  const flowOrder = (ids: string[], until: number) => {
    const edges: [string, string][] = [];
    const reach = (a: string, b: string): boolean => a === b || edges.some(([x, y]) => x === a && reach(y, b));
    for (const e of raw) if (e.at < until && e.from && e.mode === 'actual' && ids.includes(e.from) && ids.includes(e.objectId) && !reach(e.objectId, e.from)) edges.push([e.from, e.objectId]);
    const left = [...ids].sort((a, b) => byId.get(a)!.at - byId.get(b)!.at);
    const out: string[] = [];
    while (left.length) {
      const next = left.find((id) => !edges.some(([x, y]) => y === id && left.includes(x))) ?? left[0];
      out.push(next);
      left.splice(left.indexOf(next), 1);
    }
    return out;
  };

  /* Epochs: a layout holds from a shot start or a branch opening/closing.
     A branch opens when its first conditional is spoken (or a comparison shot
     inside it starts) and a close that a new shot follows within moments is
     absorbed by that shot, so the stage never reframes twice in a breath. */
  const branchOpen = (w: Window) => {
    const first = raw.find((e) => e.mode === 'hypothetical' && e.at >= w.start && e.at < w.end)?.at ?? Infinity;
    const shot = shots.find((s) => s.composition === 'comparison' && s.start >= w.start && s.start < w.end)?.start ?? Infinity;
    return Math.min(first, shot);
  };
  const branchMarks = hypothetical.flatMap((w) => {
    const open = branchOpen(w);
    if (!Number.isFinite(open)) return [];
    const absorbed = shots.some((s) => s.start >= w.end && s.start < w.end + 1.2);
    return absorbed ? [open] : [open, w.end];
  });
  const marks = [...new Set([...shots.map((s) => s.start), ...branchMarks])].filter((t) => t >= (shots[0]?.start ?? 0)).sort((a, b) => a - b);
  const objectMap = new Map(direction.objects.map((o) => [o.id, o as DirectionObject]));
  const epochs: Epoch[] = marks.map((start, i) => {
    const shot = holdAt(shots, start)!;
    const window = hypothetical.find((w) => start >= branchOpen(w) && start < w.end) ?? null;
    const lanes = Boolean(window && raw.some((e) => e.mode === 'hypothetical' && e.at >= window.start && e.at < window.end));
    const keep = keepOutFor(shot.presenter, safe);
    const ids = shot.objectIds.filter((id) => byId.has(id));
    const slots = new Map<string, Slot>();
    const ghostSlots = new Map<string, Slot>();
    let order = flowOrder(ids, shot.end);
    if (lanes) {
      const h = region.y1 - region.y0;
      const blockedRegion = keep ? { ...region, x0: Math.max(region.x0, keep.x) } : region;
      row(order, objectMap, () => 'secondary', [region.y0, region.y0 + h * 0.43], blockedRegion, null, 1.0).forEach((v, k) => slots.set(k, v));
      const branch = raw.filter((e) => e.mode === 'hypothetical' && window && e.at >= window.start && e.at < window.end && slots.has(e.objectId));
      // The IF copy and its wrapped text must end inside the stage band, above
      // the caption: first drop the explanatory line, then shrink the copy.
      const top = region.y0 + h * 0.56;
      const ghostType = TYPE.ghost;
      for (const id of new Set(branch.map((e) => e.objectId))) {
        const a = slots.get(id)!;
        const cell = (blockedRegion.x1 - blockedRegion.x0) / order.length;
        const width = Math.min(340, cell - 12);
        const text = width - 20;
        const mine = branch.filter((e) => e.objectId === id);
        const longest = (pick: (e: (typeof mine)[number]) => string) => mine.map(pick).reduce((a, b) => (b.length > a.length ? b : a), '');
        const need = (s: number, withDetail: boolean) =>
          2 * PLATE * s + 14 +
          lineCount(objectMap.get(id)!.label, ghostType.label, text) * ghostType.label * 1.06 +
          lineCount(`IF: ${longest((e) => e.state)}`, ghostType.state, text) * ghostType.state * 1.12 +
          (withDetail ? 10 + lineCount(longest((e) => e.detail), ghostType.detail, text, 500) * ghostType.detail * 1.18 : 0) + 12;
        let s = Math.min(1.3, (cell - 30) / (PLATE * 2));
        const detail = need(s, true) <= region.y1 - top;
        while (!detail && s > 0.7 && need(s, false) > region.y1 - top) s -= 0.05;
        ghostSlots.set(id, { x: a.x, y: top + PLATE * s, s, tier: 'ghost', width, detail });
      }
    } else if (shot.composition === 'recap') {
      const recapAt = (id: string) => raw.find((e) => e.mode === 'recap' && e.objectId === id && e.at >= shot.start && e.at < shot.end)?.at ?? Infinity;
      order = [...ids].sort((a, b) => recapAt(a) - recapAt(b) || byId.get(a)!.at - byId.get(b)!.at);
      grid(order, objectMap, () => 'secondary', region, keep, 1.25, true).forEach((v, k) => slots.set(k, v));
    } else if (shot.composition === 'detail' || ids.length === 1 || byId.get(shot.focus)?.kind === 'sheet') {
      // A focused table reads only at width, so it gets the detail construction.
      const rest = order.filter((id) => id !== shot.focus);
      const bottom = rest.length ? Math.max(...rest.map((id) => PLATE * 0.95 + blockBelow(objectMap.get(id)!, 'secondary', 0.95, 300))) + 8 : 0;
      const band: [number, number] = [region.y0, region.y1 - bottom - (rest.length ? 26 : 0)];
      const p = single(shot.focus, objectMap, band, region, keep, 2.1);
      slots.set(p.id, p.slot);
      row(rest, objectMap, () => 'secondary', [region.y1 - bottom, region.y1], region, keep, 0.95).forEach((v, k) => slots.set(k, v));
    } else {
      grid(order, objectMap, (id) => (id === shot.focus && ids.length <= 2 ? 'primary' : 'secondary'), region, keep, ids.length <= 2 ? 1.5 : 1.15).forEach((v, k) => slots.set(k, v));
    }
    return { start, end: marks[i + 1] ?? Infinity, shot, window, lanes, slots, ghostSlots, order, moveDelay: 0, entryDelay: 0 };
  });
  epochs.forEach((ep, i) => {
    const prev = epochs[i - 1];
    if (!prev) return;
    const was = [...prev.slots.keys()].filter((id) => byId.get(id)!.at < ep.start);
    const exits = was.some((id) => !ep.slots.has(id));
    const moves = was.some((id) => {
      const a = prev.slots.get(id)!;
      const b = ep.slots.get(id);
      return b && Math.hypot(a.x - b.x, a.y - b.y) > 60;
    });
    // An arrival waits until any carried object travelling through its slot has cleared it.
    const arrivals = [...ep.slots.entries()].filter(([id]) => !was.includes(id));
    const crossing = arrivals.some(([, s]) => was.some((id) => {
      const a = prev.slots.get(id)!;
      return ep.slots.has(id) && Math.hypot(a.x - s.x, a.y - s.y) < PLATE * (a.s + s.s) + 40;
    }));
    ep.moveDelay = exits ? 0.12 : 0;
    ep.entryDelay = crossing ? 0.62 : exits || moves ? 0.3 : 0;
  });

  const epochAt = (t: number) => holdAt(epochs, t);
  const slotAt = (id: string, t: number) => epochAt(t)?.slots.get(id) ?? epochAt(t)?.ghostSlots.get(id);

  /* Causal ancestry decides whether an action returns to where it started. */
  const ancestors = (id: string, before: number) => {
    const seen = new Set<string>();
    const walk = (x: string) => {
      for (const e of raw) if (e.mode === 'actual' && e.at < before && e.objectId === x && e.from && !seen.has(e.from)) {
        seen.add(e.from);
        walk(e.from);
      }
    };
    walk(id);
    return seen;
  };

  /* When a moving object is still settling, the action waits for it. */
  const settled = (id: string, t: number) => {
    const o = byId.get(id);
    let ready = o ? o.at + 0.5 : t;
    for (const ep of epochs) if (ep.start <= t + 0.001 && ep.start > t - 0.7 && (ep.slots.has(id) || ep.ghostSlots.has(id))) ready = Math.max(ready, ep.start + 0.45);
    return ready;
  };

  const events: ChoreoEvent[] = [];
  for (const e of raw) {
    // An authored outcome wins. Text polarity is only the fallback, because a
    // rhetorical negation ("not a chatbot") is not a refusal of the object.
    const outcome = e.outcome ?? outcomeOf(e.state);
    const target = byId.get(e.objectId)!;
    const inShot = (id: string, when: number) => {
      const x = epochAt(when);
      return Boolean(x && (x.slots.has(id) || x.ghostSlots.has(id)));
    };
    let fallback: string | null = null;
    // An object acting on itself is a change in place, not a journey.
    let from = e.from === e.objectId ? null : e.from;
    // A source introduced moments after the cue acts as soon as it arrives.
    const arrives = from ? Math.max(e.at, byId.get(from)!.at) : e.at;
    if (from && (arrives > e.at + 2 || !inShot(from, arrives) || !inShot(e.objectId, arrives))) {
      fallback = `source ${from} is not on stage with ${e.objectId} within 2s of the cue; performed in place`;
      from = null;
    }
    const ep = epochAt(from ? arrives : e.at);
    const born = Boolean(from && Math.abs(target.at - e.at) < 0.08);
    let shape: MotionShape;
    let contributors: string[] = [];
    if (e.mode === 'recap') shape = from ? 'traverse' : 'transform';
    else if (!from) shape = outcome === 'refused' ? 'block' : 'transform';
    else if (outcome === 'refused') shape = 'block';
    else if (e.action === 'return' || ancestors(from, e.at).has(e.objectId)) shape = 'return';
    else {
      const ledger = (id: string) => raw.some((x) => x.objectId === id && x.mode === 'actual' && x.at <= e.at);
      contributors = [from, ...(ep?.order ?? []).filter((id) => id !== from && id !== e.objectId && ledger(id) && byId.get(id)!.at <= e.at)];
      shape = target.kind === 'document' && contributors.length >= 2 ? 'accumulate' : 'traverse';
      if (shape !== 'accumulate') contributors = [];
    }
    if (shape === 'traverse' || shape === 'return' || shape === 'block') contributors = [from!].filter(Boolean);
    // Mid-flight objects and same-cue changes on the source finish first.
    let launch = e.at;
    if (from) {
      // A born object is not settled anywhere yet; only its source must be.
      launch = born ? Math.max(e.at, settled(from, arrives)) : Math.max(e.at, settled(from, arrives), settled(e.objectId, arrives));
      // A branch copy splits out before anything acts on it.
      if (e.mode === 'hypothetical') launch = Math.max(launch, e.at + 0.5);
      const sourceChange = raw.find((x) => x.objectId === from && x.mode === e.mode && Math.abs(x.at - e.at) < 0.05 && x !== e);
      if (sourceChange) launch = Math.max(launch, e.at + 0.4);
      launch = Math.min(launch, e.at + 2);
    }
    const a = from ? slotAt(from, launch) : undefined;
    const b = slotAt(e.objectId, launch) ?? ep?.ghostSlots.get(e.objectId);
    const dist = a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    const flight = from ? Math.min(1.05, Math.max(0.6, 0.45 + dist / 1500)) + (shape === 'accumulate' ? 0.12 * (contributors.length - 1) : 0) : 0;
    const next = raw.find((x) => x.objectId === e.objectId && x.at > e.at + 0.01);
    // An in-place change on a cue that also reframes waits for the object to settle.
    if (!from && e.mode !== 'hypothetical') launch = Math.max(e.at, Math.min(e.at + 0.6, settled(e.objectId, e.at)));
    let land = launch + flight;
    if (next) land = Math.min(land, Math.max(e.at + 0.05, next.at - 0.08));
    if (land < launch) launch = Math.max(e.at, land - 0.3);
    // Choose each path once, against the settled composition at launch.
    const bows: Record<string, number> = {};
    const settledEp = epochAt(launch);
    if (from && settledEp) {
      const rects: Rect[] = [];
      for (const [id, s] of [...settledEp.slots, ...settledEp.ghostSlots]) if (byId.get(id)!.at <= launch + 0.01) rects.push(labelRect(objectMap.get(id)!, s));
      for (const src of shape === 'accumulate' ? contributors : [from]) {
        const p = settledEp.slots.get(src);
        const q = e.mode === 'hypothetical' ? settledEp.ghostSlots.get(e.objectId) ?? settledEp.slots.get(e.objectId) : settledEp.slots.get(e.objectId);
        if (p && q) bows[src] = chooseBow(p, q, shape, rects, region);
      }
    }
    events.push({ ...e, from, shape, outcome, launch, land, contributors, born, passThrough: target.kind === 'boundary' && shape === 'traverse', fallback, bows });
  }

  const caseObjectId = direction.caseObjectId && byId.has(direction.caseObjectId) ? direction.caseObjectId : (objects.find((o) => o.kind === 'message') ?? objects[0])?.id ?? null;
  return { objects, byId, events, shots, hypothetical, recap, epochs, region, chapters: chapters.length, durationSec: opts.durationSec, caseObjectId };
};

/* ------------------------------------------------------------- per frame */

export type GlyphState = {
  awake: number;
  unread: number;
  open: number;
  seal: number;
  bar: number;
  door: number;
  lines: number;
  question: number;
};

export type StateLabel = { text: string; prev: string | null; since: number; outcome: Outcome; tag: 'RECAP' | 'IF' | null; detail: string };

export type ObjectView = {
  id: string;
  kind: Kind;
  label: string;
  x: number;
  y: number;
  s: number;
  opacity: number;
  tier: Tier;
  width: number;
  active: number;
  ring: number;
  squash: number;
  shake: number;
  labelOpacity: number;
  state: StateLabel | null;
  /** The object's introduced description, shown before it has any state. */
  intro: string;
  showDetail: boolean;
  glyph: GlyphState;
  attachments: { kind: Kind; t: number }[];
  ghost: boolean;
  /** Sheet objects: their landed events as table rows, oldest first. */
  rows: SheetRow[];
};
/** `current`: typed in this chapter. Rows carried from an earlier chapter are history. */
export type SheetRow = { text: string; outcome: Outcome; since: number; key: string; current: boolean };

export type TokenView = { key: string; kind: Kind; x: number; y: number; s: number; opacity: number; dashed: boolean; path: string; trail: number; replay: boolean };
export type ConnectorView = { key: string; path: string; opacity: number; draw: number; dashed: boolean; hot: boolean };

export type Scene = {
  objects: ObjectView[];
  ghosts: ObjectView[];
  tokens: TokenView[];
  connectors: ConnectorView[];
  lanes: { y: number; opacity: number } | null;
  status: string | null;
  inBranch: boolean;
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
const easeInOut = (v: number) => {
  const t = clamp(v);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const springAt = (dt: number, seconds: number, damping = 15) =>
  dt <= 0 ? 0 : spring({ frame: dt * 30, fps: 30, config: { damping, stiffness: 120, mass: 1 }, durationInFrames: Math.max(6, Math.round(seconds * 30)) });

type P = { x: number; y: number; s: number };
const lerp = (a: P, b: P, k: number): P => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, s: a.s + (b.s - a.s) * k });
/** Point on a quadratic arc that bows away from the straight line. */
const arc = (a: { x: number; y: number }, b: { x: number; y: number }, k: number, bow: number) => {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * bow;
  const cy = my + (dx / len) * bow;
  const u = 1 - k;
  return { x: u * u * a.x + 2 * u * k * cx + k * k * b.x, y: u * u * a.y + 2 * u * k * cy + k * k * b.y, c: { x: cx, y: cy } };
};
const arcPath = (a: { x: number; y: number }, b: { x: number; y: number }, bow: number) => {
  const c = arc(a, b, 0.5, bow).c;
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
};
/** Outbound actions bow one way, returns the other, so a round trip reads as a loop. */
const bowFor = (a: { x: number; y: number }, b: { x: number; y: number }, shape: MotionShape) => {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const side = b.x >= a.x ? -1 : 1;
  return (shape === 'return' ? -side : side) * Math.min(150, len * 0.22);
};

type Rect = { x0: number; x1: number; y0: number; y1: number };
const labelRect = (o: DirectionObject, s: Slot): Rect => {
  const below = blockBelow(o, s.tier, s.s, s.width) - PLATE * s.s;
  return { x0: s.x - s.width / 2, x1: s.x + s.width / 2, y0: s.y + PLATE * s.s + 10, y1: s.y + PLATE * s.s + below };
};

/**
 * The flatter the better, but an action is never hidden behind text: try the
 * shape's preferred side first, then wider arcs, then the other side.
 */
const chooseBow = (a: Slot, b: Slot, shape: MotionShape, rects: Rect[], region: Region) => {
  const preferred = bowFor(a, b, shape);
  const sign = Math.sign(preferred) || 1;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const mags = [Math.abs(preferred), len * 0.5, len * 0.8, len * 1.15, 620, 820];
  const candidates = [...mags.map((m) => m * sign), ...mags.map((m) => -m * sign)];
  let best = preferred;
  let bestScore = Infinity;
  for (const bow of candidates) {
    let hits = 0;
    for (let i = 2; i <= 18; i += 1) {
      const p = arc(a, b, i / 20, bow);
      // Leaving the source plate or entering the target plate is not a collision.
      if (Math.hypot(p.x - a.x, p.y - a.y) < PLATE * a.s + 8 || Math.hypot(p.x - b.x, p.y - b.y) < PLATE * b.s + 8) continue;
      if (p.x < 24 || p.x > 1056 || p.y < region.y0 - 40) hits += 3;
      for (const r of rects) if (p.x > r.x0 && p.x < r.x1 && p.y > r.y0 && p.y < r.y1) hits += 1;
    }
    const score = hits * 1000 + Math.abs(bow);
    if (score < bestScore) {
      bestScore = score;
      best = bow;
    }
  }
  return best;
};

/** Where an object is at `t`, including entry/exit choreography. */
const placeAt = (c: Choreography, id: string, t: number): (P & { presence: number; moving: number; labelK: number }) | null => {
  const o = c.byId.get(id)!;
  let pos: P | null = null;
  let presence = 0;
  let moving = 0;
  // Labels ride only on settled objects; a flying object carries no text.
  let labelK = 1;
  let visibleSince = Infinity;
  for (let i = 0; i < c.epochs.length; i += 1) {
    const ep = c.epochs[i];
    if (ep.start > t) break;
    // Evaluate each epoch at its own end so the next move starts where this one left off.
    const tt = Math.min(t, ep.end);
    const slot = ep.slots.get(id);
    const from = Math.max(ep.start, o.at);
    if (slot && from <= tt && from < ep.end) {
      const local = tt - from;
      if (pos && presence > 0.01) {
        const startPos = pos;
        const d = Math.hypot(slot.x - startPos.x, slot.y - startPos.y) + Math.abs(slot.s - startPos.s) * 200;
        const dur = Math.min(1.0, 0.5 + d / 1800);
        const k = springAt(local - ep.moveDelay, dur, 16);
        pos = lerp(startPos, slot, k);
        presence = Math.max(presence, clamp(local / 0.3));
        moving = d > 40 ? clamp(1 - Math.abs(k - 0.5) * 2) * clamp(d / 260) : 0;
        // On a large reframe the text steps aside while the objects travel
        // (the glyph carries identity) and returns as each one settles.
        labelK = d > 150 ? clamp(Math.max(1 - (local - ep.moveDelay) / 0.12, (k - 0.82) / 0.18)) : Math.max(labelK, clamp(local / 0.3));
      } else {
        // Entry. Born from its source, retrieved from the spine, or revealed in place.
        const born = c.events.find((e) => e.born && e.objectId === id && Math.abs(e.at - from) < 0.1);
        const retrieved = ep.shot.composition === 'recap' && ep.shot.recapRefs.includes(id) && o.at < ep.start - 1;
        if (born && born.from) {
          // Leaves the source where the source actually is now.
          const src = placeAt(c, born.from, tt) ?? slot;
          const k = easeInOut((tt - born.launch) / Math.max(0.3, born.land - born.launch));
          const p = arc(src, slot, k, born.bows[born.from] ?? bowFor(src, slot, 'traverse'));
          pos = { x: p.x, y: p.y, s: 0.3 * slot.s + (slot.s - 0.3 * slot.s) * k };
          presence = clamp(k * 3);
          moving = k < 1 ? 1 : 0;
          labelK = clamp((k - 0.8) / 0.2);
        } else if (retrieved) {
          // Familiar parts come back down out of the chapter where they were learned.
          const rank = ep.shot.recapRefs.filter((x) => c.byId.get(x)!.at < ep.start - 1 && !c.epochs[i - 1]?.slots.has(x)).indexOf(id);
          const dot = spineDot(o.home, c.chapters);
          const k = easeInOut((local - ep.entryDelay - Math.max(0, rank) * 0.16) / 0.75);
          const p = arc({ ...dot }, slot, k, 60);
          pos = { x: p.x, y: p.y, s: 0.12 + (slot.s - 0.12) * k };
          presence = clamp(k * 4);
          moving = k < 1 ? 1 : 0;
          labelK = clamp((k - 0.8) / 0.2);
        } else {
          // Something that has just come through a boundary emerges out of it.
          const through = c.events.find((e) => e.passThrough && e.mode === 'actual' && e.land <= from + 0.1 && e.land >= from - 1.5 && ep.slots.has(e.objectId) && e.objectId !== id);
          const door = through ? ep.slots.get(through.objectId)! : null;
          if (door) {
            const k = easeInOut((tt - Math.max(from, through!.land)) / 0.7);
            const p = arc(door, slot, k, bowFor(door, slot, 'traverse') * 0.4);
            pos = { x: p.x, y: p.y, s: 0.25 * slot.s + 0.75 * slot.s * k };
            presence = clamp(k * 4);
            moving = k < 1 ? 1 : 0;
            labelK = clamp((k - 0.8) / 0.2);
          } else {
            const delay = o.at < ep.start + 0.05 ? ep.entryDelay : 0;
            const k = springAt(local - delay, 0.6, 13);
            pos = { x: slot.x, y: slot.y + (1 - k) * 26, s: slot.s * (0.72 + 0.28 * k) };
            presence = clamp((local - delay) / 0.35);
            labelK = presence;
          }
        }
        visibleSince = from;
      }
      continue;
    }
    if (!slot && pos && presence > 0.01) {
      // Exit. Retrieved recap objects return to the spine; others settle away.
      const local = tt - ep.start;
      const prevShot = c.epochs[i - 1]?.shot;
      const toSpine = ep.shot.composition === 'recap' && prevShot?.composition === 'recap' && prevShot.recapRefs.includes(id);
      if (toSpine) {
        const k = easeInOut(local / 0.7);
        const dot = spineDot(o.home, c.chapters);
        const p = arc(pos, dot, k, -60);
        pos = { x: p.x, y: p.y, s: pos.s + (0.12 - pos.s) * k };
        presence = 1 - clamp((k - 0.75) / 0.25);
        labelK = 1 - clamp(local / 0.15);
      } else {
        const k = smooth(local / 0.4);
        pos = { x: pos.x, y: pos.y + k * 18, s: pos.s * (1 - 0.15 * k) };
        presence = 1 - k;
        labelK = 1 - clamp(local / 0.2);
      }
      if (presence <= 0.01) {
        pos = null;
        presence = 0;
      }
    }
  }
  if (!pos || presence <= 0.01 || visibleSince > t) return null;
  return { ...pos, presence, moving, labelK };
};

export const sceneAt = (c: Choreography, t: number, chapters: TimedChapter[]): Scene => {
  const ep = holdAt(c.epochs, t);
  if (!ep) return { objects: [], ghosts: [], tokens: [], connectors: [], lanes: null, status: null, inBranch: false };
  const shot = ep.shot;
  const chapter = holdAt(chapters, t);
  const beat = chapter ? holdAt(chapter.beats, t) : undefined;
  const window = c.hypothetical.find((w) => t >= w.start && t < w.end) ?? null;
  const recapWindow = c.recap.find((w) => t >= w.start && t < w.end) ?? null;
  const landed = c.events.filter((e) => e.land <= t);
  const actual = (id: string) => landed.filter((e) => e.objectId === id && e.mode === 'actual');
  const places = new Map<string, NonNullable<ReturnType<typeof placeAt>>>();
  for (const o of c.objects) {
    const p = placeAt(c, o.id, t);
    if (p) places.set(o.id, p);
  }

  /* Activation: the action in flight, else the latest landed change, else focus. */
  const shotEvents = c.events.filter((e) => e.at >= shot.start - 0.01 && e.at <= t && places.has(e.objectId) && (e.mode !== 'hypothetical' || (window && e.at >= window.start)));
  const flying = shotEvents.filter((e) => e.launch <= t && t < e.land + 0.35).at(-1);
  const latest = shotEvents.at(-1);
  const activeId = flying?.objectId ?? latest?.objectId ?? shot.focus;
  const activeSince = flying ? flying.launch : latest ? latest.at : shot.start;

  const statusOf = (id: string, ghost = false): StateLabel | null => {
    if (ghost) {
      const branch = window ? landed.filter((e) => e.objectId === id && e.mode === 'hypothetical' && e.at >= window.start).at(-1) : undefined;
      return branch ? { text: branch.state, prev: null, since: branch.land, outcome: branch.outcome, tag: 'IF', detail: branch.detail } : null;
    }
    const history = actual(id);
    const cur = history.at(-1);
    const recall = recapWindow && beat?.mode === 'recap' ? landed.filter((e) => e.objectId === id && e.mode === 'recap' && e.at >= recapWindow.start).at(-1) : undefined;
    if (recall) return { text: recall.state, prev: cur?.state ?? null, since: recall.land, outcome: recall.outcome, tag: 'RECAP', detail: recall.detail };
    if (!cur) return null;
    return { text: cur.state, prev: history.at(-2)?.state ?? null, since: cur.land, outcome: cur.outcome, tag: null, detail: cur.detail };
  };

  const glyphOf = (id: string, ghost: boolean): GlyphState => {
    const o = c.byId.get(id)!;
    const hist = ghost ? [] : actual(id);
    const first = hist[0];
    const incoming = hist.find((e) => e.from && e.shape !== 'block');
    const cur = hist.at(-1);
    const on = (since: number | undefined, dur = 0.45) => (since === undefined ? 0 : smooth((t - since) / dur));
    const refusedSticky = o.kind === 'boundary' ? hist.find((e) => e.outcome === 'refused') : cur?.outcome === 'refused' ? cur : undefined;
    const ghostCur = ghost ? statusOf(id, true) : null;
    let door = 0;
    for (const e of c.events) if (e.passThrough && e.objectId === id && t >= e.launch && t < e.land + 0.9) {
      const k = (t - e.launch) / Math.max(0.3, e.land - e.launch);
      door = Math.max(door, k < 0.55 ? smooth(k / 0.55) : 1 - smooth((t - e.land - 0.15) / 0.6));
    }
    return {
      awake: o.kind === 'agent' ? (ghost ? 1 : on(first?.land, 0.4)) : 0,
      unread: o.kind === 'message' && first && !first.from && (!incoming || incoming.land > t) ? on(first.land, 0.3) : 0,
      open: o.kind === 'message' && incoming && cur?.outcome !== 'complete' ? on(incoming.land, 0.5) : 0,
      seal: ghost ? 0 : cur?.outcome === 'complete' ? on(cur.land, 0.4) : 0,
      bar: ghost ? (ghostCur?.outcome === 'refused' ? smooth((t - ghostCur.since) / 0.35) : 0) : refusedSticky ? on(refusedSticky.land, 0.35) : 0,
      door,
      lines: o.kind === 'document' || o.kind === 'sheet' ? smooth((t - o.at) / 0.9) : 0,
      question: 0,
    };
  };

  const impactOf = (id: string, ghost: boolean) => {
    const hits = c.events.filter((e) => e.objectId === id && e.land <= t && t - e.land < 0.8 && !e.passThrough && (ghost ? e.mode === 'hypothetical' : e.mode !== 'hypothetical'));
    const hit = hits.at(-1);
    if (!hit) return { squash: 0, shake: 0 };
    const dt = t - hit.land;
    const squash = Math.exp(-6 * dt) * Math.cos(14 * dt) * (hit.shape === 'transform' ? 0.07 : 0.11);
    const shake = hit.outcome === 'refused' ? Math.exp(-6 * dt) * Math.sin(38 * dt) * 16 : 0;
    return { squash, shake };
  };

  // A sheet's table is its own history: each landed change is a row.
  const rowsOf = (id: string, ghost: boolean): SheetRow[] => {
    if (c.byId.get(id)!.kind !== 'sheet') return [];
    const source = ghost
      ? window ? landed.filter((e) => e.objectId === id && e.mode === 'hypothetical' && e.at >= window.start) : []
      : landed.filter((e) => e.objectId === id && e.mode === 'actual');
    return source.map((e) => ({ text: e.state, outcome: e.outcome, since: e.land, key: `${e.index}`, current: !chapter || e.at >= chapter.start }));
  };

  const attachmentsOf = (id: string, ghost: boolean) =>
    ghost
      ? []
      : landed
          .filter((e) => e.objectId === id && e.mode === 'actual' && (e.shape === 'accumulate' || (e.shape === 'traverse' && e.from && c.byId.get(e.from)!.kind === 'document')))
          .flatMap((e) => (e.shape === 'accumulate' ? e.contributors : [e.from!]).map((src) => ({ kind: c.byId.get(src)!.kind, t: e.land })));

  const views: ObjectView[] = [];
  for (const id of ep.order.filter((x) => places.has(x)).concat([...places.keys()].filter((x) => !ep.order.includes(x)))) {
    const o = c.byId.get(id)!;
    const p = places.get(id)!;
    const slot = ep.slots.get(id);
    const tier = slot?.tier ?? 'secondary';
    const isActive = id === activeId;
    const activeK = isActive ? smooth((t - activeSince) / 0.3) : 0;
    const im = impactOf(id, false);
    const recapDim = shot.composition === 'recap' && recapWindow && !landed.some((e) => e.objectId === id && e.mode === 'recap' && e.at >= shot.start) && c.events.some((e) => e.objectId === id && e.mode === 'recap' && e.at >= shot.start && e.at < shot.end);
    views.push({
      id,
      kind: o.kind,
      label: o.label,
      x: p.x,
      y: p.y,
      s: p.s,
      opacity: p.presence * (recapDim ? 0.7 : 1),
      tier,
      width: slot?.width ?? 300,
      active: activeK,
      ring: isActive ? smooth((t - activeSince) / 0.4) : 0,
      squash: im.squash,
      shake: im.shake,
      labelOpacity: p.labelK * (1 - (tier === 'primary' ? 0.6 : 0.85) * p.moving),
      // Recap disclosure: a part waiting for its recap line shows its name only.
      // A supporting object shows its state only while it is active or changed
      // in this chapter; an older state carried along would read as current.
      state: recapDim ? null : (() => {
        const s = statusOf(id);
        if (!s || tier !== 'secondary' || isActive || s.tag) return s;
        return chapter && s.since >= chapter.start - 0.01 ? s : null;
      })(),
      intro: o.detail,
      showDetail: tier === 'primary',
      glyph: glyphOf(id, false),
      attachments: attachmentsOf(id, false),
      ghost: false,
      rows: rowsOf(id, false),
    });
  }

  /* Hypothetical branch: the object splits into a dashed IF copy and merges back. */
  const ghosts: ObjectView[] = [];
  const branchWindow = window ?? c.hypothetical.find((w) => t >= w.end && t < w.end + 0.6) ?? null;
  if (branchWindow) {
    const merging = !window;
    const branchEp = holdAt(c.epochs, Math.min(t, branchWindow.end - 0.001));
    for (const e of c.events.filter((x) => x.mode === 'hypothetical' && x.at >= branchWindow.start && x.at < branchWindow.end && x.at <= t)) {
      if (ghosts.some((g) => g.id === e.objectId)) continue;
      const gs = branchEp?.ghostSlots.get(e.objectId);
      const home = places.get(e.objectId);
      if (!gs || !home) continue;
      const split = springAt(t - e.at, 0.6, 14);
      const merge = merging ? easeInOut((t - branchWindow.end) / 0.55) : 0;
      const k = split * (1 - merge);
      const o = c.byId.get(e.objectId)!;
      const im = impactOf(e.objectId, true);
      ghosts.push({
        id: e.objectId,
        kind: o.kind,
        label: o.label,
        x: home.x + (gs.x - home.x) * k,
        y: home.y + (gs.y - home.y) * k,
        s: home.s + (gs.s - home.s) * k,
        opacity: clamp(k * 1.6) * (merging ? 1 - merge : 1),
        tier: 'ghost',
        width: gs.width,
        active: 1,
        ring: 0,
        squash: im.squash,
        shake: im.shake,
        labelOpacity: clamp((k - 0.6) / 0.4),
        state: statusOf(e.objectId, true),
        intro: '',
        showDetail: gs.detail !== false,
        glyph: glyphOf(e.objectId, true),
        attachments: [],
        ghost: true,
        rows: rowsOf(e.objectId, true),
      });
    }
  }

  /* Actions in flight. */
  const posOf = (id: string, ghost = false) => {
    const g = ghost ? ghosts.find((v) => v.id === id) : undefined;
    if (g) return g;
    return views.find((v) => v.id === id);
  };
  const tokens: TokenView[] = [];
  const connectors: ConnectorView[] = [];
  for (const e of c.events) {
    if (!e.from || e.born || t < e.launch) continue;
    // A held hypothetical action stays parked until its branch merges back.
    const branchOf = e.mode === 'hypothetical' ? c.hypothetical.find((w) => e.at >= w.start && e.at < w.end) : undefined;
    const parkedUntil = branchOf && e.shape === 'block' ? branchOf.end + 0.45 : e.land + 0.35;
    if (t > parkedUntil) continue;
    const branchFade = branchOf && t > branchOf.end ? 1 - smooth((t - branchOf.end) / 0.4) : 1;
    const toGhost = e.mode === 'hypothetical';
    const target = posOf(e.objectId, toGhost);
    if (!target) continue;
    const sources = e.shape === 'accumulate' ? e.contributors : [e.from];
    sources.forEach((src, i) => {
      const a = posOf(src);
      if (!a) return;
      const delay = i * 0.12;
      const span = Math.max(0.3, e.land - e.launch - delay * (sources.length > 1 ? 1 : 0));
      const k = (t - e.launch - delay) / span;
      if (k < 0) return;
      const b = { x: target.x, y: target.y };
      const R = PLATE * target.s;
      const bow = e.bows[src] ?? bowFor(a, b, e.shape);
      let end = b;
      if (e.shape === 'block') {
        // A refused action stops short of the boundary along its own path.
        const c2 = arc(a, b, 0.5, bow).c;
        const d = Math.hypot(b.x - c2.x, b.y - c2.y) || 1;
        end = { x: b.x - ((b.x - c2.x) / d) * (R + 30), y: b.y - ((b.y - c2.y) / d) * (R + 30) };
      }
      const eased = easeInOut(k);
      const p = arc(a, end, eased, bow);
      const after = t - e.land;
      const parked = e.shape === 'block' && k >= 1;
      // Crossing a boundary: the action shrinks into the open doorway.
      const enter = e.passThrough ? clamp((eased - 0.72) / 0.28) : 0;
      const fade = e.passThrough ? 1 - clamp((eased - 0.9) / 0.1) : parked ? (e.mode === 'hypothetical' ? 1 : 1 - clamp(after / 0.45)) : 1 - clamp((k - 0.92) / 0.08);
      const shake = parked ? Math.exp(-7 * after) * Math.sin(40 * after) * 12 : 0;
      tokens.push({
        key: `${e.index}-${src}`,
        kind: c.byId.get(src)!.kind,
        x: p.x + shake,
        y: p.y,
        s: (0.42 * (1 - 0.15 * Math.sin(eased * Math.PI)) + 0.08 * Math.sin(eased * Math.PI)) * (1 - 0.75 * enter),
        opacity: clamp(k * 6) * fade * branchFade,
        dashed: e.mode !== 'actual',
        path: arcPath(a, end, bow),
        trail: clamp(eased),
        replay: e.mode === 'recap',
      });
    });
  }

  /* Relationships: actual edges between visible objects; a recap with a
     sequence of parts draws that chain instead. */
  const chainEvents = shot.composition === 'recap' ? c.events.filter((e) => e.mode === 'recap' && e.at >= shot.start && e.at < shot.end) : [];
  if (new Set(chainEvents.map((e) => e.objectId)).size >= 2) {
    const chain = chainEvents.filter((e) => e.at <= t && views.some((v) => v.id === e.objectId));
    chain.forEach((e, i) => {
      if (!i) return;
      const a = views.find((v) => v.id === chain[i - 1].objectId);
      const b = views.find((v) => v.id === e.objectId);
      if (!a || !b || a.id === b.id) return;
      connectors.push({ key: `chain-${i}`, path: `M${a.x} ${a.y} L${b.x} ${b.y}`, opacity: Math.min(a.opacity, b.opacity), draw: easeInOut((t - e.at) / 0.55), dashed: false, hot: t - e.at < 1.2 });
    });
  } else {
    const pairs = new Map<string, ChoreoEvent>();
    for (const e of landed) if (e.from && e.mode === 'actual' && !e.passThrough) for (const src of e.shape === 'accumulate' ? e.contributors : [e.from]) pairs.set([src, e.objectId].sort().join('|'), { ...e, from: src });
    [...pairs.values()].slice(-4).forEach((e) => {
      const a = views.find((v) => v.id === e.from);
      const b = views.find((v) => v.id === e.objectId);
      if (!a || !b) return;
      // Same side and depth as the path the action took, scaled to the current distance.
      // A recap model is a settled system: straight relationships, no crossing loops.
      const original = e.bows[e.from!];
      const bow = shot.composition === 'recap' ? 0 : original === undefined ? bowFor(a, b, e.shape) : Math.sign(original) * Math.min(Math.abs(original), Math.hypot(b.x - a.x, b.y - a.y) * 0.6);
      connectors.push({ key: `edge-${a.id}-${b.id}`, path: arcPath(a, b, bow), opacity: Math.min(a.opacity, b.opacity) * 0.9, draw: 1, dashed: false, hot: t - e.land < 0.6 });
    });
  }
  for (const g of ghosts) {
    const home = views.find((v) => v.id === g.id);
    if (home) connectors.push({ key: `tether-${g.id}`, path: `M${home.x} ${home.y} L${g.x} ${g.y}`, opacity: g.opacity * 0.8, draw: 1, dashed: true, hot: false });
  }

  // The case chip reports the case's live status only in chapters that follow
  // the case. Elsewhere a carried-over state would read as a present fact
  // ("Appointment booked" while the film is still finding customers).
  const chapterIndex = chapter ? chapters.indexOf(chapter) : -1;
  const chapterEnd = chapters[chapterIndex + 1]?.start ?? Infinity;
  const followingCase = Boolean(chapter && c.caseObjectId && c.events.some((e) => e.objectId === c.caseObjectId && e.mode === 'actual' && e.at >= chapter.start && e.at < chapterEnd));
  const status = followingCase ? actual(c.caseObjectId!).at(-1)?.state ?? null : null;
  const laneY = ep.lanes || (ghosts.length && branchWindow) ? c.region.y0 + (c.region.y1 - c.region.y0) * 0.485 : null;
  const opened = c.epochs.find((x) => x.lanes && x.window === ep.window)?.start ?? ep.start;
  const laneOpacity = window && ep.lanes ? smooth((t - opened) / 0.4) : branchWindow ? 1 - smooth((t - branchWindow.end) / 0.5) : 0;
  return {
    objects: views,
    ghosts,
    tokens,
    connectors,
    lanes: laneY !== null && laneOpacity > 0 ? { y: laneY, opacity: laneOpacity } : null,
    status,
    inBranch: Boolean(window),
  };
};

/* -------------------------------------------------------------- presenter */

export type PresenterLayerView = { pose: 'lead' | 'beside'; scale: number; dx: number; dy: number; opacity: number };

/**
 * The presenter follows shot intent with physical blocking: yields the frame
 * by stepping out before a full-stage mechanism, steps back in after, and
 * changes pose with a short dip rather than a cut.
 */
export const presenterAt = (c: Choreography, t: number, safeProfile: 'reels' | 'tiktok' = 'reels'): PresenterLayerView[] => {
  const scaleOf = (p: Presenter) => layoutFor({ hasChip: true, hasStamp: false, hasPill: false, cardRows: 0, presenter: p, safeProfile, directed: true }).presenterScale;
  const shots = c.shots;
  if (!shots.length) return [];
  // Exits lead the mechanism slightly so the stage is clear when it moves.
  const startOf = (s: ChoreoShot, prev: ChoreoShot | undefined) => (s.presenter === 'away' && prev && prev.presenter !== 'away' ? s.start - 0.2 : s.start);
  let i = 0;
  for (let k = 0; k < shots.length; k += 1) if (startOf(shots[k], shots[k - 1]) <= t) i = k;
  const cur = shots[i];
  const prev = shots[i - 1];
  const local = t - startOf(cur, prev);
  // `address` and `lead` share the presenting pose; `beside` holds the tablet.
  const poseOf = (p: Presenter): 'lead' | 'beside' => (p === 'beside' ? 'beside' : 'lead');
  // Stepping out/in moves toward the left frame edge, away from the stage.
  const view = (p: Presenter, k: number): PresenterLayerView | null =>
    p === 'away' ? null : { pose: poseOf(p), scale: scaleOf(p), dx: -(1 - k) * 280, dy: 0, opacity: k };
  if (!prev || prev.presenter === cur.presenter || i === 0) {
    const v = view(cur.presenter, 1);
    return v ? [v] : [];
  }
  if (cur.presenter === 'away') {
    const k = 1 - easeInOut(local / 0.45);
    const v = view(prev.presenter, k);
    return v && k > 0.01 ? [v] : [];
  }
  if (prev.presenter === 'away') {
    const k = easeInOut(local / 0.55);
    const v = view(cur.presenter, k);
    return v ? [v] : [];
  }
  const sa = scaleOf(prev.presenter);
  const sb = scaleOf(cur.presenter);
  // Same pose, different presence (address ↔ lead): one continuous scale move.
  if (poseOf(prev.presenter) === poseOf(cur.presenter)) {
    return [{ pose: poseOf(cur.presenter), scale: sa + (sb - sa) * easeInOut(local / 0.6), dx: 0, dy: 0, opacity: 1 }];
  }
  // Pose change: the old pose sinks out, the new one rises in, scale eases between.
  const out = 1 - smooth(local / 0.25);
  const inn = smooth((local - 0.18) / 0.32);
  const sk = easeInOut(local / 0.5);
  const scale = sa + (sb - sa) * sk;
  const layers: PresenterLayerView[] = [];
  if (out > 0.01) layers.push({ pose: poseOf(prev.presenter), scale, dx: 0, dy: (1 - out) * 26, opacity: out });
  if (inn > 0.01) layers.push({ pose: poseOf(cur.presenter), scale, dx: 0, dy: (1 - inn) * 26, opacity: inn });
  return layers;
};
