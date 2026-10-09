/**
 * The procedural stages: the visual floor.
 *
 * These render when no library component is really the object the chapter
 * needs. That has to be an honest alternative, not a visible downgrade, so
 * they are built to the same rules as a library stage: they fill the stage
 * region, they carry a headline, and their type meets the library's own
 * documented minimums (headline 84 / supporting 44 / label 32 at 1080 width,
 * from `src/remotion/lib/layout.ts`).
 *
 * The previous version capped every panel at 860px and set supporting text at
 * 18px, which is roughly half the floor. That is why a fallback chapter read
 * as unfinished next to a library one.
 */
import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { useStageConfig } from "../remotion/lib/stage";
import { card, coral, fontFamily, good, ink, inkSoft, monoFamily } from "../design";
import { spokenYet, useBeatClock } from "./beat-clock";
import type { FilmPiece } from "./types";

const GUTTER = 48;

const enter = (frame: number, fps: number, delay = 0) => {
  const start = delay * fps;
  return {
    opacity: interpolate(frame, [start, start + 0.3 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    translate: `0 ${interpolate(frame, [start, start + 0.4 * fps], [16, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    })}px`,
  };
};

/** Shrink a headline only as far as it must go to hold two lines. */
const headlineSize = (text: string) => {
  const length = [...text].length;
  if (length <= 24) return 72;
  if (length <= 40) return 62;
  if (length <= 60) return 54;
  return 46;
};

const kicker: CSSProperties = {
  fontFamily: monoFamily,
  fontWeight: 600,
  fontSize: 24,
  letterSpacing: 2.4,
  textTransform: "uppercase",
  color: inkSoft,
};

/**
 * The frame every procedural stage sits in: an optional headline, then the
 * graphic taking the rest of the region. This is what makes a bare graphic
 * read as a designed chapter rather than a card floating on paper.
 */
const StageFrame = ({ title, frame, fps, children }: { title: string; frame: number; fps: number; children: ReactNode }) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      padding: `0 ${GUTTER}px`,
      boxSizing: "border-box",
    }}
  >
    {title ? (
      <div
        style={{
          ...enter(frame, fps),
          fontFamily,
          fontWeight: 800,
          fontSize: headlineSize(title),
          letterSpacing: -1.4,
          lineHeight: 1.02,
          color: ink,
          marginBottom: 34,
          textWrap: "balance",
        }}
      >
        {title}
      </div>
    ) : null}
    {/*
      `overflow: hidden` is the safety net. A centred flex child that is taller
      than its box overflows in both directions, so content that does not fit
      rides up over the headline. Clipping at the bottom is survivable; a
      collision with the title is not.
    */}
    <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      {children}
    </div>
  </div>
);

const toneOf = (value: unknown) => (value === "good" ? good : value === "bad" ? "#D64545" : value === "accent" ? coral : ink);

export const ProceduralPiece = ({ piece }: { piece: FilmPiece; anchor?: "start" | "center" }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useStageConfig();
  const title = String(piece.props.title ?? "");

  if (piece.graphic === "fact") return <Fact piece={piece} frame={frame} fps={fps} width={width} />;
  if (piece.graphic === "count") return <Count piece={piece} frame={frame} fps={fps} title={title} />;
  if (piece.graphic === "meter") return <Meter piece={piece} frame={frame} fps={fps} title={title} />;
  if (piece.graphic === "record") return <Record piece={piece} frame={frame} fps={fps} title={title} />;
  if (piece.graphic === "set") return <Set piece={piece} frame={frame} fps={fps} title={title} height={height} />;
  if (piece.graphic === "compare") return <Compare piece={piece} frame={frame} fps={fps} title={title} />;
  return <Flow piece={piece} frame={frame} fps={fps} title={title} height={height} />;
};

/* ------------------------------------------------------------------ fact */

/** One statement, at the size the references give a payoff line. */
const Fact = ({ piece, frame, fps, width }: { piece: FilmPiece; frame: number; fps: number; width: number }) => {
  const text = String(piece.props.text ?? piece.facts[0] ?? "");
  const length = [...text].length;
  const size = length <= 18 ? 136 : length <= 34 ? 104 : length <= 56 ? 80 : 64;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", padding: `0 ${GUTTER}px`, boxSizing: "border-box" }}>
      <div
        style={{
          ...enter(frame, fps),
          width: width - GUTTER * 2,
          fontFamily,
          fontWeight: 800,
          fontSize: size,
          letterSpacing: -2.2,
          lineHeight: 0.98,
          color: ink,
          textWrap: "balance",
        }}
      >
        {text}
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------- count */

const Count = ({ piece, frame, fps, title }: { piece: FilmPiece; frame: number; fps: number; title: string }) => {
  const value = Number(piece.props.value) || 0;
  const shown = interpolate(frame, [0.1 * fps, 1.1 * fps], [0, value], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const decimals = Number.isInteger(value) ? 0 : 1;
  const text = `${piece.props.prefix ?? ""}${shown.toFixed(decimals)}${piece.props.suffix ?? ""}`;
  return (
    <StageFrame title={title} frame={frame} fps={fps}>
      <div style={enter(frame, fps, 0.1)}>
        <div
          style={{
            fontFamily,
            fontWeight: 800,
            fontSize: text.length > 7 ? 150 : 210,
            letterSpacing: -6,
            lineHeight: 0.86,
            color: ink,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {text}
        </div>
        {piece.props.label ? <div style={{ ...kicker, marginTop: 20 }}>{String(piece.props.label)}</div> : null}
      </div>
    </StageFrame>
  );
};

/* ----------------------------------------------------------------- meter */

const Meter = ({ piece, frame, fps, title }: { piece: FilmPiece; frame: number; fps: number; title: string }) => {
  const fill = Number(piece.props.fill) || 0;
  const filled = interpolate(frame, [0.15 * fps, 1 * fps], [0, fill * 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <StageFrame title={title} frame={frame} fps={fps}>
      <div style={enter(frame, fps, 0.1)}>
        {piece.props.label ? <div style={kicker}>{String(piece.props.label)}</div> : null}
        <div style={{ marginTop: 26, height: 44, borderRadius: 10, background: "#E6E0D4", border: `3px solid ${ink}`, position: "relative", overflow: "hidden" }}>
          <div style={{ width: `${filled}%`, height: "100%", background: piece.props.limit ? coral : ink }} />
        </div>
        {piece.props.limit ? <div style={{ ...kicker, marginTop: 12, color: coral }}>At the limit</div> : null}
        <div style={{ marginTop: 26, fontFamily, fontWeight: 800, fontSize: 132, letterSpacing: -4, lineHeight: 0.9, color: ink }}>
          {String(piece.props.value ?? "")}
        </div>
      </div>
    </StageFrame>
  );
};

/* ---------------------------------------------------------------- record */

/** A ledger: keys left, values right, the last row carrying the emphasis. */
const Record = ({ piece, frame, fps, title }: { piece: FilmPiece; frame: number; fps: number; title: string }) => {
  const clock = useBeatClock();
  const incoming = Array.isArray(piece.props.rows) ? (piece.props.rows as { key: string; value: string; atBeat?: number }[]) : [];
  const rows = incoming.filter((row) => (row.atBeat ?? 0) <= clock.index && spokenYet(`${row.key} ${row.value}`, clock.spoken, true));
  const shown = rows;
  const caption = spokenYet(String(piece.props.caption ?? ""), clock.spoken) ? String(piece.props.caption ?? "") : "";
  const headline = spokenYet(title, clock.spoken) ? title : "";
  return (
    <StageFrame title={headline} frame={frame} fps={fps}>
      <div
        style={{
          ...enter(frame, fps, 0.08),
          background: card,
          border: `3px solid ${ink}`,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "6px 6px 0 rgba(28,33,43,0.12)",
        }}
      >
        {caption ? <div style={{ ...kicker, padding: shown.length ? "24px 30px 0" : "24px 30px" }}>{caption}</div> : null}
        {shown.map((row, index) => (
          <div
            key={`${row.key}-${index}`}
            style={{
              ...enter(frame, fps, 0.16 + index * 0.12),
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 24,
              padding: "26px 30px",
              borderTop: index === 0 ? "none" : "2px solid rgba(28,33,43,0.12)",
              marginTop: index === 0 && caption ? 10 : 0,
            }}
          >
            <span style={{ fontFamily, fontWeight: 600, fontSize: 36, color: inkSoft }}>{row.key}</span>
            <span
              style={{
                fontFamily: monoFamily,
                fontWeight: 600,
                fontSize: 40,
                letterSpacing: -0.6,
                whiteSpace: "nowrap",
                color: index === shown.length - 1 ? coral : ink,
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </StageFrame>
  );
};

/* ------------------------------------------------------------------- set */

/**
 * N peer items: the parts of a thing, the buttons on a panel, the levels of a
 * ladder. The references use this constantly and it is not a sequence, so
 * rendering it as one (which `flow` did for every three-or-more fact list)
 * both misreads the idea and makes every fallback chapter look the same.
 */
const Set = ({ piece, frame, fps, title, height }: { piece: FilmPiece; frame: number; fps: number; title: string; height: number }) => {
  const items = Array.isArray(piece.props.items) ? (piece.props.items as { label: string; detail?: string }[]) : [];
  const numbered = piece.props.numbered === true;
  const columns = items.length >= 4 ? 2 : 1;
  const rows = Math.ceil(items.length / columns);
  const available = height - (title ? 150 : 40);
  // A roomy cell is a number badge, a label and a detail inside 22px padding.
  // When the region is squeezed - a stamp takes 176px off the top - the whole
  // cell steps down rather than letting the last row clip.
  const dense = rows * 180 + (rows - 1) * 20 > available;
  const gap = dense ? 14 : 20;
  const cellHeight = Math.max(dense ? 124 : 160, Math.min(330, Math.floor((available - (rows - 1) * gap) / Math.max(rows, 1))));
  const labelSize = dense ? (columns === 2 ? 33 : 40) : columns === 2 ? 40 : 48;
  const detailSize = dense ? (columns === 2 ? 23 : 27) : columns === 2 ? 27 : 32;
  const badge = dense ? 38 : 46;
  return (
    <StageFrame title={title} frame={frame} fps={fps}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap }}>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <div
              key={`${item.label}-${index}`}
              style={{
                ...enter(frame, fps, 0.08 + index * 0.11),
                minHeight: cellHeight,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: dense ? 5 : 8,
                background: card,
                border: `3px solid ${last ? coral : ink}`,
                borderRadius: 18,
                padding: dense ? "16px 22px" : "22px 26px",
                boxShadow: `5px 5px 0 ${last ? "rgba(226,91,58,0.2)" : "rgba(28,33,43,0.12)"}`,
              }}
            >
              {numbered ? (
                <div
                  style={{
                    width: badge,
                    height: badge,
                    borderRadius: badge / 2,
                    background: last ? coral : ink,
                    color: "#FFFFFF",
                    fontFamily,
                    fontWeight: 700,
                    fontSize: dense ? 22 : 26,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: dense ? 3 : 6,
                  }}
                >
                  {index + 1}
                </div>
              ) : null}
              <div style={{ fontFamily, fontWeight: 800, fontSize: labelSize, letterSpacing: -0.8, lineHeight: 1.04, color: ink }}>
                {item.label}
              </div>
              {item.detail ? (
                <div style={{ fontFamily, fontWeight: 500, fontSize: detailSize, lineHeight: 1.2, color: inkSoft }}>{item.detail}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </StageFrame>
  );
};

/* ------------------------------------------------------------------ flow */

/** An ordered sequence: numbered, connected, the last step carrying the payoff. */
const Flow = ({ piece, frame, fps, title, height }: { piece: FilmPiece; frame: number; fps: number; title: string; height: number }) => {
  const clock = useBeatClock();
  const incoming = Array.isArray(piece.props.items) ? (piece.props.items as { label: string; detail?: string; atBeat?: number }[]) : [];
  const items = incoming.filter((item, index) => (item.atBeat ?? index) <= clock.index && spokenYet(`${item.label} ${item.detail ?? ""}`, clock.spoken, true));
  const shown = items;
  // A non-dense step is about 148px with its connector; a headline and its
  // margin take roughly 150. Switch before the stack outgrows the region
  // rather than after, or the clip above eats the last step.
  const dense = shown.length * 148 + 150 > height;
  const marker = dense ? 48 : 58;
  return (
    <StageFrame title={title} frame={frame} fps={fps}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {shown.map((item, index) => {
          const last = index === shown.length - 1;
          return (
            <div key={`${item.label}-${index}`} style={enter(frame, fps, 0.08 + index * 0.13)}>
              {index > 0 ? <div style={{ width: 4, height: dense ? 20 : 28, marginLeft: marker / 2 - 2, background: ink, opacity: 0.35 }} /> : null}
              <div style={{ display: "flex", alignItems: "stretch", gap: 20 }}>
                <div
                  style={{
                    width: marker,
                    height: marker,
                    flex: "0 0 auto",
                    borderRadius: marker / 2,
                    background: last ? coral : ink,
                    color: "#FFFFFF",
                    fontFamily,
                    fontWeight: 700,
                    fontSize: dense ? 26 : 30,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 4,
                  }}
                >
                  {index + 1}
                </div>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: `3px solid ${last ? coral : ink}`,
                    borderRadius: 16,
                    background: card,
                    padding: dense ? "18px 24px" : "24px 28px",
                    boxShadow: `4px 4px 0 ${last ? "rgba(226,91,58,0.18)" : "rgba(28,33,43,0.1)"}`,
                  }}
                >
                  <div style={{ fontFamily, fontWeight: 800, fontSize: dense ? 40 : 46, letterSpacing: -0.8, lineHeight: 1.04, color: ink }}>
                    {item.label}
                  </div>
                  {item.detail ? (
                    <div style={{ marginTop: 6, fontFamily, fontWeight: 500, fontSize: dense ? 28 : 32, lineHeight: 1.2, color: inkSoft }}>
                      {item.detail}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </StageFrame>
  );
};

/* --------------------------------------------------------------- compare */

/** Two outcomes, stacked for the phone, with the difference marked. */
const Compare = ({ piece, frame, fps, title }: { piece: FilmPiece; frame: number; fps: number; title: string }) => {
  const left = (piece.props.left ?? {}) as { label?: string; detail?: string; tone?: string };
  const right = (piece.props.right ?? {}) as { label?: string; detail?: string; tone?: string };
  const side = (item: { label?: string; detail?: string; tone?: string }, accent: boolean, delay: number) => {
    const colour = item.tone ? toneOf(item.tone) : accent ? coral : ink;
    return (
      <div
        style={{
          ...enter(frame, fps, delay),
          background: card,
          border: `3px solid ${colour}`,
          borderRadius: 20,
          padding: "30px 32px",
          boxShadow: `6px 6px 0 ${accent ? "rgba(226,91,58,0.18)" : "rgba(28,33,43,0.12)"}`,
        }}
      >
        <div style={{ fontFamily, fontWeight: 800, fontSize: 56, letterSpacing: -1.4, lineHeight: 1.02, color: colour }}>{item.label}</div>
        {item.detail ? (
          <div style={{ marginTop: 12, fontFamily, fontWeight: 500, fontSize: 34, lineHeight: 1.2, color: inkSoft }}>{item.detail}</div>
        ) : null}
      </div>
    );
  };
  return (
    <StageFrame title={title} frame={frame} fps={fps}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {side(left, false, 0.06)}
        <div style={{ ...kicker, ...enter(frame, fps, 0.16), alignSelf: "center" }}>versus</div>
        {side(right, true, 0.22)}
      </div>
    </StageFrame>
  );
};
