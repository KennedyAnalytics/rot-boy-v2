/**
 * Every narration gap must hold the beat that already finished, never a later one.
 *
 *   npx tsx scripts/gap-regression.ts out/prod-builder/props.json
 */
import fs from "fs";
import { holdAt, narrationGaps } from "../src/film/hold";

const buggy = <T extends { start: number; end: number }>(items: T[], time: number) =>
  items.find((item) => time >= item.start && time < item.end) ?? items[items.length - 1];

const props = JSON.parse(fs.readFileSync(process.argv[2] || "out/prod-builder/props.json", "utf8"));
const chapters = props.plan.chapters as {
  name: string;
  start: number;
  end: number;
  beats: { start: number; end: number; mode?: string; state?: string | null; narration: string }[];
}[];

const gaps = narrationGaps(chapters);
const failures: string[] = [];
const oldLeaks: string[] = [];

for (const gap of gaps) {
  const beats = chapters[gap.chapter].beats;
  const mid = (gap.from + gap.to) / 2;
  const held = holdAt(beats, mid);
  const leaked = buggy(beats, mid);
  const heldIndex = held ? beats.indexOf(held) : -1;
  if (heldIndex !== gap.holdIndex) {
    failures.push(`${gap.name} ${gap.from.toFixed(2)}–${gap.to.toFixed(2)} held beat ${heldIndex}, expected ${gap.holdIndex}`);
  }
  if (held && held.mode === "hypothetical" && gap.holdMode !== "hypothetical") {
    failures.push(`${gap.name} gap shows hypothetical during an actual hold`);
  }
  if (leaked && beats.indexOf(leaked) > gap.holdIndex) {
    oldLeaks.push(
      `${gap.name} ${gap.from.toFixed(2)}–${gap.to.toFixed(2)} old renderer jumped to beat ${beats.indexOf(leaked)} (${leaked.state ?? leaked.mode})`,
    );
  }
}

const report = {
  gaps: gaps.length,
  failures,
  oldLeakCount: oldLeaks.length,
  oldLeaks,
};
const out = process.argv[3] || "out/prod-gate/gap-regression.json";
fs.mkdirSync(out.replace(/[/\\][^/\\]+$/, ""), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`gaps ${gaps.length}, new failures ${failures.length}, old leaks ${oldLeaks.length}`);
if (failures.length) {
  console.log(failures.join("\n"));
  process.exit(1);
}
