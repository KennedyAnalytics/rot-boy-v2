/**
 * Hand-authored composition proof. Not part of the studio pipeline.
 *
 * Purpose: test whether the existing visual substrate (vendored RemotionUI
 * components + house tokens + the approved character) can reach reference
 * composition once the four missing layers are applied: spine, stage,
 * annotation, presenter.
 *
 * Everything here is either an existing project material or a short house
 * primitive built from `src/design.ts` tokens. Nothing new was installed.
 *
 * Script is the existing print-shop script from `scripts/proof-unseen.ts`.
 * The worked example (#4417) is a declared example, not a factual claim.
 */
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Character, Paper } from "../components/chrome";
import { coral, fontFamily, good, ink, inkSoft, monoFamily, paper, WIDTH } from "../design";
import { StageContext } from "../remotion/lib/stage";
import { ArrowAnnotate } from "../remotion/primitives/arrow-annotate";
import { BadgeStamp } from "../remotion/primitives/badge-stamp";
import { KanbanMove } from "../remotion/scenes/kanban-move";

const BAD = "#D64545";

/* ------------------------------------------------------------------ spine */

const CHAPTERS = ["Order", "Ticket", "Press", "Handoff", "Board"];

/**
 * The film spine. Modelled on the reference rail: every chapter is named and
 * visible for the whole film, done ones go green, the live one goes coral.
 *
 * `ChapterRail` in `src/components/chrome.tsx` is the same idea but hides the
 * label of every inactive chapter, which loses the "you are 3 of 5" reading
 * that makes the reference rail work.
 */
const Spine = ({ active }: { active: number }) => (
  <div
    style={{
      position: "absolute",
      top: 54,
      left: 48,
      right: 48,
      height: 78,
      borderRadius: 39,
      background: ink,
      display: "flex",
      alignItems: "center",
      padding: "0 14px",
      zIndex: 7,
    }}
  >
    {CHAPTERS.map((chapter, index) => {
      const on = index === active;
      const done = index < active;
      return (
        <div key={chapter} style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 0 }}>
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
              fontSize: 25,
              letterSpacing: -0.2,
              whiteSpace: "nowrap",
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

/** The worked example's live state. Persists across the whole film. */
const StatusChip = ({ label, state, tone }: { label: string; state: string; tone: string }) => (
  <div
    style={{
      position: "absolute",
      top: 158,
      right: 48,
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: "#FBF9F4",
      border: `2px solid ${ink}`,
      borderRadius: 12,
      padding: "11px 18px",
      boxShadow: "3px 3px 0 rgba(28,33,43,0.18)",
      zIndex: 7,
    }}
  >
    <span style={{ fontFamily: monoFamily, fontWeight: 600, fontSize: 25, color: ink }}>{label}</span>
    <span style={{ width: 2, height: 24, background: "rgba(28,33,43,0.18)" }} />
    <span style={{ fontFamily, fontWeight: 700, fontSize: 25, color: tone }}>{state}</span>
  </div>
);

/* ------------------------------------------------------- annotation layer */

/** The reference's core teaching device: an abstract term bound to a thing. */
const MetaphorPill = ({
  text,
  left,
  top,
  delay = 0,
}: {
  text: string;
  left: number;
  top: number;
  delay?: number;
}) => {
  const frame = useCurrentFrame();
  const on = interpolate(frame, [delay, delay + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        background: coral,
        color: "#FFFFFF",
        fontFamily,
        fontWeight: 800,
        fontSize: 31,
        letterSpacing: 0.4,
        padding: "13px 24px",
        borderRadius: 10,
        boxShadow: "3px 3px 0 rgba(28,33,43,0.22)",
        opacity: on,
        translate: `0 ${(1 - on) * 10}px`,
        zIndex: 6,
      }}
    >
      {text}
    </div>
  );
};

/** A small annotation card. The thing the references hang off an arrow. */
const Callout = ({
  kicker,
  rows,
  left,
  top,
  width,
  delay = 0,
}: {
  kicker: string;
  rows: { label: string; value: string; tone?: string }[];
  left: number;
  top: number;
  width: number;
  delay?: number;
}) => {
  const frame = useCurrentFrame();
  const on = interpolate(frame, [delay, delay + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        background: "#FBF9F4",
        border: `3px solid ${ink}`,
        borderRadius: 16,
        padding: "22px 26px 24px",
        boxShadow: "5px 5px 0 rgba(28,33,43,0.14)",
        opacity: on,
        translate: `0 ${(1 - on) * 14}px`,
        zIndex: 6,
      }}
    >
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
      {rows.map((row, index) => (
        <div
          key={row.label}
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
          <span
            style={{
              fontFamily: monoFamily,
              fontWeight: 600,
              fontSize: 32,
              color: row.tone ?? inkSoft,
              textAlign: "right",
            }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/* -------------------------------------------------------------- the stage */

/**
 * The stage box is chosen so the component's own scale unit lands at 2.0.
 *
 * `kanban-move` computes `u = min(width / 496, height / 896)` in portrait and
 * then centres a board of `boardW x 276u` inside whatever box it is given. The
 * live pipeline hands it 968x1464, which gives u = 1.63: an 888x451 board
 * floating in a 1464-tall slot, with 26px card titles.
 *
 * Handing it 1080x1792 gives u = 2.0: a 1000x552 board with 32px card titles,
 * which clears the library's own documented 32px label minimum
 * (`src/remotion/lib/layout.ts`). The board is then placed by offsetting the
 * box, not by hoping the component centres where the frame wants it.
 */
const STAGE_W = 1080;
const STAGE_H = 1792;
const BOARD_W = 1000;
const BOARD_H = 552;
const BOARD_LEFT = (WIDTH - BOARD_W) / 2;

const Stage = ({ top, children }: { top: number; children: React.ReactNode }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: top - (STAGE_H - BOARD_H) / 2,
      width: STAGE_W,
      height: STAGE_H,
      zIndex: 2,
    }}
  >
    <StageContext.Provider value={{ width: STAGE_W, height: STAGE_H }}>{children}</StageContext.Provider>
  </div>
);

const COLUMNS = ["COUNTER", "PRESS", "FINISHING"];

/* ------------------------------------------------------------- presenter */

/**
 * The presenter at reference scale.
 *
 * `Character` in `src/components/chrome.tsx` hard-codes a 1200px image inside a
 * 560x1240 box: 62% of a 1920 frame. In the references he is 20-25%. There is
 * no prop for it, so the proof scales the existing component rather than
 * editing live code. 1200 * 0.42 = 504px, which is 26%.
 */
const PRESENTER_SCALE = 0.42;

const Presenter = () => (
  <div
    style={{
      position: "absolute",
      left: 18,
      bottom: 0,
      transform: `scale(${PRESENTER_SCALE})`,
      transformOrigin: "bottom left",
      zIndex: 4,
    }}
  >
    <Character pose="present" side="left" start={0} time={2} />
  </div>
);

/** House caption, with the live word in coral the way the references set it. */
const CaptionPill = ({ before, live, after }: { before: string; live: string; after: string }) => (
  <div
    style={{
      position: "absolute",
      left: 72,
      right: 72,
      bottom: 176,
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
      <span style={{ color: "#FFFFFF" }}>{before}</span>
      <span style={{ color: coral }}>{live}</span>
      <span style={{ color: "#FFFFFF" }}>{after}</span>
    </div>
  </div>
);

/* ------------------------------------------------ chapter 3 -- THE PRESS */

const BOARD_TOP = 462;
const PILL_TOP = BOARD_TOP + BOARD_H + 36;
const CALLOUT_TOP = PILL_TOP + 80;

/**
 * Card titles are sized to the column, not to the sentence. At u = 2.0 a
 * column is 321px wide and clips past about 13 characters. The live film's
 * "#4417 - 500 flyers" renders as "#4417 - 500...". This is a composition
 * rule the audit should enforce, not a component defect.
 */
const PRESS_CARDS = [
  { title: "#4417 Flyers", meta: "A5 · due Thu", column: 0, tint: coral, moveTo: 1, moveAtSeconds: 2.7 },
  { title: "#4418 Menus", meta: "A4 · due Fri", column: 0, tint: ink },
  { title: "#4422 Labels", meta: "due Fri", column: 0, tint: ink },
  { title: "#4415 Signs", meta: "A2 · due Thu", column: 1, tint: ink },
  { title: "#4412 Cards", meta: "90x50 · Wed", column: 2, tint: ink },
  { title: "#4409 Books", meta: "A5 · due Tue", column: 2, tint: ink },
];

const ChapterPress = () => {
  const frame = useCurrentFrame();
  // Beat 2 begins when the ticket lands at the press.
  const checking = frame >= 96;
  return (
    <AbsoluteFill>
      <Spine active={2} />
      <StatusChip label="#4417" state={checking ? "AT PRESS" : "WAITING"} tone={checking ? coral : inkSoft} />

      <Stage top={BOARD_TOP}>
        <KanbanMove
          columns={COLUMNS}
          theme="light"
          backgroundColor="transparent"
          accentColor={coral}
          moveSeconds={0.7}
          dealStaggerSeconds={0.09}
          cards={PRESS_CARDS}
        />
      </Stage>

      {/* Annotation layer, overlaid on the stage. Not a second stage. */}
      {checking ? (
        <>
          <MetaphorPill text="THE PROOF = THE TARGET COLOUR" left={BOARD_LEFT} top={PILL_TOP} delay={100} />
          <Callout
            kicker="At the press"
            left={BOARD_LEFT}
            top={CALLOUT_TOP}
            width={BOARD_W}
            delay={108}
            rows={[
              { label: "Open the file", value: "#4417" },
              { label: "Check colour against", value: "the proof", tone: coral },
            ]}
          />
          {/*
            `badge-stamp` defaults to ringText "REMOTIONUI", ringTextBottom
            "VERIFIED BUILD" and sublabel "2026". `presentProps` only blanks
            subtitle, helper and footnote, so those three print into the frame.
            Every text prop has to be set or blanked explicitly.
          */}
          <div style={{ position: "absolute", left: 762, top: 236, zIndex: 7 }}>
            <BadgeStamp
              label="CHECK"
              ringText="BEFORE IT PRINTS"
              ringTextBottom=""
              sublabel=""
              size={172}
              color={coral}
              rotation={-11}
              delayInFrames={112}
            />
          </div>
        </>
      ) : (
        <>
          <MetaphorPill text="THE COUNTER = THE QUEUE" left={BOARD_LEFT} top={PILL_TOP} delay={16} />
          <Callout
            kicker="Waiting on"
            left={BOARD_LEFT}
            top={CALLOUT_TOP}
            width={BOARD_W}
            delay={26}
            rows={[
              { label: "Tickets at the counter", value: "3" },
              { label: "Presses free", value: "0", tone: coral },
            ]}
          />
          <div style={{ position: "absolute", left: BOARD_LEFT + 150, top: BOARD_TOP - 128, zIndex: 6 }}>
            <ArrowAnnotate
              width={420}
              height={150}
              from={{ x: 0.04, y: 0.42 }}
              to={{ x: 0.94, y: 0.96 }}
              bow={-0.22}
              stroke={ink}
              strokeWidth={5}
              headSize={26}
              label="when a press frees up"
              labelSize={29}
              delayInFrames={26}
              durationInFrames={34}
            />
          </div>
        </>
      )}

      <Presenter />
      {checking ? (
        <CaptionPill before="checks the " live="colour" after=" against the proof" />
      ) : (
        <CaptionPill before="waits at the " live="counter" after="" />
      )}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------ chapter 5 -- THE BOARD */

const BOARD_CARDS = [
  { title: "#4421 Flyers", meta: "LATE", column: 0, tint: BAD },
  { title: "#4423 Labels", meta: "due Fri", column: 0, tint: ink },
  { title: "#4419 Books", meta: "LATE", column: 1, tint: BAD },
  { title: "#4420 Decals", meta: "due Mon", column: 1, tint: ink },
  { title: "#4417 Flyers", meta: "bagged", column: 2, tint: good },
  { title: "#4415 Signs", meta: "bagged", column: 2, tint: good },
];

const ChapterBoard = () => (
  <AbsoluteFill>
    <Spine active={4} />
    <StatusChip label="#4417" state="BAGGED" tone={good} />

    <Stage top={BOARD_TOP}>
      <KanbanMove
        columns={COLUMNS}
        theme="light"
        backgroundColor="transparent"
        accentColor={coral}
        dealStaggerSeconds={0.07}
        cards={BOARD_CARDS}
      />
    </Stage>

    <MetaphorPill text="ONE BOARD = THE WHOLE SHOP" left={BOARD_LEFT} top={PILL_TOP} delay={14} />
    <Callout
      kicker="Open right now"
      left={BOARD_LEFT}
      top={CALLOUT_TOP}
      width={BOARD_W}
      delay={24}
      rows={[
        { label: "Open tickets", value: "6" },
        { label: "Late", value: "2", tone: BAD },
      ]}
    />
    <div style={{ position: "absolute", left: 752, top: 234, zIndex: 7 }}>
      <BadgeStamp
        label="2 LATE"
        ringText="AT A GLANCE"
        ringTextBottom=""
        sublabel=""
        size={176}
        color={BAD}
        rotation={9}
        delayInFrames={34}
      />
    </div>

    <Presenter />
    <CaptionPill before="and which ones are " live="late" after=", on one board" />
  </AbsoluteFill>
);

/* ------------------------------------------------------------------ film */

export const ProofFrame = () => (
  <AbsoluteFill style={{ background: paper, overflow: "hidden" }}>
    <Paper />
    <Sequence from={0} durationInFrames={200}>
      <ChapterPress />
    </Sequence>
    <Sequence from={200} durationInFrames={120}>
      <ChapterBoard />
    </Sequence>
  </AbsoluteFill>
);
