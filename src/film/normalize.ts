import { catalogByName } from "./retrieve";
import { actionProps } from "./action-stage";
import type { CharacterMode } from "../types";
import type { Explanation, FilmPiece, FilmScene, Graphic, Pose, Side } from "./types";

const clip = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const record = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null);

const poseOf = (value: unknown): Pose => (value === "tablet" || value === "present" || value === "none" ? value : "none");

const sideOf = (value: unknown): Side => (value === "right" ? "right" : "left");

const characterMode = (pose: Pose, mode: CharacterMode): Pose => {
  if (mode === "never") return "none";
  if (mode === "always" && pose === "none") return "present";
  return pose;
};

const words = (value: unknown, max: number, count: number) =>
  (Array.isArray(value) ? value : [])
    .map((item) => clip(item, max))
    .filter(Boolean)
    .slice(0, count);

export const explanationsFrom = (raw: unknown, from: number, to: number) => {
  const body = record(raw);
  const scenes = Array.isArray(body?.scenes) ? body.scenes : [];
  const used = new Set<number>();
  const explanations: Explanation[] = [];
  for (const scene of scenes) {
    const item = record(scene);
    if (!item) continue;
    const indexes = (Array.isArray(item.sentenceIndexes) ? item.sentenceIndexes : [])
      .map((index) => Number(index))
      .filter((index) => Number.isInteger(index) && index >= from && index < to && !used.has(index));
    const unique = [...new Set(indexes)].sort((a, b) => a - b);
    if (!unique.length) continue;
    unique.forEach((index) => used.add(index));
    explanations.push({
      indexes: unique,
      intent: clip(item.intent, 220) || "Show the idea.",
      persists: clip(item.persists, 160),
      changes: clip(item.changes, 160),
      payoff: clip(item.payoff, 120),
      dominates: clip(item.dominates, 120),
      character: poseOf(item.character),
      side: sideOf(item.side),
      kicker: clip(item.kicker, 48),
      needs: words(item.needs, 80, 4),
      facts: words(item.facts, 48, 6),
      approach: clip(item.approach, 20) || "designed",
      illustrationGap: clip(item.illustrationGap, 180) || null,
    });
  }
  return { title: clip(body?.title, 80), explanations };
};

/**
 * Trim to a whole word inside a budget, or return "".
 *
 * Procedural stages render at the type sizes in `procedural.tsx`, and their
 * text does not wrap inside a card or a ledger row. A hard `slice` put
 * "Increase logo size. Ke" and "waiting on Marlow's an" on screen. Half a word
 * reads as a bug; a shorter true phrase does not.
 */
const fitWords = (value: unknown, max: number) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const space = cut.lastIndexOf(" ");
  if (space < Math.ceil(max * 0.5)) return cut.slice(0, max).trim();
  return cut.slice(0, space).replace(/[,;:.\-]$/, "").trim();
};

const pair = (value: unknown) => {
  const item = record(value);
  return { label: fitWords(item?.label ?? value, 28), detail: fitWords(item?.detail, 48), tone: clip(item?.tone, 8) };
};

const parseCount = (fact: string) => {
  const match = fact.match(/([^0-9-]*)(-?\d+(?:\.\d+)?)(.*)/);
  if (!match) return { value: 0, prefix: "", suffix: "", label: fact };
  return {
    value: Number(match[2]),
    prefix: match[1].trim(),
    suffix: match[3].trim().slice(0, 8),
    label: fact.replace(match[0], "").trim() || fact,
  };
};

/**
 * The last-resort stage, built from the chapter's facts when nothing valid
 * came back. The payoff becomes the headline, so even this path produces a
 * stage with a title rather than a bare list.
 *
 * A list of facts is a set of peer labels, not a sequence: nothing in `facts`
 * says they happen in order. Rendering every such list as `flow` asserted an
 * order that was often not there and made every fallback chapter look
 * identical, which is the fixed-menu failure from creative-standard 16.
 */
export const inferPiece = (facts: string[], payoff: string): FilmPiece => {
  const lines = facts.map((fact) => fact.trim()).filter(Boolean).slice(0, 6);
  const title = clip(payoff, 72);
  const pairs = lines.filter((line) => line.includes(":") || line.includes("—"));
  if (pairs.length >= 2) {
    return {
      source: "procedural",
      component: "",
      graphic: "record",
      weight: 1,
      facts: lines,
      props: {
        caption: "",
        title,
        rows: pairs.slice(0, 4).map((line) => {
          const [key, value] = line.split(/:|—/);
          return { key: (key ?? "").trim(), value: (value ?? "").trim() };
        }),
      },
    };
  }
  if (lines.length >= 3) {
    return {
      source: "procedural",
      component: "",
      graphic: "set",
      weight: 1,
      facts: lines,
      props: { title, items: lines.map((label) => ({ label, detail: "" })), numbered: false },
    };
  }
  if (lines.length === 2) {
    return {
      source: "procedural",
      component: "",
      graphic: "compare",
      weight: 1,
      facts: lines,
      props: { title, left: { label: lines[0], detail: "" }, right: { label: lines[1], detail: "" } },
    };
  }
  const numeric = lines.find((line) => /\d/.test(line));
  if (numeric && lines.length <= 2) {
    return { source: "procedural", component: "", graphic: "count", weight: 1, facts: lines, props: { ...parseCount(numeric), title } };
  }
  return {
    source: "procedural",
    component: "",
    graphic: "fact",
    weight: 1,
    facts: lines,
    props: { text: lines[0] || payoff || "The idea" },
  };
};

const GRAPHICS = new Set<string>(["fact", "count", "meter", "record", "flow", "set", "compare", "diagram"]);

const graphicOf = (value: unknown): Graphic => {
  if (
    value === "count" ||
    value === "meter" ||
    value === "record" ||
    value === "flow" ||
    value === "set" ||
    value === "compare" ||
    value === "fact" ||
    value === "diagram"
  ) {
    return value;
  }
  return "fact";
};

const cleanProps = (props: Record<string, unknown>, names: Set<string>) => {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (names.size > 0 && !names.has(key)) continue;
    if (key === "children" || key === "frame" || key === "holdSeconds" || key === "theme" || key === "backgroundColor" || key === "accentColor") continue;
    if (value == null) continue;
    next[key] = value;
  }
  return next;
};

/**
 * Every procedural stage can carry a headline. A bare graphic on paper reads
 * as a placeholder; the same graphic under a headline reads as a chapter.
 */
const titleOf = (props: Record<string, unknown>) => clip(props.title, 72);

const proceduralProps = (graphic: Graphic, props: Record<string, unknown>, facts: string[]) => {
  const title = titleOf(props);
  if (graphic === "fact") return { text: clip(props.text ?? facts[0], 64) || "The idea" };
  if (graphic === "set") {
    const items = (Array.isArray(props.items) ? props.items : [])
      .map((item) => pair(item))
      .filter((item) => item.label)
      .slice(0, 6);
    return { title, items, numbered: props.numbered === true };
  }
  if (graphic === "count") {
    const parsed = parseCount(String(props.label ?? facts[0] ?? ""));
    const value = Number(props.value);
    return {
      value: Number.isFinite(value) ? value : parsed.value,
      prefix: clip(props.prefix ?? parsed.prefix, 4),
      suffix: clip(props.suffix ?? parsed.suffix, 8),
      label: clip(props.label ?? parsed.label, 32),
      title,
    };
  }
  if (graphic === "meter") {
    const fill = Number(props.fill);
    return {
      label: clip(props.label ?? facts[0], 28),
      value: clip(props.value ?? facts[1] ?? facts[0], 16),
      fill: Number.isFinite(fill) ? Math.max(0, Math.min(1, fill)) : 0.7,
      limit: props.limit === true,
      title,
    };
  }
  if (graphic === "record") {
    const rows = (Array.isArray(props.rows) ? props.rows : [])
      .map((row) => {
        const item = record(row);
        // key is 36px semibold, value 40px mono on one non-wrapping row.
        return item
          ? {
              key: fitWords(item.key, 24),
              value: fitWords(item.value, 22),
              atBeat: Number.isFinite(Number(item.atBeat)) ? Math.max(0, Math.min(6, Math.round(Number(item.atBeat)))) : 0,
            }
          : null;
      })
      .filter((row): row is { key: string; value: string; atBeat: number } => Boolean(row?.key && row.value))
      .slice(0, 4);
    return { caption: fitWords(props.caption, 28), rows, title };
  }
  if (graphic === "flow") {
    const items = (Array.isArray(props.items) ? props.items : [])
      .map((item) => pair(item))
      .filter((item) => item.label)
      .slice(0, 5);
    return { items, title };
  }
  // compare cards are full width, so the label is 56px and the detail 34px.
  const side = (value: unknown, fallback: string) => {
    const item = record(value);
    return {
      label: fitWords(item?.label ?? value ?? fallback, 24),
      detail: fitWords(item?.detail, 48),
      tone: clip(item?.tone, 8),
    };
  };
  return { left: side(props.left, facts[0] ?? ""), right: side(props.right, facts[1] ?? ""), title };
};

const mediaRequired = (name: string) => {
  const item = catalogByName.get(name);
  if (!item) return false;
  if (item.name.startsWith("map-")) return true;
  return item.props.some((prop) => prop.required && /src|url|video|audio|image/i.test(prop.name));
};

const beatOf = (value: unknown) =>
  Number.isFinite(Number(value)) ? Math.max(0, Math.min(6, Math.round(Number(value)))) : 0;

const diagramProps = (props: Record<string, unknown>, facts: string[]) => {
  const nodes = (Array.isArray(props.nodes) ? props.nodes : [])
    .map((entry, index) => {
      const item = record(entry);
      if (!item) return null;
      const label = fitWords(item.label, 28);
      if (!label) return null;
      const tone = item.tone === "if" || item.tone === "good" || item.tone === "bad" || item.tone === "accent" ? item.tone : "neutral";
      return {
        id: clip(item.id, 12) || `n${index + 1}`,
        label,
        detail: fitWords(item.detail, 42),
        atBeat: beatOf(item.atBeat),
        tone,
      };
    })
    .filter((node): node is { id: string; label: string; detail: string; atBeat: number; tone: "if" | "accent" | "good" | "bad" | "neutral" } => Boolean(node))
    .slice(0, 6);
  if (!nodes.length && facts.length) {
    facts.slice(0, 4).forEach((fact, index) => {
      nodes.push({ id: `n${index + 1}`, label: fitWords(fact, 28), detail: "", atBeat: index, tone: "neutral" });
    });
  }
  const known = new Set(nodes.map((node) => node.id));
  const links = (Array.isArray(props.links) ? props.links : [])
    .map((entry) => {
      const item = record(entry);
      if (!item) return null;
      const from = clip(item.from, 12);
      const to = clip(item.to, 12);
      if (!known.has(from) || !known.has(to)) return null;
      return { from, to, label: fitWords(item.label, 16) };
    })
    .filter((link): link is { from: string; to: string; label: string } => Boolean(link))
    .slice(0, 6);
  return { title: fitWords(props.title, 72), nodes, links };
};

export const piecesFrom = (raw: unknown, allowed: Set<string>, facts: string[], payoff: string) => {
  const body = record(raw);
  const incoming = Array.isArray(body?.pieces) ? body.pieces : [];
  const pieces: FilmPiece[] = [];
  for (const piece of incoming) {
    const item = record(piece);
    if (!item || pieces.length >= 2) continue;
    const weight = Math.max(0.6, Math.min(2, Number(item.weight) || 1));
    const stateCues = Array.isArray(item.stateCues) ? item.stateCues as import('./state-cues').StateCue[] : [];
    /**
     * A graphic can arrive named in either field. Models reliably write
     * `{ source: "graphic", component: "set" }` instead of
     * `{ source: "procedural", graphic: "set" }`, and the strict read dropped
     * those pieces and fell through to `inferPiece` - which rebuilt a far
     * worse version of the same graphic out of the raw facts. Accept the name
     * wherever it is, as long as it is a real graphic.
     */
    const named = clip(item.graphic ?? item.component, 20);
    if (item.source === "action" || named === "exchange") {
      const props = actionProps(record(item.props) ?? {});
      if (!props.steps.length) continue;
      pieces.push({ source: "action", component: "", graphic: "exchange", props, weight, facts });
      continue;
    }
    if (item.source === "bespoke" || named === "diagram") {
      const props = diagramProps(record(item.props) ?? {}, facts);
      if (!(props.nodes as unknown[]).length) continue;
      pieces.push({ source: "bespoke", component: "", graphic: "diagram", props, weight, facts, stateCues });
      continue;
    }
    const isGraphic = GRAPHICS.has(named) && named !== "diagram";
    if (item.source === "procedural" || item.source === "graphic" || (isGraphic && !allowed.has(named))) {
      if (!isGraphic) continue;
      const graphic = graphicOf(named);
      const props = proceduralProps(graphic, record(item.props) ?? {}, facts);
      if (graphic === "record" && !(props.rows as unknown[]).length && !stateCues.length) continue;
      if (graphic === "flow" && !(props.items as unknown[]).length && !stateCues.length) continue;
      pieces.push({ source: "procedural", component: "", graphic, props, weight, facts, stateCues });
      continue;
    }
    const component = clip(item.component, 80);
    if (!allowed.has(component) || mediaRequired(component)) continue;
    const spec = catalogByName.get(component);
    const names = new Set((spec?.props ?? []).map((prop) => prop.name));
    const props = cleanProps(record(item.props) ?? {}, names);
    const missing = (spec?.props ?? []).filter((prop) => prop.required && (props[prop.name] == null || props[prop.name] === ""));
    if (missing.length) continue;
    pieces.push({ source: "library", component, graphic: "fact", props, weight, facts, stateCues });
  }
  if (!pieces.length) pieces.push(inferPiece(facts, payoff));
  return pieces;
};

export const sceneFrom = (explanation: Explanation, pieces: FilmPiece[], sentences: string[], index: number, mode: CharacterMode): FilmScene => {
  const pose = characterMode(pieces.some((piece) => piece.source === "library") && mode !== "always" ? "none" : explanation.character, mode);
  const label = explanation.kicker.split("—").pop()?.trim() || explanation.dominates || explanation.intent;
  const heading = (explanation.kicker.split("—").pop() ?? label).replace(/^FIG\.\s*\d+\s*/i, "").trim();
  const kicker = `FIG. ${String(index + 1).padStart(2, "0")}  —  ${heading.slice(0, 28).toUpperCase()}`;
  const built = pieces
    .map((piece) => (piece.source === "library" ? piece.component : piece.graphic))
    .join(" + ");
  return {
    id: `scene-${index + 1}`,
    chapter: clip(label, 32) || "The idea",
    kicker,
    intent: explanation.intent,
    persists: explanation.persists,
    changes: explanation.changes,
    payoff: explanation.payoff,
    character: { pose, side: explanation.side },
    beats: explanation.indexes.map((sentence) => ({ narration: sentences[sentence] ?? "" })).filter((beat) => beat.narration),
    pieces,
    illustrationGap: explanation.illustrationGap,
    built,
  };
};

export const auditPlan = (scenes: FilmScene[]) => {
  const warnings: string[] = [];
  scenes.forEach((scene, index) => {
    if (!scene.pieces.length) warnings.push(`Scene ${index + 1} has nothing to show.`);
    if (scene.pieces.length > 2) warnings.push(`Scene ${index + 1} has too many objects.`);
    for (const piece of scene.pieces) {
      const text = JSON.stringify(piece.props);
      if (text.length > 900) warnings.push(`Scene ${index + 1} is carrying too much copy.`);
    }
  });
  const primary = scenes.map((scene) => scene.pieces[0]?.component || scene.pieces[0]?.graphic || "");
  for (let index = 2; index < primary.length; index += 1) {
    if (primary[index] && primary[index] === primary[index - 1] && primary[index] === primary[index - 2]) {
      warnings.push(`Scenes ${index - 1}–${index + 1} repeat the same object (${primary[index]}).`);
    }
  }
  const layouts = scenes.map((scene) => `${scene.character.pose}:${scene.built}`);
  if (layouts.length >= 4 && new Set(layouts).size === 1) warnings.push("The film repeats one macro layout.");
  return warnings;
};
