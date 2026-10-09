import type { TimedPlan, VideoPlan, Word } from "./types";

const WORDS_PER_SECOND = 175 / 60;
const SENTENCE_LANDING = 0.42;
const BEAT_GAP = 0.06;
const SCENE_GAP = 0.16;
const HEAD = 0.2;
const TAIL = 0.45;

const tokens = (text: string) =>
  text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

const landing = (word: string) => /[.!?]["']?$/.test(word);

export const scriptOf = (plan: VideoPlan) =>
  plan.scenes
    .flatMap((scene) => scene.beats.map((beat) => beat.narration.trim()))
    .filter(Boolean)
    .join(" ");

const wordDuration = (word: string) => Math.max(0.16, Math.min(0.55, word.replace(/[^A-Za-z0-9]/g, "").length * 0.038 + 0.12));

type Narrated = { scenes: Array<{ beats: { narration: string }[] }> };

export const realizeNarration = <T extends Narrated>(plan: T) => {
  const words: Word[] = [];
  let cursor = HEAD;
  const scenes = plan.scenes.map((scene) => {
    const start = cursor;
    const beats = scene.beats.map((beat) => {
      const beatStart = cursor;
      const pieces = tokens(beat.narration);
      if (pieces.length === 0) {
        cursor += 0.3;
        return { ...beat, start: beatStart, end: cursor };
      }
      pieces.forEach((piece) => {
        const startAt = cursor;
        const spoken = wordDuration(piece);
        const paced = Math.max(spoken, 1 / WORDS_PER_SECOND);
        cursor += paced;
        words.push({ text: piece, start: startAt, end: cursor });
        if (landing(piece)) cursor += SENTENCE_LANDING;
      });
      const end = cursor;
      cursor += BEAT_GAP;
      return { ...beat, start: beatStart, end };
    });
    const end = Math.max(start + 0.4, cursor);
    cursor += SCENE_GAP;
    return { ...scene, beats, start, end };
  });
  cursor += TAIL - SCENE_GAP;
  return {
    words,
    plan: {
      ...plan,
      scenes,
      durationSec: Math.max(1, cursor),
    },
  };
};

export const realize = (plan: VideoPlan) => realizeNarration(plan) as { plan: TimedPlan; words: Word[] };

const normalizeToken = (word: string) => word.toLowerCase().replace(/[^a-z0-9%]/g, "");

export const alignNarration = <T extends Narrated>(plan: T, words: Word[]) => {
  const usable = words.filter((word) => normalizeToken(word.text).length > 0);
  let index = 0;
  const take = (narration: string) => {
    const need = tokens(narration).map(normalizeToken).filter(Boolean);
    const startIndex = Math.min(index, Math.max(0, usable.length - 1));
    need.forEach((token) => {
      const lookahead = usable.slice(index, index + 8).findIndex((word) => normalizeToken(word.text) === token);
      if (lookahead >= 0) index += lookahead + 1;
      else if (index < usable.length) index += 1;
    });
    const endIndex = Math.max(startIndex, Math.min(usable.length - 1, index - 1));
    const start = usable[startIndex]?.start ?? 0;
    const end = usable[endIndex]?.end ?? start + 0.4;
    return { start, end: Math.max(end, start + 0.25) };
  };

  const scenes = plan.scenes.map((scene) => {
    const beats = scene.beats.map((beat) => {
      const span = take(beat.narration);
      return { ...beat, ...span };
    });
    const start = beats[0]?.start ?? 0;
    const end = beats[beats.length - 1]?.end ?? start + 0.4;
    return { ...scene, beats, start, end };
  });

  const lastWord = words[words.length - 1]?.end ?? 1;
  const lastScene = scenes[scenes.length - 1];
  if (lastScene) lastScene.end = Math.max(lastScene.end, lastWord + 0.35);
  return {
    ...plan,
    scenes,
    durationSec: Math.max(1, lastWord + 0.45),
  };
};

export const align = (plan: VideoPlan, words: Word[]) => alignNarration(plan, words) as TimedPlan;

type ChapterClock = { beats: { narration: string }[] };

export type TimedChapters<T extends ChapterClock> = {
  chapters: Array<
    Omit<T, "beats"> & {
      start: number;
      end: number;
      beats: Array<T["beats"][number] & { start: number; end: number }>;
    }
  >;
  durationSec: number;
  words: Word[];
  /** `alignment` is the ElevenLabs recording. `estimate` is only a preview. */
  clock: "alignment" | "estimate";
};

/**
 * Put a structured plan on a clock.
 *
 * The recording is the authority whenever word timestamps exist. Estimated
 * timing is the preview used when Eric A did not record.
 */
export const timeChapters = <T extends ChapterClock>(chapters: T[], recorded: Word[] | null): TimedChapters<T> => {
  const shell = { scenes: chapters };
  if (recorded && recorded.length > 0) {
    const aligned = alignNarration(shell, recorded);
    return {
      chapters: aligned.scenes as unknown as TimedChapters<T>["chapters"],
      durationSec: aligned.durationSec,
      words: recorded,
      clock: "alignment",
    };
  }
  const estimated = realizeNarration(shell);
  return {
    chapters: estimated.plan.scenes as unknown as TimedChapters<T>["chapters"],
    durationSec: estimated.plan.durationSec,
    words: estimated.words,
    clock: "estimate",
  };
};

export const splitSentences = (script: string): string[] => {
  const clean = script.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const parts = clean.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [clean];
};
