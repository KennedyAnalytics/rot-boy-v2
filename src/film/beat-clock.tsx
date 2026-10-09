import { createContext, useContext } from "react";
import type { BeatMode } from "./structure-types";

export type BeatClockValue = {
  index: number;
  count: number;
  mode: BeatMode;
  /** 0 at the start of the held beat, 1 once that beat has finished or is being held through a gap. */
  progress: number;
  /** Seconds from the start of the composition. Cue phrases use this, not the beat index. */
  time: number;
  /** Narration spoken from the start of the chapter through the current beat. */
  spoken: string;
};

const BeatClock = createContext<BeatClockValue>({ index: 0, count: 1, mode: "actual", progress: 1, time: 0, spoken: "" });

export const BeatClockProvider = BeatClock.Provider;

export const useBeatClock = () => useContext(BeatClock);

const WordClock = createContext<{ text: string; start: number }[]>([]);

export const WordClockProvider = WordClock.Provider;

export const useWordClock = () => useContext(WordClock);

/** A label may appear once its words have been spoken in this chapter. */
export const spokenYet = (text: string, spoken: string, strict = false) => {
  const words = text.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [];
  if (!words.length) return true;
  const hay = spoken.toLowerCase();
  const hit = (word: string) => hay.includes(word) || (word.endsWith("s") && hay.includes(word.slice(0, -1)));
  if (!strict) return words.some(hit);
  const longest = words.reduce((best, word) => (word.length > best.length ? word : best));
  return hit(longest);
};
