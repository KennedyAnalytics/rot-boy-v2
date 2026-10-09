/**
 * Sound design follows the motion plan. Every cue is caused by a performed
 * event, so sound marks state change, impact and transition rather than
 * decorating time. Pure, so it can be audited like the picture.
 */
import type { Choreography } from './choreography';

export type SoundKind = 'whoosh' | 'land' | 'chime' | 'knock' | 'type' | 'retrieve' | 'branch';
export type SoundCue = { at: number; kind: SoundKind; gain: number; cause: string };

/**
 * Relative loudness of each meaning in the mix; narration is the reference.
 * Cues land on spoken phrases, so they sit well under the voice: the first
 * delivered mix at twice these levels put effects above word onsets
 * (out/live-v1/c3/mix-evidence.json).
 */
const GAIN: Record<SoundKind, number> = { whoosh: 0.16, land: 0.13, chime: 0.15, knock: 0.21, type: 0.16, retrieve: 0.13, branch: 0.15 };
/** Minimum spacing per kind and overall, so dense passages do not chatter. */
const SPACING = { sameKind: 0.55, any: 0.2 };

/** A cue landing inside a spoken word plays this much quieter (about -5 dB), so it never masks the word. */
const UNDER_WORD = 0.56;

export const soundCues = (c: Choreography, words: { start: number; end: number }[] = []): SoundCue[] => {
  const raw: SoundCue[] = [];
  const inWord = (at: number) => words.some((w) => at >= w.start - 0.05 && at < w.end);
  const push = (at: number, kind: SoundKind, cause: string, scale = 1) => raw.push({ at, kind, gain: GAIN[kind] * scale * (inWord(at) ? UNDER_WORD : 1), cause });
  for (const e of c.events) {
    const target = c.byId.get(e.objectId)!;
    const cause = `${e.objectId}:${e.state}`;
    if (e.mode === 'hypothetical' && !e.from) {
      push(e.at, 'branch', cause);
      continue;
    }
    if (e.from) push(e.launch, 'whoosh', cause, e.mode === 'actual' ? 1 : 0.7);
    const landKind: SoundKind = e.outcome === 'refused' ? 'knock' : e.outcome === 'complete' ? 'chime' : target.kind === 'sheet' ? 'type' : 'land';
    push(e.land, landKind, cause, e.mode === 'recap' ? 0.6 : 1);
  }
  // Familiar objects returning in a recap.
  c.epochs.forEach((ep, i) => {
    if (ep.shot.composition !== 'recap') return;
    const prev = c.epochs[i - 1];
    const returning = ep.shot.recapRefs.filter((id) => !prev?.slots.has(id) && c.byId.get(id)!.at < ep.start - 1);
    if (returning.length) push(ep.start + ep.entryDelay, 'retrieve', `recap:${returning.join(',')}`);
  });
  raw.sort((a, b) => a.at - b.at || b.gain - a.gain);
  const kept: SoundCue[] = [];
  for (const cue of raw) {
    const last = kept.at(-1);
    const sameKind = [...kept].reverse().find((k) => k.kind === cue.kind);
    if (last && cue.at - last.at < SPACING.any) continue;
    if (sameKind && cue.at - sameKind.at < SPACING.sameKind) continue;
    kept.push(cue);
  }
  return kept;
};

/** Music bed level: ducked under speech, with gentle fades at the ends. */
export const musicGain = (t: number, words: { start: number; end: number }[], duration: number, base: number) => {
  const speaking = (x: number) => words.some((w) => x >= w.start - 0.12 && x < w.end + 0.25);
  // Smooth the duck by averaging the speech state over a short window.
  let s = 0;
  const n = 8;
  for (let i = 0; i < n; i += 1) s += speaking(t - 0.3 + (0.6 * i) / (n - 1)) ? 1 : 0;
  const duck = 1 - 0.5 * (s / n);
  const fadeIn = Math.min(1, t / 1.5);
  const fadeOut = Math.min(1, Math.max(0, (duration - t) / 3));
  return base * duck * fadeIn * fadeOut;
};
