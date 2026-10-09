import { splitSentences } from "../timing";
import type { Block, BoardFilmProps, BoardScene, FlowItem, IconName, Plate, Pose, Row, Side, Tone } from "./types";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const text = (value: unknown, words: number) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, words)
    .join(" ");

const toneOf = (value: unknown): Tone => (value === "coral" || value === "good" || value === "bad" ? value : "ink");

const icons: IconName[] = ["bolt", "coin", "page", "tray", "person", "gear", "check", "stop", "arrow"];

const iconOf = (value: unknown): IconName | null => (icons.includes(value as IconName) ? (value as IconName) : null);

const poseOf = (value: unknown): Pose => (value === "tablet" || value === "none" ? value : "present");

const sideOf = (value: unknown): Side => (value === "right" ? "right" : "left");

const item = (value: unknown): FlowItem | null => {
  const record = asRecord(value);
  if (!record) return null;
  const label = text(record.label, 3);
  if (!label) return null;
  return { label, detail: text(record.detail, 6) };
};

const blockOf = (value: unknown): Block | null => {
  const record = asRecord(value);
  if (!record) return null;
  const kind = record.kind ?? record.type;
  if (kind === "statement") {
    const line = text(record.text ?? record.label, 4);
    return line ? { kind: "statement", text: line, tone: toneOf(record.tone) } : null;
  }
  if (kind === "sentence") {
    const line = text(record.text ?? record.label, 14);
    return line ? { kind: "sentence", text: line } : null;
  }
  if (kind === "stamp") {
    const line = text(record.text ?? record.label, 3);
    return line ? { kind: "stamp", text: line, tone: record.tone === "bad" ? "bad" : "good" } : null;
  }
  if (kind === "meter") {
    const valueText = text(record.value, 3);
    const fill = Math.min(1, Math.max(0, Number(record.fill)));
    if (!valueText || Number.isNaN(fill)) return null;
    return {
      kind: "meter",
      label: text(record.label, 4) || "LIMIT",
      value: valueText,
      unit: text(record.unit, 4),
      fill,
      limit: Boolean(record.limit),
    };
  }
  if (kind === "plates") {
    const items = (Array.isArray(record.items) ? record.items : [])
      .map((entry): Plate | null => {
        const plate = asRecord(entry);
        if (!plate) return null;
        const label = text(plate.label, 3);
        if (!label) return null;
        return { label, detail: text(plate.detail, 6), icon: iconOf(plate.icon), tone: toneOf(plate.tone) };
      })
      .filter((entry): entry is Plate => entry !== null)
      .slice(0, 4);
    return items.length ? { kind: "plates", items } : null;
  }
  if (kind === "record") {
    const accent = toneOf(record.tone);
    const rows = (Array.isArray(record.rows) ? record.rows : [])
      .map((entry): Row | null => {
        const row = asRecord(entry);
        if (!row) return null;
        const key = text(row.key ?? row.label, 3);
        const valueText = text(row.value ?? row.text, 3);
        if (!key || !valueText) return null;
        return { key, value: valueText, tone: row.tone === undefined ? "ink" : toneOf(row.tone) };
      })
      .filter((entry): entry is Row => entry !== null)
      .slice(0, 4);
    if (rows.length && accent !== "ink") rows[rows.length - 1].tone = accent;
    return rows.length ? { kind: "record", caption: text(record.caption, 4), rows } : null;
  }
  if (kind === "flow") {
    const source = Array.isArray(record.items) ? record.items : Array.isArray(record.steps) ? record.steps : [];
    const items = source.map(item).filter((entry): entry is FlowItem => entry !== null).slice(0, 4);
    return items.length >= 2 ? { kind: "flow", items } : null;
  }
  if (kind === "pair") {
    const left = item(record.left);
    const right = item(record.right);
    return left && right ? { kind: "pair", left, right } : null;
  }
  return null;
};

export const normalizeBoard = (raw: unknown, script: string): BoardFilmProps => {
  const record = asRecord(raw);
  if (!record) throw new Error("The director did not return a film.");
  const sentences = splitSentences(script);
  if (sentences.length === 0) throw new Error("Write a script before designing the video.");
  const incoming = Array.isArray(record.scenes) ? record.scenes : [];
  const used = new Set<number>();
  const scenes: BoardScene[] = [];

  incoming.forEach((entry) => {
    const scene = asRecord(entry);
    if (!scene) return;
    const indexes = (Array.isArray(scene.sentenceIndexes) ? scene.sentenceIndexes : [])
      .map((index) => Number(index))
      .filter((index) => Number.isInteger(index) && index >= 0 && index < sentences.length && !used.has(index));
    if (indexes.length === 0) return;
    const blocks = (Array.isArray(scene.blocks) ? scene.blocks : []).map(blockOf).filter((block): block is Block => block !== null).slice(0, 3);
    if (blocks.length === 0) return;
    indexes.forEach((index) => used.add(index));
    scenes.push({
      id: `scene-${scenes.length + 1}`,
      kicker: text(scene.kicker, 8) || "FIG. 01",
      title: text(scene.title, 4),
      narration: indexes.map((index) => sentences[index]).join(" "),
      character: poseOf(scene.character),
      side: sideOf(scene.side),
      blocks,
    });
  });

  const missing = sentences.map((_, index) => index).filter((index) => !used.has(index));
  if (scenes.length === 0) throw new Error("The director returned no usable scenes.");
  if (missing.length > 0) throw new Error(`Sentences ${missing.map((index) => index + 1).join(", ")} were not designed.`);
  return { title: text(record.title, 6) || "Untitled", scenes };
};
