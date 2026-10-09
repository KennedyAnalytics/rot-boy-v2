/**
 * Re-render one time span and splice it into the existing picture.
 * The original audio stream is copied. Narration is not re-recorded.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { renderStructuredFilm } from "../server/render";
import type { StructuredFilmProps } from "../src/film/structure-types";

const run = (args: string[]) => {
  const result = spawnSync("ffmpeg", ["-y", ...args], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr?.slice(-600) || "ffmpeg failed");
};

export const splicePictureSpan = async (props: StructuredFilmProps, film: string, startSec: number, endSec: number, output: string) => {
  const fps = 30;
  const startFrame = Math.max(0, Math.round(startSec * fps));
  const endFrame = Math.max(startFrame + 1, Math.round(endSec * fps) - 1);
  const dir = path.dirname(output);
  fs.mkdirSync(dir, { recursive: true });
  const segment = path.join(dir, "segment.mp4");
  const videoOnly = path.join(dir, "picture-spliced.mp4");
  await renderStructuredFilm(segment, props, undefined, [startFrame, endFrame]);
  const start = startSec.toFixed(3);
  const end = endSec.toFixed(3);
  run([
    "-i", film,
    "-i", segment,
    "-filter_complex",
    `[0:v]trim=0:${start},setpts=PTS-STARTPTS[v0];[1:v]setpts=PTS-STARTPTS[v1];[0:v]trim=${end},setpts=PTS-STARTPTS[v2];[v0][v1][v2]concat=n=3:v=1:a=0[v]`,
    "-map", "[v]",
    "-an",
    videoOnly,
  ]);
  run(["-i", videoOnly, "-i", film, "-map", "0:v:0", "-map", "1:a:0?", "-c:v", "libx264", "-c:a", "copy", "-shortest", output]);
  return { startFrame, endFrame, output };
};
