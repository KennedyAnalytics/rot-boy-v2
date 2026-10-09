import { splitSentences } from "../timing";
import type { CharacterMode, DrawNode, Scene, VideoPlan } from "../types";

const blank = (): DrawNode => ({
  appear: 0,
  shape: "group",
  x: 0,
  y: 0,
  w: 100,
  h: 100,
  x2: 0,
  y2: 0,
  ink: "ink",
  fill: "none",
  weight: 2,
  radius: 0,
  draw: false,
  slide: null,
  text: "",
  role: "label",
  d: "",
  count: 8,
  columns: 4,
  mark: "square",
  from: 0,
  to: 1,
  suffix: "",
  before: "",
  after: "",
  children: [],
});

const words = (sentence: string) => sentence.replace(/[^A-Za-z0-9' ]/g, " ").split(/\s+/).filter((word) => word.length > 2).slice(0, 3).join(" ").toUpperCase() || "IDEA";

const pictureFor = (sentence: string): DrawNode => ({
  ...blank(),
  children: [
    { ...blank(), shape: "rect", x: 8, y: 10, w: 36, h: 22, radius: 2, text: words(sentence), role: "label" },
    { ...blank(), shape: "line", x: 48, y: 21, x2: 62, y2: 21, draw: true },
    { ...blank(), shape: "ellipse", x: 66, y: 12, w: 18, h: 12, ink: "coral", draw: true },
  ],
});

export const directLocally = (script: string, characterMode: CharacterMode): { plan: VideoPlan; warnings: string[] } => {
  const sentences = splitSentences(script);
  const scenes: Scene[] = sentences.map((sentence, index) => ({
    id: `local-${index + 1}`,
    chapter: index < sentences.length / 2 ? "The idea" : "The mechanism",
    kicker: null,
    intent: "Offline sketch. Connect a language model for a picture invented from this line.",
    character: characterMode === "never" ? { pose: "none", side: "left" } : { pose: index % 2 === 0 ? "present" : "none", side: "left" },
    beats: [{ narration: sentence }],
    picture: pictureFor(sentence),
  }));
  return {
    warnings: ["Designed without a language model. The pictures are only a sketch of the line."],
    plan: { title: words(sentences[0] ?? "Untitled"), chrome: "kicker", chapters: ["The idea", "The mechanism"], scenes },
  };
};
