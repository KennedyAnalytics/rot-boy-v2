import fs from "node:fs";
import path from "node:path";

const catalog = JSON.parse(fs.readFileSync("src/film/catalog.json", "utf8"));

const entryFor = (target) => {
  const candidates = [path.join(target, "index.tsx"), path.join(target, "index.ts"), `${target}.tsx`, `${target}.ts`];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
};

const exportsOf = (source) => [...source.matchAll(/export\s+(?:const|function|class)\s+([A-Z][A-Za-z0-9_]*)/g)].map((match) => match[1]);

const lines = [];
const map = [];
const skipped = [];

for (const item of catalog) {
  if (item.scope === "utility" || item.scope === "transition") continue;
  const file = entryFor(item.installTarget);
  if (!file) {
    skipped.push(`${item.name} missing`);
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes("<")) {
    skipped.push(`${item.name} no jsx`);
    continue;
  }
  const names = exportsOf(source);
  const want = path.basename(item.installTarget).replace(/-/g, "").toLowerCase();
  const chosen =
    names.find((name) => name.toLowerCase() === want) ||
    names.find((name) => name.toLowerCase().includes(want) || want.includes(name.toLowerCase())) ||
    (item.exportName && names.includes(item.exportName) ? item.exportName : null) ||
    names[0];
  if (!chosen) {
    skipped.push(`${item.name} no export`);
    continue;
  }
  const ident = `Component_${item.name.replace(/[^A-Za-z0-9_]/g, "_")}`;
  lines.push(`import { ${chosen} as ${ident} } from "${item.importPath}";`);
  map.push(`  "${item.name}": ${ident},`);
}

const contents = `import type { ComponentType } from "react";
${lines.join("\n")}

export const library = {
${map.join("\n")}
} as unknown as Record<string, ComponentType<Record<string, unknown>>>;
`;

fs.writeFileSync("src/film/registry.tsx", contents);
fs.writeFileSync("out/registry-skipped.json", JSON.stringify(skipped, null, 2));
console.log(`registry ${map.length}, skipped ${skipped.length}`);
