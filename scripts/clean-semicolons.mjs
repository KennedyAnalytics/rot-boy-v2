import fs from "node:fs";
import path from "node:path";

const walk = (dir, files = []) => {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(full);
  }
  return files;
};

let count = 0;
for (const file of [...walk("src/remotion"), ...walk("src/compositions")]) {
  const source = fs.readFileSync(file, "utf8");
  const next = source.replaceAll('from "@/remotion/lib/stage";;', 'from "@/remotion/lib/stage";');
  if (next !== source) {
    fs.writeFileSync(file, next);
    count += 1;
  }
}
console.log("cleaned", count);
