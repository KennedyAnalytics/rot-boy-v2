/**
 * One compact visual review after deterministic QC.
 * Three frames, one model call. This is the production critic.
 * scripts/review-film.ts remains the manual multi-strip review and is not the default.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "../server/env";
import { completeVision, type VisionProvider } from "../server/vision";

loadEnv();

export type CompactDefect = { time: number; severity: "blocking" | "major" | "minor"; issue: string; repair: string; chapterId?: string };

const frameAt = (film: string, time: number, file: string) => {
  const result = spawnSync("ffmpeg", ["-y", "-ss", time.toFixed(2), "-i", film, "-frames:v", "1", file], { encoding: "utf8" });
  return result.status === 0 && fs.existsSync(file);
};

export const reviewCompact = async (filmDir: string) => {
  const film = path.join(filmDir, "film.mp4");
  const propsPath = path.join(filmDir, "props.json");
  const reviewDir = path.join(filmDir, "review");
  fs.mkdirSync(reviewDir, { recursive: true });
  if (!fs.existsSync(film) || !fs.existsSync(propsPath)) {
    const skipped = { calls: 0, defects: [] as CompactDefect[], skipped: "film or props missing" };
    fs.writeFileSync(path.join(reviewDir, "compact.json"), JSON.stringify(skipped, null, 2));
    return skipped;
  }
  const props = JSON.parse(fs.readFileSync(propsPath, "utf8")) as { plan: { durationSec: number; chapters: { id: string; start: number }[] } };
  const duration = Number(props.plan.durationSec) || 1;
  const times = [Math.min(1.2, duration * 0.1), duration * 0.5, Math.max(0.4, duration - 1.2)];
  const frames = times.map((time, index) => ({ time, file: path.join(reviewDir, `frame-${index}.png`) }));
  if (frames.some((frame) => !frameAt(film, frame.time, frame.file))) {
    const skipped = { calls: 0, defects: [] as CompactDefect[], skipped: "ffmpeg could not extract review frames" };
    fs.writeFileSync(path.join(reviewDir, "compact.json"), JSON.stringify(skipped, null, 2));
    return skipped;
  }
  const provider: VisionProvider = process.env.OPENAI_API_KEY ? "openai" : "anthropic";
  if (provider === "openai" ? !process.env.OPENAI_API_KEY : !process.env.ANTHROPIC_API_KEY) {
    const skipped = { calls: 0, defects: [] as CompactDefect[], skipped: "no vision key" };
    fs.writeFileSync(path.join(reviewDir, "compact.json"), JSON.stringify(skipped, null, 2));
    return skipped;
  }
  const chapterIdAt = (time: number) => props.plan.chapters.find((chapter, index) => time >= chapter.start && time < (props.plan.chapters[index + 1]?.start ?? Infinity))?.id;
  const content = [
    { type: "text" as const, text: `These three phone frames are from one vertical film at ${times.map((time) => time.toFixed(1)).join("s, ")}s. Name only blocking semantic or visual defects: clipping, unreadable type, a state shown before it is spoken, or a shot that does not teach. Do not restage the film. Return JSON {"defects":[{"time":number,"severity":"blocking"|"major"|"minor","issue":string,"repair":string}]}.` },
    ...frames.map((frame) => ({ type: "image" as const, source: { type: "base64" as const, media_type: "image/png" as const, data: fs.readFileSync(frame.file).toString("base64") } })),
  ];
  const response = await completeVision("You are the single visual critic for this film. One pass. Return JSON only.", content, 2500, provider);
  fs.writeFileSync(path.join(reviewDir, "compact-response.txt"), response.text);
  const parsed = JSON.parse(response.text) as { defects?: CompactDefect[] };
  const defects = (parsed.defects ?? []).map((defect) => ({ ...defect, chapterId: chapterIdAt(Number(defect.time) || 0) }));
  const result = { calls: 1, defects, skipped: null, provider, model: response.model };
  fs.writeFileSync(path.join(reviewDir, "compact.json"), JSON.stringify(result, null, 2));
  return result;
};

if (process.argv[1] && process.argv[1].endsWith("compact-review.ts")) {
  reviewCompact(path.resolve(process.argv[2] || "")).then((result) => {
    console.log(JSON.stringify({ calls: result.calls, blocking: result.defects.filter((defect) => defect.severity === "blocking").length, skipped: result.skipped }));
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
