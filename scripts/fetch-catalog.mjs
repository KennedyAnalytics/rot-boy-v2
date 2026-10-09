import fs from "node:fs";

const indexPath =
  process.argv[2] ||
  "C:/Users/Eric/.cursor/projects/c-Users-Eric-Documents-rot-boy-v2/agent-tools/cb123f47-1f95-4354-ba7c-0b55f51d96d0.txt";
const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));

const tagRules = [
  [/chart|gauge|sparkline|heatmap|treemap|donut|pie-|radar|candlestick|waterfall|funnel|scatter|bubble|metric|stat-card|comparison-bar|comparison-table|poll-overlay|sports-score/, "data visualization chart metric table comparison"],
  [/terminal|code-|commit|file-tree|claude-code|opencode|live-code|landing-code/, "code terminal diff editor file tree"],
  [/device|browser-flow|multi-device|hero-device|tab-switch|chat-to-preview|ai-generation|dashboard|bento/, "device interface browser dashboard screen"],
  [/form-fill|faq-|search-result|notification|kanban|drag-drop|quiz-/, "form search notification kanban workflow interaction"],
  [/timeline|roadmap|gantt|calendar|changelog|org-chart|feature-list|countdown|progress-bar/, "timeline roadmap steps schedule hierarchy"],
  [/caption|karaoke|subtitle|transcript|word-pop|typewriter|counter|title|quote|lower-third|end-card|hook-card|auto-fit|text-|split-text|scramble|handwriting|marker-highlight|strikethrough|wave-text|slot-roll|matrix-decode|marquee/, "text animation caption title quote"],
  [/map-|globe|geo/, "map route globe place"],
  [/cursor|arrow-annotate|connector|path-draw|dashed-path|data-flow|shape-morph|callout-spotlight/, "diagram connector arrow cursor path"],
  [/chat-gpt|claude-chat|v0\b|comment-callout|voice-note|talking-head/, "conversation chat message"],
  [/audio|waveform|vu-meter|beat-pulse|audiogram/, "audio waveform meter"],
  [/pricing|logo-wall|team-grid|weather|media-frame|split-screen|image-expand|news-ticker|badge-stamp|document/, "card document media comparison badge"],
  [/3d|turntable|extrude|card-stack-3d/, "3d device product"],
  [/particle|aurora|grain|grid|caustic|ray|shader|dither|warp-band|tunnel|noise|topographic|mesh-gradient/, "background atmosphere"],
];

const scopeOf = (component) => {
  const name = component.name;
  const tasks = component.tasks ?? [];
  if (component.category === "utility" || component.type === "registry:lib" || component.type === "registry:hook") return "utility";
  if (tasks.includes("transitions") || name.startsWith("transition-") || name.endsWith("-wipe") || name.includes("wipe") || name === "blur-reveal" || name === "zoom-through" || name === "spatial-push") return "transition";
  if (name.endsWith("-bg") || name.includes("grain") || name.includes("shader") && name.includes("bg")) return "background";
  if (["aurora-bg", "particle-field", "mesh-gradient-bg", "dynamic-grid", "light-rays", "animated-noise-grain", "paper-shader", "dither-field-bg", "warp-bands-bg", "grain-gradient-bg", "light-tunnel-bg", "topographic-lines-bg", "caustics-bg"].includes(name)) return "background";
  if (component.category === "composition") return "template";
  if (["fade-in", "fade-out", "slide-up", "slide-left", "scale-in", "blur-in", "spring-in", "rotate-in", "skew-in", "stagger-children", "squash-stretch", "shake-emphasis", "glow-pulse", "motion-trail", "parallax-layers", "depth-of-field-blur", "track-matte", "follow-through", "slit-scan", "scanline-crt", "orbit-motion", "svg-mask-reveal"].includes(name)) return "wrapper";
  return "material";
};

const tagsFor = (name, description) => {
  const hay = `${name} ${description}`.toLowerCase();
  const tags = [];
  for (const [rule, tag] of tagRules) {
    if (rule.test(hay)) tags.push(tag);
  }
  return tags.join(" ");
};

const pool = async (items, size, worker) => {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (queue.length) {
        const item = queue.shift();
        await worker(item);
      }
    }),
  );
};

const details = new Map();
let done = 0;
await pool(index.components, 12, async (component) => {
  const url = component.detailUrl;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(String(response.status));
      details.set(component.name, await response.json());
      break;
    } catch (error) {
      if (attempt === 2) console.error("detail failed", component.name, error instanceof Error ? error.message : error);
    }
  }
  done += 1;
  if (done % 25 === 0) console.log(`details ${done}/${index.components.length}`);
});

const exportName = (usage, fallback) => {
  const match = String(usage ?? "").match(/import\s*\{([^}]+)\}/);
  if (!match) return fallback;
  const first = match[1]
    .split(",")
    .map((part) => part.trim())
    .find((part) => /^[A-Z]/.test(part));
  return first ? first.split(/\s+as\s+/i).pop() : fallback;
};

const catalog = index.components.map((component) => {
  const detail = details.get(component.name) ?? {};
  const props = Array.isArray(detail.props) ? detail.props : [];
  return {
    name: component.name,
    category: component.category ?? "",
    registryType: component.type ?? "",
    description: component.description ?? detail.description ?? "",
    tasks: component.tasks ?? [],
    importPath: component.importPath ?? "",
    installTarget: component.installTarget ?? "",
    exportName: exportName(detail.usage, null),
    scope: scopeOf(component),
    tags: tagsFor(component.name, `${component.description ?? ""} ${(component.tasks ?? []).join(" ")}`),
    props: props.slice(0, 18).map((prop) => ({
      name: prop.name,
      type: String(prop.type ?? "unknown").slice(0, 100),
      required: Boolean(prop.required),
      description: String(prop.description ?? "").slice(0, 160),
    })),
    usage: String(detail.usage ?? "").slice(0, 900),
  };
});

fs.mkdirSync("src/film", { recursive: true });
fs.writeFileSync("src/film/catalog.json", JSON.stringify(catalog));
const counts = catalog.reduce((acc, item) => {
  acc[item.scope] = (acc[item.scope] ?? 0) + 1;
  return acc;
}, {});
console.log("catalog", catalog.length, counts, "with props", catalog.filter((item) => item.props.length).length);
