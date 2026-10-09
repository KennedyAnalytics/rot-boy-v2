/**
 * One FilmSpec call for the whole film. Beat timing, material binding, and
 * grammar variety are validated in code. There is no per-chapter beat pass
 * and no per-chapter stage pass.
 */
import fs from "fs";
import path from "path";
import { extractJson } from "../src/director/normalize";
import { assertStoryboardHonored, compileFilmSpec, filmSpecSystem, storyboardCompiles } from "../src/film/film-spec";
import { styleRules } from "../src/film/style-guide";
import { splitSentences } from "../src/timing";
import { acquireSources } from "./capture";
import { complete } from "./llm";
import { stageTelemetry, type StageTelemetry } from "./telemetry";

const numbered = (sentences: string[]) => sentences.map((sentence, index) => `${index}. ${sentence}`).join("\n");

const writePlan = (
  trace: string,
  compiled: ReturnType<typeof compileFilmSpec>,
  telemetry: StageTelemetry,
  sentences: string[],
) => {
  fs.writeFileSync(path.join(trace, "film-spec.json"), JSON.stringify(compiled.spec, null, 2));
  fs.writeFileSync(path.join(trace, "plan.json"), JSON.stringify(compiled.plan, null, 2));
  fs.writeFileSync(path.join(trace, "telemetry.json"), JSON.stringify(telemetry, null, 2));
  fs.writeFileSync(
    path.join(trace, "coverage.json"),
    JSON.stringify(
      {
        sentences: sentences.length,
        chapters: compiled.plan.chapters.length,
        beats: compiled.plan.chapters.reduce((sum, chapter) => sum + chapter.beats.length, 0),
        grammars: [...new Set(compiled.spec.executions.map((execution) => execution.grammar))],
        mediums: compiled.spec.executions.map((execution) => ({ chapterId: execution.chapterId, medium: execution.medium, materialId: execution.materialId, grammar: execution.grammar })),
        modelCalls: telemetry.retries + (telemetry.model ? 1 : 0),
        warnings: compiled.warnings,
      },
      null,
      2,
    ),
  );
};

export const directStructure = async (script: string, notes: string, storyboard?: unknown) => {
  const sentences = splitSentences(script);
  if (!sentences.length) throw new Error("Write a script before designing the video.");

  const trace = path.resolve("public", "jobs", `structure-${Date.now()}`);
  fs.mkdirSync(trace, { recursive: true });
  fs.writeFileSync(path.join(trace, "script.txt"), script);
  if (storyboard) fs.writeFileSync(path.join(trace, "storyboard.json"), JSON.stringify(storyboard, null, 2));

  const started = Date.now();
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let model: string | null = null;
  let retries = 0;

  let compiled = storyboard ? storyboardCompiles(storyboard, sentences) : null;
  if (compiled && storyboard) assertStoryboardHonored(storyboard, compiled.spec);

  if (!compiled) {
    console.log(`film spec for ${sentences.length} sentences${storyboard ? " from a supplied storyboard" : ""}`);
    let lastError = "";
    let lastText = "";
    for (let attempt = 0; attempt < 3 && !compiled; attempt += 1) {
      const reply = await complete(
        filmSpecSystem,
        [
          storyboard
            ? "A storyboard was supplied. Normalize it into this same FilmSpec. Keep every supplied sentence span, medium, and source. Use judgment only to fill missing execution details."
            : "Write one FilmSpec for this whole film.",
          styleRules,
          "The script, one numbered sentence per line:",
          numbered(sentences),
          `Creator notes:\n${notes || "None."}`,
          storyboard ? `Supplied storyboard:\n${JSON.stringify(storyboard).slice(0, 80000)}` : "",
          lastError ? `The validator rejected the previous FilmSpec: ${lastError}\nReturn the complete corrected FilmSpec. Previous reply:\n${lastText.slice(0, 60000)}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
        24000,
      );
      model = reply.model ?? model;
      if (reply.inputTokens != null) inputTokens = (inputTokens ?? 0) + reply.inputTokens;
      if (reply.outputTokens != null) outputTokens = (outputTokens ?? 0) + reply.outputTokens;
      lastText = reply.text;
      fs.writeFileSync(path.join(trace, `filmspec-attempt-${attempt + 1}.txt`), reply.text);
      try {
        compiled = compileFilmSpec(extractJson(reply.text), sentences);
        if (storyboard) assertStoryboardHonored(storyboard, compiled.spec);
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        retries += 1;
        compiled = null;
        fs.writeFileSync(path.join(trace, `filmspec-rejected-${attempt + 1}.txt`), lastError);
      }
    }
    if (!compiled) throw new Error(`FilmSpec failed validation: ${lastError}`);
  }

  const captured = await acquireSources(compiled.spec.sources, path.resolve("public", "sources"));
  compiled = {
    ...compiled,
    spec: { ...compiled.spec, sources: captured.sources },
    plan: { ...compiled.plan, sources: captured.sources },
    warnings: [...compiled.warnings, ...captured.warnings],
  };

  const telemetry = stageTelemetry({
    stage: "filmspec",
    model,
    inputTokens,
    outputTokens,
    durationMs: Date.now() - started,
    retries,
  });
  writePlan(trace, compiled, telemetry, sentences);

  const gaps = compiled.plan.chapters
    .filter((chapter) => chapter.illustrationGap)
    .map((chapter) => ({ chapter: chapter.id, gap: chapter.illustrationGap }));

  return {
    plan: compiled.plan,
    filmSpec: compiled.spec,
    warnings: compiled.warnings,
    gaps,
    telemetry,
    coverage: {
      sentences: sentences.length,
      chapters: compiled.plan.chapters.length,
      trace: path.relative(path.resolve("public"), trace).replace(/\\/g, "/"),
    },
  };
};
