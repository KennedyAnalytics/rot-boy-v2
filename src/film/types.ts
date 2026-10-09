import type { Word } from "../types";

export type Pose = "present" | "tablet" | "none";
export type Side = "left" | "right";
export type Graphic = "fact" | "count" | "meter" | "record" | "flow" | "set" | "compare" | "diagram" | "exchange";

export type CatalogProp = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

export type CatalogItem = {
  name: string;
  category: string;
  registryType: string;
  description: string;
  tasks: string[];
  importPath: string;
  installTarget: string;
  exportName: string | null;
  scope: "utility" | "transition" | "wrapper" | "material" | "template" | "background";
  tags: string;
  props: CatalogProp[];
  usage: string;
};

export type FilmPiece = {
  stateCues?: import('./state-cues').StateCue[];
  source: "library" | "procedural" | "bespoke" | "action";
  component: string;
  graphic: Graphic;
  props: Record<string, unknown>;
  weight: number;
  facts: string[];
};

export type FilmBeat = { narration: string };

export type FilmScene = {
  id: string;
  chapter: string;
  kicker: string | null;
  intent: string;
  persists: string;
  changes: string;
  payoff: string;
  character: { pose: Pose; side: Side };
  beats: FilmBeat[];
  pieces: FilmPiece[];
  illustrationGap: string | null;
  built: string;
};

export type TimedBeat = FilmBeat & { start: number; end: number };
export type TimedFilmScene = Omit<FilmScene, "beats"> & {
  beats: TimedBeat[];
  start: number;
  end: number;
};

export type FilmPlan = {
  title: string;
  scenes: FilmScene[];
};

export type TimedFilm = Omit<FilmPlan, "scenes"> & {
  scenes: TimedFilmScene[];
  durationSec: number;
};

export type FilmProps = {
  plan: TimedFilm;
  words: Word[];
  audioFile: string | null;
};

export type Explanation = {
  indexes: number[];
  intent: string;
  persists: string;
  changes: string;
  payoff: string;
  dominates: string;
  character: Pose;
  side: Side;
  kicker: string;
  needs: string[];
  facts: string[];
  approach: string;
  illustrationGap: string | null;
};
