/**
 * One scoped FilmSpec repair. The model may change the named chapters only.
 * A failed patch is logged and not retried.
 */
import { extractJson } from "../src/director/normalize";
import { applySpecPatch, type FilmSpec, type SpecPatch } from "../src/film/film-spec";
import { complete } from "./llm";
import { stageTelemetry, type StageTelemetry } from "./telemetry";

export const repairFilmSpec = async (
  spec: FilmSpec,
  sentences: string[],
  defects: { time?: number; issue: string; repair?: string; chapterId?: string }[],
) => {
  const started = Date.now();
  const chapterIds = [...new Set(defects.map((defect) => defect.chapterId).filter((id): id is string => Boolean(id)))].slice(0, Math.max(1, spec.chapters.length - 1));
  if (!chapterIds.length) throw new Error("Scoped repair needs a chapter id.");
  const reply = await complete(
    "You repair one FilmSpec. Return JSON only: { provenance, chapterIds, shots, events }. shots replace only the named chapters and must include every DirectionShot field plus medium, materialId, sourceId, grammar, intentionalRepeat, repeatReason. events replace only events whose cue.sentence sits in those chapters. Do not rewrite other chapters. Do not add a new planner, and do not change the spoken script.",
    JSON.stringify({
      chapterIds,
      defects,
      chapters: spec.chapters.map((chapter, index) => ({ id: `chapter-${index + 1}`, ...chapter })),
      shots: spec.direction.shots.map((shot, index) => ({ ...shot, ...spec.executions[index] })),
      events: spec.direction.events,
      sources: spec.sources,
    }),
    8000,
  );
  const patch = extractJson(reply.text) as SpecPatch;
  patch.chapterIds = chapterIds;
  patch.provenance = patch.provenance || "compact-review";
  const compiled = applySpecPatch(spec, patch, sentences);
  const telemetry: StageTelemetry = stageTelemetry({
    stage: "repair",
    model: reply.model,
    inputTokens: reply.inputTokens,
    outputTokens: reply.outputTokens,
    durationMs: Date.now() - started,
    retries: 0,
  });
  return { ...compiled, telemetry, patch };
};
