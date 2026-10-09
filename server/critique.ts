import type { Chapter } from "../src/film/structure-types";

export type Defect = {
  chapter: number;
  kind: "mechanical" | "semantic" | "design";
  rule: string;
  detail: string;
};

const signature = (chapter: Chapter) => chapter.pieces[0]?.component || chapter.pieces[0]?.graphic || "";

/** Deterministic checks from the motion-style rules. Does not reject a plan. */
export const inspectPlan = (chapters: Chapter[]): Defect[] => {
  const defects: Defect[] = [];
  let resolved = false;

  chapters.forEach((chapter, index) => {
    const built = signature(chapter);
    const previous = index > 0 ? signature(chapters[index - 1]) : "";
    if (built === "record" && (previous === "record" || chapters.slice(0, index).filter((item) => signature(item) === "record").length >= 2)) {
      defects.push({
        chapter: index,
        kind: "design",
        rule: "G01",
        detail: "record is standing in for the action again. Build a diagram of the mechanism, with atBeat on each node, or a component whose shape is not a ledger.",
      });
    }
    if (built === "notification-stack") {
      defects.push({
        chapter: index,
        kind: "mechanical",
        rule: "G04",
        detail: "notification-stack draws outside the stage and across the spine. Replace it with a diagram of the parts already introduced.",
      });
    }

    chapter.beats.forEach((beat, beatIndex) => {
      if (beat.mode === "hypothetical" && beat.stateTone === "good") {
        defects.push({
          chapter: index,
          kind: "semantic",
          rule: "G13",
          detail: `Beat ${beatIndex + 1} marks a hypothetical as a completed success.`,
        });
      }
      if (beat.mode === "recap" && beat.state && /WAITING|UNREAD/i.test(beat.state) && resolved) {
        defects.push({
          chapter: index,
          kind: "semantic",
          rule: "G11",
          detail: "The recap puts the case back to waiting after it was already resolved. Use the actual final state.",
        });
      }
      if (beat.state && /ANSWERED|CLOSED|APPROVED|SENT/i.test(beat.state) && beat.mode === "actual") resolved = true;
    });

    for (const piece of chapter.pieces) {
      const rows = Array.isArray(piece.props.rows) ? (piece.props.rows as { atBeat?: number }[]) : [];
      if (piece.graphic === "record" && rows.length > 1 && rows.every((row) => (row.atBeat ?? 0) === 0) && chapter.beats.length > 2) {
        defects.push({
          chapter: index,
          kind: "semantic",
          rule: "G06",
          detail: "Every record row is visible from the first beat. Set atBeat so a result appears only when the narration reaches it.",
        });
      }
      const nodes = Array.isArray(piece.props.nodes) ? (piece.props.nodes as { atBeat?: number }[]) : [];
      if (nodes.length > 2 && nodes.every((node) => (node.atBeat ?? 0) === 0)) {
        defects.push({
          chapter: index,
          kind: "semantic",
          rule: "G06",
          detail: "Every diagram node appears on beat 0. Stagger atBeat with the narration.",
        });
      }
    }
  });

  const seen = new Set<string>();
  return defects.filter((defect) => {
    const key = `${defect.chapter}:${defect.rule}:${defect.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
