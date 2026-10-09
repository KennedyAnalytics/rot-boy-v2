/**
 * During a silence between narrated beats, keep the last beat that has
 * already started. Never fall through to a later beat.
 */
export const holdAt = <T extends { start: number; end: number }>(items: T[], time: number): T | undefined => {
  if (!items.length) return undefined;
  const current = items.find((item) => time >= item.start && time < item.end);
  if (current) return current;
  let held: T | undefined;
  for (const item of items) {
    if (item.start <= time) held = item;
    else break;
  }
  return held ?? items[0];
};

export type Gap = {
  chapter: number;
  name: string;
  from: number;
  to: number;
  holdIndex: number;
  holdMode: string;
  holdState: string | null;
};

type BeatSpan = { start: number; end: number; mode?: string; state?: string | null };

/** Every silence between beats, and between a chapter's last beat and the next chapter. */
export const phraseTime = (words: { text: string; start: number }[], phrase: string): number | null => {
  const need = phrase
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
  if (!need.length) return null;
  const tokens = words
    .map((word) => ({ text: word.text.toLowerCase().replace(/[^a-z0-9]/g, ""), start: word.start }))
    .filter((word) => word.text);
  for (let start = 0; start < tokens.length; start += 1) {
    let cursor = start;
    let matched = 0;
    let first = start;
    while (matched < need.length && cursor < tokens.length && cursor < start + need.length + 4) {
      const token = tokens[cursor].text;
      const want = need[matched];
      const close =
        token === want ||
        (token.startsWith(want) && want.length >= 4) ||
        (want.startsWith(token) && token.length >= 4 && want.length - token.length <= 1);
      if (close) {
        if (matched === 0) first = cursor;
        matched += 1;
      }
      cursor += 1;
    }
    if (matched === need.length) return tokens[first].start;
  }
  return null;
};

export const narrationGaps = (
  chapters: { name: string; start: number; end: number; beats: BeatSpan[] }[],
): Gap[] => {
  const gaps: Gap[] = [];
  chapters.forEach((chapter, chapterIndex) => {
    const beats = chapter.beats;
    for (let index = 0; index < beats.length - 1; index += 1) {
      const from = beats[index].end;
      const to = beats[index + 1].start;
      if (to - from < 0.04) continue;
      gaps.push({
        chapter: chapterIndex,
        name: chapter.name,
        from,
        to,
        holdIndex: index,
        holdMode: beats[index].mode ?? "actual",
        holdState: beats[index].state ?? null,
      });
    }
    const next = chapters[chapterIndex + 1];
    const last = beats[beats.length - 1];
    if (last && next && next.start - last.end >= 0.04) {
      gaps.push({
        chapter: chapterIndex,
        name: chapter.name,
        from: last.end,
        to: next.start,
        holdIndex: beats.length - 1,
        holdMode: last.mode ?? "actual",
        holdState: last.state ?? null,
      });
    }
  });
  return gaps;
};
