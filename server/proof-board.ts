import fs from "fs";
import path from "path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { normalizeBoard } from "../src/board/normalize";
import { SCENE_FRAMES } from "../src/board/types";
import { extractJson } from "../src/director/normalize";
import { loadEnv } from "./env";
import { directBoard } from "./direct-board";

loadEnv();

const script = [
  "An agent that can spend money needs a ceiling before the first tool call.",
  "The ceiling is a number of dollars.",
  "Each call subtracts its own cost from what remains.",
  "At zero, the run stops, even when the task is half done.",
  "The stop is what makes the agent safe to leave on.",
].join(" ");

const outDir = path.resolve("public", "jobs", "board-proof");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "script.txt"), script);

const saved = path.join(outDir, "reply-1.txt");
const film = process.argv.includes("--from-saved")
  ? normalizeBoard(extractJson(fs.readFileSync(saved, "utf8")), script)
  : (await directBoard(script)).film;
fs.writeFileSync(path.join(outDir, "film.json"), JSON.stringify(film, null, 2));
console.log(JSON.stringify(film.scenes.map((scene) => ({ kicker: scene.kicker, title: scene.title, blocks: scene.blocks.map((block) => block.kind), narration: scene.narration })), null, 2));

console.log("bundling");
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), onProgress: () => undefined });
const composition = await selectComposition({ serveUrl, id: "BoardProof", inputProps: film });

for (let index = 0; index < film.scenes.length; index += 1) {
  const frame = index * SCENE_FRAMES + 80;
  const output = path.join(outDir, `scene-${index + 1}.png`);
  await renderStill({ composition, serveUrl, output, frame, inputProps: film });
  console.log("still", output);
}

const video = path.join(outDir, "video.mp4");
await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: video, inputProps: film, crf: 16 });
console.log("video", video);
