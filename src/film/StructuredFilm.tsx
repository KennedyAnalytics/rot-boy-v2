/**
 * The structured-film renderer.
 *
 * One chapter is one Sequence. The stage mounts once per chapter and holds for
 * every beat; only the annotation layer changes between beats. That is the
 * difference from `Film.tsx`, where every scene unmounted the picture and
 * mounted a new component, so nothing could persist.
 */
import { Component, type ComponentType, type ReactNode } from "react";
import { AbsoluteFill, Audio, Freeze, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { DirectedStage } from './DirectedStage';
import { musicGain } from './sound';
import { statePropsAt } from './state-cues';
import { Paper } from "../components/chrome";
import { FPS, paper } from "../design";
import { presentProps, gateSemanticProps } from "./identity";
import {
  Callout,
  CaptionPill,
  GRID,
  layoutFor,
  MetaphorPill,
  PresenterLayer,
  Spine,
  StageSlot,
  StatusChip,
  toneColor,
} from "./layers";
import { holdAt } from "./hold";
import { inferPiece } from "./normalize";
import { BespokeDiagram, type DiagramLink, type DiagramNode } from "./bespoke";
import { ActionStage } from "./action-stage";
import { BeatClockProvider, WordClockProvider } from "./beat-clock";
import { ProceduralPiece } from "./procedural";
import { library } from "./registry";
import { BadgeStamp } from "../remotion/primitives/badge-stamp";
import { StageContext } from "../remotion/lib/stage";
import type { FilmPiece } from "./types";
import type { StructuredFilmProps, TimedBeat, TimedChapter } from "./structure-types";

class PieceBoundary extends Component<{ piece: FilmPiece; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error(`Stage failed: ${this.props.piece.component || this.props.piece.graphic}`, error);
  }

  render() {
    if (this.state.failed) {
      return <ProceduralPiece piece={inferPiece(this.props.piece.facts, this.props.piece.facts[0] || "")} />;
    }
    return this.props.children;
  }
}

const LibraryStage = ({ piece, width, height, seconds, beatIndex }: { piece: FilmPiece; width: number; height: number; seconds: number; beatIndex: number }) => {
  const Comp = library[piece.component] as ComponentType<Record<string, unknown>> | undefined;
  if (!Comp) return <ProceduralPiece piece={inferPiece(piece.facts, piece.facts[0] || "")} />;
  const props = presentProps(piece.component, piece.stateCues ? piece.props : gateSemanticProps(piece.component, piece.props, beatIndex), seconds);
  return (
    <div data-stage={piece.component} style={{ width, height, position: "relative" }}>
      <PieceBoundary piece={piece}>
        <Freeze frame={30}><Comp {...props} /></Freeze>
      </PieceBoundary>
    </div>
  );
};

/** The beat that owns this moment. A gap holds the beat that already started. */
const beatAt = (beats: TimedBeat[], time: number) => holdAt(beats, time);

/** `exampleName` rides on the chapter so the chip does not need the whole plan. */
type ChapterWithExample = TimedChapter & { exampleName: string; words: StructuredFilmProps['words']; chapters: TimedChapter[]; safeProfile?: 'reels' | 'tiktok' };

const ChapterStage = ({ chapter, spine, index, time }: { chapter: ChapterWithExample; spine: string[]; index: number; time: number }) => {
  const beat = beatAt(chapter.beats, time);
  const seconds = Math.max(0.8, chapter.end - chapter.start);

  const layout = layoutFor({
    hasChip: Boolean(beat?.state),
    hasStamp: Boolean(beat?.stamp),
    hasPill: Boolean(beat?.pill),
    cardRows: beat?.card?.rows.length ?? 0,
    presenter: chapter.presenter,
    safeProfile: chapter.safeProfile,
  });

  const region = { top: layout.stageTop, height: layout.stageHeight };
  const beatIndex = Math.max(0, beat ? chapter.beats.indexOf(beat) : 0);
  const beatSpan = beat ? Math.max(0.25, beat.end - beat.start) : 1;
  const progress = beat && time >= beat.start && time < beat.end ? Math.min(1, Math.max(0, (time - beat.start) / beatSpan)) : 1;
  const draw = (original: FilmPiece, width: number, height: number) => {
    const piece = {...original,props:statePropsAt(original.props,original.stateCues??[],time,chapter.words,chapter.chapters)};
    return (
    piece.source === "action" ? (
      <ActionStage props={piece.props} />
    ) : piece.source === "bespoke" ? (
      <BespokeDiagram
        title={String(piece.props.title ?? "")}
        nodes={(Array.isArray(piece.props.nodes) ? piece.props.nodes : []) as DiagramNode[]}
        links={(Array.isArray(piece.props.links) ? piece.props.links : []) as DiagramLink[]}
      />
    ) : piece.source === "library" ? (
      <LibraryStage piece={piece} width={width} height={height} seconds={seconds} beatIndex={beatIndex} />
    ) : (
      <ProceduralPiece piece={piece} anchor="center" />
    ));
  };

  const chipState =
    beat?.mode === "hypothetical" && beat.state
      ? beat.state.replace(/^IF\s+/i, "").length
        ? `IF ${beat.state.replace(/^IF\s+/i, "")}`.slice(0, 16)
        : beat.state
      : beat?.state;
  const stampTone = beat?.stamp && beat.mode === "hypothetical" && beat.stamp.tone === "good" ? "accent" : beat?.stamp?.tone;

  return (
    <BeatClockProvider value={{ index: beatIndex, count: chapter.beats.length, mode: beat?.mode ?? "actual", progress, time, spoken: chapter.beats.slice(0, beatIndex + 1).map((item) => item.narration).join(" ") }}>
    <AbsoluteFill>
      <Spine chapters={spine} active={index} />

      {chapter.pieces.length <= 1 ? (
        <StageSlot region={region} component={chapter.pieces[0]?.source === "library" ? chapter.pieces[0].component : ""}>
          {(box) => (chapter.pieces[0] ? draw(chapter.pieces[0], box.width, box.height) : null)}
        </StageSlot>
      ) : (
        <div style={{ position: "absolute", left: GRID.gutter, top: layout.stageTop, right: GRID.gutter, height: layout.stageHeight, overflow: "hidden", zIndex: 2, display: "flex", flexDirection: "column", gap: 16 }}>
          {chapter.pieces.slice(0, 2).map((piece, position) => {
            const height = position === 0 ? Math.round(layout.stageHeight * 0.64) : Math.max(160, layout.stageHeight - Math.round(layout.stageHeight * 0.64) - 16);
            const width = 1080 - GRID.gutter * 2;
            return (
              <div key={`${piece.component || piece.graphic}-${position}`} style={{ height, overflow: "hidden" }}>
                <StageContext.Provider value={{ width, height }}>{draw(piece, width, height)}</StageContext.Provider>
              </div>
            );
          })}
        </div>
      )}

      {chipState ? <StatusChip label={chapter.exampleName} state={chipState} tone={beat?.mode === "hypothetical" ? "accent" : beat?.stateTone ?? "neutral"} /> : null}

      {beat?.stamp ? (
        <div style={{ position: "absolute", right: GRID.gutter + 24, top: GRID.stampTop, zIndex: 7 }}>
          <BadgeStamp
            label={beat.stamp.label}
            ringText={beat.stamp.ring}
            ringTextBottom=""
            sublabel=""
            size={GRID.stampSize}
            color={toneColor(stampTone ?? "neutral")}
            rotation={-9}
            delayInFrames={2}
          />
        </div>
      ) : null}

      {beat?.pill ? <MetaphorPill term={beat.pill.term} is={beat.pill.is} top={layout.pillTop} delay={2} /> : null}
      {beat?.card ? <Callout kicker={beat.card.kicker} rows={beat.card.rows} top={layout.cardTop} delay={6} /> : null}

      <PresenterLayer scale={layout.presenterScale} pose={chapter.presenter} safeProfile={chapter.safeProfile}/>
    </AbsoluteFill>
    </BeatClockProvider>
  );
};

const chapterAt = (chapters: TimedChapter[], time: number) => holdAt(chapters, time);

export const StructuredFilm = ({ plan, words, audioFile, sound }: StructuredFilmProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const exampleName = plan.example?.name ?? "";
  const active = plan.chapters.length ? chapterAt(plan.chapters, time) : undefined;

  return (
    <AbsoluteFill style={{ background: paper, overflow: "hidden" }}>
      <Paper />
      <WordClockProvider value={words}>
      {audioFile ? <Audio src={staticFile(audioFile)} /> : null}
      {sound?.music ? <Audio src={staticFile(sound.music)} volume={(f) => musicGain(f / fps, words, plan.durationSec, sound.musicGain)} /> : null}

      {plan.direction ? <DirectedStage plan={plan} words={words} time={time} sfx={Boolean(sound?.sfx)}/> : plan.chapters.map((chapter, index) => {
        const from = Math.round(chapter.start * fps);
        const next = plan.chapters[index + 1];
        const until = next ? next.start : plan.durationSec;
        const duration = Math.max(1, Math.round((until - chapter.start) * fps));
        return (
          <Sequence key={chapter.id} from={from} durationInFrames={duration} premountFor={fps} style={{ zIndex: 2 }}>
            <ChapterStage
              chapter={{ ...chapter, exampleName, words, chapters:plan.chapters, safeProfile:plan.safeProfile } as ChapterWithExample}
              spine={plan.spine}
              index={index}
              time={time}
            />
          </Sequence>
        );
      })}

      {plan.chapters.map((chapter) => (
        <Sequence key={`${chapter.id}-tick`} from={Math.round(chapter.start * fps)} durationInFrames={6} premountFor={FPS}>
          <Audio src={staticFile("sfx/tick.wav")} volume={0.08} />
        </Sequence>
      ))}

      {active ? <CaptionPill words={words} time={time} /> : null}
      </WordClockProvider>
    </AbsoluteFill>
  );
};
