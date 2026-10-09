import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { withAlias } from "../remotion.config";

const props = JSON.parse(fs.readFileSync("out/unseen/props.json", "utf8"));
console.log("bundling");
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), webpackOverride: (current) => withAlias(current) });
const composition = await selectComposition({ serveUrl, id: "Film", inputProps: props });
fs.mkdirSync("out/unseen", { recursive: true });

for (const scene of props.plan.scenes) {
  const frame = Math.max(0, Math.round((scene.start + (scene.end - scene.start) * 0.72) * 30));
  const output = path.resolve("out/unseen", `${scene.id}.png`);
  await renderStill({ composition, serveUrl, output, frame, inputProps: props, imageFormat: "png" });
  console.log("wrote", scene.id, frame);
}

console.log("stills ready");
