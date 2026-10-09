import fs from "fs";
import path from "path";
import { directorSystem, scriptSystem } from "../src/director/prompt";
import { extractJson, normalizePlan } from "../src/director/normalize";
import { splitSentences } from "../src/timing";
import type { CharacterMode, Scene, VideoPlan } from "../src/types";
import { llmProvider } from "./env";
import { responsesComplete } from "./openai-responses";

type Completion = { text: string; stopReason: string | null; outputTokens: number | null; inputTokens: number | null; model: string | null };

export const complete = async (system: string, user: string, maxTokens: number): Promise<Completion> => {
  const provider = llmProvider();
  if (!provider) {
    throw new Error("Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env. You can still paste a script and design a local draft.");
  }
  if (provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    const body = (await response.json()) as {
      content?: { text?: string }[];
      error?: { message?: string };
      stop_reason?: string;
      usage?: { output_tokens?: number };
    };
    if (!response.ok) throw new Error(body.error?.message || `Anthropic request failed (${response.status}).`);
    return {
      text: body.content?.map((block) => block.text ?? "").join("\n") ?? "",
      stopReason: body.stop_reason ?? null,
      outputTokens: body.usage?.output_tokens ?? null,
      inputTokens: (body.usage as { input_tokens?: number } | undefined)?.input_tokens ?? null,
      model: (body as { model?: string }).model ?? process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
    };
  }
  if (process.env.OPENAI_REASONING_EFFORT) {
    const result = await responsesComplete({ system, content: [{ type: "input_text", text: user }], maxOutputTokens: maxTokens, purpose: "filmspec" });
    const usage = result.usage as { output_tokens?: number; input_tokens?: number } | null;
    return { text: result.text, stopReason: result.status, outputTokens: usage?.output_tokens ?? null, inputTokens: usage?.input_tokens ?? null, model: result.model };
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  const body = (await response.json()) as {
    choices?: { finish_reason?: string; message?: { content?: string } }[];
    error?: { message?: string };
    usage?: { completion_tokens?: number };
  };
  if (!response.ok) throw new Error(body.error?.message || `OpenAI request failed (${response.status}).`);
  const choice = body.choices?.[0];
  return {
    text: choice?.message?.content ?? "",
    stopReason: choice?.finish_reason ?? null,
    outputTokens: body.usage?.completion_tokens ?? null,
    inputTokens: (body.usage as { prompt_tokens?: number } | undefined)?.prompt_tokens ?? null,
    model: (body as { model?: string }).model ?? process.env.OPENAI_MODEL ?? "gpt-4.1",
  };
};

const readJson = async (system: string, user: string, maxTokens: number) => {
  const first = await complete(system, user, maxTokens);
  try {
    return extractJson(first.text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "invalid JSON";
    const again = await complete(
      `${system}\n\nReturn one JSON object and nothing else. Escape quotes inside strings. Put a comma between every array item.`,
      `The previous reply was not valid JSON (${reason}). Return that same plan as valid JSON.\n\n${first.text.slice(0, 60000)}`,
      maxTokens,
    );
    return extractJson(again.text);
  }
};

export const writeScript = async (topic: string, notes: string) => {
  const parsed = (await readJson(
    scriptSystem,
    `Topic:\n${topic}\n\nNotes from the creator, follow them when they constrain the video:\n${notes || "None."}`,
    2500,
  )) as { title?: string; script?: string };
  const script = (parsed.script ?? "").trim();
  if (!script) throw new Error("The writer returned an empty script.");
  return { title: (parsed.title ?? topic).trim(), script };
};

const beatIndexes = (scene: Scene, sentences: string[], from = 0, to = sentences.length, claimed = new Set<number>()) => {
  const used = new Set<number>(claimed);
  return scene.beats.flatMap((beat) => {
    const index = sentences.findIndex((sentence, position) => position >= from && position < to && !used.has(position) && sentence === beat.narration);
    if (index < 0) return [];
    used.add(index);
    return [index];
  });
};

const claimedIndexes = (scenes: Scene[], sentences: string[]) => {
  const claimed = new Set<number>();
  scenes.forEach((scene) => {
    beatIndexes(scene, sentences, 0, sentences.length, claimed).forEach((index) => claimed.add(index));
  });
  return claimed;
};

export const directFilm = async (script: string, notes: string, characterMode: CharacterMode) => {
  const sentences = splitSentences(script);
  if (sentences.length === 0) throw new Error("Write a script before designing the video.");
  const trace = path.resolve("public", "jobs", `direct-${Date.now()}`);
  fs.mkdirSync(trace, { recursive: true });
  fs.writeFileSync(path.join(trace, "script.txt"), script);

  const scenes: Scene[] = [];
  const warnings: string[] = [];
  const passes: { from: number; to: number; stopReason: string | null; outputTokens: number | null; accepted: number[] }[] = [];
  let title = "";
  let chrome: VideoPlan["chrome"] = "kicker";
  let cursor = 0;

  while (cursor < sentences.length) {
    let width = Math.min(8, sentences.length - cursor);
    let windowEnd = Math.min(sentences.length, cursor + width);
    let accepted: Scene[] = [];
    let stopReason: string | null = null;
    let outputTokens: number | null = null;
    for (let attempt = 0; attempt < 3 && accepted.length === 0; attempt += 1) {
      const end = Math.min(sentences.length, cursor + width);
      windowEnd = end;
      const previous = scenes.at(-1);
      const passage = sentences.slice(cursor, end).map((sentence, offset) => `${cursor + offset}. ${sentence}`).join("\n");
      console.log(`directing sentences ${cursor + 1}-${end} attempt ${attempt + 1}`);
      const completion = await complete(
        directorSystem,
        [
          previous
            ? `This passage continues one film. Previous chapter: "${previous.chapter}". Previous picture: ${previous.intent}. Extend that picture when this passage is the same idea. Start a new picture when the idea turns.`
            : "This is the opening passage of the film.",
          "Direct only the numbered sentences below. Use those numbers as sentenceIndexes. Cover every one of them, and no others. Sentences that belong to one idea can share an evolving picture.",
          passage,
          `Creator notes:\n${notes || "None."}`,
        ].join("\n\n"),
        16000,
      );
      stopReason = completion.stopReason;
      outputTokens = completion.outputTokens;
      const passFile = `pass-${passes.length + 1}-attempt-${attempt + 1}.txt`;
      fs.writeFileSync(path.join(trace, passFile), completion.text);
      let normalized: ReturnType<typeof normalizePlan> | null = null;
      try {
        normalized = normalizePlan(extractJson(completion.text), script, characterMode);
      } catch {
        normalized = null;
      }
      const inSpan = (normalized?.plan.scenes ?? []).filter((scene) => {
        const indexes = beatIndexes(scene, sentences, cursor, end);
        return indexes.length > 0 && indexes.every((index) => index >= cursor && index < end);
      });
      const closed = completion.text.trimEnd().endsWith("}");
      if (completion.stopReason === "max_tokens" && !closed) inSpan.pop();
      const coveredNow = new Set(inSpan.flatMap((scene) => beatIndexes(scene, sentences, cursor, end)));
      let hole = cursor;
      while (hole < end && coveredNow.has(hole)) hole += 1;
      accepted = hole === cursor ? [] : inSpan.filter((scene) => beatIndexes(scene, sentences, cursor, end).every((index) => index < hole));
      if (!title && normalized?.plan.title) title = normalized.plan.title;
      if (normalized?.plan.chrome) chrome = normalized.plan.chrome;
      if (accepted.length === 0) width = Math.max(2, Math.floor(width / 2));
    }
    if (accepted.length === 0) {
      throw new Error(`Direction stopped at sentence ${cursor + 1} of ${sentences.length}. The remaining narration was not given a picture.`);
    }
    const acceptedIndexes = [...new Set(accepted.flatMap((scene) => beatIndexes(scene, sentences, cursor, windowEnd)))].sort((a, b) => a - b);
    scenes.push(...accepted);
    passes.push({ from: cursor + 1, to: windowEnd, stopReason, outputTokens, accepted: acceptedIndexes.map((index) => index + 1) });
    if (stopReason === "max_tokens") {
      warnings.push(`The reply for sentences ${cursor + 1}–${windowEnd} reached the output limit, so direction continued from the next undirected sentence.`);
    }
    const covered = claimedIndexes(scenes, sentences);
    const next = sentences.findIndex((_, index) => index >= cursor && !covered.has(index));
    if (next < 0) break;
    if (next === cursor) throw new Error(`Direction could not move past sentence ${cursor + 1}.`);
    cursor = next;
  }

  const covered = claimedIndexes(scenes, sentences);
  const missing = sentences.map((_, index) => index).filter((index) => !covered.has(index));
  if (missing.length > 0) {
    throw new Error(`Sentences ${missing.map((index) => index + 1).join(", ")} were not directed.`);
  }

  const chapters = [...new Set(scenes.map((scene) => scene.chapter))].slice(0, 8);
  const plan: VideoPlan = {
    title: title || "Untitled",
    chrome,
    chapters: chapters.length > 0 ? chapters : ["The idea"],
    scenes: scenes.map((scene, index) => ({ ...scene, id: `scene-${index + 1}` })),
  };
  fs.writeFileSync(path.join(trace, "coverage.json"), JSON.stringify({ sentences: sentences.length, passes, warnings }, null, 2));
  return { plan, warnings, coverage: { sentences: sentences.length, scenes: plan.scenes.length, passes, trace: path.relative(path.resolve("public"), trace).replace(/\\/g, "/") } };
};
