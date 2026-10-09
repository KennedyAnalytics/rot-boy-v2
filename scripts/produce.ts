/**
 * Production path for a finished script.
 *
 *   FilmSpec and narration start together.
 *   timeChapters attaches the recording to that one plan.
 *   DirectedStage renders it.
 *   Deterministic QC, then one compact critic.
 *   At most one scoped repair. Audio remix never re-renders the picture.
 *
 *   node scripts/npx.mjs tsx scripts/produce.ts path/to/script.txt
 *   --plan=props-or-plan.json   reuse a plan
 *   --storyboard=board.json     normalize into the same FilmSpec
 *
 * The studio must already be running on http://127.0.0.1:8787.
 */
import fs from "fs";
import http from "http";
import path from "path";
import { needsNarration } from "../src/director/brief";
import type { StructuredPlan, TimedStructuredPlan } from "../src/film/structure-types";
import { splitSentences, timeChapters } from "../src/timing";
import type { Word } from "../src/types";

const STUDIO = process.env.STUDIO_URL || "http://127.0.0.1:8787";
const NOTES = process.env.PRODUCE_NOTES || "Paper, ink, and coral. Do not invent numbers that were not spoken.";
const args = process.argv.slice(2);
const planArg = args.find((arg) => arg.startsWith("--plan="));
const storyArg = args.find((arg) => arg.startsWith("--storyboard="));
const scriptPath = path.resolve(args.find((arg) => !arg.startsWith("--")) || "");
const out = path.resolve("out", process.env.OUT_NAME || "prod-supplied");

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

// Direction with a reasoning model can run far longer than fetch's 300 s
// header timeout, so the local studio is called over plain http without one.
const post = <T,>(url: string, body: unknown): Promise<T> =>
  new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const request = http.request(`${STUDIO}${url}`, { method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(data) } }, (response) => {
      let text = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => (text += chunk));
      response.on("end", () => {
        try {
          const payload = JSON.parse(text) as T & { error?: string };
          if ((response.statusCode ?? 500) >= 400) reject(new Error(payload.error || `${url} failed (${response.statusCode}).`));
          else resolve(payload);
        } catch (error) {
          reject(error);
        }
      });
    });
    request.setTimeout(0);
    request.on("error", reject);
    request.end(data);
  });

const token = (word: string) => word.toLowerCase().replace(/[^a-z0-9%]/g, "");

const main = async () => {
  if (!scriptPath || !fs.existsSync(scriptPath)) throw new Error("Pass the path to a finished script.");
  const supplied = fs.readFileSync(scriptPath, "utf8").trim();
  // Markdown emphasis (**bold**, __bold__) is formatting, not speech. It is
  // removed before narration and captions; the spoken words must be unchanged.
  const script = supplied.replace(/\*\*|__/g, "").trim();
  if (!script) throw new Error("The script file is empty.");
  const spokenWords = (text: string) => text.split(/\s+/).map((word) => word.replace(/[*_]/g, "")).filter(Boolean).join(" ");
  if (spokenWords(script) !== spokenWords(supplied)) throw new Error("Markup removal changed the spoken words.");
  if (needsNarration(script)) {
    throw new Error("This file looks like a topic or outline. Produce preserves a finished script and will not send it to the writer.");
  }

  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "input-script.txt"), `${script}\n`);
  if (supplied !== script) fs.writeFileSync(path.join(out, "supplied-script.txt"), `${supplied}\n`);

  const status = await fetch(`${STUDIO}/api/status`).then((response) => response.json());
  console.log("studio", status);

  console.log(`directing ${splitSentences(script).length} sentences, script unchanged`);
  const storyboard = storyArg ? JSON.parse(fs.readFileSync(path.resolve(storyArg.slice("--storyboard=".length)), "utf8")) : undefined;
  const stages: { stage: string; durationMs: number; model?: string | null; inputTokens?: number | null; outputTokens?: number | null; costUsd?: number | null; retries?: number }[] = [];
  const reuseVoice = () => {
    const priorPath = path.resolve(process.env.REUSE_PROPS || "");
    const prior = JSON.parse(fs.readFileSync(priorPath, "utf8")) as { words: Word[]; audioFile?: string | null };
    if (prior.audioFile && fs.existsSync(path.resolve("public", prior.audioFile))) return { audioFile: prior.audioFile, words: prior.words };
    const reuseName = process.env.REUSE_AUDIO_DIR || "reuse-mara";
    const audioDir = path.resolve("public", "jobs", reuseName);
    fs.mkdirSync(audioDir, { recursive: true });
    fs.copyFileSync(path.join(path.dirname(priorPath), "voice.mp3"), path.join(audioDir, "voice.mp3"));
    return { audioFile: `jobs/${reuseName}/voice.mp3`, words: prior.words };
  };
  const directStarted = Date.now();
  const voiceStarted = Date.now();
  const [directed, voice] = await Promise.all([
    planArg
      ? Promise.resolve({
          plan: JSON.parse(fs.readFileSync(path.resolve(planArg.slice("--plan=".length)), "utf8")) as StructuredPlan,
          warnings: [] as string[],
          gaps: [] as { chapter: string; gap: string | null }[],
          telemetry: null,
          filmSpec: null,
          coverage: {
            sentences: splitSentences(script).length,
            chapters: 0,
            trace: path.relative("public", path.dirname(path.resolve(planArg.slice("--plan=".length)))).replace(/\\/g, "/"),
          },
        })
      : post<{
          plan: StructuredPlan;
          warnings: string[];
          gaps: { chapter: string; gap: string | null }[];
          telemetry?: { model: string | null; inputTokens: number | null; outputTokens: number | null; costUsd: number | null; durationMs: number; retries: number };
          filmSpec?: unknown;
          coverage: { sentences: number; chapters: number; trace: string };
        }>("/api/direct", { script, notes: NOTES, characterMode: "auto", storyboard }),
    process.env.REUSE_PROPS
      ? Promise.resolve(reuseVoice())
      : post<{ audioFile: string; words: Word[] }>("/api/voice", { script }),
  ]);
  stages.push({
    stage: "filmspec",
    durationMs: directed.telemetry?.durationMs ?? Date.now() - directStarted,
    model: directed.telemetry?.model ?? null,
    inputTokens: directed.telemetry?.inputTokens ?? null,
    outputTokens: directed.telemetry?.outputTokens ?? null,
    costUsd: directed.telemetry?.costUsd ?? null,
    retries: directed.telemetry?.retries ?? 0,
  });
  stages.push({ stage: "narration", durationMs: Date.now() - voiceStarted });
  directed.coverage.chapters = directed.plan.chapters.length;
  if (directed.filmSpec) fs.writeFileSync(path.join(out, "film-spec.json"), JSON.stringify(directed.filmSpec, null, 2));

  const spoken = directed.plan.chapters.flatMap((chapter) => chapter.beats.map((beat) => beat.narration)).join(" ");
  const preserved = normalize(spoken) === normalize(splitSentences(script).join(" "));
  if (!preserved) {
    fs.writeFileSync(path.join(out, "script-mismatch.txt"), `${normalize(splitSentences(script).join(" "))}\n\n---\n\n${normalize(spoken)}\n`);
    throw new Error("The structured plan changed the supplied script. See script-mismatch.txt.");
  }
  console.log("script preserved");
  console.log(process.env.REUSE_PROPS ? `reusing narration, ${voice.words.length} words` : "narration recorded alongside the FilmSpec");
  const timed = timeChapters(directed.plan.chapters, voice.words);
  if (timed.clock !== "alignment") throw new Error("Timing fell back to the estimate. Production requires the recording.");

  const plan: TimedStructuredPlan = {
    direction:directed.plan.direction,
    safeProfile:directed.plan.safeProfile,
    title: directed.plan.title,
    spine: directed.plan.spine,
    example: directed.plan.example,
    chapters: timed.chapters,
    durationSec: timed.durationSec,
    executions: directed.plan.executions,
    sources: directed.plan.sources,
  };

  const usable = voice.words.filter((word) => token(word.text));
  let cursor = 0;
  const beats = plan.chapters.flatMap((chapter, chapterIndex) =>
    chapter.beats.map((beat) => {
      const need = beat.narration.split(/\s+/).map(token).filter(Boolean);
      const start = cursor;
      need.forEach((piece) => {
        const lookahead = usable.slice(cursor, cursor + 8).findIndex((word) => token(word.text) === piece);
        if (lookahead >= 0) cursor += lookahead + 1;
        else if (cursor < usable.length) cursor += 1;
      });
      const slice = usable.slice(start, cursor);
      let heardIndex = 0;
      const matched = need.filter((piece) => {
        const found = slice.slice(heardIndex).findIndex((word) => token(word.text) === piece);
        if (found < 0) return false;
        heardIndex += found + 1;
        return true;
      }).length;
      return {
        chapter: chapterIndex + 1,
        name: chapter.name,
        start: Number(beat.start.toFixed(3)),
        end: Number(beat.end.toFixed(3)),
        narration: beat.narration,
        heard: slice.map((word) => word.text).join(" "),
        tokens: need.length,
        matched,
      };
    }),
  );
  const tokenTotal = beats.reduce((sum, beat) => sum + beat.tokens, 0);
  const tokenMatched = beats.reduce((sum, beat) => sum + beat.matched, 0);

  const props = { plan, words: timed.words, audioFile: voice.audioFile };
  fs.writeFileSync(path.join(out, "props.json"), JSON.stringify(props, null, 2));
  fs.writeFileSync(path.join(out, "timing.json"), JSON.stringify({ clock: timed.clock, durationSec: timed.durationSec, audioFile: voice.audioFile, beats }, null, 2));
  fs.copyFileSync(path.resolve("public", voice.audioFile), path.join(out, `voice${path.extname(voice.audioFile)}`));
  fs.writeFileSync(
    path.join(out, "summary.json"),
    JSON.stringify(
      {
        source: "supplied-script",
        scriptPreserved: true,
        clock: timed.clock,
        title: plan.title,
        words: script.split(/\s+/).filter(Boolean).length,
        alignedWords: voice.words.length,
        tokenMatch: tokenTotal ? Number((tokenMatched / tokenTotal).toFixed(3)) : 0,
        durationSec: Number(timed.durationSec.toFixed(2)),
        spine: plan.spine,
        example: plan.example,
        warnings: directed.warnings,
        gaps: directed.gaps,
        trace: directed.coverage.trace,
        grammars: plan.executions?.map((execution) => ({ chapterId: execution.chapterId, medium: execution.medium, materialId: execution.materialId, grammar: execution.grammar, intentionalRepeat: execution.intentionalRepeat })),
        chapters: plan.chapters.map((chapter, index) => ({
          n: index + 1,
          name: chapter.name,
          presenter: chapter.presenter,
          recap: chapter.recap,
          built: chapter.built,
          medium: plan.executions?.find((execution) => execution.chapterId === chapter.id)?.medium ?? "house_graphic",
          sentences: chapter.sentenceIndexes.length,
          start: Number(chapter.start.toFixed(2)),
          end: Number(chapter.end.toFixed(2)),
          stage: chapter.stage,
          gap: chapter.illustrationGap,
          beats: chapter.beats.map((beat) => ({
            state: beat.state,
            pill: beat.pill ? `${beat.pill.term} = ${beat.pill.is}` : null,
            card: beat.card ? beat.card.kicker : null,
            stamp: beat.stamp ? beat.stamp.label : null,
            start: Number(beat.start.toFixed(2)),
            end: Number(beat.end.toFixed(2)),
            narration: beat.narration,
          })),
        })),
      },
      null,
      2,
    ),
  );

  console.log(`spine: ${plan.spine.join(" > ")}`);
  console.log(`example: ${plan.example ? `${plan.example.name} — ${plan.example.what}` : "none"}`);
  console.log(`clock: ${timed.clock}, duration ${timed.durationSec.toFixed(1)}s, token match ${(100 * tokenMatched / tokenTotal).toFixed(1)}%`);
  if (directed.warnings.length) console.log(`warnings:\n- ${directed.warnings.join("\n- ")}`);
  if (tokenTotal && tokenMatched / tokenTotal < 0.9) {
    throw new Error(`Alignment matched only ${tokenMatched}/${tokenTotal} narration tokens. Not rendering.`);
  }

  const finish = (extra: Record<string, unknown> = {}) => {
    fs.writeFileSync(path.join(out, "telemetry.json"), JSON.stringify({ stages, repairRounds: extra.repairRounds ?? 0, criticCalls: extra.criticCalls ?? 0, ...extra }, null, 2));
  };

  if (process.env.SKIP_STUDIO_RENDER) {
    finish();
    console.log(`props written to ${path.relative(process.cwd(), out)}; render with scripts/render-continuity.ts`);
    return;
  }
  console.log("rendering 1080×1920");
  const job = await post<{ id: string; done: boolean; error: string | null; url: string | null; progress: number }>("/api/render", props);
  const started = Date.now();
  let latest = job;
  while (!latest.done) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const response = await fetch(`${STUDIO}/api/render/${job.id}`);
    latest = (await response.json()) as typeof job;
    const minutes = ((Date.now() - started) / 60000).toFixed(1);
    console.log(`render ${Math.round(latest.progress * 100)}% (${minutes} min)`);
  }
  if (latest.error || !latest.url) throw new Error(latest.error || "Render finished without a file.");
  const video = path.resolve("public", latest.url.replace(/^\//, ""));
  fs.copyFileSync(video, path.join(out, "film.mp4"));
  stages.push({ stage: "render", durationMs: Date.now() - started });

  let criticCalls = 0;
  let repairRounds = 0;
  if (process.env.SKIP_REVIEW !== "1") {
    const reviewStarted = Date.now();
    try {
      const { reviewCompact } = await import("./compact-review.ts");
      const review = await reviewCompact(out);
      criticCalls = review.calls;
      stages.push({ stage: "critic", durationMs: Date.now() - reviewStarted, retries: 0 });
      const blocking = review.defects.filter((defect) => defect.severity === "blocking");
      if (blocking.length && process.env.SKIP_REPAIR !== "1" && directed.filmSpec) {
        repairRounds = 1;
        console.log(`one scoped repair for ${blocking.length} blocking defect(s)`);
        try {
          const studio = (await fetch(`${STUDIO}/api/status`).then((response) => response.json())) as { llm?: string };
          if (studio.llm === "openai" || studio.llm === "anthropic") process.env.LLM_PROVIDER = studio.llm;
          const { repairFilmSpec } = await import("../server/repair-spec.ts");
          const repaired = await repairFilmSpec(directed.filmSpec as never, splitSentences(script), blocking);
          stages.push({ stage: "repair", durationMs: repaired.telemetry.durationMs, model: repaired.telemetry.model, inputTokens: repaired.telemetry.inputTokens, outputTokens: repaired.telemetry.outputTokens, costUsd: repaired.telemetry.costUsd, retries: 0 });
          fs.writeFileSync(path.join(out, "repair-patch.json"), JSON.stringify(repaired.patch, null, 2));
          fs.writeFileSync(path.join(out, "film-spec.json"), JSON.stringify(repaired.spec, null, 2));
          const timedRepair = timeChapters(repaired.plan.chapters, voice.words);
          const nextPlan: TimedStructuredPlan = {
            ...plan,
            direction: repaired.plan.direction,
            executions: repaired.plan.executions,
            sources: repaired.plan.sources,
            chapters: timedRepair.chapters,
            durationSec: timedRepair.durationSec,
          };
          const touched = new Set(repaired.patch.chapterIds);
          const spans = nextPlan.chapters.filter((chapter) => touched.has(chapter.id));
          if (spans.length) {
            const { splicePictureSpan } = await import("./splice-span.ts");
            const start = Math.min(...spans.map((chapter) => chapter.start));
            const end = Math.max(...spans.map((chapter) => chapter.end));
            await splicePictureSpan({ plan: nextPlan, words: voice.words, audioFile: voice.audioFile }, path.join(out, "film.mp4"), start, end, path.join(out, "film-repaired.mp4"));
            fs.copyFileSync(path.join(out, "film-repaired.mp4"), path.join(out, "film.mp4"));
          }
        } catch (error) {
          fs.writeFileSync(path.join(out, "repair-failed.txt"), error instanceof Error ? error.message : String(error));
        }
      }
    } catch (error) {
      fs.writeFileSync(path.join(out, "review-failed.txt"), error instanceof Error ? error.message : String(error));
    }
  }
  finish({ criticCalls, repairRounds });
  console.log(`wrote ${path.relative(process.cwd(), out)}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
