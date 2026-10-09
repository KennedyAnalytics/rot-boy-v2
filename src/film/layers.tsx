/**
 * The four layers of the reference grammar, and the grid that places them.
 *
 * Spine / StatusChip / Stamp are chrome. MetaphorPill / Callout are the
 * annotation layer. Presenter and CaptionPill are the bottom band. The stage
 * is whatever component the material pass chose, placed by `stageBox`.
 *
 * Nothing here takes a position from a model. `layoutFor` is the only thing
 * that decides where anything sits, which is what keeps this from repeating
 * the coordinate experiment.
 */
import { interpolate, useCurrentFrame } from "remotion";
import { Character } from "../components/chrome";
import { bad, coral, fontFamily, good, HEIGHT, ink, inkSoft, monoFamily, WIDTH } from "../design";
import { StageContext } from "../remotion/lib/stage";
import fitJson from "./stage-fit.json";
import type { CalloutRow, Presenter, Tone } from "./structure-types";

export const toneColor = (tone: Tone) =>
  tone === "accent" ? coral : tone === "good" ? good : tone === "bad" ? bad : inkSoft;

const rise = (frame: number, delay: number, span = 11) => {
  const on = interpolate(frame, [delay, delay + span], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { opacity: on, translate: `0 ${(1 - on) * 12}px` };
};

/* ------------------------------------------------------------------ grid */

export const GRID = {
  spineTop: 140,
  spineHeight: 78,
  chipTop: 236,
  chipHeight: 58,
  stampTop: 312,
  stampSize: 176,
  captionBottom: 340,
  pillHeight: 62,
  gutter: 48,
} as const;

/** Evaluation guides for 1080×1920 Reels/TikTok. Not drawn in the film. */
export const SAFE = {
  top: 130,
  bottom: 280,
  right: 120,
  presenterInset: 300,
} as const;
export const SAFE_PROFILES = { reels: SAFE, tiktok: { ...SAFE, bottom: 320, presenterInset: 340 } };
export const presenterBounds = (scale: number, profile: keyof typeof SAFE_PROFILES = 'reels') => ({ left: 18 - 20 * scale, right: 18 + 560 * scale, top: HEIGHT - SAFE_PROFILES[profile].presenterInset - 1240 * scale, bottom: HEIGHT - SAFE_PROFILES[profile].presenterInset + 3 * scale });

/** A callout's height is its padding, kicker, rows, and row rules. */
export const calloutHeight = (rows: number) => 90 + rows * 46 + Math.max(0, rows - 1) * 28;

export type Layout = {
  stageTop: number;
  stageHeight: number;
  pillTop: number;
  cardTop: number;
  presenterScale: number;
};

/**
 * The vertical grid, solved from the top for chrome and from the bottom for
 * the annotation stack, so the stage takes whatever is left.
 *
 * `bottomGuard` is where the annotation block must stop: above the presenter's
 * head when there is one, above the caption when there is not.
 */
export const layoutFor = (opts: {
  hasChip: boolean;
  hasStamp: boolean;
  hasPill: boolean;
  cardRows: number;
  presenter: Presenter;
  safeProfile?: keyof typeof SAFE_PROFILES;
  directed?: boolean;
}): Layout => {
  const safe = SAFE_PROFILES[opts.safeProfile ?? 'reels'];
  // `address` keeps the feet on the same safe inset; only the size changes.
  const presenterScale = opts.presenter === "address" ? 0.68 : opts.presenter === "lead" ? 0.52 : opts.presenter === "beside" ? 0.42 : 0;
  // `Character` draws a 1200px image; the scaled head is what the stack clears.
  const presenterHead = presenterScale ? HEIGHT - safe.presenterInset - Math.round(1240 * presenterScale) : HEIGHT;
  const captionHead = HEIGHT - GRID.captionBottom - 86;
  const bottomGuard = opts.directed ? captionHead-24 : Math.min(presenterScale ? presenterHead - 24 : captionHead - 24, captionHead - 24);

  const cardH = opts.cardRows ? calloutHeight(opts.cardRows) : 0;
  const pillH = opts.hasPill ? GRID.pillHeight : 0;
  const inner = pillH && cardH ? 18 : 0;
  const annotation = pillH + inner + cardH;

  const stageTop = opts.hasStamp
    ? GRID.stampTop + GRID.stampSize + 42
    : opts.hasChip
      ? GRID.chipTop + GRID.chipHeight + 56
      : GRID.spineTop + GRID.spineHeight + 72;

  const annotationTop = bottomGuard - annotation;
  const stageBottom = annotation ? annotationTop - 40 : bottomGuard;

  return {
    stageTop,
    stageHeight: Math.max(460, stageBottom - stageTop),
    pillTop: annotationTop,
    cardTop: annotationTop + pillH + inner,
    presenterScale,
  };
};

/**
 * The box handed to a stage component.
 *
 * There are two kinds of component in this library and they want opposite
 * things, which one fixed box cannot give both.
 *
 * A component with a portrait reference box computes
 *   u = Math.min(width / A, height / B)
 * and lays out fixed-size content in units of u, centred. A taller box raises
 * u, so its content and its type get bigger. The live pipeline's 968x1464 slot
 * held `kanban-move` at u = 1.63 with 26px card titles; a box at the
 * component's own aspect gives u = 2.17 and 35px titles.
 *
 * A component with no reference box distributes itself across whatever box it
 * is handed. Giving that one an over-tall box is exactly how the old film got
 * a four-step timeline spread over 1200px of empty paper, and the first
 * structured run reproduced it with `timeline-steps`.
 *
 * `stage-fit.json` is generated by `scripts/measure-stages.mjs`, which reads
 * the reference box out of each component's source. Re-run it after
 * re-vendoring the library.
 */
const stageFit = fitJson as Record<string, { w: number; h: number } | null>;

export const stageBox = (region: { top: number; height: number }, component: string) => {
  const ref = component ? stageFit[component] : null;
  if (!ref) {
    // Fills its box: the box is the region.
    return { width: WIDTH, height: region.height, left: 0, top: region.top };
  }
  // Scales against a reference aspect: give it that aspect at full width, and
  // centre the box on the region so its own centring lands where we want it.
  const height = Math.round(WIDTH * (ref.h / ref.w));
  return { width: WIDTH, height, left: 0, top: Math.round(region.top + region.height / 2 - height / 2) };
};

export const StageSlot = ({
  region,
  component,
  children,
}: {
  region: { top: number; height: number };
  component: string;
  children: (box: { width: number; height: number }) => React.ReactNode;
}) => {
  const box = stageBox(region, component);
  return (
    <div style={{ position: "absolute", left: 0, top: region.top, width: WIDTH, height: region.height, overflow: "hidden", zIndex: 2 }}>
      <div style={{ position: "absolute", left: box.left, top: box.top - region.top, width: box.width, height: box.height }}>
        <StageContext.Provider value={{ width: box.width, height: box.height }}>{children(box)}</StageContext.Provider>
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------- spine */

export const Spine = ({ chapters, active }: { chapters: string[]; active: number }) => (
  <div
    style={{
      position: "absolute",
      top: GRID.spineTop,
      left: GRID.gutter,
      right: GRID.gutter,
      height: GRID.spineHeight,
      borderRadius: GRID.spineHeight / 2,
      background: ink,
      display: "flex",
      alignItems: "center",
      padding: "0 14px",
      zIndex: 7,
    }}
  >
    {chapters.map((chapter, index) => {
      const on = index === active;
      const done = index < active;
      return (
        <div key={`${chapter}-${index}`} style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              flexShrink: 0,
              background: on ? coral : done ? good : "rgba(243,240,230,0.14)",
              color: on || done ? "#FFFFFF" : "#8E96A3",
              fontFamily,
              fontWeight: 700,
              fontSize: 19,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {index + 1}
          </div>
          <div
            style={{
              fontFamily,
              fontWeight: on ? 700 : 500,
              fontSize: chapters.length > 5 ? 22 : 25,
              letterSpacing: -0.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              color: on ? "#FFFFFF" : done ? "#A9B3A9" : "#737C8A",
            }}
          >
            {chapter}
          </div>
        </div>
      );
    })}
  </div>
);

/* ------------------------------------------------------------------ chip */

export const StatusChip = ({ label, state, tone }: { label: string; state: string; tone: Tone }) => (
  <div
    style={{
      position: "absolute",
      top: GRID.chipTop,
      right: GRID.gutter,
      height: GRID.chipHeight,
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: "#FBF9F4",
      border: `2px solid ${ink}`,
      borderRadius: 12,
      padding: "0 18px",
      boxShadow: "3px 3px 0 rgba(28,33,43,0.18)",
      zIndex: 7,
    }}
  >
    <span style={{ fontFamily: monoFamily, fontWeight: 600, fontSize: 25, color: ink }}>{label}</span>
    <span style={{ width: 2, height: 24, background: "rgba(28,33,43,0.18)" }} />
    <span style={{ fontFamily, fontWeight: 700, fontSize: 25, color: tone === "neutral" ? inkSoft : toneColor(tone) }}>{state}</span>
  </div>
);

/* ------------------------------------------------------------ annotation */

export const MetaphorPill = ({ term, is, top, delay = 0 }: { term: string; is: string; top: number; delay?: number }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: GRID.gutter,
        top,
        height: GRID.pillHeight,
        display: "flex",
        alignItems: "center",
        background: coral,
        color: "#FFFFFF",
        fontFamily,
        fontWeight: 800,
        fontSize: 31,
        letterSpacing: 0.4,
        padding: "0 24px",
        borderRadius: 10,
        boxShadow: "3px 3px 0 rgba(28,33,43,0.22)",
        maxWidth: WIDTH - GRID.gutter * 2,
        whiteSpace: "nowrap",
        overflow: "hidden",
        zIndex: 6,
        ...rise(frame, delay),
      }}
    >
      {term} = {is}
    </div>
  );
};

export const Callout = ({ kicker, rows, top, delay = 0 }: { kicker: string; rows: CalloutRow[]; top: number; delay?: number }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: GRID.gutter,
        right: GRID.gutter,
        top,
        background: "#FBF9F4",
        border: `3px solid ${ink}`,
        borderRadius: 16,
        padding: "22px 26px 24px",
        boxShadow: "5px 5px 0 rgba(28,33,43,0.14)",
        zIndex: 6,
        ...rise(frame, delay),
      }}
    >
      {kicker ? (
        <div
          style={{
            fontFamily: monoFamily,
            fontWeight: 600,
            fontSize: 20,
            letterSpacing: 2.2,
            textTransform: "uppercase",
            color: inkSoft,
            marginBottom: 16,
          }}
        >
          {kicker}
        </div>
      ) : null}
      {rows.map((row, index) => (
        <div
          key={`${row.label}-${index}`}
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 18,
            paddingTop: index ? 14 : 0,
            marginTop: index ? 14 : 0,
            borderTop: index ? "2px solid rgba(28,33,43,0.12)" : "none",
          }}
        >
          <span style={{ fontFamily, fontWeight: 600, fontSize: 32, color: ink }}>{row.label}</span>
          <span style={{ fontFamily: monoFamily, fontWeight: 600, fontSize: 32, color: toneColor(row.tone), textAlign: "right", whiteSpace: "nowrap" }}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/* --------------------------------------------------------------- bottom */

export const PresenterLayer = ({ scale, pose, safeProfile = 'reels' }: { scale: number; pose: Presenter; safeProfile?: keyof typeof SAFE_PROFILES }) => {
  if (!scale) return null;
  const presenting = pose === "lead" || pose === "address";
  return (
    <div style={{ position: "absolute", left: 18, bottom: SAFE_PROFILES[safeProfile].presenterInset, transform: `scale(${scale})`, transformOrigin: "bottom left", zIndex: 4 }}>
      <Character pose={presenting ? "present" : "tablet"} motion={presenting ? "presenting" : "tablet"} side="left" start={0} time={2} />
    </div>
  );
};

type CaptionWord = { text: string; start: number; end: number };
export type CaptionChunk = { words: CaptionWord[]; first: number; show: number; hide: number };

/** Caption chunk budget: one line of the pill at the house size. */
export const CAPTION = { maxChars: 30, maxWords: 5, pause: 0.35, lead: 0.06, hold: 0.9, linger: 0.5 } as const;

const closesSentence = (text: string) => /[.!?…]["”’)]*$/.test(text);
const closesClause = (text: string) => /[,;:—–-]["”’)]*$/.test(text);

/**
 * Stable phrase chunks. A caption is a phrase that appears with its first
 * spoken word and holds until the next phrase, so the currently spoken word is
 * always on screen and the line never slides word by word.
 */
export const captionChunks = (words: CaptionWord[]): CaptionChunk[] => {
  const groups: { words: CaptionWord[]; first: number }[] = [];
  let current: CaptionWord[] = [];
  let first = 0;
  const chars = (list: CaptionWord[]) => list.reduce((n, w) => n + w.text.length, 0) + Math.max(0, list.length - 1);
  words.forEach((word, index) => {
    const prev = words[index - 1];
    const breakBefore =
      current.length > 0 &&
      (chars([...current, word]) > CAPTION.maxChars ||
        current.length >= CAPTION.maxWords ||
        (prev && closesSentence(prev.text)) ||
        (prev && closesClause(prev.text) && current.length >= 2) ||
        (prev && word.start - prev.end >= CAPTION.pause));
    if (breakBefore) {
      groups.push({ words: current, first });
      current = [];
    }
    if (!current.length) first = index;
    current.push(word);
  });
  if (current.length) groups.push({ words: current, first });
  // A lone word joins the phrase before it when it fits: a short word anywhere
  // in a sentence, or any word that ends the sentence ("phone | number.").
  for (let i = groups.length - 1; i > 0; i -= 1) {
    const g = groups[i];
    const p = groups[i - 1];
    const word = g.words[0]?.text ?? '';
    const lone = g.words.length === 1 && (word.length <= 4 || closesSentence(word)) && !closesSentence(p.words.at(-1)!.text) && !closesClause(p.words.at(-1)!.text) && g.words[0].start - p.words.at(-1)!.end < CAPTION.pause;
    if (lone && chars([...p.words, ...g.words]) <= CAPTION.maxChars + 4) {
      p.words.push(...g.words);
      groups.splice(i, 1);
    }
  }
  // Adjacent phrases hand over at one instant: never before the last word of
  // the outgoing phrase ends, never after the first word of the next begins.
  const out: CaptionChunk[] = [];
  groups.forEach((g, i) => {
    const next = groups[i + 1];
    const start = g.words[0].start;
    const end = g.words.at(-1)!.end;
    const show = i > 0 && out[i - 1].hide > start - CAPTION.lead ? out[i - 1].hide : Math.max(0, start - CAPTION.lead);
    let hide = end + CAPTION.linger;
    if (next) {
      const nextStart = next.words[0].start;
      hide = nextStart - end < CAPTION.hold ? Math.min(nextStart, Math.max(end, nextStart - CAPTION.lead)) : Math.min(hide, nextStart - CAPTION.lead);
    }
    out.push({ words: g.words, first: g.first, show, hide: Math.max(hide, show + 0.05) });
  });
  return out;
};

const chunkCache = new WeakMap<object, CaptionChunk[]>();
const chunksFor = (words: CaptionWord[]) => {
  let chunks = chunkCache.get(words);
  if (!chunks) {
    chunks = captionChunks(words);
    chunkCache.set(words, chunks);
  }
  return chunks;
};

/** The chunk on screen at `time`, if any. Shared by the renderer and Tier 2. */
export const captionAt = (words: CaptionWord[], time: number) => chunksFor(words).find((c) => time >= c.show && time < c.hide) ?? null;

/**
 * House caption. Same pill as before. The phrase holds its full width, and
 * each word appears as it is spoken: the current word coral, spoken words
 * white, unspoken words reserved but invisible, so no word shows early.
 */
export const CaptionPill = ({ words, time }: { words: CaptionWord[]; time: number }) => {
  if (!words.length) return null;
  const chunk = captionAt(words, time);
  if (!chunk) return null;
  const phrase = chunk.words;
  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        right: 72,
        bottom: GRID.captionBottom,
        display: "flex",
        justifyContent: "center",
        zIndex: 8,
      }}
    >
      <div
        style={{
          background: "#16181D",
          borderRadius: 11,
          padding: "16px 28px",
          fontFamily,
          fontWeight: 700,
          fontSize: 38,
          lineHeight: 1.15,
          letterSpacing: -0.4,
          boxShadow: "4px 4px 0 rgba(22,24,29,0.35)",
          textAlign: "center",
        }}
      >
        {phrase.map((word, position) => {
          const live = time >= word.start && time < word.end + 0.05;
          // The first word shows with the pill itself, so the pill is never blank
          // during the lead-in frames before that word is spoken.
          const upcoming = position > 0 && time < word.start;
          return (
            <span key={`${word.start}-${position}`} style={{ color: live ? coral : "#FFFFFF", opacity: upcoming ? 0 : 1 }}>
              {word.text}
              {position < phrase.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
};
