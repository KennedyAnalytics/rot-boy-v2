/**
 * Render an existing timed props file through the studio.
 *   npx tsx scripts/render-props.ts out/prod-harden/props.json out/prod-harden/film.mp4
 */
import fs from "fs";
import path from "path";

const propsPath = path.resolve(process.argv[2] || "");
const dest = path.resolve(process.argv[3] || "");
const props = JSON.parse(fs.readFileSync(propsPath, "utf8"));
const studio = process.env.STUDIO_URL || "http://127.0.0.1:8787";
const response = await fetch(`${studio}/api/render`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(props),
});
const job = (await response.json()) as { id?: string; error?: string; done?: boolean; progress?: number; url?: string };
if (!response.ok) throw new Error(job.error || "render failed to start");
console.log("job", job.id);
const started = Date.now();
let latest = job;
while (!latest.done) {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  latest = (await fetch(`${studio}/api/render/${job.id}`).then((item) => item.json())) as typeof job;
  console.log(`render ${Math.round((latest.progress || 0) * 100)}% (${((Date.now() - started) / 60000).toFixed(1)} min)`);
}
if (latest.error || !latest.url) throw new Error(latest.error || "no file");
fs.copyFileSync(path.resolve("public", latest.url.replace(/^\//, "")), dest);
console.log("wrote", dest);
