/**
 * Disk report, dry run, and later cleanup for the studio repo.
 *
 *   node scripts/retention/disk-cleanup.mjs dry-run
 *   node scripts/retention/disk-cleanup.mjs report
 *   node scripts/retention/disk-cleanup.mjs self-check
 *   node scripts/retention/disk-cleanup.mjs apply --confirm safe
 *   node scripts/retention/disk-cleanup.mjs apply --aggressive --confirm aggressive
 *
 * dry-run is the default and deletes nothing. apply is the only mode that
 * deletes files. Safe apply removes only hash-matched duplicate studio
 * renders and listed temporary logs. Aggressive apply also removes
 * node_modules and the webpack cache, and it still refuses every protected
 * path. This script does not change the Windows execution policy.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = path.join(repoRoot, "retention", "protected-manifest.json");
const reportDir = path.join(repoRoot, "retention", "reports");

const CATEGORY_LABELS = {
  authoritative: "Authoritative / protected",
  acceptance: "Authoritative acceptance evidence",
  regression: "Regression evidence",
  narration: "Narration and alignment",
  "active-phase": "Current active-phase work",
  reference: "References, handoffs, and Studio Memory",
  character: "Corporate Defector assets",
  source: "Source code",
  config: "Project configuration",
  "referenced-rd": "Referenced comparison renders",
  "historical-trace": "Historical job traces",
  "reproducible-intermediate": "Reproducible intermediate output",
  "unique-studio-render": "Unique studio renders (kept for review)",
  "render-cache": "Render cache",
  temporary: "Temporary output",
  dependency: "Dependencies (node_modules)",
  unclassified: "Unclassified (kept)",
};

const toRel = (abs) => path.relative(repoRoot, abs).split(path.sep).join("/");

const absInsideRepo = (relPath) => {
  const abs = path.resolve(repoRoot, relPath);
  const back = path.relative(repoRoot, abs);
  if (back.startsWith("..") || path.isAbsolute(back)) {
    throw new Error(`Path escapes the repo: ${relPath}`);
  }
  return abs;
};

const formatBytes = (bytes) => {
  const n = Number(bytes);
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = n;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const shown = unit === 0 ? String(value) : value.toFixed(2);
  return `${shown} ${units[unit]} (${n.toLocaleString("en-US")} bytes)`;
};

const loadManifest = () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.version !== 1) throw new Error(`Unsupported manifest version: ${manifest.version}`);
  if (!Array.isArray(manifest.protected) || manifest.protected.length === 0) {
    throw new Error("Manifest protected list is empty");
  }
  for (const entry of manifest.protected) {
    if (!entry.path && !entry.glob) throw new Error("Protected entry needs path or glob");
    if (!entry.category || !entry.reason) throw new Error("Protected entry needs category and reason");
    if (entry.path === "node_modules" || entry.glob === "node_modules") {
      throw new Error("node_modules cannot be protected; it belongs to aggressive cleanup");
    }
  }
  return manifest;
};

const globMatches = (glob, relPath) => {
  const star = glob.indexOf("*");
  if (star < 0) return relPath === glob || relPath.startsWith(`${glob}/`);
  const prefix = glob.slice(0, star);
  if (!relPath.startsWith(prefix)) return false;
  const rest = relPath.slice(prefix.length);
  const slash = rest.indexOf("/");
  const segment = slash === -1 ? rest : rest.slice(0, slash);
  return segment.length > 0;
};

const protectedMatch = (relPath, manifest) => {
  let best = null;
  let bestLength = -1;
  for (const entry of manifest.protected) {
    const key = entry.path ?? entry.glob;
    const matched = entry.glob
      ? globMatches(entry.glob, relPath)
      : relPath === entry.path || relPath.startsWith(`${entry.path}/`);
    if (!matched) continue;
    const specificity = entry.path ? entry.path.length : entry.glob.replace("*", "").length;
    if (specificity > bestLength) {
      best = entry;
      bestLength = specificity;
    }
  }
  if (manifest.alwaysKeepFiles?.includes(relPath)) {
    return {
      path: relPath,
      category: "config",
      reason: "Root project file retained by the manifest.",
    };
  }
  return best;
};

const isRenderCandidate = (relPath, manifest) => {
  const rule = manifest.safe.duplicateStudioRenders;
  const dir = path.posix.dirname(relPath);
  const parent = path.posix.dirname(dir);
  const name = path.posix.basename(dir);
  return parent === rule.parent && name.startsWith(rule.namePrefix);
};

const walkFiles = (absDir, files, warnings) => {
  let entries;
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch (error) {
    warnings.push(`Skipped ${toRel(absDir)}: ${error.message}`);
    return;
  }
  for (const entry of entries) {
    const abs = path.join(absDir, entry.name);
    if (entry.isSymbolicLink()) {
      warnings.push(`Skipped symlink ${toRel(abs)}`);
      continue;
    }
    if (entry.isDirectory()) {
      walkFiles(abs, files, warnings);
      continue;
    }
    if (!entry.isFile()) continue;
    try {
      const stat = fs.statSync(abs);
      files.push({
        rel: toRel(abs),
        abs,
        bytes: stat.size,
        mtimeMs: stat.mtimeMs,
      });
    } catch (error) {
      warnings.push(`Skipped ${toRel(abs)}: ${error.message}`);
    }
  }
};

const sha256 = (abs) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(abs);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });

const classifyFile = (file, manifest) => {
  const cacheRoots = ["node_modules/.cache", "node_modules/.remotion", "node_modules/.vite"];
  if (cacheRoots.some((root) => file.rel === root || file.rel.startsWith(`${root}/`))) {
    return { category: "render-cache", protectedEntry: null, candidate: false };
  }
  if (file.rel === "node_modules" || file.rel.startsWith("node_modules/")) {
    return { category: "dependency", protectedEntry: null, candidate: false };
  }
  const match = protectedMatch(file.rel, manifest);
  if (match) return { category: match.category, protectedEntry: match, candidate: false };
  if (isRenderCandidate(file.rel, manifest)) {
    return { category: "unique-studio-render", protectedEntry: null, candidate: true };
  }
  return { category: "unclassified", protectedEntry: null, candidate: false };
};

const rankMatch = (relPath, landmarks) => {
  if (landmarks.has(relPath)) return 0;
  if (relPath.startsWith("out/")) return 1;
  if (relPath.startsWith("references/")) return 2;
  if (relPath.startsWith("public/character/")) return 3;
  return 4;
};

const findDuplicates = async (files, classified, manifest, warnings) => {
  const landmarks = new Set((manifest.landmarks ?? []).map((item) => item.path));
  const candidates = files.filter((file) => classified.get(file.rel).candidate);
  const sizes = new Set(candidates.map((file) => file.bytes));
  const protectedBySize = new Map();
  for (const file of files) {
    const info = classified.get(file.rel);
    if (!info.protectedEntry || !sizes.has(file.bytes)) continue;
    const list = protectedBySize.get(file.bytes) ?? [];
    list.push(file);
    protectedBySize.set(file.bytes, list);
  }
  for (const list of protectedBySize.values()) {
    list.sort((a, b) => rankMatch(a.rel, landmarks) - rankMatch(b.rel, landmarks) || a.rel.localeCompare(b.rel));
  }

  const hashCache = new Map();
  const digest = async (file) => {
    if (hashCache.has(file.abs)) return hashCache.get(file.abs);
    const value = await sha256(file.abs);
    hashCache.set(file.abs, value);
    return value;
  };

  const matches = [];
  for (const candidate of candidates) {
    const pool = protectedBySize.get(candidate.bytes) ?? [];
    if (pool.length === 0) continue;
    let candidateHash;
    try {
      candidateHash = await digest(candidate);
    } catch (error) {
      warnings.push(`Could not hash ${candidate.rel}: ${error.message}. It will be kept.`);
      continue;
    }
    let twin = null;
    for (const original of pool) {
      try {
        const originalHash = await digest(original);
        if (originalHash === candidateHash) {
          twin = original;
          break;
        }
      } catch (error) {
        warnings.push(`Could not hash ${original.rel}: ${error.message}`);
      }
    }
    if (!twin) continue;
    matches.push({
      path: candidate.rel,
      bytes: candidate.bytes,
      mtimeMs: candidate.mtimeMs,
      sha256: candidateHash,
      matches: twin.rel,
      rule: manifest.safe.duplicateStudioRenders.id,
      reason: `Byte-identical to protected ${twin.rel}`,
    });
  }
  return matches;
};

const holdCutoff = (manifest) => Date.now() - manifest.holdIfModifiedWithinHours * 60 * 60 * 1000;

const directoryBytes = (files, prefix) => {
  const needle = prefix.endsWith("/") ? prefix : `${prefix}/`;
  return files
    .filter((file) => file.rel === prefix || file.rel.startsWith(needle))
    .reduce((sum, file) => sum + file.bytes, 0);
};

const buildPlan = async (manifest) => {
  const warnings = [];
  const files = [];
  walkFiles(repoRoot, files, warnings);
  const classified = new Map();
  for (const file of files) classified.set(file.rel, classifyFile(file, manifest));

  const duplicates = await findDuplicates(files, classified, manifest, warnings);
  const cutoff = holdCutoff(manifest);
  const safe = [];
  const held = [];
  for (const item of duplicates) {
    if (item.mtimeMs >= cutoff) {
      held.push({ ...item, reason: `${item.reason}, but modified within ${manifest.holdIfModifiedWithinHours} hours` });
      classified.get(item.path).category = "reproducible-intermediate";
      continue;
    }
    safe.push({ ...item, mode: "safe" });
    classified.get(item.path).category = "reproducible-intermediate";
  }

  for (const temp of manifest.safe.temporaryFiles ?? []) {
    const file = files.find((item) => item.rel === temp.path);
    if (!file) continue;
    if (protectedMatch(file.rel, manifest)) {
      warnings.push(`Temporary path ${file.rel} is protected and was not scheduled.`);
      continue;
    }
    const entry = {
      path: file.rel,
      bytes: file.bytes,
      mtimeMs: file.mtimeMs,
      sha256: null,
      matches: null,
      rule: "temporary-file",
      reason: temp.reason,
      mode: "safe",
    };
    if (file.mtimeMs >= cutoff) {
      held.push({ ...entry, reason: `${temp.reason}, but modified within ${manifest.holdIfModifiedWithinHours} hours` });
      continue;
    }
    classified.get(file.rel).category = "temporary";
    safe.push(entry);
  }

  const aggressive = [];
  for (const rule of manifest.aggressive ?? []) {
    for (const entry of manifest.protected) {
      if (entry.path && (entry.path === rule.path || entry.path.startsWith(`${rule.path}/`))) {
        throw new Error(`Aggressive rule ${rule.id} contains protected path ${entry.path}`);
      }
    }
    const bytes = directoryBytes(files, rule.path);
    if (bytes <= 0 && !files.some((file) => file.rel.startsWith(`${rule.path}/`))) continue;
    aggressive.push({
      path: rule.path,
      bytes,
      rule: rule.id,
      mode: "aggressive",
      category: rule.category,
      reason: rule.regenerate,
    });
  }

  assertPlanDoesNotTouchProtected(safe.concat(aggressive), manifest);

  const categories = new Map();
  for (const file of files) {
    const category = classified.get(file.rel).category;
    const current = categories.get(category) ?? { category, bytes: 0, files: 0 };
    current.bytes += file.bytes;
    current.files += 1;
    categories.set(category, current);
  }

  return {
    generatedAt: new Date().toISOString(),
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    totalFiles: files.length,
    files,
    categories: [...categories.values()].sort((a, b) => b.bytes - a.bytes),
    safe,
    held,
    aggressive,
    warnings,
    manifest,
  };
};

const assertPlanDoesNotTouchProtected = (items, manifest) => {
  const temporary = new Set((manifest.safe.temporaryFiles ?? []).map((item) => item.path));
  for (const item of items) {
    if (item.mode === "aggressive") continue;
    const allowed = item.rule === "temporary-file"
      ? temporary.has(item.path)
      : isRenderCandidate(item.path, manifest);
    if (!allowed) {
      throw new Error(`Safe plan included ${item.path}, which is outside the disposable rules`);
    }
    const match = protectedMatch(item.path, manifest);
    if (match) {
      throw new Error(`Safe plan tried to delete protected ${item.path}: ${match.reason}`);
    }
  }
  for (const landmark of manifest.landmarks ?? []) {
    for (const item of items) {
      const deletesLandmark =
        item.path === landmark.path ||
        landmark.path.startsWith(`${item.path}/`) ||
        item.path.startsWith(`${landmark.path}/`);
      if (deletesLandmark) {
        throw new Error(`Plan tried to delete landmark ${landmark.path} via ${item.path}`);
      }
    }
  }
};

const groupSafeDeletes = (safe, files) => {
  const groups = new Map();
  for (const item of safe) {
    const dir = path.posix.dirname(item.path);
    const group = groups.get(dir) ?? { dir, items: [] };
    group.items.push(item);
    groups.set(dir, group);
  }
  return [...groups.values()]
    .map((group) => {
      const present = files.filter((file) => path.posix.dirname(file.rel) === group.dir).length;
      const bytes = group.items.reduce((sum, item) => sum + item.bytes, 0);
      return {
        ...group,
        bytes,
        removesDirectory: present > 0 && present === group.items.length,
      };
    })
    .sort((a, b) => b.bytes - a.bytes);
};

const largestDirectories = (files) => {
  const totals = new Map();
  const add = (key, bytes) => totals.set(key, (totals.get(key) ?? 0) + bytes);
  for (const file of files) {
    const parts = file.rel.split("/");
    if (parts.length === 1) add("(repo root files)", file.bytes);
    else add(parts[0], file.bytes);
    if (parts.length > 2) add(`${parts[0]}/${parts[1]}`, file.bytes);
  }
  return [...totals.entries()]
    .map(([path, bytes]) => ({ path, bytes }))
    .sort((a, b) => b.bytes - a.bytes);
};

const largestFiles = (files, limit = 25) =>
  files
    .filter((file) => !file.rel.startsWith("node_modules/"))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, limit);

const landmarkReport = (manifest) =>
  (manifest.landmarks ?? []).map((item) => ({
    ...item,
    exists: fs.existsSync(absInsideRepo(item.path)),
    bytes: fs.existsSync(absInsideRepo(item.path))
      ? fs.statSync(absInsideRepo(item.path)).isDirectory()
        ? null
        : fs.statSync(absInsideRepo(item.path)).size
      : null,
  }));

const covers = (listed, relPath) =>
  listed.some((path) => path === relPath || relPath.startsWith(`${path}/`) || path.startsWith(`${relPath}/`));

const reviewReport = (plan) => {
  const rows = [];
  for (const item of plan.manifest.reviewBeforeDeletion ?? []) {
    const abs = absInsideRepo(item.path);
    const exists = fs.existsSync(abs);
    rows.push({
      path: item.path,
      bytes: exists ? directoryBytes(plan.files, item.path) || fs.statSync(abs).size : 0,
      exists,
      why: item.why,
      scheduled: false,
    });
  }
  const listed = () => rows.map((row) => row.path);
  const heldSet = new Set(plan.held.map((item) => item.path));
  const uniqueDirs = new Map();
  for (const file of plan.files) {
    if (!isRenderCandidate(file.rel, plan.manifest)) continue;
    if (plan.safe.some((item) => item.path === file.rel)) continue;
    const dir = path.posix.dirname(file.rel);
    const row = uniqueDirs.get(dir) ?? { path: dir, bytes: 0, heldOnly: true };
    row.bytes += file.bytes;
    if (!heldSet.has(file.rel)) row.heldOnly = false;
    uniqueDirs.set(dir, row);
  }
  for (const row of uniqueDirs.values()) {
    if (row.heldOnly || covers(listed(), row.path)) continue;
    rows.push({
      path: row.path,
      bytes: row.bytes,
      exists: true,
      scheduled: false,
      why: "Unique studio render. No protected file has the same bytes, so it stays.",
    });
  }

  const unclassified = new Map();
  for (const file of plan.files) {
    if (file.rel.startsWith("node_modules/")) continue;
    if (protectedMatch(file.rel, plan.manifest)) continue;
    if (isRenderCandidate(file.rel, plan.manifest)) continue;
    if (plan.safe.some((item) => item.path === file.rel)) continue;
    const top = file.rel.includes("/") ? file.rel.split("/").slice(0, 2).join("/") : file.rel;
    const row = unclassified.get(top) ?? {
      path: top,
      bytes: 0,
      why: "Not named by a protected entry or a disposable rule. Kept.",
    };
    row.bytes += file.bytes;
    unclassified.set(top, row);
  }
  for (const row of unclassified.values()) {
    if (row.bytes < 1024 * 1024 && row.path.includes("/")) continue;
    if (covers(listed(), row.path)) continue;
    rows.push({ ...row, exists: true, scheduled: false });
  }
  return rows.sort((a, b) => b.bytes - a.bytes);
};

const renderMarkdown = (plan) => {
  const safeBytes = plan.safe.reduce((sum, item) => sum + item.bytes, 0);
  const nodeModules = plan.aggressive.find((item) => item.path === "node_modules");
  const cacheBytes = plan.aggressive
    .filter((item) => item.path.startsWith("node_modules/") || item.path === "node_modules/.cache")
    .reduce((sum, item) => sum + item.bytes, 0);
  const groups = groupSafeDeletes(plan.safe, plan.files);
  const landmarks = landmarkReport(plan.manifest);
  const reviews = reviewReport(plan);
  const lines = [];
  lines.push("# Disk retention dry run");
  lines.push("");
  lines.push(`Generated: ${plan.generatedAt}`);
  lines.push("");
  lines.push("No files were deleted. This report is a plan.");
  lines.push("");
  lines.push("## Total");
  lines.push("");
  lines.push(`- Repo size: **${formatBytes(plan.totalBytes)}**`);
  lines.push(`- Files walked: ${plan.totalFiles.toLocaleString("en-US")}`);
  const heldBytes = plan.held.reduce((sum, item) => sum + item.bytes, 0);
  lines.push(`- Safe recoverable space: **${formatBytes(safeBytes)}**`);
  lines.push(`- Confirmed duplicates held by the ${plan.manifest.holdIfModifiedWithinHours}-hour write window: **${formatBytes(heldBytes)}**`);
  lines.push(`- Additional space only if aggressive mode is invoked later: **${formatBytes(nodeModules?.bytes ?? 0)}**`);
  if (cacheBytes > 0) {
    lines.push(`- Render caches inside that aggressive total: ${formatBytes(cacheBytes)}`);
  }
  lines.push("");
  lines.push("## Largest directories");
  lines.push("");
  lines.push("| Bytes | Path |");
  lines.push("| ---: | --- |");
  for (const row of largestDirectories(plan.files).slice(0, 30)) {
    lines.push(`| ${row.bytes.toLocaleString("en-US")} | \`${row.path}\` |`);
  }
  lines.push("");
  lines.push("## Largest files outside node_modules");
  lines.push("");
  lines.push("| Bytes | Path |");
  lines.push("| ---: | --- |");
  for (const file of largestFiles(plan.files)) {
    lines.push(`| ${file.bytes.toLocaleString("en-US")} | \`${file.rel}\` |`);
  }
  lines.push("");
  lines.push("## Category breakdown");
  lines.push("");
  lines.push("| Category | Files | Bytes |");
  lines.push("| --- | ---: | ---: |");
  for (const row of plan.categories) {
    const label = CATEGORY_LABELS[row.category] ?? row.category;
    lines.push(`| ${label} | ${row.files.toLocaleString("en-US")} | ${row.bytes.toLocaleString("en-US")} |`);
  }
  lines.push("");
  lines.push("## Protected landmarks");
  lines.push("");
  lines.push("These paths are checked on every run. A plan that includes one of them fails before any deletion.");
  lines.push("");
  for (const item of landmarks) {
    const state = item.exists ? "present" : "MISSING";
    lines.push(`- \`${item.path}\` — ${item.role} (${state})`);
  }
  lines.push("");
  lines.push("New baselines belong in `retention/protected-manifest.json`. Add a `protected` entry and, when the file is a film or narration asset that must never be deleted, a `landmarks` entry.");
  lines.push("");
  lines.push("## Safe disposable set");
  lines.push("");
  lines.push("Safe mode deletes only these paths. Each studio-render file matches a protected file by SHA-256. Temporary logs are listed by name in the manifest.");
  lines.push("");
  if (groups.length === 0) {
    lines.push("Nothing qualified.");
  }
  for (const group of groups) {
    const scope = group.removesDirectory ? "whole folder" : "listed files only; the folder stays";
    lines.push(`### \`${group.dir}\` — ${formatBytes(group.bytes)} (${scope})`);
    lines.push("");
    for (const item of group.items) {
      const twin = item.matches ? ` matches \`${item.matches}\`` : "";
      lines.push(`- \`${item.path}\` — ${formatBytes(item.bytes)}${twin}`);
      lines.push(`  - ${item.reason}`);
    }
    lines.push("");
  }
  lines.push(`Safe total: **${formatBytes(safeBytes)}** across ${plan.safe.length} files.`);
  lines.push("");
  if (plan.held.length > 0) {
    lines.push("## Held back");
    lines.push("");
    lines.push(`These matched a disposable rule but were modified within ${plan.manifest.holdIfModifiedWithinHours} hours, so they stay.`);
    lines.push("");
    for (const item of plan.held) {
      lines.push(`- \`${item.path}\` — ${formatBytes(item.bytes)}. ${item.reason}`);
    }
    lines.push("");
  }
  lines.push("## Aggressive mode (not part of the safe delete)");
  lines.push("");
  lines.push("Invoke this only after review, and not while a render, typecheck, or install is running. Protected paths are refused even in this mode. Applying aggressive mode deletes `node_modules` once. The cache paths below sit inside it, so their sizes are not added on top.");
  lines.push("");
  for (const item of plan.aggressive) {
    lines.push(`- \`${item.path}\` — ${formatBytes(item.bytes)}`);
    lines.push(`  - Regenerate: ${item.reason}`);
  }
  lines.push("");
  lines.push("## Review before any broader deletion");
  lines.push("");
  lines.push("These are large or unnamed, and they are **not** in the delete set.");
  lines.push("");
  lines.push("| Bytes | Path | Why it stays |");
  lines.push("| ---: | --- | --- |");
  for (const row of reviews) {
    const why = row.why.replaceAll("|", "/");
    lines.push(`| ${row.bytes.toLocaleString("en-US")} | \`${row.path}\` | ${why} |`);
  }
  lines.push("");
  lines.push("## Commands");
  lines.push("");
  lines.push("```");
  lines.push("node scripts/retention/disk-cleanup.mjs dry-run");
  lines.push("node scripts/retention/disk-cleanup.mjs apply --confirm safe");
  lines.push("node scripts/retention/disk-cleanup.mjs apply --aggressive --confirm aggressive");
  lines.push("```");
  lines.push("");
  lines.push("Safe apply deletes the safe set above and nothing else. Aggressive apply deletes the safe set and the aggressive set. Neither command runs unless `--confirm` matches the mode.");
  lines.push("");
  if (plan.warnings.length > 0) {
    lines.push("## Warnings");
    lines.push("");
    for (const warning of plan.warnings) lines.push(`- ${warning}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
};

const writeReports = (plan) => {
  fs.mkdirSync(reportDir, { recursive: true });
  const markdown = renderMarkdown(plan);
  const safeBytes = plan.safe.reduce((sum, item) => sum + item.bytes, 0);
  const json = {
    generatedAt: plan.generatedAt,
    deleted: false,
    totalBytes: plan.totalBytes,
    totalFiles: plan.totalFiles,
    safeRecoverableBytes: safeBytes,
    heldRecoverableBytes: plan.held.reduce((sum, item) => sum + item.bytes, 0),
    aggressiveRecoverableBytes: plan.aggressive.find((item) => item.path === "node_modules")?.bytes ?? 0,
    categories: plan.categories,
    largestDirectories: largestDirectories(plan.files).slice(0, 30),
    largestFiles: largestFiles(plan.files).map((file) => ({ path: file.rel, bytes: file.bytes })),
    landmarks: landmarkReport(plan.manifest),
    safe: plan.safe.map(({ mtimeMs, ...item }) => item),
    held: plan.held.map(({ mtimeMs, ...item }) => item),
    aggressive: plan.aggressive,
    review: reviewReport(plan),
    warnings: plan.warnings,
  };
  fs.writeFileSync(path.join(reportDir, "dry-run.md"), markdown);
  fs.writeFileSync(path.join(reportDir, "dry-run.json"), `${JSON.stringify(json, null, 2)}\n`);
  return markdown;
};

const printSummary = (plan) => {
  const safeBytes = plan.safe.reduce((sum, item) => sum + item.bytes, 0);
  const aggressiveBytes = plan.aggressive.find((item) => item.path === "node_modules")?.bytes ?? 0;
  console.log(`Repo size: ${formatBytes(plan.totalBytes)}`);
  console.log(`Safe recoverable: ${formatBytes(safeBytes)} across ${plan.safe.length} files`);
  console.log(`Aggressive additional (node_modules, includes cache): ${formatBytes(aggressiveBytes)}`);
  console.log("No files were deleted.");
  console.log("Report: retention/reports/dry-run.md");
};

const applyPlan = (plan, { aggressive }) => {
  const selected = aggressive ? plan.safe.concat(plan.aggressive) : plan.safe;
  const parents = new Set();
  const deleted = [];
  const aggressiveParents = plan.aggressive.map((item) => item.path);
  const targets = selected.filter((item) => {
    if (!aggressive) return true;
    return !aggressiveParents.some((parent) => parent !== item.path && item.path.startsWith(`${parent}/`));
  });
  for (const item of targets) {
    const match = item.mode === "safe" ? protectedMatch(item.path, plan.manifest) : null;
    if (match) throw new Error(`Refusing to delete protected ${item.path}`);
    for (const landmark of plan.manifest.landmarks ?? []) {
      if (item.path === landmark.path || landmark.path.startsWith(`${item.path}/`) || item.path.startsWith(`${landmark.path}/`)) {
        throw new Error(`Refusing to delete landmark ${landmark.path}`);
      }
    }
    const abs = absInsideRepo(item.path);
    if (!fs.existsSync(abs)) continue;
    if (item.mode === "safe") {
      const stat = fs.statSync(abs);
      if (stat.mtimeMs >= holdCutoff(plan.manifest)) {
        throw new Error(`Refusing ${item.path}: it changed after the plan was built`);
      }
    }
    fs.rmSync(abs, { recursive: true, force: false });
    deleted.push(item.path);
    parents.add(path.posix.dirname(item.path));
  }
  for (const dir of [...parents].sort((a, b) => b.length - a.length)) {
    if (dir === "." || dir === "public" || dir === "public/jobs" || dir === "out") continue;
    const abs = absInsideRepo(dir);
    if (!fs.existsSync(abs)) continue;
    if (fs.readdirSync(abs).length === 0) fs.rmdirSync(abs);
  }
  const record = {
    deletedAt: new Date().toISOString(),
    aggressive,
    deleted,
  };
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "last-apply.json"), `${JSON.stringify(record, null, 2)}\n`);
  console.log(`Deleted ${deleted.length} paths.`);
  for (const item of deleted) console.log(`- ${item}`);
};

const selfCheck = (manifest) => {
  const samples = [
    ["public/jobs/voice-1791500948631/words.json", "narration"],
    ["public/jobs/render-1/video.mp4", null],
    ["out/continuity-v1/mara-v1-production/film.mp4", "authoritative"],
    ["out/continuity-v1/ACCEPTANCE_EVIDENCE.md", "acceptance"],
    ["out/motion-v1/mara/film.mp4", "active-phase"],
    ["references/STUDIO_MEMORY.md", "reference"],
    ["node_modules/react/package.json", null],
  ];
  for (const [relPath, category] of samples) {
    const match = protectedMatch(relPath, manifest);
    const actual = match?.category ?? null;
    if (actual !== category) {
      throw new Error(`self-check ${relPath}: expected ${category}, got ${actual}`);
    }
    if (category === null && relPath.startsWith("public/jobs/render-") && !isRenderCandidate(relPath, manifest)) {
      throw new Error(`self-check expected ${relPath} to be a render candidate`);
    }
  }
  if (isRenderCandidate("out/motion-v1/film.mp4", manifest)) {
    throw new Error("active phase was classified as a render candidate");
  }
  console.log("self-check passed");
};

const usage = () => {
  console.log(`Usage:
  node scripts/retention/disk-cleanup.mjs dry-run
  node scripts/retention/disk-cleanup.mjs report
  node scripts/retention/disk-cleanup.mjs self-check
  node scripts/retention/disk-cleanup.mjs apply --confirm safe
  node scripts/retention/disk-cleanup.mjs apply --aggressive --confirm aggressive`);
};

const main = async () => {
  const args = process.argv.slice(2);
  const command = args.find((arg) => !arg.startsWith("--")) ?? "dry-run";
  const aggressive = args.includes("--aggressive");
  const confirm = args.includes("--confirm") ? args[args.indexOf("--confirm") + 1] : null;
  const manifest = loadManifest();

  if (command === "self-check") {
    selfCheck(manifest);
    return;
  }
  if (command === "help" || args.includes("--help")) {
    usage();
    return;
  }
  if (!["dry-run", "report", "apply"].includes(command)) {
    usage();
    process.exitCode = 2;
    return;
  }

  console.log("Scanning the repo. Hashing duplicate candidates only. Nothing is deleted during the scan.");
  const plan = await buildPlan(manifest);
  const markdown = writeReports(plan);
  if (command === "report" || command === "dry-run") {
    console.log(markdown);
    printSummary(plan);
    return;
  }

  if (aggressive && confirm !== "aggressive") {
    console.error("Refusing aggressive cleanup. Re-run with: node scripts/retention/disk-cleanup.mjs apply --aggressive --confirm aggressive");
    process.exitCode = 2;
    return;
  }
  if (!aggressive && confirm !== "safe") {
    console.error("Refusing cleanup. Re-run with: node scripts/retention/disk-cleanup.mjs apply --confirm safe");
    process.exitCode = 2;
    return;
  }
  applyPlan(plan, { aggressive });
};

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
