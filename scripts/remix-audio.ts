/**
 * Replace the audio stream and keep the picture. This never calls the renderer.
 *
 *   npx tsx scripts/remix-audio.ts <film.mp4> <audio.wav> <out.mp4>
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const remixAudio = (film: string, audio: string, output: string) => {
  if (!fs.existsSync(film)) throw new Error(`No picture at ${film}`);
  if (!fs.existsSync(audio)) throw new Error(`No audio at ${audio}`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const result = spawnSync(
    "ffmpeg",
    ["-y", "-i", film, "-i", audio, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-shortest", output],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr?.slice(-500) || "Audio remix failed.");
  return output;
};

if (process.argv[1] && process.argv[1].endsWith("remix-audio.ts")) {
  remixAudio(path.resolve(process.argv[2] || ""), path.resolve(process.argv[3] || ""), path.resolve(process.argv[4] || ""));
  console.log("audio remixed without a picture render");
}
