import fs from "fs";
import os from "os";
import path from "path";

/** Prefix passed to `fs.mkdtemp` by `@remotion/bundler` when `outDir` is omitted. */
export const REMOTION_BUNDLE_PREFIX = "remotion-webpack-bundle-";

export type RenderBundleCleanupOptions = {
  /** Retries inside one `fs.rmSync` call. Node backs off linearly on EPERM/EBUSY. */
  maxRetries?: number;
  retryDelay?: number;
  /**
   * Extra attempts around `fs.rmSync`. Remotion retries outside `rmSync` because a
   * Windows EPERM can still escape `maxRetries`.
   */
  attempts?: number;
};

const defaultCleanup: Required<RenderBundleCleanupOptions> = {
  // renderMedia starts closing Chrome and the static server without awaiting them.
  // A few seconds of backoff covers that release without touching any other directory.
  maxRetries: 8,
  retryDelay: 150,
  attempts: 3,
};

const samePath = (left: string, right: string) => {
  const strip = (value: string) => path.resolve(value).replace(/^\\\\\?\\/, "");
  const a = strip(left);
  const b = strip(right);
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
};

const isDirectChild = (parent: string, child: string) => samePath(path.dirname(path.resolve(child)), parent);

const temporaryRoots = () => {
  const logical = path.resolve(os.tmpdir());
  try {
    return { logical, real: fs.realpathSync(logical) };
  } catch {
    return { logical, real: logical };
  }
};

const projectRoots = () => [path.resolve("."), path.resolve("public"), path.resolve("out"), path.resolve("public", "jobs")];

const isInside = (parent: string, child: string) => {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};

/** Why this path must not be deleted, or null when it is one owned Remotion bundle directory. */
export const renderBundleRefusal = (directory: string): string | null => {
  const resolved = path.resolve(directory);
  const roots = temporaryRoots();
  if (!isDirectChild(roots.logical, resolved) && !isDirectChild(roots.real, resolved)) {
    return "not a direct child of the OS temp directory";
  }
  const base = path.basename(resolved);
  if (!base.startsWith(REMOTION_BUNDLE_PREFIX) || base.length === REMOTION_BUNDLE_PREFIX.length) {
    return "name is not a Remotion webpack bundle directory";
  }
  for (const root of projectRoots()) {
    if (isInside(root, resolved)) return "path is inside the project, public assets, or rendered output";
  }
  return null;
};

/**
 * Delete one bundle directory created for a studio render.
 * Refuses every other path, including shared `public/` assets, `out/`, job videos, and unrelated temp directories.
 */
export const removeOwnedRenderBundle = (directory: string, options: RenderBundleCleanupOptions = {}) => {
  const refusal = renderBundleRefusal(directory);
  if (refusal) throw new Error(`Refusing to delete ${directory}: ${refusal}.`);

  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  if (stat.isSymbolicLink()) throw new Error(`Refusing to delete ${directory}: path is a symbolic link.`);
  if (!stat.isDirectory()) throw new Error(`Refusing to delete ${directory}: path is not a directory.`);

  const real = fs.realpathSync(directory);
  const roots = temporaryRoots();
  const realParentOk = isDirectChild(roots.logical, real) || isDirectChild(roots.real, real);
  const realNameOk = path.basename(real).startsWith(REMOTION_BUNDLE_PREFIX);
  if (!realParentOk || !realNameOk) {
    throw new Error(`Refusing to delete ${directory}: path escapes its temporary location.`);
  }

  const maxRetries = options.maxRetries ?? defaultCleanup.maxRetries;
  const retryDelay = options.retryDelay ?? defaultCleanup.retryDelay;
  const attempts = options.attempts ?? defaultCleanup.attempts;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      fs.rmSync(directory, { recursive: true, force: true, maxRetries, retryDelay });
      return;
    } catch (error) {
      lastError = error;
      if (!fs.existsSync(directory)) return;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Could not delete render bundle ${directory}.`);
};

const deleteTracked = (directories: ReadonlySet<string>) => {
  let cleanupError: unknown = null;
  for (const directory of directories) {
    try {
      removeOwnedRenderBundle(directory);
    } catch (error) {
      cleanupError = error;
    }
  }
  return cleanupError;
};

/**
 * Create a bundle, render with it, then delete it.
 * `onDirectoryCreated` runs before webpack finishes, so a failed bundle is still removed.
 * A render error is kept when cleanup also fails.
 */
export const withOwnedRenderBundle = async <T>(
  create: (onDirectoryCreated: (directory: string) => void) => Promise<string>,
  use: (bundleDirectory: string) => Promise<T>,
): Promise<T> => {
  const directories = new Set<string>();
  let renderError: unknown;
  try {
    const created = await create((directory) => {
      directories.add(directory);
    });
    directories.add(created);
    return await use(created);
  } catch (error) {
    renderError = error;
    throw error;
  } finally {
    const cleanupError = deleteTracked(directories);
    if (cleanupError && renderError) console.error("Render bundle cleanup failed:", cleanupError);
    else if (cleanupError) throw cleanupError;
  }
};
