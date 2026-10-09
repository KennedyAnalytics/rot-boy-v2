export type Pose = "tablet" | "present" | "none";
export type Side = "left" | "right";
export type Chrome = "kicker" | "rail";
export type CharacterMode = "auto" | "always" | "never";

export type Word = {
  text: string;
  start: number;
  end: number;
};

export type Beat = {
  narration: string;
};

export type CharacterCue = {
  pose: Pose;
  side: Side;
};

export type InkName = "ink" | "soft" | "coral" | "good" | "bad" | "paper" | "none";
export type TextRole = "display" | "label" | "note";
export type MarkShape = "square" | "dot";
export type ShapeName = "group" | "text" | "rect" | "ellipse" | "line" | "path" | "marks" | "count" | "swap";

export type DrawNode = {
  appear: number;
  shape: ShapeName;
  x: number;
  y: number;
  w: number;
  h: number;
  x2: number;
  y2: number;
  ink: InkName;
  fill: InkName;
  weight: 1 | 2 | 3;
  radius: number;
  draw: boolean;
  slide: { dx: number; dy: number } | null;
  text: string;
  role: TextRole;
  d: string;
  count: number;
  columns: number;
  mark: MarkShape;
  from: number;
  to: number;
  suffix: string;
  before: string;
  after: string;
  children: DrawNode[];
};

export type Scene = {
  id: string;
  chapter: string;
  kicker: string | null;
  intent: string;
  character: CharacterCue;
  beats: Beat[];
  picture: DrawNode;
};

export type VideoPlan = {
  title: string;
  chrome: Chrome;
  chapters: string[];
  scenes: Scene[];
};

export type TimedBeat = Beat & { start: number; end: number };
export type TimedScene = Omit<Scene, "beats"> & {
  beats: TimedBeat[];
  start: number;
  end: number;
};

export type TimedPlan = Omit<VideoPlan, "scenes"> & {
  scenes: TimedScene[];
  durationSec: number;
};

export type ExplainerProps = {
  plan: TimedPlan;
  words: Word[];
  audioFile: string | null;
};

export const pictureSignature = (node: DrawNode): string => {
  const box = `${node.shape}@${Math.round(node.x / 12)}:${Math.round(node.y / 12)}`;
  const inner = node.children.map(pictureSignature).join("|");
  return `${box}[${inner}]`;
};
