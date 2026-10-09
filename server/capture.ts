import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { assertPublicHttps } from "../src/film/source-policy";
import type { SourceAsset } from "../src/film/spec-types";

const candidates = () =>
  [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter((item): item is string => Boolean(item));

export const findBrowser = () => candidates().find((item) => fs.existsSync(item)) ?? null;

const safeId = (id: string) => id.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "source";

export const capturePublicPage = (url: string, pngPath: string) =>
  new Promise<{ bytes: number; browser: string }>((resolve, reject) => {
    assertPublicHttps(url);
    const browser = findBrowser();
    if (!browser) {
      reject(new Error("Capture needs Chrome or Edge. Set CHROME_PATH, or install a browser. No page was invented in its place."));
      return;
    }
    fs.mkdirSync(path.dirname(pngPath), { recursive: true });
    const child = spawn(browser, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1280,1600", `--screenshot=${pngPath}`, url], {
      windowsHide: true,
    });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Capture timed out after 45s."));
    }, 45000);
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const bytes = fs.existsSync(pngPath) ? fs.statSync(pngPath).size : 0;
      if (code !== 0 || bytes < 1000) {
        reject(new Error(`Capture failed (${code}): ${stderr.slice(-400)}`));
        return;
      }
      resolve({ bytes, browser });
    });
  });

/** Acquire every source that names a public URL and does not already have a file. */
export const acquireSources = async (sources: SourceAsset[], root: string) => {
  const warnings: string[] = [];
  const next: SourceAsset[] = [];
  for (const source of sources) {
    if (source.localPath && fs.existsSync(path.resolve("public", source.localPath))) {
      next.push(source);
      continue;
    }
    if (!source.url) {
      next.push(source);
      if (!source.localPath) warnings.push(`Source ${source.id} has no file and no URL.`);
      continue;
    }
    try {
      assertPublicHttps(source.url);
      const id = safeId(source.id);
      const png = path.join(root, id, "capture.png");
      const shot = await capturePublicPage(source.url, png);
      const provenance = {
        url: source.url,
        fetchedAt: new Date().toISOString(),
        tool: path.basename(shot.browser),
        bytes: shot.bytes,
        policy: "public-https",
      };
      fs.writeFileSync(path.join(root, id, "provenance.json"), JSON.stringify(provenance, null, 2));
      next.push({
        ...source,
        localPath: `sources/${id}/capture.png`,
        provenance: `Captured ${source.url} at ${provenance.fetchedAt} with ${provenance.tool}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`Source ${source.id} was not captured: ${message}`);
      next.push({ ...source, provenance: `Capture failed: ${message}` });
    }
  }
  return { sources: next, warnings };
};
