import type { FilmPiece } from "./types";
import type { Word } from "../types";
import type { FilmDirection } from './direction';
import type { ShotExecution, SourceAsset } from './spec-types';

/**
 * How the presenter relates to the frame. `address` is direct speech to the
 * viewer: larger, eye contact, the stage sparse beside him. Directed shots may
 * use it; the chapter structure pass still chooses among the first three.
 */
export type Presenter = "lead" | "beside" | "away" | "address";

export type Tone = "neutral" | "accent" | "good" | "bad";

/** The one case the film carries from start to finish. */
export type WorkedExample = {
  /** Short enough for the status chip. */
  name: string;
  /** One line, for the model's own reference in later passes. */
  what: string;
};

export type CalloutRow = { label: string; value: string; tone: Tone };

/**
 * One state of the picture, spanning one or more consecutive sentences.
 *
 * A beat never mounts a new stage. It changes what is annotated on the stage
 * the chapter already established.
 */
export type BeatMode = "actual" | "hypothetical" | "recap";

export type Beat = {
  sentenceIndexes: number[];
  narration: string;
  /** Actual event, a spoken conditional, or a review of earlier states. */
  mode: BeatMode;
  /** Diagram node ids allowed on screen during this beat. */
  reveal: string[];
  /** Worked-example status for the chip, or null when it is not on screen. */
  state: string | null;
  stateTone: Tone;
  pill: { term: string; is: string } | null;
  card: { kicker: string; rows: CalloutRow[] } | null;
  stamp: { label: string; ring: string; tone: Tone } | null;
};

export type Chapter = {
  id: string;
  /** Spine label. Short, concrete, title case. */
  name: string;
  sentenceIndexes: number[];
  /** What the main object is, in ordinary words. Drives retrieval. */
  stage: string;
  persists: string;
  changes: string;
  payoff: string;
  presenter: Presenter;
  facts: string[];
  needs: string[];
  recap: boolean;
  illustrationGap: string | null;
  beats: Beat[];
  /** The stage. Chosen once, held for every beat of the chapter. */
  pieces: FilmPiece[];
  built: string;
};

export type StructuredPlan = {
  direction?: FilmDirection;
  safeProfile?: 'reels' | 'tiktok';
  title: string;
  spine: string[];
  example: WorkedExample | null;
  chapters: Chapter[];
  /** Per-shot medium and material. Absent on plans made before FilmSpec. */
  executions?: ShotExecution[];
  sources?: SourceAsset[];
};

export type TimedBeat = Beat & { start: number; end: number };

export type TimedChapter = Omit<Chapter, "beats"> & {
  beats: TimedBeat[];
  start: number;
  end: number;
};

export type TimedStructuredPlan = Omit<StructuredPlan, "chapters"> & {
  chapters: TimedChapter[];
  durationSec: number;
};

export type StructuredFilmProps = {
  plan: TimedStructuredPlan;
  words: Word[];
  audioFile: string | null;
  /** Delivery sound: motion-driven effects and an optional ducked music bed. Absent = narration only. */
  sound?: { sfx: boolean; music: string | null; musicGain: number };
};

/** The structure pass's raw output, before beats and stages are attached. */
export type ChapterBrief = Omit<Chapter, "id" | "beats" | "pieces" | "built">;
