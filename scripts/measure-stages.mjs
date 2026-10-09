/**
 * Reads each installed library component's source and records the reference
 * box it scales itself against, so the renderer can size its stage slot.
 *
 * Components in this library compute a scale unit as
 *   u = Math.min(width / A, height / B)
 * and then lay themselves out in units of u. A/B is the aspect the component
 * was designed at. A portrait-referenced component gets bigger when it is
 * handed a taller box; a component with no reference box fills whatever box it
 * is given, and handing it a box taller than the frame spreads its contents
 * into the gap.
 *
 * Writes src/film/stage-fit.json. Re-run after re-vendoring the library.
 *
 *   node scripts/measure-stages.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src/remotion");
const CATALOG = path.resolve("src/film/catalog.json");
const OUT = path.resolve("src/film/stage-fit.json");

const sourceFor = (importPath) => {
  const rel = importPath.replace(/^@\/remotion\//, "");
  const direct = path.join(ROOT, `${rel}.tsx`);
  if (fs.existsSync(direct)) return direct;
  const index = path.join(ROOT, rel, "index.tsx");
  if (fs.existsSync(index)) return index;
  return null;
};

const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
const fit = {};
let measured = 0;
let missing = 0;

for (const item of catalog) {
  if (!item.importPath?.startsWith("@/remotion/")) continue;
  const file = sourceFor(item.importPath);
  if (!file) {
    missing += 1;
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  const refs = [...source.matchAll(/Math\.min\(\s*width\s*\/\s*(\d+)\s*,\s*height\s*\/\s*(\d+)\s*\)/g)].map((match) => ({
    w: Number(match[1]),
    h: Number(match[2]),
  }));
  // A component with both a portrait and a landscape reference picks between
  // them at runtime. The portrait one is what applies on a 9:16 stage.
  const portrait = refs.find((ref) => ref.h > ref.w);
  if (portrait) {
    fit[item.name] = { w: portrait.w, h: portrait.h };
    measured += 1;
  } else {
    fit[item.name] = null;
  }
}

fs.writeFileSync(OUT, `${JSON.stringify(fit, null, 2)}\n`);
console.log(`measured ${measured} portrait-referenced components, ${Object.keys(fit).length - measured} fill-the-box, ${missing} sources not found`);
console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
