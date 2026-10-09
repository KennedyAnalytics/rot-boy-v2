import { spawn } from "node:child_process";
import fs from "node:fs";
import { packageManagerLaunch } from "./lib/resolve-bin.mjs";

const indexPath =
  process.argv[2] ||
  "C:/Users/Eric/.cursor/projects/c-Users-Eric-Documents-rot-boy-v2/agent-tools/cb123f47-1f95-4354-ba7c-0b55f51d96d0.txt";
const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const names = index.components.map((component) => component.name);
const logPath = "out/remotionui-install.log";
fs.mkdirSync("out", { recursive: true });
fs.writeFileSync(logPath, `installing ${names.length} components\n`);

const run = (args) =>
  new Promise((resolve) => {
    const launch = packageManagerLaunch("npx", ["remotion-ui@0.9.1", ...args]);
    const child = spawn(launch.command, launch.args, {
      ...launch.options,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (chunk) => {
      out += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      out += chunk;
      process.stderr.write(chunk);
    });
    child.on("exit", (code) => {
      fs.appendFileSync(logPath, `\n$ remotion-ui ${args.join(" ")}\n${out}\nexit ${code}\n`);
      resolve(code ?? 1);
    });
  });

const failed = [];
for (let offset = 0; offset < names.length; offset += 10) {
  const batch = names.slice(offset, offset + 10);
  console.log(`\n=== ${offset + 1}-${offset + batch.length} / ${names.length} ===`);
  const code = await run(["add", ...batch, "--yes", "--json"]);
  if (code === 0) continue;
  for (const name of batch) {
    const one = await run(["add", name, "--yes", "--json"]);
    if (one !== 0) failed.push(name);
  }
}

fs.writeFileSync("out/remotionui-install-failed.json", JSON.stringify(failed, null, 2));
console.log(`done, failed ${failed.length}`);
if (failed.length) console.log(failed.join(", "));
