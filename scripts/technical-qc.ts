/**
 * Tier 1. Objective delivery checks. No vision model.
 *
 *   npx tsx scripts/technical-qc.ts out/prod-harden/film.mp4 out/prod-harden/props.json
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { GRID, SAFE } from "../src/film/layers";
import { HEIGHT } from "../src/design";

const video = path.resolve(process.argv[2] || "");
const propsPath = process.argv[3] ? path.resolve(process.argv[3]) : "";
if (!video || !fs.existsSync(video)) throw new Error("Pass a rendered mp4.");

const probeRaw = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height,avg_frame_rate", "-of", "json", video], { encoding: "utf8" });
const probe = JSON.parse(probeRaw.stdout || "{}") as {
  streams?: { codec_type?: string; codec_name?: string; width?: number; height?: number; avg_frame_rate?: string }[];
  format?: { duration?: string };
};
const videoStream = probe.streams?.find((stream) => stream.codec_type === "video");
const audioStream = probe.streams?.find((stream) => stream.codec_type === "audio");
const duration = Number(probe.format?.duration ?? 0);
const planned = propsPath && fs.existsSync(propsPath) ? Number(JSON.parse(fs.readFileSync(propsPath, "utf8")).plan?.durationSec ?? 0) : 0;
const [fpsNum, fpsDen] = (videoStream?.avg_frame_rate || "0/1").split("/").map(Number);
const fps = fpsDen ? fpsNum / fpsDen : 0;

const detect = (args: string[]) => {
  const result = spawnSync("ffmpeg", args, { encoding: "utf8" });
  return `${result.stdout || ""}\n${result.stderr || ""}`;
};
const blackLog = detect(["-i", video, "-vf", "blackdetect=d=1:pic_th=0.98", "-f", "null", "-"]);
const silenceLog = detect(["-i", video, "-af", "silencedetect=n=-40dB:d=8", "-f", "null", "-"]);
const black = blackLog.includes("black_start") ? "blackdetect reported a stretch" : "none";
const longSilence = /silence_duration: ([0-9.]+)/.exec(silenceLog)?.[1] ?? null;

const checks = {
  resolution: videoStream?.width === 1080 && videoStream?.height === 1920,
  fps: Math.abs(fps - 30) < 0.2,
  videoCodec: videoStream?.codec_name === "h264",
  audioPresent: Boolean(audioStream),
  audioCodec: audioStream?.codec_name === "aac",
  durationClose: !planned || Math.abs(duration - planned) < 1.5,
  noLongBlack: black === "none",
  noLongSilence: !longSilence || Number(longSilence) < 12,
  captionClearsBottomBand: GRID.captionBottom >= SAFE.bottom,
  presenterInset: SAFE.presenterInset,
  bottomBand: SAFE.bottom,
  captionFloor: HEIGHT - 340,
};
const failed = Object.entries(checks).filter(([, ok]) => ok === false).map(([name]) => name);
const report = { video: path.basename(video), duration, planned, fps, width: videoStream?.width, height: videoStream?.height, checks, failed, black, longSilence };
const out = path.join(path.dirname(video), "technical-qc.json");
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(failed.length ? `failed: ${failed.join(", ")}` : "technical qc passed");
if (failed.length) process.exit(1);
