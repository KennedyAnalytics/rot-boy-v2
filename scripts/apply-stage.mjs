import fs from "node:fs";
import path from "node:path";

const roots = ["src/remotion", "src/compositions"];
const sans = ["PlusJakartaSans", "SchibstedGrotesk", "InstrumentSans", "LibreFranklin", "SourceSans3", "NunitoSans", "Manrope", "Figtree", "DMSans", "Barlow", "Urbanist", "Outfit", "Inter", "Geist", "Sora"];

const walk = (dir, files = []) => {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(full);
  }
  return files;
};

const marker = 'import { useStageConfig as useVideoConfig } from "@/remotion/lib/stage";';
let staged = 0;
let fonts = 0;

for (const file of roots.flatMap((root) => walk(root))) {
  if (file.endsWith(`${path.sep}stage.tsx`)) continue;
  let source = fs.readFileSync(file, "utf8");
  const original = source;
  if (source.includes("useVideoConfig")) {
    source = source.replace(/import\s*\{([^}]+)\}\s*from\s*(["']remotion["'])/g, (full, inner, from) => {
      const parts = inner.split(",").map((part) => part.trim()).filter(Boolean);
      if (!parts.some((part) => /^useVideoConfig(\s|$)/.test(part))) return full;
      const kept = parts.filter((part) => !/^useVideoConfig(\s|$)/.test(part));
      const line = kept.length ? `import { ${kept.join(", ")} } from ${from};\n` : "";
      return `${line}${marker}`;
    });
    const copies = source.split(marker).length - 1;
    if (copies > 1) {
      source = source.split(marker).join("");
      const firstImport = source.indexOf("import ");
      source = `${source.slice(0, firstImport)}${marker}\n${source.slice(firstImport)}`;
    }
  }
  for (const name of sans) {
    const needle = `@remotion/google-fonts/${name}`;
    source = source.replaceAll(`${needle}"`, '@remotion/google-fonts/Archivo"').replaceAll(`${needle}'`, "@remotion/google-fonts/Archivo'");
  }
  if (source !== original) {
    if (source.includes("useStageConfig")) staged += 1;
    if (source.includes("@remotion/google-fonts/Archivo") && !original.includes("@remotion/google-fonts/Archivo")) fonts += 1;
    fs.writeFileSync(file, source);
  }
}

console.log(`stage rewrites ${staged}, font rewrites ${fonts}`);
