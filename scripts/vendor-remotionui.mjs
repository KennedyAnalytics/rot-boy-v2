import fs from "node:fs";
import path from "node:path";

const indexPath =
  process.argv[2] ||
  "C:/Users/Eric/.cursor/projects/c-Users-Eric-Documents-rot-boy-v2/agent-tools/cb123f47-1f95-4354-ba7c-0b55f51d96d0.txt";
const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const root = process.cwd();

const pool = async (items, size, worker) => {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (queue.length) await worker(queue.shift());
    }),
  );
};

const failed = [];
let written = 0;
let done = 0;

await pool(index.components, 8, async (component) => {
  let item = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(component.registryUrl);
      if (!response.ok) throw new Error(String(response.status));
      item = await response.json();
      break;
    } catch (error) {
      if (attempt === 2) {
        failed.push(component.name);
        console.error("failed", component.name, error instanceof Error ? error.message : error);
      }
    }
  }
  if (item?.files) {
    for (const file of item.files) {
      const target = String(file.target || "");
      if (!target || target.includes("..") || path.isAbsolute(target)) continue;
      const destination = path.join(root, target);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, file.content ?? "");
      written += 1;
    }
  }
  done += 1;
  if (done % 20 === 0) console.log(`vendored ${done}/${index.components.length} files ${written}`);
});

fs.writeFileSync("out/remotionui-vendor-failed.json", JSON.stringify(failed, null, 2));
console.log(`done components ${done} files ${written} failed ${failed.length}`);
