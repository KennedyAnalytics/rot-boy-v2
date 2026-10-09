import type { TimedFilm } from "./types";

export const blankFilm = (): TimedFilm => ({
  title: "Empty",
  durationSec: 3,
  scenes: [
    {
      id: "empty",
      chapter: "Start",
      kicker: "FIG. 01  —  WAITING",
      intent: "Waiting for a script.",
      persists: "",
      changes: "",
      payoff: "",
      character: { pose: "none", side: "left" },
      beats: [{ narration: "Paste a script.", start: 0.2, end: 2.4 }],
      pieces: [{ source: "procedural", component: "", graphic: "fact", weight: 1, facts: ["Paste a script"], props: { text: "Paste a script" } }],
      illustrationGap: null,
      built: "fact",
      start: 0.2,
      end: 2.6,
    },
  ],
});
