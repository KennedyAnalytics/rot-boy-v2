import fs from "node:fs";
import path from "node:path";
import { directVisual } from "../server/direct-visual";
import { loadEnv } from "../server/env";
import { realizeNarration } from "../src/timing";

loadEnv();

const script = `A neighborhood print shop used to take orders on paper slips. Now the order starts on the website. The customer uploads a file, picks a size, and sets a due date. Those three facts become one ticket. The ticket waits at the counter until a press is free. At the press, someone opens the file and checks the color against the proof. If the color is off, the ticket goes back and the due date does not move. If the color holds, the sheets go to the finishing table. Finishing checks the cut and bags the job. Only then does a text go to the customer. The bag is already on the shelf when the text arrives. The customer does not call to ask where the order is. The shop can see every open ticket, and which ones are late, on one board.`;

const directed = await directVisual(script, "Phone frame. Paper, ink, and coral. Do not invent numbers that were not spoken.", "auto");
const timed = realizeNarration(directed.plan);
const props = { plan: timed.plan, words: timed.words, audioFile: null };
fs.mkdirSync("out/unseen", { recursive: true });
fs.writeFileSync("out/unseen/props.json", JSON.stringify(props));
fs.writeFileSync(
  "out/unseen/summary.json",
  JSON.stringify(
    {
      title: timed.plan.title,
      warnings: directed.warnings,
      gaps: directed.gaps,
      durationSec: timed.plan.durationSec,
      scenes: timed.plan.scenes.map((scene) => ({
        id: scene.id,
        kicker: scene.kicker,
        intent: scene.intent,
        built: scene.built,
        character: scene.character.pose,
        gap: scene.illustrationGap,
        start: scene.start,
        end: scene.end,
        narration: scene.beats.map((beat) => beat.narration).join(" "),
      })),
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ title: timed.plan.title, warnings: directed.warnings, scenes: timed.plan.scenes.map((scene) => scene.built) }, null, 2));
