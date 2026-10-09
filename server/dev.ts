import fs from "fs";
import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import { capturePublicPage } from "./capture";
import { directStructure } from "./direct-structure";
import type { StructuredFilmProps, StructuredPlan } from "../src/film/structure-types";
import type { CharacterMode } from "../src/types";
import { llmProvider, loadEnv } from "./env";
import { writeScript } from "./llm";
import { getRender, startRender } from "./render";
import { synthesize } from "./voice";

loadEnv();

const modeOf = (value: unknown): CharacterMode => (value === "always" || value === "never" ? value : "auto");

/**
 * The structure pass decides where Corporate Defector stands.
 * `auto` leaves that decision alone. The other two are explicit creator overrides.
 */
const applyPresenter = (plan: StructuredPlan, mode: CharacterMode) => {
  if (mode === "auto") return { plan, note: null as string | null };
  let changed = false;
  const chapters = plan.chapters.map((chapter) => {
    const presenter = mode === "never" ? "away" : chapter.presenter === "away" ? "beside" : chapter.presenter;
    if (presenter !== chapter.presenter) changed = true;
    return { ...chapter, presenter };
  });
  const note =
    mode === "never"
      ? "Presenter forced off for every chapter."
      : changed
        ? "Presenter placed beside the stage in chapters that would have left him out."
        : null;
  const direction=plan.direction ? {...plan.direction,shots:plan.direction.shots.map(shot=>({...shot,presenter:mode==='never'?'away' as const:shot.presenter==='away'?'beside' as const:shot.presenter}))} : undefined;
  return { plan: { ...plan, chapters, direction }, note };
};

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/api/status", (_req, res) => {
  res.json({
    llm: llmProvider(),
    voice: Boolean(process.env.ELEVENLABS_API_KEY),
  });
});

app.post("/api/script", async (req, res) => {
  try {
    const topic = String(req.body.topic ?? "").trim();
    if (!topic) throw new Error("Give the video a topic.");
    res.json(await writeScript(topic, String(req.body.notes ?? "")));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Could not write the script." });
  }
});

app.post("/api/direct", async (req, res) => {
  try {
    const script = String(req.body.script ?? "").trim();
    if (!script) throw new Error("Paste or write a script first.");
    const characterMode = modeOf(req.body.characterMode);
    if (!llmProvider()) throw new Error("Add an API key before designing a video.");
    const notes = String(req.body.notes ?? "");
    const storyboard = req.body.storyboard ?? undefined;
    const directed = await directStructure(script, notes, storyboard);
    const presented = applyPresenter(directed.plan, characterMode);
    res.json({
      ...directed,
      plan: presented.plan,
      warnings: [...directed.warnings, ...(presented.note ? [presented.note] : [])],
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Could not design the video." });
  }
});

app.post("/api/voice", async (req, res) => {
  try {
    const script = String(req.body.script ?? "").trim();
    if (!script) throw new Error("There is no script to read.");
    const id = `voice-${Date.now()}`;
    res.json(await synthesize(script, id));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Could not record the narration." });
  }
});

app.post("/api/capture", async (req, res) => {
  try {
    const url = String(req.body.url ?? "").trim();
    const id = String(req.body.id ?? "capture").replace(/[^a-z0-9-]+/gi, "-").slice(0, 40) || "capture";
    const png = path.resolve("public", "sources", id, "capture.png");
    const shot = await capturePublicPage(url, png);
    fs.writeFileSync(path.resolve("public", "sources", id, "provenance.json"), JSON.stringify({ url, fetchedAt: new Date().toISOString(), tool: path.basename(shot.browser), bytes: shot.bytes, policy: "public-https" }, null, 2));
    res.json({ id, localPath: `sources/${id}/capture.png`, bytes: shot.bytes, provenance: `Captured ${url}` });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Could not capture that page." });
  }
});

app.post("/api/render", (req, res) => {
  const props = req.body as StructuredFilmProps;
  if (!props?.plan?.chapters?.length || !Number.isFinite(props.plan.durationSec)) {
    res.status(400).json({ error: "Design the video before rendering." });
    return;
  }
  const id = `render-${Date.now()}`;
  fs.mkdirSync(path.resolve("public", "jobs", id), { recursive: true });
  if (props.audioFile) {
    const source = path.resolve("public", props.audioFile);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.resolve("public", "jobs", id, "voice.mp3"));
    props.audioFile = fs.existsSync(source) ? `jobs/${id}/voice.mp3` : null;
  }
  res.json(startRender(id, props));
});

app.get("/api/render/:id", (req, res) => {
  const job = getRender(req.params.id);
  if (!job) {
    res.status(404).json({ error: "That render is not running." });
    return;
  }
  res.json(job);
});

const vite = await createViteServer({
  configFile: path.resolve("vite.config.ts"),
  server: { middlewareMode: true },
  appType: "custom",
});

app.use(vite.middlewares);

app.use(async (req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api")) return next();
  try {
    const template = fs.readFileSync(path.resolve("studio", "index.html"), "utf8");
    const html = await vite.transformIndexHtml(req.originalUrl, template);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (error) {
    vite.ssrFixStacktrace(error as Error);
    next(error);
  }
});

const port = 8787;
const server = app.listen(port, "127.0.0.1", () => {
  console.log(`Defector studio  http://127.0.0.1:${port}`);
});
// Direction is many model calls. The default Node request timeout would cut it off.
server.requestTimeout = 30 * 60 * 1000;
server.headersTimeout = 30 * 60 * 1000;
