import catalogJson from "./catalog.json";
import type { CatalogItem } from "./types";
import {approvedCatalogNames} from "../founding-toolset/registry";

export const catalog = catalogJson as CatalogItem[];
export const catalogByName = new Map(catalog.map((item) => [item.name, item]));

const stop = new Set("the and that with from into this for when what your then than are was has have its not but you one onto over under about after before they their them will can just out all who how she her his our was were been being".split(" "));

const synonyms: [RegExp, string[]][] = [
  [/\b(phones?|mobile|iphone)\b/i, ["multi-device-lineup", "device-mockup-zoom"]],
  [/\b(laptops?|desktops?|computers?|browsers?|websites?|webpages?|sites?)\b/i, ["browser-flow", "tab-switch-panel", "device-mockup-zoom"]],
  [/\b(terminals?|commands?|shells?|consoles?|deploys?)\b/i, ["terminal-simulator", "deploy-reveal"]],
  [/\b(codes?|functions?|snippets?|diffs?|commits?|repos?|repositories)\b/i, ["code-reveal", "code-diff-wipe", "commit-graph", "file-tree-reveal"]],
  [/\b(charts?|graphs?|trends?|plots?)\b/i, ["line-chart-draw", "animated-bar-chart", "sparkline-row"]],
  [/\b(funnels?|pipelines?|conversions?)\b/i, ["funnel-chart", "data-flow-pipes"]],
  [/\b(tables?|ledgers?|spreadsheets?|records?|rows?)\b/i, ["comparison-table"]],
  [/\b(compares?|comparisons?|versus|before|after)\b/i, ["split-screen", "comparison-bars", "comparison-table"]],
  [/\b(forms?|signups?|fields?|checkouts?)\b/i, ["form-fill-sequence"]],
  [/\b(search|results|quer(?:y|ies))\b/i, ["search-results-populate"]],
  [/\b(notifications?|toasts?|alerts?|texts?|sms)\b/i, ["notification-stack"]],
  [/\b(kanban|tickets?|boards?)\b/i, ["kanban-move"]],
  [/\b(timelines?|steps?|process|sequence|workflows?)\b/i, ["timeline-steps", "feature-list"]],
  [/\b(roadmaps?|milestones?|quarters?)\b/i, ["roadmap-lanes", "gantt-timeline"]],
  [/\b(hierarch(?:y|ies)|org)\b/i, ["org-chart-build"]],
  [/\b(calendars?|schedules?|months?|dates?)\b/i, ["calendar-month-fill"]],
  [/\b(quotes?|testimonials?)\b/i, ["quote-card"]],
  [/\b(maps?|cities|city|routes?|countries|globe)\b/i, ["map-flight", "globe-arc", "map-route"]],
  [/\b(cursors?|clicks?|drags?)\b/i, ["simulated-cursor", "drag-drop-flow", "cursor-path"]],
  [/\b(files?|folders?|documents?|pdfs?)\b/i, ["file-tree-reveal", "media-frame"]],
  [/\b(dashboards?|metrics?|kpis?|stats?)\b/i, ["metric-ticker", "stat-card"]],
  [/\b(arrows?|connectors?|pipes?)\b/i, ["data-flow-pipes", "connector-lines", "arrow-annotate"]],
  [/\b(gauges?|dials?|meters?|percents?|percentages?)\b/i, ["gauge-dial", "stat-card", "progress-bar"]],
  [/\b(chats?|messages?|inbox)\b/i, ["notification-stack", "comment-callout"]],
  [/\b(prices?|pricing|tiers?)\b/i, ["pricing-card", "comparison-table"]],
  [/\b(teams?|people|avatars?)\b/i, ["team-grid"]],
  [/\b(counts?|totals?|numbers?)\b/i, ["counter", "stat-card", "metric-ticker"]],
  [/\b(titles?|headlines?|words?)\b/i, ["auto-fit-title", "title-card", "typewriter"]],
  // Object vocabulary that the structure pass actually produces. Each of these
  // came out of a real chapter's `needs` and matched nothing useful.
  [/\b(buttons?|controls?|switches|toggles?|levers?)\b/i, ["feature-list", "tab-switch-panel"]],
  [/\b(panels?|consoles?|workbench)\b/i, ["tab-switch-panel", "metric-ticker"]],
  [/\b(drafts?|letters?|replies|reply|emails?|messages?|threads?)\b/i, ["chat-to-preview", "notification-stack", "claude-chat"]],
  [/\b(inbox|mailbox|conversations?)\b/i, ["notification-stack", "claude-chat"]],
  [/\b(folders?|directories|trees?)\b/i, ["file-tree-reveal"]],
  [/\b(lists?|entries|invoices?|bills?|queues?)\b/i, ["comparison-table", "kanban-move", "search-results-populate"]],
  [/\b(approvals?|approve|sign[- ]?off|reviews?|checks?|gates?)\b/i, ["form-fill-sequence", "comparison-table"]],
  [/\b(rules?|limits?|policies|guardrails?|constraints?)\b/i, ["feature-list", "comparison-table"]],
  [/\b(settings?|configs?|options?|preferences)\b/i, ["feature-list", "form-fill-sequence"]],
];

const needsPicture = new Set(["device-mockup-zoom", "media-frame", "media-sequence", "image-expand", "b-roll-stack", "zoom-pan-frame", "text-mask-video"]);

/**
 * Components that are `material` in the catalog but cannot carry a chapter.
 *
 * A stage has to hold a whole chapter: it stays up across several beats and
 * presents structured information while annotation changes around it. These
 * do not. They are effects, overlays, chrome, or captions, and several are
 * used by the annotation layer and the house chrome instead.
 *
 * The first structured run picked `marker-highlight` as a chapter stage and
 * rendered two beats with nothing on screen at all. Leaving them in the pool
 * is how a thesaurus hit becomes an empty frame.
 */
const NOT_A_STAGE = new Set([
  // Type effects. These animate a line of text; they are not a picture.
  "typewriter", "split-text-chars", "scramble-text", "light-sweep-text", "slot-roll",
  "matrix-decode", "rgb-glitch-text", "strikethrough-replace", "handwriting-text",
  "stroke-to-fill-text", "variable-font-morph", "liquid-text-morph", "wave-text",
  "neon-flicker-text", "tracking-in", "auto-fit-title", "infinite-marquee",
  "text-animator", "text-reveal-shader", "text-extrude-3d", "title-card",
  // Annotation layer owns these. The renderer places them; retrieval must not.
  "marker-highlight", "arrow-annotate", "badge-stamp", "callout-spotlight",
  "connector-lines", "comment-callout", "caption-highlight", "simulated-cursor",
  "cursor-path", "dashed-path-travel", "confetti-burst", "reaction-burst",
  "path-draw", "shape-morph", "blob-morph", "shape-layer", "effector-field", "ik-rig",
  // The house owns captions.
  "karaoke-captions", "word-pop-captions", "caption-emoji-beat", "srt-caption-track",
  "speaker-label-captions", "subtitle-translate", "caption-scene", "transcript-scroll",
  // Audio furniture. No informational role in a silent-readable explainer.
  "audiogram-bars", "audiogram-scene", "waveform-line", "waveform-bars-radial",
  "audio-pulse", "audio-reactive-scale", "vu-meter", "beat-pulse-grid",
  "audio-scrubber", "voice-note-bubble",
  // Broadcast and social chrome, not explanation.
  "end-card", "hook-card", "logo-reveal", "logo-wall", "countdown-timer",
  "news-ticker-bar", "sports-scorebug", "poll-overlay",
]);

/** Can this component hold a chapter on its own? */
export const isStage = (name: string) => {
  const item = catalogByName.get(name);
  if (!item || item.scope !== "material") return false;
  return !NOT_A_STAGE.has(name) && !needsPicture.has(name) && !name.startsWith("map-");
};

const tokensOf = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !stop.has(token));

/** Singular/plural fold, so "buttons" matches a component described with "button". */
const stem = (token: string) => (token.length > 4 && token.endsWith("s") && !token.endsWith("ss") ? token.slice(0, -1) : token);

const indexOf = (item: CatalogItem) => ({
  name: new Set(tokensOf(item.name.replace(/-/g, " ")).map(stem)),
  body: new Set([...tokensOf(`${item.description} ${item.tags} ${item.tasks.join(" ")}`)].map(stem)),
});

const index = new Map(catalog.map((item) => [item.name, indexOf(item)] as const));

/**
 * Whole-token scoring.
 *
 * The previous version matched tokens as substrings of one concatenated
 * string, so "note" hit `notification-stack` and `arrow-annotate`, and a
 * query about an approval card came back holding `calendar-month-fill`,
 * `claude-chat` and `kanban-move`. A word has to match a word.
 */
const score = (item: CatalogItem, query: string) => {
  const entry = index.get(item.name);
  if (!entry) return 0;
  let total = 0;
  for (const raw of new Set(tokensOf(query))) {
    const token = stem(raw);
    // The component's own name is the strongest statement of what it is.
    if (entry.name.has(token)) total += raw.length > 5 ? 6 : 4;
    else if (entry.body.has(token)) total += raw.length > 5 ? 3 : 2;
  }
  for (const [pattern, names] of synonyms) {
    if (pattern.test(query) && names.includes(item.name)) total += 10;
  }
  return total;
};

/**
 * A candidate has to actually look like the object, not merely share a word.
 *
 * Below this, returning nothing is the better answer: the stage pass then
 * chooses a procedural graphic, which is a designed house object rather than
 * the nearest catalog metaphor. Padding the list to eight is how
 * `code-accordion` became "a wall of labelled doors".
 */
const MIN_SCORE = 6;

/**
 * `stagesOnly` restricts the shortlist to components that can carry a whole
 * chapter. The structured pipeline always sets it; the previous per-scene
 * pipeline does not, so its behaviour is unchanged.
 */
export const shortlist = (query: string, limit = 8, exclude: string[] = [], stagesOnly = false) => {
  const blocked = new Set(exclude);
  const ranked = catalog
    .filter(
      (item) =>
        approvedCatalogNames.has(item.name) &&
        item.scope === "material" &&
        !blocked.has(item.name) &&
        !item.name.startsWith("map-") &&
        !needsPicture.has(item.name) &&
        (!stagesOnly || !NOT_A_STAGE.has(item.name)),
    )
    .map((item) => ({ item, value: score(item, query) }))
    .filter((row) => row.value >= MIN_SCORE)
    .sort((a, b) => b.value - a.value);
  const picked: CatalogItem[] = [];
  const families = new Map<string, number>();
  for (const row of ranked) {
    const family = row.item.tags.split(" ")[0] || row.item.category;
    const count = families.get(family) ?? 0;
    if (count >= 2) continue;
    picked.push(row.item);
    families.set(family, count + 1);
    if (picked.length >= limit) break;
  }
  // Deliberately no fill-to-limit pass. A short list is an honest short list.
  return picked;
};

export const materialBrief = (items: CatalogItem[]) =>
  items.map((item) => ({
    name: item.name,
    description: item.description,
    props: item.props.map((prop) => ({
      name: prop.name,
      type: prop.type,
      required: prop.required,
      description: prop.description,
    })),
    example: item.usage,
  }));
