import fs from "fs";
import path from "path";
import { explanationSystem, materialSystem } from "../src/film/prompt";
import { auditPlan, explanationsFrom, inferPiece, piecesFrom, sceneFrom } from "../src/film/normalize";
import { materialBrief, shortlist } from "../src/film/retrieve";
import type { Explanation, FilmPlan, FilmScene } from "../src/film/types";
import { extractJson } from "../src/director/normalize";
import { splitSentences } from "../src/timing";
import type { CharacterMode } from "../src/types";
import { complete } from "./llm";

const queryOf = (explanation: Explanation) =>
  [explanation.intent, explanation.dominates, explanation.changes, explanation.needs.join(" "), explanation.facts.join(" ")].join("\n");

const materialize = async (explanation: Explanation, sentences: string[], previous: string[], notes: string, block: string[] = []) => {
  if (explanation.approach === "gap" && explanation.illustrationGap) {
    const line = explanation.payoff || explanation.facts[0] || explanation.intent;
    return [inferPiece(explanation.facts.length ? explanation.facts : [line], explanation.payoff)];
  }
  const list = shortlist(queryOf(explanation), 8, block);
  const narration = explanation.indexes.map((index) => sentences[index]).join(" ");
  const ask = async (extra: string) => {
    const completion = await complete(
      materialSystem,
      [
        extra,
        `Explain: ${explanation.intent}`,
        `Stays: ${explanation.persists || "nothing is required to stay"}`,
        `Changes: ${explanation.changes || "the scene can arrive and hold"}`,
        `Payoff: ${explanation.payoff || "the last fact"}`,
        `Dominates: ${explanation.dominates || "one object"}`,
        `Facts: ${explanation.facts.join(" | ") || "none supplied"}`,
        `Narration: ${narration}`,
        previous.length ? `Already used: ${previous.join(", ")}` : "Nothing has been used yet.",
        list.length ? `Shortlist:\n${JSON.stringify(materialBrief(list))}` : "No designed component is close. Use a precise graphic.",
        `Creator notes:\n${notes || "None."}`,
      ].join("\n\n"),
      5000,
    );
    return completion.text;
  };
  const allowed = new Set(list.map((item) => item.name));
  let text = "";
  try {
    text = await ask("Assemble this one scene.");
  } catch (error) {
    console.error(error);
    return [inferPiece(explanation.facts, explanation.payoff)];
  }
  let pieces = [inferPiece(explanation.facts, explanation.payoff)];
  try {
    pieces = piecesFrom(extractJson(text), allowed, explanation.facts, explanation.payoff);
  } catch {
    pieces = [inferPiece(explanation.facts, explanation.payoff)];
  }
  const designed = explanation.approach === "designed" || explanation.approach === "mixed";
  if (designed && list.length && pieces.every((piece) => piece.source !== "library")) {
    text = await ask("The last assembly did not use a valid component. Use an exact name from the shortlist, or a precise graphic if none of them is the object.");
    try {
      pieces = piecesFrom(extractJson(text), allowed, explanation.facts, explanation.payoff);
    } catch {
      pieces = pieces.length ? pieces : [inferPiece(explanation.facts, explanation.payoff)];
    }
  }
  return pieces;
};

export const directVisual = async (script: string, notes: string, characterMode: CharacterMode) => {
  const sentences = splitSentences(script);
  if (!sentences.length) throw new Error("Write a script before designing the video.");
  const trace = path.resolve("public", "jobs", `direct-${Date.now()}`);
  fs.mkdirSync(trace, { recursive: true });
  fs.writeFileSync(path.join(trace, "script.txt"), script);

  const explanations: Explanation[] = [];
  const warnings: string[] = [];
  const passes: { from: number; to: number; stopReason: string | null; outputTokens: number | null; accepted: number[] }[] = [];
  let title = "";
  let cursor = 0;

  while (cursor < sentences.length) {
    let width = Math.min(6, sentences.length - cursor);
    let accepted: Explanation[] = [];
    let stopReason: string | null = null;
    let outputTokens: number | null = null;
    let windowEnd = cursor;
    for (let attempt = 0; attempt < 3 && accepted.length === 0; attempt += 1) {
      const end = Math.min(sentences.length, cursor + width);
      windowEnd = end;
      const passage = sentences.slice(cursor, end).map((sentence, offset) => `${cursor + offset}. ${sentence}`).join("\n");
      const previous = explanations.at(-1);
      console.log(`directing sentences ${cursor + 1}-${end} attempt ${attempt + 1}`);
      const completion = await complete(
        explanationSystem,
        [
          previous
            ? `This passage continues one film. Previous explanation: ${previous.intent}. Extend that picture when this passage is the same idea. Start a new picture when the idea turns.`
            : "This is the opening passage of the film.",
          "Direct only the numbered sentences below. Cover every one of them, and no others.",
          passage,
          `Creator notes:\n${notes || "None."}`,
        ].join("\n\n"),
        8000,
      );
      stopReason = completion.stopReason;
      outputTokens = completion.outputTokens;
      fs.writeFileSync(path.join(trace, `pass-${passes.length + 1}-attempt-${attempt + 1}.txt`), completion.text);
      let parsed = { title: "", explanations: [] as Explanation[] };
      try {
        parsed = explanationsFrom(extractJson(completion.text), cursor, end);
      } catch {
        parsed = { title: "", explanations: [] };
      }
      if (!title && parsed.title) title = parsed.title;
      const closed = completion.text.trimEnd().endsWith("}");
      const batch = parsed.explanations;
      if (completion.stopReason === "max_tokens" && !closed) batch.pop();
      const coveredNow = new Set(batch.flatMap((scene) => scene.indexes));
      let hole = cursor;
      while (hole < end && coveredNow.has(hole)) hole += 1;
      accepted = hole === cursor ? [] : batch.filter((scene) => scene.indexes.every((index) => index < hole));
      if (!accepted.length) width = Math.max(2, Math.floor(width / 2));
    }
    if (!accepted.length) throw new Error(`Direction stopped at sentence ${cursor + 1} of ${sentences.length}.`);
    explanations.push(...accepted);
    const acceptedIndexes = [...new Set(accepted.flatMap((scene) => scene.indexes))].sort((a, b) => a - b);
    passes.push({ from: cursor + 1, to: windowEnd, stopReason, outputTokens, accepted: acceptedIndexes.map((index) => index + 1) });
    if (stopReason === "max_tokens") warnings.push(`The reply for sentences ${cursor + 1}–${windowEnd} reached the output limit, so direction continued.`);
    const covered = new Set(explanations.flatMap((scene) => scene.indexes));
    const next = sentences.findIndex((_, index) => index >= cursor && !covered.has(index));
    if (next < 0) break;
    if (next === cursor) throw new Error(`Direction could not move past sentence ${cursor + 1}.`);
    cursor = next;
  }

  const missing = sentences.map((_, index) => index).filter((index) => !explanations.some((scene) => scene.indexes.includes(index)));
  if (missing.length) throw new Error(`Sentences ${missing.map((index) => index + 1).join(", ")} were not directed.`);

  const scenes: FilmScene[] = [];
  for (const [index, explanation] of explanations.entries()) {
    const previous = scenes.flatMap((scene) => scene.pieces.map((piece) => piece.component)).filter(Boolean);
    console.log(`assembling scene ${index + 1}/${explanations.length}`);
    const pieces = await materialize(explanation, sentences, previous, notes);
    scenes.push(sceneFrom(explanation, pieces, sentences, index, characterMode));
  }

  for (let index = 1; index < scenes.length - 1; index += 1) {
    const name = scenes[index].pieces[0]?.component;
    if (!name || name !== scenes[index - 1].pieces[0]?.component || name !== scenes[index + 1].pieces[0]?.component) continue;
    const pieces = await materialize(explanations[index], sentences, [name], notes, [name]);
    scenes[index] = sceneFrom(explanations[index], pieces, sentences, index, characterMode);
  }

  warnings.push(...auditPlan(scenes));
  const plan: FilmPlan = {
    title: title || "Untitled",
    scenes: scenes.map((scene, index) => ({ ...scene, id: `scene-${index + 1}` })),
  };
  const gaps = plan.scenes.filter((scene) => scene.illustrationGap).map((scene) => ({ scene: scene.id, gap: scene.illustrationGap }));
  fs.writeFileSync(path.join(trace, "coverage.json"), JSON.stringify({ sentences: sentences.length, passes, warnings, gaps, built: plan.scenes.map((scene) => scene.built) }, null, 2));
  fs.writeFileSync(path.join(trace, "plan.json"), JSON.stringify(plan, null, 2));
  return {
    plan,
    warnings,
    gaps,
    coverage: { sentences: sentences.length, scenes: plan.scenes.length, passes, trace: path.relative(path.resolve("public"), trace).replace(/\\/g, "/") },
  };
};
