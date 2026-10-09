/**
 * Unseen test for the structured-film system.
 *
 * Writes a script from a topic the system has not been tuned on, structures
 * it, directs its beats and stages, times it, and writes props for the
 * `StructuredFilm` composition.
 *
 *   npx tsx scripts/proof-structure.ts "<topic>"
 *   npx remotion render src/index.ts StructuredFilm out/structure/film.mp4 \
 *     --props=out/structure/props.json
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { directStructure } from "../server/direct-structure";
import { writeScript } from "../server/llm";
import { realizeNarration } from "../src/timing";
import type { StructuredFilmProps, TimedChapter } from "../src/film/structure-types";

const TOPIC =
  process.argv.slice(2).join(" ").trim() ||
  "How a small accounting firm uses an AI agent to chase unpaid invoices";

const NOTES = "Paper, ink, and coral. Do not invent numbers that were not spoken.";

const out = path.resolve("out", process.env.OUT_NAME || "structure");

const main = async () => {
  fs.mkdirSync(out, { recursive: true });

  console.log(`topic: ${TOPIC}\n`);
  const written = await writeScript(TOPIC, NOTES);
  const wordCount = written.script.split(/\s+/).filter(Boolean).length;
  console.log(`script: "${written.title}" (${wordCount} words)\n`);
  fs.writeFileSync(path.join(out, "script.txt"), `${written.title}\n\n${written.script}\n`);

  const directed = await directStructure(written.script, NOTES);

  // `realizeNarration` is generic over { scenes: [{ beats: [{ narration }] }] }.
  const timed = realizeNarration({ scenes: directed.plan.chapters });
  const chapters = timed.plan.scenes as unknown as TimedChapter[];

  const props: StructuredFilmProps = {
    plan: {
      title: directed.plan.title,
      spine: directed.plan.spine,
      example: directed.plan.example,
      chapters,
      durationSec: timed.plan.durationSec,
    },
    words: timed.words,
    audioFile: null,
  };

  fs.writeFileSync(path.join(out, "props.json"), JSON.stringify(props, null, 2));
  fs.writeFileSync(
    path.join(out, "summary.json"),
    JSON.stringify(
      {
        topic: TOPIC,
        title: directed.plan.title,
        words: wordCount,
        durationSec: Number(timed.plan.durationSec.toFixed(2)),
        spine: directed.plan.spine,
        example: directed.plan.example,
        warnings: directed.warnings,
        gaps: directed.gaps,
        trace: directed.coverage.trace,
        chapters: chapters.map((chapter, index) => ({
          n: index + 1,
          name: chapter.name,
          presenter: chapter.presenter,
          recap: chapter.recap,
          built: chapter.built,
          sentences: chapter.sentenceIndexes.length,
          start: Number(chapter.start.toFixed(2)),
          end: Number(chapter.end.toFixed(2)),
          stage: chapter.stage,
          persists: chapter.persists,
          changes: chapter.changes,
          payoff: chapter.payoff,
          gap: chapter.illustrationGap,
          beats: chapter.beats.map((beat) => ({
            state: beat.state,
            pill: beat.pill ? `${beat.pill.term} = ${beat.pill.is}` : null,
            card: beat.card ? { kicker: beat.card.kicker, rows: beat.card.rows.map((row) => `${row.label}: ${row.value}`) } : null,
            stamp: beat.stamp ? `${beat.stamp.label} (${beat.stamp.ring})` : null,
            narration: beat.narration,
          })),
        })),
      },
      null,
      2,
    ),
  );

  console.log(`\nspine: ${directed.plan.spine.join(" > ")}`);
  console.log(`example: ${directed.plan.example ? `${directed.plan.example.name} - ${directed.plan.example.what}` : "none"}`);
  console.log(`chapters: ${chapters.length}, beats: ${chapters.reduce((sum, c) => sum + c.beats.length, 0)}`);
  console.log(`duration: ${timed.plan.durationSec.toFixed(1)}s`);
  if (directed.warnings.length) console.log(`\nwarnings:\n- ${directed.warnings.join("\n- ")}`);
  console.log(`\nwrote ${path.relative(process.cwd(), out)}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
