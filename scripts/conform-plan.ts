/**
 * Tier 2. Plan conformance. Deterministic. Not a vision critic.
 *
 *   npx tsx scripts/conform-plan.ts out/prod-harden/props.json
 */
import fs from "fs";
import path from "path";
import { holdAt, narrationGaps } from "../src/film/hold";
import { layoutFor,presenterBounds,SAFE_PROFILES } from '../src/film/layers';
import { cueTime } from '../src/film/direction';

const propsPath = path.resolve(process.argv[2] || "");
const props = JSON.parse(fs.readFileSync(propsPath, "utf8"));
const chapters = props.plan.chapters as {
  name: string;
  start: number;
  end: number;
  beats: { start: number; end: number; mode?: string; state?: string | null; narration: string }[];
}[];

const failures: string[] = [];
const profile = props.plan.safeProfile ?? 'reels';
if (!(profile in SAFE_PROFILES)) failures.push(`Unknown safe profile ${profile}`);
const boundsSamples: unknown[] = [];
const modes = props.plan.direction ? props.plan.direction.shots.map((s:any)=>({name:s.chapterId,presenter:s.presenter})) : props.plan.chapters;
for (const c of modes) {
  const layout=layoutFor({hasChip:false,hasStamp:false,hasPill:false,cardRows:0,presenter:c.presenter,safeProfile:profile});
  const bounds=presenterBounds(layout.presenterScale,profile);
  if(layout.presenterScale && (bounds.bottom > 1920-SAFE_PROFILES[profile as keyof typeof SAFE_PROFILES].bottom || bounds.top < SAFE_PROFILES[profile as keyof typeof SAFE_PROFILES].top || bounds.left < 0 || bounds.right>1080-SAFE_PROFILES[profile as keyof typeof SAFE_PROFILES].right)) failures.push(`${c.name}: presenter violates ${profile}`);
  boundsSamples.push({chapter:c.name,presenter:c.presenter,bounds});
}
const allCues = props.plan.direction ? [...props.plan.direction.objects.map((o:any)=>o.introduced),...props.plan.direction.events.map((e:any)=>e.cue),...props.plan.direction.shots.map((s:any)=>s.cue)] : [];
for (const c of props.plan.chapters) for(const piece of c.pieces) {
  if(!props.plan.direction && piece.source==='library' && !piece.stateCues?.length) failures.push(`${c.name}: library ${piece.component} lacks authoritative state cues`);
  allCues.push(...(piece.stateCues??[]).map((s:any)=>s.cue));
}
for(const cue of allCues) if(cueTime(cue,props.words,props.plan.chapters)===null) failures.push(`Unaligned cue: ${JSON.stringify(cue)}`);
const samples: { time: number; chapter: string; beat: number; mode: string; state: string | null; forbidden: (string | null)[] }[] = [];

for (const gap of narrationGaps(chapters)) {
  const beats = chapters[gap.chapter].beats;
  const mid = (gap.from + gap.to) / 2;
  const held = holdAt(beats, mid);
  const chapter = holdAt(chapters, mid);
  if (!held || beats.indexOf(held) !== gap.holdIndex) failures.push(`${gap.name} ${mid.toFixed(2)} held the wrong beat`);
  if (!chapter || chapter.name !== gap.name) failures.push(`${gap.name} ${mid.toFixed(2)} held the wrong chapter`);
  if (held?.mode === "hypothetical" && gap.holdMode !== "hypothetical") failures.push(`${gap.name} ${mid.toFixed(2)} leaked a hypothetical`);
  const future = beats.slice(gap.holdIndex + 1).map((beat) => beat.state).filter((state) => state && state !== held?.state);
  if (held?.mode === "hypothetical" && gap.holdMode === "actual") failures.push(`${gap.name} hypothetical overwrote actual`);
  samples.push({ time: Number(mid.toFixed(3)), chapter: chapter?.name ?? "", beat: held ? beats.indexOf(held) : -1, mode: held?.mode ?? "", state: held?.state ?? null, forbidden: future });
}

chapters.forEach((chapter) => {
  chapter.beats.forEach((beat, index) => {
    const mid = (beat.start + beat.end) / 2;
    const held = holdAt(chapter.beats, mid);
    if (held !== beat) failures.push(`${chapter.name} beat ${index} midpoint selected another beat`);
  });
});

const report = { samples: samples.length, safeProfile:profile,presenterBounds:boundsSamples,cues:allCues.length,failures, ok: failures.length === 0 };
const out = path.join(path.dirname(propsPath), "conformance.json");
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(report.ok ? `conformance passed (${samples.length} gaps)` : failures.join("\n"));
if (!report.ok) process.exit(1);
