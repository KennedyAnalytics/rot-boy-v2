/**
 * Confirms npm is launched as npm.cmd on Windows and that the call succeeds.
 *   node scripts/check-package-bin.mjs
 */
import { packageManagerBin, runPackageManager } from "./lib/resolve-bin.mjs";

const bin = packageManagerBin("npm");
if (process.platform === "win32" && !bin.toLowerCase().endsWith("npm.cmd")) {
  console.error(`Windows npm launcher resolved to ${bin}, expected npm.cmd`);
  process.exit(1);
}
if (bin.toLowerCase().endsWith(".ps1")) {
  console.error(`Refusing to launch ${bin}`);
  process.exit(1);
}

const result = runPackageManager("npm", ["--version"], { stdio: "pipe" });
const out = `${result.stdout ?? ""}`;
const err = `${result.stderr ?? ""}`;
if (result.error || result.status !== 0) {
  console.error(err || result.error?.message || "npm --version failed");
  process.exit(1);
}
if (/npm\.ps1|execution of scripts is disabled|PSSecurityException/i.test(out + err)) {
  console.error(out + err);
  process.exit(1);
}
if (!/^\d+\.\d+\.\d+/.test(out.trim())) {
  console.error(`Unexpected npm version output: ${out}`);
  process.exit(1);
}
console.log(`npm ${out.trim()} via ${bin}`);
