import { splitSentences } from "../timing";
import type { CharacterMode, DrawNode, InkName, Scene, ShapeName, TextRole, VideoPlan } from "../types";
import { pictureSignature } from "../types";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asString = (value: unknown, fallback = "") => (typeof value === "string" ? value.trim() : fallback);

const clip = (value: string, max: number) => value.split(/\s+/).filter(Boolean).slice(0, max).join(" ");

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const num = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const inkOf = (value: unknown, fallback: InkName): InkName =>
  value === "ink" || value === "soft" || value === "coral" || value === "good" || value === "bad" || value === "paper" || value === "none" ? value : fallback;

const roleOf = (value: unknown): TextRole => (value === "display" || value === "note" ? value : "label");

const words = (value: unknown, max: number) => clip(asString(value).replace(/[<>]/g, ""), max);

const pathOf = (value: unknown) => asString(value).replace(/[^MLHVCSQZmlhvcsqz0-9eE.,\s-]/g, "").slice(0, 480);

const slideOf = (value: unknown): DrawNode["slide"] => {
  const record = asRecord(value);
  if (!record) return null;
  return { dx: clamp(num(record.dx, 0), -80, 80), dy: clamp(num(record.dy, 0), -80, 80) };
};

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

const shapeOf = (record: Record<string, unknown>): ShapeName => {
  const named = asString(record.shape);
  if (named === "group" || named === "text" || named === "rect" || named === "ellipse" || named === "line" || named === "path" || named === "marks" || named === "count" || named === "swap") return named;
  const paint = asRecord(record.paint);
  const kind = asString(paint?.kind);
  if (kind === "display" || kind === "words" || kind === "stamp") return "text";
  if (kind === "chip" || kind === "frame" || kind === "bar") return "rect";
  if (kind === "rule" || kind === "arrow" || kind === "mover") return "line";
  if (kind === "field") return "marks";
  if (kind === "num") return "count";
  if (kind === "swap") return "swap";
  if (Array.isArray(record.children) || Array.isArray(record.nodes)) return "group";
  return "text";
};

const nodeOf = (value: unknown, budget: { left: number }, depth: number): DrawNode | null => {
  if (depth > 5 || budget.left <= 0) return null;
  const record = asRecord(value);
  if (!record) return null;
  budget.left -= 1;
  const shape = shapeOf(record);
  const paint = asRecord(record.paint);
  const rawChildren = Array.isArray(record.children) ? record.children : Array.isArray(record.nodes) ? record.nodes : [];
  const children = rawChildren.map((child) => nodeOf(child, budget, depth + 1)).filter((child): child is DrawNode => child !== null).slice(0, 18);
  const text = words(record.text ?? paint?.text ?? paint?.label, shape === "text" && (record.role === "display" || paint?.kind === "display") ? 4 : 8);
  const node: DrawNode = {
    ...blank(),
    appear: clamp(num(record.appear, 0), 0, 0.92),
    shape,
    x: clamp(num(record.x, 0), -10, 110),
    y: clamp(num(record.y, 0), -10, 110),
    w: clamp(num(record.w, shape === "line" ? 0 : 28), 0, 100),
    h: clamp(num(record.h, shape === "line" ? 0 : 16), 0, 100),
    x2: clamp(num(record.x2, num(record.x, 0) + num(record.w, 20)), -10, 110),
    y2: clamp(num(record.y2, num(record.y, 0)), -10, 110),
    ink: inkOf(record.ink ?? paint?.tone, "ink"),
    fill: inkOf(record.fill, shape === "rect" && paint?.kind === "chip" ? "paper" : "none"),
    weight: record.weight === 1 || record.weight === 3 ? record.weight : 2,
    radius: clamp(num(record.radius, paint?.kind === "chip" ? 14 : 0), 0, 16),
    draw: record.draw === true,
    slide: slideOf(record.slide) ?? (paint?.kind === "mover" ? { dx: 28, dy: 0 } : null),
    text,
    role: record.role === "display" || paint?.kind === "display" ? "display" : roleOf(record.role),
    d: pathOf(record.d),
    count: clamp(Math.round(num(record.count, 8)), 1, 48),
    columns: clamp(Math.round(num(record.columns, 4)), 1, 12),
    mark: record.mark === "dot" ? "dot" : "square",
    from: num(record.from, 0),
    to: num(record.to ?? paint?.to, 1),
    suffix: words(record.suffix ?? paint?.suffix, 2),
    before: words(record.before ?? paint?.before, 4),
    after: words(record.after ?? paint?.after, 4),
    children,
  };
  if (shape === "path" && !node.d) return children.length ? { ...node, shape: "group" } : null;
  if ((shape === "text" || shape === "swap") && !node.text && !node.before && children.length === 0) return null;
  if (shape === "group" && children.length === 0 && !node.text) return null;
  return node;
};

const earliest = (node: DrawNode): number => Math.min(...(node.shape === "group" ? [] : [node.appear]), ...node.children.map(earliest), 1);

const showFromTheStart = (node: DrawNode): DrawNode => {
  const shift = earliest(node);
  const walk = (current: DrawNode): DrawNode => ({
    ...current,
    appear: clamp(current.appear - shift, 0, 0.92),
    children: current.children.map(walk),
  });
  return walk(node);
};

const stage = (children: DrawNode[]): DrawNode => ({ ...blank(), shape: "group", children });

const pictureOf = (value: unknown): DrawNode | null => {
  const record = asRecord(value);
  if (!record) return null;
  const budget = { left: 40 };
  if (Array.isArray(record.nodes)) {
    const children = record.nodes.map((child) => nodeOf(child, budget, 0)).filter((child): child is DrawNode => child !== null);
    return children.length ? showFromTheStart(stage(children)) : null;
  }
  const node = nodeOf(record, budget, 0);
  if (!node) return null;
  if (node.shape === "group") return showFromTheStart({ ...node, x: 0, y: 0, w: 100, h: 100 });
  return showFromTheStart(stage([node]));
};

const side = (value: unknown): "left" | "right" => (value === "right" ? "right" : "left");

const pose = (value: unknown): Scene["character"]["pose"] =>
  value === "tablet" || value === "present" || value === "none" ? value : "present";

const applyCharacterMode = (next: Scene["character"]["pose"], mode: CharacterMode): Scene["character"]["pose"] => {
  if (mode === "never") return "none";
  if (mode === "always" && next === "none") return "present";
  return next;
};

export const repeatedSignatures = (scenes: Scene[]) => {
  const groups = new Map<string, number[]>();
  scenes.forEach((scene, index) => {
    const signature = pictureSignature(scene.picture);
    groups.set(signature, [...(groups.get(signature) ?? []), index]);
  });
  return [...groups.values()].filter((group) => group.length > 1);
};

export const normalizePlan = (raw: unknown, script: string, characterMode: CharacterMode): { plan: VideoPlan; warnings: string[]; uncovered: number[] } => {
  const record = asRecord(raw);
  if (!record) throw new Error("The director did not return a plan.");
  const sentences = splitSentences(script);
  if (sentences.length === 0) throw new Error("Write a script before designing the video.");
  const incoming = Array.isArray(record.scenes) ? record.scenes : [];
  const used = new Set<number>();
  const warnings: string[] = [];
  const chapters = Array.isArray(record.chapters) ? record.chapters.map((chapter) => clip(asString(chapter), 3)).filter(Boolean).slice(0, 5) : [];
  const drafts: Array<Scene & { first: number }> = [];

  incoming.forEach((item, sceneIndex) => {
    const scene = asRecord(item);
    if (!scene) return;
    const indexes = Array.isArray(scene.sentenceIndexes)
      ? scene.sentenceIndexes.map((index) => Number(index)).filter((index) => Number.isInteger(index) && index >= 0 && index < sentences.length && !used.has(index))
      : [];
    indexes.forEach((index) => used.add(index));
    if (indexes.length === 0) return;
    const narration = indexes.map((index) => sentences[index]);
    const chapter = clip(asString(scene.chapter, chapters[0] ?? "The idea"), 4);
    if (chapter && !chapters.includes(chapter)) chapters.push(chapter);
    const picture = pictureOf(scene.picture);
    if (!picture) {
      indexes.forEach((index) => used.delete(index));
      warnings.push(`Scene ${sceneIndex + 1} had no usable picture, so those sentences stay undirected.`);
      return;
    }
    drafts.push({
      first: indexes[0],
      id: `scene-${sceneIndex + 1}`,
      chapter,
      kicker: asString(scene.kicker) ? clip(asString(scene.kicker), 8) : null,
      intent: clip(asString(scene.intent, "A picture made for this line."), 40),
      character: {
        pose: applyCharacterMode(pose(asRecord(scene.character)?.pose), characterMode),
        side: side(asRecord(scene.character)?.side),
      },
      beats: narration.map((line) => ({ narration: line })),
      picture,
    });
  });

  const uncovered = sentences.map((_, index) => index).filter((index) => !used.has(index));

  const scenes = drafts.sort((a, b) => a.first - b.first).map(({ first: _first, ...scene }) => scene);
  if (scenes.length === 0) throw new Error("The director returned no scenes.");
  const repeats = repeatedSignatures(scenes);
  repeats.forEach((group) => {
    warnings.push(`Scenes ${group.map((index) => index + 1).join(" and ")} use the same composition.`);
  });

  return {
    warnings,
    uncovered,
    plan: {
      title: clip(asString(record.title, "Untitled"), 8),
      chrome: record.chrome === "rail" ? "rail" : "kicker",
      chapters: chapters.length > 0 ? chapters.slice(0, 5) : ["The idea"],
      scenes,
    },
  };
};

const jsonSlice = (text: string) => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("The model did not return JSON.");
  return body.slice(start, end + 1);
};

const nextSolid = (input: string, from: number) => {
  for (let index = from; index < input.length; index += 1) {
    const char = input[index];
    if (char !== " " && char !== "\n" && char !== "\r" && char !== "\t") return char;
  }
  return "";
};

export const repairJson = (input: string) => {
  let out = "";
  let inString = false;
  let escape = false;
  let afterValue = false;
  const stack: Array<"{" | "["> = [];

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (inString) {
      if (escape) {
        out += char;
        escape = false;
        continue;
      }
      if (char === "\\") {
        out += char;
        escape = true;
        continue;
      }
      if (char === "\n" || char === "\r") {
        out += "\\n";
        continue;
      }
      if (char === '"') {
        const next = nextSolid(input, index + 1);
        const closes = next === "" || next === "," || next === "}" || next === "]" || next === ":";
        if (!closes) {
          out += '\\"';
          continue;
        }
        inString = false;
        afterValue = true;
        out += char;
        continue;
      }
      out += char;
      continue;
    }

    if (char === " " || char === "\n" || char === "\r" || char === "\t") {
      out += char;
      continue;
    }
    if (char === "/" && input[index + 1] === "/") {
      while (index + 1 < input.length && input[index + 1] !== "\n") index += 1;
      continue;
    }

    if (char === '"') {
      if (afterValue) out += ",";
      inString = true;
      afterValue = false;
      out += char;
      continue;
    }
    if (char === "{" || char === "[") {
      if (afterValue) out += ",";
      stack.push(char);
      afterValue = false;
      out += char;
      continue;
    }
    if (char === "}" || char === "]") {
      out = out.replace(/,\s*$/, "");
      stack.pop();
      afterValue = true;
      out += char;
      continue;
    }
    if (char === ",") {
      if (afterValue) out += char;
      afterValue = false;
      continue;
    }
    if (char === ":") {
      afterValue = false;
      out += char;
      continue;
    }

    if (afterValue) out += ",";
    afterValue = false;
    out += char;
    if (/[0-9-]/.test(char)) {
      while (index + 1 < input.length && /[0-9.eE+-]/.test(input[index + 1])) {
        index += 1;
        out += input[index];
      }
      afterValue = true;
    } else if (char === "t" || char === "f" || char === "n") {
      const rest = char === "t" ? "rue" : char === "f" ? "alse" : "ull";
      if (input.slice(index + 1, index + 1 + rest.length) === rest) {
        out += rest;
        index += rest.length;
      }
      afterValue = true;
    }
  }

  if (inString) out += '"';
  while (stack.length > 0) {
    const open = stack.pop();
    out += open === "{" ? "}" : "]";
  }
  return out;
};

export const extractJson = (text: string): unknown => {
  const slice = jsonSlice(text);
  try {
    return JSON.parse(slice);
  } catch (error) {
    try {
      return JSON.parse(repairJson(slice));
    } catch {
      throw error;
    }
  }
};
