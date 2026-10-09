/**
 * Launch npm/npx without going through PowerShell.
 *
 * On Windows, `npm` in PowerShell resolves to npm.ps1. If the execution
 * policy blocks scripts, that shim fails. npm.cmd beside node.exe does not.
 * This does not change the execution policy.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export const packageManagerBin = (name) => {
  if (process.platform !== "win32") return name;
  const besideNode = path.join(path.dirname(process.execPath), `${name}.cmd`);
  if (existsSync(besideNode)) return besideNode;
  return `${name}.cmd`;
};

const quoteCmd = (value) => `"${String(value).replace(/"/g, '""')}"`;

/** argv for spawn/spawnSync. Windows goes through cmd.exe and npm.cmd. */
export const packageManagerLaunch = (name, args) => {
  const bin = packageManagerBin(name);
  if (process.platform !== "win32") {
    return { command: bin, args, options: { shell: false } };
  }
  const command = [quoteCmd(bin), ...args.map(quoteCmd)].join(" ");
  return {
    command: process.env.ComSpec || "cmd.exe",
    args: ["/d", "/s", "/c", `"${command}"`],
    options: { windowsVerbatimArguments: true },
  };
};

export const runPackageManager = (name, args, options = {}) => {
  const launch = packageManagerLaunch(name, args);
  return spawnSync(launch.command, launch.args, {
    ...launch.options,
    stdio: options.stdio ?? "inherit",
    windowsHide: true,
    cwd: options.cwd,
    env: options.env ?? process.env,
  });
};
