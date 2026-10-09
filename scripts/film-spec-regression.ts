/**
 * Contract tests for the single FilmSpec path and the arsenal.
 * No model calls. A fixture plan is written for stills.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { applySpecPatch, assertStoryboardHonored, compileFilmSpec, storyboardCompiles, usesHouseGlyphs } from "../src/film/film-spec";
import { assertPublicHttps } from "../src/film/source-policy";
import { arsenalMaterials } from "../src/founding-toolset/arsenal";
import { foundingMaterials } from "../src/founding-toolset/registry";
import { timeChapters } from "../src/timing";
import type { Word } from "../src/types";

const fail = (message: string): never => {
  throw new Error(message);
};

const script = [
  "Mara runs a roofing crew.",
  "A lead arrives in the inbox.",
  "The form records the address.",
  "A diagram shows the next step.",
  "The sheet lists one hundred calls.",
  "Open the public page for the live search.",
  "The quote document states the price.",
  "The recap keeps the same lead.",
].join(" ");

const sentences = script.split(/(?<=[.!?])\s+/);
const shot = (
  chapterId: string,
  sentence: number,
  phrase: string,
  medium: string,
  materialId: string,
  grammar: string,
  focus: string,
  objectIds: string[],
  extra: Record<string, unknown> = {},
) => ({
  chapterId,
  cue: { phrase, sentence },
  boundary: "carry",
  composition: extra.composition ?? "detail",
  objectIds,
  focus,
  presenter: "beside",
  recapRefs: extra.recapRefs ?? [],
  medium,
  materialId,
  sourceId: extra.sourceId ?? null,
  grammar,
  intentionalRepeat: false,
  repeatReason: null,
});

const fixture = {
  version: 1,
  title: "Roofing pipeline",
  example: { name: "Mara", what: "A roofing crew working one lead." },
  throughLine: "One lead, followed through",
  caseObjectId: "lead",
  chapters: [
    { name: "Crew", sentenceIndexes: [0, 1], stage: "The crew and the lead", persists: "The crew", changes: "A lead arrives", payoff: "The lead is in", presenter: "lead", facts: ["Mara"], needs: ["crew", "inbox"], recap: false, illustrationGap: null },
    { name: "Form", sentenceIndexes: [2, 3], stage: "The intake and the path", persists: "The form", changes: "The next step appears", payoff: "The path is visible", presenter: "beside", facts: ["address"], needs: ["form", "diagram"], recap: false, illustrationGap: null },
    { name: "Calls", sentenceIndexes: [4, 5], stage: "The call sheet and the page", persists: "The sheet", changes: "The page opens", payoff: "The search is real", presenter: "away", facts: ["one hundred calls"], needs: ["sheet", "page"], recap: false, illustrationGap: null },
    { name: "Quote", sentenceIndexes: [6, 7], stage: "The quote and the recap", persists: "The quote", changes: "The lead is retrieved", payoff: "The same lead remains", presenter: "beside", facts: ["price"], needs: ["quote", "lead"], recap: true, illustrationGap: null },
  ],
  objects: [
    { id: "crew", label: "Mara's crew", kind: "boundary", introduced: { phrase: "Mara runs", sentence: 0 }, detail: "The roofing crew." },
    { id: "lead", label: "New lead", kind: "message", introduced: { phrase: "A lead arrives", sentence: 1 }, detail: "A customer inquiry." },
    { id: "form", label: "Intake form", kind: "document", introduced: { phrase: "The form records", sentence: 2 }, detail: "The address goes here." },
    { id: "steps", label: "Next step", kind: "sheet", introduced: { phrase: "A diagram shows", sentence: 3 }, detail: "What happens next." },
    { id: "calls", label: "Call sheet", kind: "sheet", introduced: { phrase: "The sheet lists", sentence: 4 }, detail: "One hundred calls." },
    { id: "page", label: "Public page", kind: "boundary", introduced: { phrase: "the public page", sentence: 5 }, detail: "The live search." },
    { id: "quote", label: "Quote", kind: "document", introduced: { phrase: "The quote document", sentence: 6 }, detail: "The stated price." },
  ],
  events: [
    { objectId: "crew", cue: { phrase: "Mara runs", sentence: 0 }, mode: "actual", state: "Working", detail: "The crew is on a job.", action: "transform", from: null },
    { objectId: "lead", cue: { phrase: "A lead arrives", sentence: 1 }, mode: "actual", state: "Arrived", detail: "The lead reaches the inbox.", action: "traverse", from: "crew" },
    { objectId: "form", cue: { phrase: "The form records", sentence: 2 }, mode: "actual", state: "Recorded", detail: "The address is on the form.", action: "transform", from: null },
    { objectId: "steps", cue: { phrase: "A diagram shows", sentence: 3 }, mode: "actual", state: "Mapped", detail: "The next step is drawn.", action: "transform", from: null },
    { objectId: "calls", cue: { phrase: "The sheet lists", sentence: 4 }, mode: "actual", state: "One hundred", detail: "The sheet lists the calls.", action: "transform", from: null },
    { objectId: "page", cue: { phrase: "the public page", sentence: 5 }, mode: "actual", state: "Opened", detail: "The public page is open.", action: "traverse", from: "calls" },
    { objectId: "quote", cue: { phrase: "The quote document", sentence: 6 }, mode: "actual", state: "Priced", detail: "The quote states the price.", action: "transform", from: null },
    { objectId: "lead", cue: { phrase: "the same lead", sentence: 7 }, mode: "recap", state: "Arrived", detail: "The lead is retrieved.", action: "return", from: "quote" },
  ],
  shots: [
    shot("chapter-1", 0, "Mara runs", "house_graphic", "house.directed-stage", "house-objects", "crew", ["crew"]),
    shot("chapter-1", 1, "A lead arrives", "ui_component_scene", "ui.inbox", "inbox", "lead", ["crew", "lead"]),
    shot("chapter-2", 2, "The form records", "ui_component_scene", "ui.form", "form", "form", ["form", "lead"]),
    shot("chapter-2", 3, "A diagram shows", "diagram_scene", "arsenal.process-diagram", "process-diagram", "steps", ["steps", "form"]),
    shot("chapter-3", 4, "The sheet lists", "data_visualization_scene", "arsenal.numeric-stage", "numeric", "calls", ["calls"]),
    shot("chapter-3", 5, "the public page", "captured_website", "arsenal.browser-capture", "browser", "page", ["page", "calls"], { sourceId: "proof-search" }),
    shot("chapter-4", 6, "The quote document", "document_scene", "arsenal.document-page", "document", "quote", ["quote", "lead"]),
    shot("chapter-4", 7, "the same lead", "house_graphic", "house.persistent-glyph", "recap-objects", "lead", ["lead", "quote"], { composition: "recap", recapRefs: ["lead"] }),
  ],
  sources: [
    { id: "proof-search", kind: "webpage", url: null, localPath: "sources/proof-search/capture.png", provenance: "Studio fixture, not a live page.", crop: null, highlight: { label: "Search", x: 0.08, y: 0.12, width: 0.5, height: 0.22 } },
  ],
};

const compiled = compileFilmSpec(fixture, sentences);
if (compiled.plan.chapters.reduce((sum, chapter) => sum + chapter.beats.length, 0) !== sentences.length) fail("Beats were not derived one per sentence.");
if (compiled.spec.executions.length !== 8) fail("Expected eight shot executions.");
const grammars = compiled.spec.executions.map((execution) => execution.grammar);
if (new Set(grammars).size !== grammars.length) fail("The fixture was forced into a repeated grammar.");
if (compiled.spec.executions.some((execution) => execution.medium === "captured_website" && !execution.sourceId)) fail("Capture shot lost its source.");

const repeated = structuredClone(fixture);
repeated.shots[1].grammar = "house-objects";
let rejected = false;
try {
  compileFilmSpec(repeated, sentences);
} catch (error) {
  rejected = /grammar/.test(error instanceof Error ? error.message : "");
}
if (!rejected) fail("Consecutive identical grammars were accepted.");

const allowed = structuredClone(fixture);
allowed.shots[1].grammar = "house-objects";
allowed.shots[1].intentionalRepeat = true;
allowed.shots[1].repeatReason = "The lead continues the crew scene.";
compileFilmSpec(allowed, sentences);

if (!storyboardCompiles(fixture, sentences)) fail("A complete storyboard still wanted a model call.");
const honored = compileFilmSpec(fixture, sentences);
assertStoryboardHonored(fixture, honored.spec);
const drifted = structuredClone(fixture);
drifted.shots[5].medium = "house_graphic";
let driftRejected = false;
try {
  assertStoryboardHonored(drifted, honored.spec);
} catch {
  driftRejected = true;
}
if (!driftRejected) fail("A storyboard medium was allowed to change.");

let scoped = false;
try {
  applySpecPatch(honored.spec, { provenance: "test", chapterIds: ["chapter-1", "chapter-2", "chapter-3", "chapter-4"], shots: [] }, sentences);
} catch (error) {
  scoped = /untouched/.test(error instanceof Error ? error.message : "");
}
if (!scoped) fail("A whole-film repair was accepted.");

if (usesHouseGlyphs(undefined) !== true) fail("Plans without an execution must keep the house stage.");
if (usesHouseGlyphs({ medium: "diagram_scene", materialId: "arsenal.process-diagram" }) !== false) fail("A diagram shot still drew glyphs.");
if (usesHouseGlyphs({ medium: "house_graphic", materialId: "arsenal.text-treatment" }) !== false) fail("A statement still drew glyphs.");

if (foundingMaterials.length !== 29) fail("The founding set changed size.");
const arsenalIds = arsenalMaterials.map((material) => material.id);
if (new Set(arsenalIds).size !== arsenalIds.length) fail("Arsenal ids collide with each other.");
if (arsenalIds.some((id) => foundingMaterials.some((material) => material.id === id))) fail("Arsenal ids collide with the founding set.");

try {
  assertPublicHttps("http://example.com");
  fail("http was accepted");
} catch { /* expected */ }
try {
  assertPublicHttps("https://127.0.0.1/private");
  fail("loopback was accepted");
} catch { /* expected */ }
try {
  assertPublicHttps("https://10.0.0.4/local");
  fail("a private network was accepted");
} catch { /* expected */ }
assertPublicHttps("https://example.com/search");

const hotPath = fs.readFileSync("server/direct-structure.ts", "utf8");
if (/beats for chapter|stageFor|beatSystem|stageSystem/.test(hotPath)) fail("The directed hot path still runs per-chapter beat or stage calls.");
if (!hotPath.includes("compileFilmSpec")) fail("The directed hot path does not compile a FilmSpec.");
const remix = fs.readFileSync("scripts/remix-audio.ts", "utf8");
if (/remotion|renderStructuredFilm|renderMedia/.test(remix)) fail("Audio remix still reaches the picture renderer.");
const review = fs.readFileSync("scripts/compact-review.ts", "utf8");
if (review.includes("for (let i = 0; i < strips")) fail("The compact critic loops over strips.");

const png = (width: number, height: number) => {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const pixel = row + 1 + x * 4;
      const bar = y < 28;
      raw[pixel] = bar ? 28 : 226;
      raw[pixel + 1] = bar ? 33 : 120;
      raw[pixel + 2] = bar ? 43 : 90;
      raw[pixel + 3] = 255;
    }
  }
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c;
  }
  const crc32 = (data: Buffer) => {
    let c = 0xffffffff;
    for (const byte of data) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const head = Buffer.alloc(4);
    head.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc32(body));
    return Buffer.concat([head, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};

const captureDir = path.resolve("public", "sources", "proof-search");
fs.mkdirSync(captureDir, { recursive: true });
fs.writeFileSync(path.join(captureDir, "capture.png"), png(640, 360));
fs.writeFileSync(path.join(captureDir, "provenance.json"), JSON.stringify({ policy: "fixture", note: "Replaced when a public capture succeeds." }, null, 2));

const words: Word[] = script.split(/\s+/).map((text, index) => ({ text, start: index * 0.45, end: index * 0.45 + 0.4 }));
const timed = timeChapters(compiled.plan.chapters, words);
const props = {
  plan: { ...compiled.plan, chapters: timed.chapters, durationSec: timed.durationSec },
  words,
  audioFile: null,
};
const out = path.resolve("out", "arsenal-proof");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "props.json"), JSON.stringify(props, null, 2));
fs.writeFileSync(path.join(out, "film-spec.json"), JSON.stringify(compiled.spec, null, 2));
fs.writeFileSync(path.join(out, "scene-media.json"), JSON.stringify(compiled.spec.executions, null, 2));

console.log(JSON.stringify({
  status: "pass",
  sentences: sentences.length,
  grammars,
  mediums: compiled.spec.executions.map((execution) => execution.medium),
  founding: foundingMaterials.length,
  arsenal: arsenalMaterials.length,
  props: path.join(out, "props.json"),
}, null, 2));
