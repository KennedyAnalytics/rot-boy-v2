/**
 * One executable FilmSpec replaces structure, FilmDirection, per-chapter
 * beats, and per-chapter stage selection. The model writes this contract
 * once. Beat boundaries, material binding, and variety checks are code.
 */
import { directionFrom, directionSystem, type DirectionEvent, type DirectionShot, type FilmDirection } from "./direction";
import { executableMaterialById, executableMaterialIndex } from "../founding-toolset/arsenal";
import { FIT, auditStructure, chapterFrom, structureFrom } from "./structure-normalize";
import type { Beat, ChapterBrief, StructuredPlan, WorkedExample } from "./structure-types";
import type { FilmPiece } from "./types";
import { CAPTURE_MEDIUMS, VISUAL_MEDIUMS, type ShotExecution, type SourceAsset, type VisualMedium } from "./spec-types";

export type FilmSpec = {
  version: 1;
  title: string;
  spine: string[];
  example: WorkedExample | null;
  throughLine: string;
  caseObjectId?: string;
  chapters: ChapterBrief[];
  direction: FilmDirection;
  executions: ShotExecution[];
  sources: SourceAsset[];
};

const record = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null);

const clip = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const stateLabel = (value: unknown) => {
  const text = clip(value, 80);
  if (!text) return null;
  if (text.length <= FIT.state) return text.toUpperCase();
  const cut = text.slice(0, FIT.state + 1);
  const space = cut.lastIndexOf(" ");
  const next = (space > 4 ? cut.slice(0, space) : text.slice(0, FIT.state)).replace(/[,;:.\-]$/, "").trim();
  return next.toUpperCase() || null;
};

const mediumOf = (value: unknown): VisualMedium => {
  const text = String(value ?? "").trim() as VisualMedium;
  if ((VISUAL_MEDIUMS as readonly string[]).includes(text)) return text;
  throw new Error(`Unknown visual medium "${text}". Use one of ${VISUAL_MEDIUMS.join(", ")}.`);
};

const boxOf = (value: unknown) => {
  const item = record(value);
  if (!item) return null;
  const x = Number(item.x);
  const y = Number(item.y);
  const width = Number(item.width);
  const height = Number(item.height);
  if (![x, y, width, height].every((n) => Number.isFinite(n) && n >= 0 && n <= 1)) return null;
  if (width <= 0 || height <= 0 || x + width > 1.001 || y + height > 1.001) return null;
  return { x, y, width, height };
};

const sourceOf = (value: unknown): SourceAsset => {
  const item = record(value);
  if (!item) throw new Error("A source must be an object.");
  const id = clip(item.id, 40);
  if (!id) throw new Error("A source is missing an id.");
  const kind = String(item.kind ?? "webpage");
  const kinds = ["screenshot", "webpage", "interface", "recording", "image", "video", "document"];
  if (!kinds.includes(kind)) throw new Error(`Source ${id} has unsupported kind ${kind}.`);
  const highlightBox = boxOf(item.highlight);
  const highlightLabel = clip(record(item.highlight)?.label, 40);
  return {
    id,
    kind: kind as SourceAsset["kind"],
    url: clip(item.url, 300) || null,
    localPath: clip(item.localPath, 240) || null,
    provenance: clip(item.provenance, 240) || (clip(item.url, 300) ? `Retrieved from ${clip(item.url, 300)}` : "Supplied to the studio"),
    crop: boxOf(item.crop),
    highlight: highlightBox && highlightLabel ? { ...highlightBox, label: highlightLabel } : null,
  };
};

const defaultMaterial = (medium: VisualMedium) => {
  switch (medium) {
    case "house_graphic":
      return "house.directed-stage";
    case "ui_component_scene":
      return "ui.app-window";
    case "captured_interface":
      return "arsenal.interface-capture";
    case "captured_website":
    case "screenshot_scene":
      return "arsenal.browser-capture";
    case "screen_recording_scene":
      return "arsenal.device-frame";
    case "diagram_scene":
      return "arsenal.process-diagram";
    case "data_visualization_scene":
      return "arsenal.numeric-stage";
    case "document_scene":
      return "arsenal.document-page";
    case "generated_image_scene":
    case "real_world_image_scene":
      return "arsenal.product-still";
    case "generated_video_shot":
      return "arsenal.device-frame";
    case "mixed_scene":
      return "arsenal.mixed-annotation";
    default:
      return "house.directed-stage";
  }
};

const pieceFor = (materialId: string, facts: string[]): FilmPiece => ({
  source: "procedural",
  component: "",
  graphic: "diagram",
  props: { materialId },
  weight: 1,
  facts,
});

/** One beat per sentence. Mode and state come from the events cued in that sentence. */
export const beatsForChapter = (brief: ChapterBrief, sentences: string[], events: DirectionEvent[]): Beat[] =>
  brief.sentenceIndexes.map((index) => {
    const here = events.filter((event) => event.cue.sentence === index);
    const mode = here.some((event) => event.mode === "hypothetical")
      ? "hypothetical"
      : here.some((event) => event.mode === "recap") || brief.recap
        ? "recap"
        : "actual";
    const state = here.filter((event) => event.mode !== "hypothetical").at(-1)?.state ?? here.at(-1)?.state;
    return {
      sentenceIndexes: [index],
      narration: sentences[index] ?? "",
      mode,
      reveal: [],
      state: stateLabel(state),
      stateTone: "neutral" as const,
      pill: null,
      card: null,
      stamp: null,
    };
  });

const chapterIdFor = (raw: unknown, chapters: { id: string; name: string }[]) => {
  const text = clip(raw, 80);
  if (chapters.some((chapter) => chapter.id === text)) return text;
  const byName = chapters.find((chapter) => chapter.name.toLowerCase() === text.toLowerCase());
  if (byName) return byName.id;
  const number = Number(text);
  if (Number.isInteger(number) && chapters[number - 1]) return chapters[number - 1].id;
  return text;
};

const grammarOf = (shot: Record<string, unknown>, medium: VisualMedium) => clip(shot.grammar, 40) || medium.replace(/_scene$|_shot$/, "").replace(/_/g, "-");

/**
 * Validate one model reply, or a supplied storyboard, into the plan the
 * renderer already consumes. Throws on a contract failure so the single
 * planning call can correct itself. There is no second planner.
 */
export const compileFilmSpec = (raw: unknown, sentences: string[]): { spec: FilmSpec; plan: StructuredPlan; warnings: string[] } => {
  const body = record(raw);
  if (!body) throw new Error("FilmSpec must be a JSON object.");
  const structure = structureFrom(body, sentences.length);
  if (!structure.chapters.length) throw new Error("FilmSpec returned no chapters.");
  if (structure.covered < sentences.length) {
    throw new Error(`FilmSpec covered ${structure.covered} of ${sentences.length} sentences. Every sentence needs exactly one chapter.`);
  }
  const chapters = structure.chapters.map((chapter, index) => ({ ...chapter, id: `chapter-${index + 1}` }));
  const idByName = chapters.map((chapter) => ({ id: chapter.id, name: chapter.name }));

  const objects = Array.isArray(body.objects) ? body.objects : [];
  const events = Array.isArray(body.events) ? body.events : [];
  const incomingShots = Array.isArray(body.shots) ? body.shots : [];
  if (!incomingShots.length) throw new Error("FilmSpec has no shots.");

  const shots: DirectionShot[] = [];
  const executions: ShotExecution[] = [];
  incomingShots.forEach((entry) => {
    const shot = record(entry);
    if (!shot) return;
    const chapterId = chapterIdFor(shot.chapterId, idByName);
    const cue = record(shot.cue) ?? {};
    const medium = mediumOf(shot.medium ?? "house_graphic");
    const materialId = clip(shot.materialId, 80) || defaultMaterial(medium);
    if (!executableMaterialById.has(materialId)) throw new Error(`Unknown material id "${materialId}". Copy an id from the registry.`);
    const grammar = grammarOf(shot, medium);
    const intentionalRepeat = shot.intentionalRepeat === true;
    const repeatReason = clip(shot.repeatReason, 160) || null;
    if (intentionalRepeat && !repeatReason) throw new Error(`Shot "${cue.phrase}" repeats on purpose but gives no repeatReason.`);
    const sourceId = clip(shot.sourceId, 40) || null;
    shots.push({
      chapterId,
      cue: { phrase: clip(cue.phrase, 120), sentence: cue.sentence as number },
      boundary: shot.boundary as DirectionShot["boundary"],
      composition: shot.composition as DirectionShot["composition"],
      objectIds: Array.isArray(shot.objectIds) ? shot.objectIds.map((id) => String(id)) : [],
      focus: String(shot.focus ?? ""),
      presenter: shot.presenter as DirectionShot["presenter"],
      recapRefs: Array.isArray(shot.recapRefs) ? shot.recapRefs.map((id) => String(id)) : [],
    });
    executions.push({
      chapterId,
      phrase: clip(cue.phrase, 120),
      sentence: typeof cue.sentence === "number" ? cue.sentence : Number(cue.sentence),
      medium,
      materialId,
      sourceId,
      grammar,
      intentionalRepeat,
      repeatReason,
    });
  });

  const sources = (Array.isArray(body.sources) ? body.sources : []).map(sourceOf);
  const sourceIds = new Set(sources.map((source) => source.id));
  if (sourceIds.size !== sources.length) throw new Error("Source ids must be unique.");

  const directionInput = {
    version: 1 as const,
    throughLine: clip(body.throughLine, 80) || structure.title || "The mechanism",
    caseObjectId: clip(body.caseObjectId, 40) || undefined,
    objects,
    events,
    shots,
  };
  const direction = directionFrom(directionInput, { chapters: chapters.map((chapter) => ({ ...chapter, beats: [], pieces: [], built: "" })) }, sentences);

  executions.forEach((execution, index) => {
    const shot = direction.shots[index];
    if (!shot) return;
    execution.chapterId = shot.chapterId;
    execution.phrase = shot.cue.phrase;
    execution.sentence = shot.cue.sentence;
    if (CAPTURE_MEDIUMS.includes(execution.medium)) {
      if (!execution.sourceId || !sourceIds.has(execution.sourceId)) {
        throw new Error(`Shot "${execution.phrase}" uses ${execution.medium} without a source in sources[].`);
      }
      const source = sources.find((item) => item.id === execution.sourceId);
      if (source && !source.url && !source.localPath) throw new Error(`Source ${source.id} needs a public https URL or a local path.`);
    }
  });

  const ordered = executions.map((execution, index) => ({ execution, index })).sort((a, b) => a.execution.sentence - b.execution.sentence || a.index - b.index);
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1].execution;
    const current = ordered[index].execution;
    if (previous.grammar === current.grammar && !current.intentionalRepeat) {
      throw new Error(`Consecutive shots both use the "${current.grammar}" grammar. Change the grammar, or set intentionalRepeat with a story reason.`);
    }
  }

  const planChapters = chapters.map((chapter, index) => {
    const brief: ChapterBrief = {
      name: chapter.name,
      sentenceIndexes: chapter.sentenceIndexes,
      stage: chapter.stage,
      persists: chapter.persists,
      changes: chapter.changes,
      payoff: chapter.payoff,
      presenter: chapter.presenter,
      facts: chapter.facts,
      needs: chapter.needs,
      recap: chapter.recap,
      illustrationGap: chapter.illustrationGap,
    };
    const entry = executions.find((execution) => execution.chapterId === chapter.id);
    const built = chapterFrom(brief, beatsForChapter(brief, sentences, direction.events), [pieceFor(entry?.materialId ?? "house.directed-stage", brief.facts)], index);
    return { ...built, built: entry?.materialId ?? built.built };
  });

  const spec: FilmSpec = {
    version: 1,
    title: structure.title || "Untitled",
    spine: planChapters.map((chapter) => chapter.name),
    example: structure.example,
    throughLine: direction.throughLine,
    caseObjectId: direction.caseObjectId,
    chapters: planChapters.map(({ beats: _beats, pieces: _pieces, built: _built, id: _id, ...brief }) => brief),
    direction,
    executions,
    sources,
  };
  const plan: StructuredPlan = {
    direction,
    safeProfile: "reels",
    title: spec.title,
    spine: spec.spine,
    example: spec.example,
    chapters: planChapters,
    executions,
    sources,
  };
  const warnings = auditStructure(plan);
  const grammars = new Set(executions.map((execution) => execution.grammar));
  if (executions.length >= 4 && grammars.size < 3) {
    warnings.push(`The film uses ${grammars.size} explanatory grammars across ${executions.length} shots. Variety is thin.`);
  }
  return { spec, plan, warnings };
};

/** A supplied storyboard that already satisfies the contract needs no model call. */
export const storyboardCompiles = (storyboard: unknown, sentences: string[]) => {
  try {
    return compileFilmSpec(storyboard, sentences);
  } catch {
    return null;
  }
};

/**
 * When a storyboard names sentence spans or mediums, the compiled spec has to
 * keep them. The model may fill execution details. It may not replace the plan.
 */
export const assertStoryboardHonored = (storyboard: unknown, spec: FilmSpec) => {
  const body = record(storyboard);
  if (!body) return;
  const supplied = Array.isArray(body.chapters) ? body.chapters : [];
  supplied.forEach((entry, index) => {
    const item = record(entry);
    const indexes = Array.isArray(item?.sentenceIndexes) ? item.sentenceIndexes.map(Number) : [];
    if (!indexes.length) return;
    const chapter = spec.chapters[index];
    if (!chapter || indexes.some((sentence, offset) => chapter.sentenceIndexes[offset] !== sentence)) {
      throw new Error(`Storyboard chapter ${index + 1} sentence span was replaced.`);
    }
  });
  const suppliedShots = Array.isArray(body.shots) ? body.shots : [];
  suppliedShots.forEach((entry) => {
    const shot = record(entry);
    if (!shot?.medium) return;
    const cue = record(shot.cue);
    const phrase = clip(cue?.phrase, 120);
    const kept = spec.executions.find((execution) => execution.phrase === phrase);
    if (phrase && kept && kept.medium !== shot.medium) throw new Error(`Storyboard shot "${phrase}" changed medium from ${shot.medium} to ${kept.medium}.`);
  });
};

export const executionFor = (
  list: ShotExecution[] | undefined,
  shot: { chapterId: string; cue: { phrase: string; sentence: number } },
) => {
  if (!list?.length) return undefined;
  return (
    list.find((execution) => execution.chapterId === shot.chapterId && execution.sentence === shot.cue.sentence && execution.phrase === shot.cue.phrase) ??
    list.find((execution) => execution.chapterId === shot.chapterId && execution.sentence === shot.cue.sentence) ??
    list.find((execution) => execution.chapterId === shot.chapterId)
  );
};

export const usesHouseGlyphs = (execution?: { medium: string; materialId: string } | null) => {
  if (!execution) return true;
  if (execution.materialId === "arsenal.text-treatment") return false;
  if (execution.medium !== "house_graphic") return false;
  return execution.materialId.startsWith("house.") || execution.materialId.startsWith("action.");
};

const registryLines = executableMaterialIndex.map((item) => `${item.id} — ${item.intent}`).join("\n");

export const filmSpecSystem = `${directionSystem.replace(
  "Return FilmDirection JSON with version:1, throughLine:string, objects:[], events:[], shots:[].",
  "Those objects, events, and shots belong inside one FilmSpec. Do not return a bare FilmDirection.",
)}

You are the only creative planner for this film. There is no later beat pass, stage pass, or material-selection agent. Choose the explanatory grammar yourself by naming a stable material id.

Return one FilmSpec JSON object:
{
  "version": 1,
  "title": string,
  "spine": string[],
  "example": { "name": string, "what": string } | null,
  "throughLine": string,
  "caseObjectId": string,
  "chapters": [{ "name": string, "sentenceIndexes": number[], "stage": string, "persists": string, "changes": string, "payoff": string, "presenter": "lead"|"beside"|"away", "facts": string[], "needs": string[], "recap": boolean, "illustrationGap": string|null }],
  "objects": [],
  "events": [],
  "shots": [{ "chapterId": "chapter-1", "cue": { "phrase": string, "sentence": number }, "boundary": "carry"|"transform"|"reframe"|"reset", "composition": "detail"|"system"|"comparison"|"recap", "objectIds": string[], "focus": string, "presenter": "lead"|"beside"|"away"|"address", "recapRefs": string[], "medium": string, "materialId": string, "sourceId": string|null, "grammar": string, "intentionalRepeat": boolean, "repeatReason": string|null }],
  "sources": [{ "id": string, "kind": "webpage"|"interface"|"screenshot"|"recording"|"image"|"video"|"document", "url": string|null, "localPath": string|null, "provenance": string, "crop": null, "highlight": null }]
}

Chapter rules: three to six chapters, spine labels of one short noun, every sentence in exactly one contiguous chapter starting at sentence 0. chapterId is chapter-1 in spine order. The worked example name is at most 18 characters and must be spoken.

Medium is one of: ${VISUAL_MEDIUMS.join(", ")}.
materialId is copied exactly from this registry:
${registryLines}

grammar is a short name for how the shot explains (house-objects, browser, process-diagram, crm, spreadsheet, document, numeric, conversation, timeline, comparison, map, statement, device). Two consecutive shots must not share a grammar unless intentionalRepeat is true and repeatReason says why the story needs the repetition (continuity, retrieval, comparison, or state progression).

Capture mediums (captured_interface, captured_website, screenshot_scene, screen_recording_scene, generated_image_scene, generated_video_shot, real_world_image_scene, mixed_scene) require a source. Use one only when you have a real public https URL or a local path that was supplied. Never invent a URL. Never point at a login wall. If you do not have a permitted source, choose a studio-owned grammar instead.

Prefer a new grammar when the idea changes. Keep house_graphic when the scene is about persistent objects moving. Use ui_component_scene for software, diagram_scene for a mechanism, data_visualization_scene for a spoken number, document_scene for paper, and a capture medium for a real page.`;

export type SpecPatch = {
  provenance: string;
  chapterIds: string[];
  shots?: unknown[];
  events?: unknown[];
};

/** Replace shots and events for the named chapters only, then revalidate the whole spec. */
export const applySpecPatch = (spec: FilmSpec, patch: SpecPatch, sentences: string[]) => {
  const touched = new Set(patch.chapterIds);
  if (!touched.size) throw new Error("A repair patch must name the chapters it changes.");
  if (touched.size >= spec.chapters.length && spec.chapters.length > 1) throw new Error("Repair must leave at least one chapter untouched.");
  const sentenceIn = (index: number) => {
    const chapter = spec.chapters.find((item, position) => touched.has(`chapter-${position + 1}`) && item.sentenceIndexes.includes(index));
    return Boolean(chapter);
  };
  const keptEvents = spec.direction.events.filter((event) => !sentenceIn(event.cue.sentence));
  const incomingEvents = (Array.isArray(patch.events) ? patch.events : []).filter((entry) => {
    const cue = record(record(entry)?.cue);
    return cue ? sentenceIn(Number(cue.sentence)) : false;
  });
  const keptShots = spec.direction.shots
    .map((shot, index) => ({ shot, execution: spec.executions[index] }))
    .filter((item) => item.execution && !touched.has(item.execution.chapterId));
  const raw = {
    version: 1,
    title: spec.title,
    example: spec.example,
    throughLine: spec.throughLine,
    caseObjectId: spec.caseObjectId,
    chapters: spec.chapters.map((chapter, index) => ({ ...chapter, sentenceIndexes: chapter.sentenceIndexes })),
    objects: spec.direction.objects,
    events: [...keptEvents, ...incomingEvents],
    shots: [
      ...keptShots.map((item) => ({ ...item.shot, ...item.execution })),
      ...(Array.isArray(patch.shots) ? patch.shots : []),
    ],
    sources: spec.sources,
  };
  return compileFilmSpec(raw, sentences);
};
