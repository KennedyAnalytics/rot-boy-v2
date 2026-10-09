/**
 * Studio /api/render bundle cleanup. Does not render a film.
 *
 *   node node_modules/tsx/dist/cli.mjs scripts/render-bundle-cleanup-check.ts
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  REMOTION_BUNDLE_PREFIX,
  removeOwnedRenderBundle,
  renderBundleRefusal,
  withOwnedRenderBundle,
} from "../server/render-bundle";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const created: string[] = [];

const tempDir = (prefix: string) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  created.push(directory);
  return directory;
};

const bundleDir = () => tempDir(REMOTION_BUNDLE_PREFIX);

const gone = (directory: string) => {
  assert.equal(fs.existsSync(directory), false, `${directory} should have been removed`);
};

const kept = (directory: string) => {
  assert.equal(fs.existsSync(directory), true, `${directory} should have been kept`);
};

const refuses = (directory: string) => {
  const reason = renderBundleRefusal(directory);
  assert.ok(reason, `expected a refusal for ${directory}`);
  assert.throws(() => removeOwnedRenderBundle(directory, { maxRetries: 0, attempts: 1 }), /Refusing to delete/);
  if (fs.existsSync(directory)) kept(directory);
};

const successPath = async () => {
  const output = tempDir("render-bundle-check-output-");
  const video = path.join(output, "video.mp4");
  fs.writeFileSync(video, "encoded-video");
  let seen: string | null = null;
  await withOwnedRenderBundle(
    async (onDirectoryCreated) => {
      const directory = bundleDir();
      fs.writeFileSync(path.join(directory, "bundle.js"), "bundle");
      onDirectoryCreated(directory);
      return directory;
    },
    async (directory) => {
      seen = directory;
      kept(directory);
      fs.writeFileSync(video, "encoded-video");
    },
  );
  assert.ok(seen);
  gone(seen);
  kept(video);
  assert.equal(fs.readFileSync(video, "utf8"), "encoded-video");
};

const renderFailurePath = async () => {
  let seen: string | null = null;
  await assert.rejects(
    () =>
      withOwnedRenderBundle(
        async (onDirectoryCreated) => {
          const directory = bundleDir();
          fs.writeFileSync(path.join(directory, "bundle.js"), "bundle");
          onDirectoryCreated(directory);
          seen = directory;
          return directory;
        },
        async () => {
          throw new Error("Render failed.");
        },
      ),
    /Render failed\./,
  );
  assert.ok(seen);
  gone(seen);
};

const bundleFailurePath = async () => {
  let seen: string | null = null;
  await assert.rejects(
    () =>
      withOwnedRenderBundle(
        async (onDirectoryCreated) => {
          const directory = bundleDir();
          fs.writeFileSync(path.join(directory, "partial.js"), "partial");
          onDirectoryCreated(directory);
          seen = directory;
          throw new Error("Bundle failed.");
        },
        async () => {
          throw new Error("render should not run");
        },
      ),
    /Bundle failed\./,
  );
  assert.ok(seen);
  gone(seen);
};

const waitForText = (stream: NodeJS.ReadableStream, needle: string) =>
  new Promise<void>((resolve, reject) => {
    let text = "";
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${needle}: ${text}`)), 8000);
    const onData = (chunk: Buffer) => {
      text += String(chunk);
      if (!text.includes(needle)) return;
      clearTimeout(timer);
      stream.off("data", onData);
      resolve();
    };
    stream.on("data", onData);
  });

/**
 * Node opens files with delete sharing, so an fd in this process does not block `fs.rm`.
 * Chrome and ffmpeg do not share delete. Hold the file the same way and prove one attempt
 * leaves the bundle in place, then a later attempt removes only that bundle.
 */
const lockedBundlePath = async () => {
  if (process.platform !== "win32") return;
  const directory = bundleDir();
  const file = path.join(directory, "locked.txt");
  fs.writeFileSync(file, "open");
  const release = path.join(os.tmpdir(), `render-bundle-check-release-${process.pid}-${Date.now()}`);
  const powershell = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const child = spawn(
    powershell,
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "$ErrorActionPreference='Stop'; $stream=[System.IO.File]::Open($env:LOCK_PATH,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::None); [Console]::Out.WriteLine('locked'); [Console]::Out.Flush(); while (-not (Test-Path -LiteralPath $env:RELEASE_PATH)) { Start-Sleep -Milliseconds 40 }; $stream.Dispose(); [Console]::Out.WriteLine('released'); [Console]::Out.Flush()",
    ],
    {
      env: { ...process.env, LOCK_PATH: file, RELEASE_PATH: release },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (!child.stdout || !child.stderr) throw new Error("Could not watch the lock process.");
  let stderr = "";
  child.stderr.on("data", (chunk: Buffer) => {
    stderr += String(chunk);
  });
  const neighbor = tempDir("render-bundle-check-other-");
  fs.writeFileSync(path.join(neighbor, "keep.txt"), "keep");
  try {
    await waitForText(child.stdout, "locked");
    let blocked: unknown;
    try {
      removeOwnedRenderBundle(directory, { maxRetries: 0, attempts: 1 });
    } catch (error) {
      blocked = error;
    }
    assert.ok(blocked instanceof Error, `expected the sharing lock to block cleanup. ${stderr}`);
    assert.match(blocked.message, /EPERM|EBUSY|sharing/i);
    kept(directory);
    kept(file);
    fs.writeFileSync(release, "go");
    await waitForText(child.stdout, "released");
    removeOwnedRenderBundle(directory);
    gone(directory);
    kept(path.join(neighbor, "keep.txt"));
  } finally {
    if (!fs.existsSync(release)) fs.writeFileSync(release, "go");
    if (child.exitCode === null) child.kill();
    fs.rmSync(release, { force: true });
  }
};

const routeStillEncodesTheSameWay = () => {
  const source = fs.readFileSync(path.join(root, "server", "render.ts"), "utf8");
  assert.match(source, /withOwnedRenderBundle\(/);
  assert.match(source, /onDirectoryCreated/);
  assert.match(source, /codec:\s*"h264"/);
  assert.match(source, /crf:\s*16/);
  assert.match(source, /outputLocation:\s*output/);
  assert.match(source, /id:\s*"StructuredFilm"/);
  assert.doesNotMatch(source, /rmSync|rm\(/);
  const dev = fs.readFileSync(path.join(root, "server", "dev.ts"), "utf8");
  assert.match(dev, /app\.post\("\/api\/render"/);
  assert.match(dev, /startRender\(id, props\)/);
};

const main = async () => {
  const unrelated = tempDir("render-bundle-check-other-");
  fs.writeFileSync(path.join(unrelated, "narration.mp3"), "audio");
  const nested = tempDir("render-bundle-check-nest-");
  const nestedBundle = path.join(nested, `${REMOTION_BUNDLE_PREFIX}nested`);
  fs.mkdirSync(nestedBundle);
  fs.writeFileSync(path.join(nestedBundle, "bundle.js"), "nested");

  refuses(unrelated);
  refuses(nestedBundle);
  refuses(path.join(root, "public"));
  refuses(path.join(root, "out"));
  refuses(path.join(root, "public", "jobs"));
  kept(path.join(unrelated, "narration.mp3"));
  kept(path.join(nestedBundle, "bundle.js"));

  const owned = bundleDir();
  fs.writeFileSync(path.join(owned, "bundle.js"), "bundle");
  removeOwnedRenderBundle(owned);
  gone(owned);

  await successPath();
  await renderFailurePath();
  await bundleFailurePath();
  await lockedBundlePath();
  routeStillEncodesTheSameWay();

  let linkSkipped = false;
  const target = tempDir("render-bundle-check-link-target-");
  fs.writeFileSync(path.join(target, "keep.txt"), "keep");
  const link = path.join(os.tmpdir(), `${REMOTION_BUNDLE_PREFIX}link-${Date.now()}`);
  created.push(link);
  try {
    fs.symlinkSync(target, link, process.platform === "win32" ? "junction" : "dir");
    assert.equal(renderBundleRefusal(link), null);
    assert.throws(
      () => removeOwnedRenderBundle(link, { maxRetries: 0, attempts: 1 }),
      /symbolic link|escapes its temporary location/,
    );
    kept(path.join(target, "keep.txt"));
    kept(link);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EPERM" || code === "EACCES" || code === "ENOTSUP") linkSkipped = true;
    else throw error;
  }

  console.log(
    `render bundle cleanup check passed (success, render failure, bundle failure, locked handle${linkSkipped ? "; symlink case skipped" : ", symlink refusal"}).`,
  );
};

try {
  await main();
} finally {
  for (const directory of created) {
    if (!fs.existsSync(directory)) continue;
    const stat = fs.lstatSync(directory);
    if (stat.isSymbolicLink()) fs.unlinkSync(directory);
    else if (directory.startsWith(os.tmpdir())) fs.rmSync(directory, { recursive: true, force: true });
  }
}
