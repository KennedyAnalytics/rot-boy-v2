export type Pose = "present" | "tablet" | "none";
export type Side = "left" | "right";
export type Tone = "ink" | "coral" | "good" | "bad";
export type IconName = "bolt" | "coin" | "page" | "tray" | "person" | "gear" | "check" | "stop" | "arrow";

export type Plate = { label: string; detail: string; icon: IconName | null; tone: Tone };
export type Row = { key: string; value: string; tone: Tone };
export type FlowItem = { label: string; detail: string };

export type Block =
  | { kind: "statement"; text: string; tone: Tone }
  | { kind: "plates"; items: Plate[] }
  | { kind: "meter"; label: string; value: string; unit: string; fill: number; limit: boolean }
  | { kind: "record"; caption: string; rows: Row[] }
  | { kind: "stamp"; text: string; tone: "good" | "bad" }
  | { kind: "flow"; items: FlowItem[] }
  | { kind: "pair"; left: FlowItem; right: FlowItem }
  | { kind: "sentence"; text: string };

export type BoardScene = {
  id: string;
  kicker: string;
  title: string;
  narration: string;
  character: Pose;
  side: Side;
  blocks: Block[];
};

export type BoardFilmProps = {
  title: string;
  scenes: BoardScene[];
};

export const SCENE_FRAMES = 120;
