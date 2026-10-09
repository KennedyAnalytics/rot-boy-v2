import type { Beat, CalloutRow, ChapterBrief, Chapter, Presenter, Tone, WorkedExample } from "./structure-types";

const clip = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * Fit text to a character budget on a word boundary, or give up.
 *
 * A hard `slice` produced "Emails a paid clie" and "stay inside the li" on the
 * first run. Half a word on screen is worse than no annotation, so anything
 * that cannot be trimmed to a whole word inside the budget returns "" and the
 * caller drops the slot. The budgets come from the rendered type sizes in
 * `layers.tsx`, not from taste.
 */
const fit = (value: unknown, max: number) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const space = cut.lastIndexOf(" ");
  if (space < Math.ceil(max * 0.55)) return "";
  return cut.slice(0, space).replace(/[,;:.\-]$/, "").trim();
};

/**
 * Budgets, in characters, measured against the rendered layer type.
 *
 * pill        31px bold, one line, 984px of usable width
 * card label  32px semibold, sharing a row with its value
 * card value  32px mono, right aligned, must not wrap
 * stamp       inside a 176px disc
 */
export const FIT = {
  pillTerm: 18,
  pillIs: 22,
  cardKicker: 22,
  cardLabel: 24,
  cardValue: 14,
  stampLabel: 10,
  stampRing: 20,
  state: 13,
} as const;

const record = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null);

const toneOf = (value: unknown): Tone =>
  value === "accent" || value === "good" || value === "bad" ? value : "neutral";

const presenterOf = (value: unknown): Presenter => (value === "lead" || value === "away" ? value : "beside");

const words = (value: unknown, max: number, count: number) =>
  (Array.isArray(value) ? value : [])
    .map((item) => clip(item, max))
    .filter(Boolean)
    .slice(0, count);

const indexes = (value: unknown, from: number, to: number, used: Set<number>) => {
  const raw = (Array.isArray(value) ? value : [])
    .map((index) => Number(index))
    .filter((index) => Number.isInteger(index) && index >= from && index < to && !used.has(index));
  return [...new Set(raw)].sort((a, b) => a - b);
};

/**
 * Spine labels are read inside a rail that gives each chapter about a sixth of
 * the frame width. Past ten characters the label either clips or squeezes the
 * others, so the limit is enforced here rather than trusted to the prompt.
 */
export const SPINE_LABEL_MAX = 10;

const spineLabel = (value: unknown, fallback: string) => {
  const text = clip(value, 40) || fallback;
  if (text.length <= SPINE_LABEL_MAX) return text;
  // Prefer dropping a leading article over truncating a real word.
  const trimmed = text.replace(/^(the|a|an)\s+/i, "");
  if (trimmed.length <= SPINE_LABEL_MAX) return trimmed;
  const cut = trimmed.slice(0, SPINE_LABEL_MAX);
  const space = cut.lastIndexOf(" ");
  return (space > 3 ? cut.slice(0, space) : cut).trim();
};

export const exampleFrom = (raw: unknown): WorkedExample | null => {
  const item = record(raw);
  if (!item) return null;
  // The name rides in the status chip beside its state for the whole film, so
  // it is a tag, not a description. "Harbor Bakery, menu round two" was
  // clipped to "Harbor Bakery, menu ro" on every frame.
  const name = fit(item.name, 20) || fit(String(item.name ?? "").split(/[,(—-]/)[0], 20);
  if (!name) return null;
  return { name, what: clip(item.what, 120) };
};

/**
 * Chapters must partition the script. This accepts the longest contiguous
 * prefix of chapters starting at sentence 0 and reports the first hole, the
 * same discipline the sentence-coverage check already used: a plan that
 * silently drops the back half of the narration is the failure mode recorded
 * in creative-standard section 16.
 */
export const structureFrom = (raw: unknown, total: number) => {
  const body = record(raw);
  const incoming = Array.isArray(body?.chapters) ? body.chapters : [];
  const used = new Set<number>();
  const chapters: ChapterBrief[] = [];
  let recapTaken = false;

  for (const entry of incoming) {
    const item = record(entry);
    if (!item) continue;
    const span = indexes(item.sentenceIndexes, 0, total, used);
    if (!span.length) continue;
    span.forEach((index) => used.add(index));
    const recap = item.recap === true && !recapTaken;
    if (recap) recapTaken = true;
    chapters.push({
      name: spineLabel(item.name, `Part ${chapters.length + 1}`),
      sentenceIndexes: span,
      stage: clip(item.stage, 240) || "One object that holds the idea.",
      persists: clip(item.persists, 180),
      changes: clip(item.changes, 180),
      payoff: clip(item.payoff, 160),
      presenter: presenterOf(item.presenter),
      facts: words(item.facts, 48, 8),
      needs: words(item.needs, 80, 5),
      recap,
      illustrationGap: clip(item.illustrationGap, 200) || null,
    });
  }

  chapters.sort((a, b) => a.sentenceIndexes[0] - b.sentenceIndexes[0]);

  // Keep only the contiguous run from sentence 0, so a hole fails loudly.
  const covered = new Set<number>();
  const contiguous: ChapterBrief[] = [];
  let cursor = 0;
  for (const chapter of chapters) {
    if (chapter.sentenceIndexes[0] !== cursor) break;
    const span = chapter.sentenceIndexes;
    const dense = span.every((index, offset) => index === span[0] + offset);
    if (!dense) break;
    contiguous.push(chapter);
    span.forEach((index) => covered.add(index));
    cursor = span[span.length - 1] + 1;
  }

  const spine = contiguous.map((chapter) => chapter.name);
  return {
    title: clip(body?.title, 90),
    spine,
    example: exampleFrom(body?.example),
    chapters: contiguous,
    covered: cursor,
  };
};

const rowsFrom = (value: unknown): CalloutRow[] =>
  (Array.isArray(value) ? value : [])
    .map((entry) => {
      const item = record(entry);
      if (!item) return null;
      const label = fit(item.label, FIT.cardLabel);
      const text = fit(item.value, FIT.cardValue);
      if (!label || !text) return null;
      return { label, value: text, tone: toneOf(item.tone) };
    })
    .filter((row): row is CalloutRow => row !== null)
    .slice(0, 3);

/**
 * Beats must cover the chapter's sentences contiguously and in order. Anything
 * the model leaves out is appended to the last accepted beat rather than
 * dropped, because a missing beat would silently mute narration that the
 * coverage check upstream already guaranteed.
 */
export const beatsFrom = (raw: unknown, span: number[], sentences: string[]): Beat[] => {
  const body = record(raw);
  const incoming = Array.isArray(body?.beats) ? body.beats : [];
  const allowed = new Set(span);
  const used = new Set<number>();
  const beats: Beat[] = [];

  for (const entry of incoming) {
    const item = record(entry);
    if (!item) continue;
    const picked = (Array.isArray(item.sentenceIndexes) ? item.sentenceIndexes : [])
      .map((index) => Number(index))
      .filter((index) => Number.isInteger(index) && allowed.has(index) && !used.has(index));
    const unique = [...new Set(picked)].sort((a, b) => a - b);
    if (!unique.length) continue;
    unique.forEach((index) => used.add(index));

    const pill = record(item.pill);
    const card = record(item.card);
    const stamp = record(item.stamp);
    const cardRows = card ? rowsFrom(card.rows) : [];
    const pillTerm = pill ? fit(pill.term, FIT.pillTerm) : "";
    const pillIs = pill ? fit(pill.is, FIT.pillIs) : "";
    const stampLabel = stamp ? fit(stamp.label, FIT.stampLabel) : "";
    const mode = item.mode === "hypothetical" || item.mode === "recap" ? item.mode : "actual";
    const reveal = (Array.isArray(item.reveal) ? item.reveal : [])
      .map((id) => String(id ?? "").trim())
      .filter(Boolean)
      .slice(0, 8);

    beats.push({
      sentenceIndexes: unique,
      narration: unique.map((index) => sentences[index] ?? "").filter(Boolean).join(" "),
      mode,
      reveal,
      state: fit(item.state, FIT.state).toUpperCase() || null,
      stateTone: toneOf(item.stateTone),
      pill: pillTerm && pillIs ? { term: pillTerm.toUpperCase(), is: pillIs.toUpperCase() } : null,
      card: card && cardRows.length ? { kicker: fit(card.kicker, FIT.cardKicker), rows: cardRows } : null,
      stamp: stampLabel ? { label: stampLabel.toUpperCase(), ring: fit(stamp?.ring, FIT.stampRing).toUpperCase(), tone: toneOf(stamp?.tone) } : null,
    });
  }

  beats.sort((a, b) => a.sentenceIndexes[0] - b.sentenceIndexes[0]);

  const missing = span.filter((index) => !used.has(index));
  if (!beats.length) {
    return [
      {
        sentenceIndexes: [...span],
        narration: span.map((index) => sentences[index] ?? "").filter(Boolean).join(" "),
        mode: "actual",
        reveal: [],
        state: null,
        stateTone: "neutral",
        pill: null,
        card: null,
        stamp: null,
      },
    ];
  }
  if (missing.length) {
    for (const index of missing) {
      const host = beats.filter((beat) => beat.sentenceIndexes[0] < index).at(-1) ?? beats[0];
      host.sentenceIndexes = [...host.sentenceIndexes, index].sort((a, b) => a - b);
    }
    for (const beat of beats) {
      beat.narration = beat.sentenceIndexes.map((index) => sentences[index] ?? "").filter(Boolean).join(" ");
    }
  }
  return beats;
};

export const chapterFrom = (
  brief: ChapterBrief,
  beats: Beat[],
  pieces: Chapter["pieces"],
  index: number,
): Chapter => ({
  ...brief,
  id: `chapter-${index + 1}`,
  pieces,
  built: pieces.map((piece) => (piece.source === "library" ? piece.component : piece.graphic)).join(" + "),
  beats: beats.map((beat) => ({
    ...beat,
    mode: /^if\b/i.test(beat.narration.trim())
      ? "hypothetical"
      : brief.recap && beat.mode !== "hypothetical"
        ? "recap"
        : beat.mode,
  })),
});

/**
 * Composition checks that can be made without a DOM. These are the rules the
 * hand-authored proof had to satisfy by hand; the audit is where they become
 * the system's own standard rather than one agent's taste.
 */
export const auditStructure = (plan: { spine: string[]; chapters: Chapter[]; example: WorkedExample | null; direction?: unknown }) => {
  const warnings: string[] = [];

  if (plan.spine.length < 3) warnings.push(`The spine has only ${plan.spine.length} chapters. The references run three to six.`);
  if (plan.spine.length > 6) warnings.push(`The spine has ${plan.spine.length} chapters. Past six the rail stops being readable.`);
  if (!plan.example) warnings.push("The film carries no worked example, so nothing changes state across the chapters.");
  if (!plan.chapters.some((chapter) => chapter.recap)) warnings.push("No chapter recaps the structure before the close.");

  const stages = plan.chapters.map((chapter) => chapter.built || chapter.pieces[0]?.component || chapter.pieces[0]?.graphic || "");
  if (!plan.direction) {
    for (let index = 2; index < stages.length; index += 1) {
      if (stages[index] && stages[index] === stages[index - 1] && stages[index] === stages[index - 2]) {
        warnings.push(`Chapters ${index - 1}-${index + 1} all use ${stages[index]}.`);
      }
    }
  }

  const totalSentences = plan.chapters.reduce((sum, chapter) => sum + chapter.sentenceIndexes.length, 0);

  plan.chapters.forEach((chapter, index) => {
    const share = totalSentences ? chapter.sentenceIndexes.length / totalSentences : 0;
    if (share > 0.3) {
      warnings.push(
        `Chapter ${index + 1} ("${chapter.name}") carries ${Math.round(share * 100)}% of the script, so one object has to hold several jobs.`,
      );
    }
    if (!chapter.pieces.length) warnings.push(`Chapter ${index + 1} has no stage.`);
    if (chapter.pieces.length > 2) warnings.push(`Chapter ${index + 1} has more than two stage pieces.`);
    if (chapter.beats.length < 2 && chapter.sentenceIndexes.length > 2) {
      warnings.push(`Chapter ${index + 1} covers ${chapter.sentenceIndexes.length} sentences in one beat, so nothing changes while it runs.`);
    }
    const annotated = chapter.beats.some((beat) => beat.pill || beat.card || beat.stamp || beat.state);
    if (!annotated && !plan.direction) warnings.push(`Chapter ${index + 1} has no annotation on any beat.`);
    for (const piece of chapter.pieces) {
      if (JSON.stringify(piece.props).length > 900) warnings.push(`Chapter ${index + 1} is carrying too much copy on its stage.`);
      // A stage laid out in columns clips its labels. 1080px over five columns
      // is 216px a column, which is about nine characters at stage type size.
      for (const [key, value] of Object.entries(piece.props)) {
        if (!Array.isArray(value)) continue;
        if (/column|lane|series|tab/i.test(key) && value.length > 4) {
          warnings.push(`Chapter ${index + 1} gives ${piece.component} ${value.length} ${key}; past four they are too narrow to read on a phone.`);
        }
        const longest = value.reduce((max: number, entry) => {
          const text = typeof entry === "string" ? entry : typeof entry === "object" && entry ? String((entry as Record<string, unknown>).title ?? (entry as Record<string, unknown>).label ?? "") : "";
          return Math.max(max, text.length);
        }, 0);
        if (/column|lane/i.test(key) && longest > 12) {
          warnings.push(`Chapter ${index + 1} has a ${piece.component} ${key} label of ${longest} characters; it will clip.`);
        }
        // Items that live inside those columns get the column's width, not the
        // frame's. A three-column board gives each card about twelve
        // characters before the title is cut.
        const lanes = Object.entries(piece.props).find(([name, entry]) => /column|lane/i.test(name) && Array.isArray(entry));
        const laneCount = lanes ? (lanes[1] as unknown[]).length : 0;
        if (laneCount >= 2 && /card|item|task|row/i.test(key)) {
          const budget = Math.max(8, Math.floor(36 / laneCount));
          if (longest > budget) {
            warnings.push(
              `Chapter ${index + 1} has a ${piece.component} ${key} title of ${longest} characters in ${laneCount} columns; about ${budget} will fit.`,
            );
          }
        }
      }
    }
  });

  if (plan.chapters.every((chapter) => chapter.presenter === plan.chapters[0]?.presenter) && plan.chapters.length > 2) {
    warnings.push(`Every chapter uses presenter "${plan.chapters[0]?.presenter}", so the presenter never responds to the material.`);
  }

  return warnings;
};
