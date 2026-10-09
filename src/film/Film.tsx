import { Component, type ComponentType, type ReactNode } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption, Character, Kicker, Paper } from "../components/chrome";
import { FPS, HEIGHT, WIDTH } from "../design";
import { inferPiece } from "./normalize";
import { presentProps } from "./identity";
import { ProceduralPiece } from "./procedural";
import { library } from "./registry";
import { StageContext } from "../remotion/lib/stage";
import type { FilmPiece, FilmProps, TimedFilmScene } from "./types";

const shownPose = (scene: TimedFilmScene) => (scene.pieces.some((piece) => piece.source === "library") ? "none" : scene.character.pose);

const regionFor = (scene: TimedFilmScene) => {
  const caption = 320;
  const pose = shownPose(scene);
  if (pose === "none") return { left: 56, top: 136, width: WIDTH - 112, height: HEIGHT - 136 - caption };
  if (scene.character.side === "left") return { left: 520, top: 156, width: WIDTH - 520 - 56, height: HEIGHT - 156 - caption };
  return { left: 56, top: 156, width: WIDTH - 520 - 56, height: HEIGHT - 156 - caption };
};

class PieceBoundary extends Component<{ piece: FilmPiece; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error(`Piece failed: ${this.props.piece.component || this.props.piece.graphic}`, error);
  }

  render() {
    if (this.state.failed) {
      return <ProceduralPiece piece={inferPiece(this.props.piece.facts, this.props.piece.facts[0] || "")} />;
    }
    return this.props.children;
  }
}

const LibraryPiece = ({ piece, width, height, seconds }: { piece: FilmPiece; width: number; height: number; seconds: number }) => {
  const Comp = library[piece.component] as ComponentType<Record<string, unknown>> | undefined;
  if (!Comp) return <ProceduralPiece piece={inferPiece(piece.facts, piece.facts[0] || "")} />;
  return (
    <div data-slot={piece.component} style={{ width, height, position: "relative", overflow: "hidden", transform: "translateZ(0)" }}>
      <StageContext.Provider value={{ width, height }}>
        <PieceBoundary piece={piece}>
          <Comp {...presentProps(piece.component, piece.props, seconds)} />
        </PieceBoundary>
      </StageContext.Provider>
    </div>
  );
};

const SceneStage = ({ scene }: { scene: TimedFilmScene }) => {
  const region = regionFor(scene);
  const seconds = Math.max(0.8, scene.end - scene.start);
  const gap = 18;
  const total = scene.pieces.reduce((sum, piece) => sum + piece.weight, 0) || 1;
  const usable = region.height - gap * Math.max(0, scene.pieces.length - 1);
  let top = 0;
  return (
    <div style={{ position: "absolute", left: region.left, top: region.top, width: region.width, height: region.height }}>
      {scene.pieces.map((piece, index) => {
        const height = Math.max(180, Math.round((usable * piece.weight) / total));
        const offset = top;
        top += height + gap;
        return (
          <div key={`${piece.component || piece.graphic}-${index}`} data-piece={piece.source} style={{ position: "absolute", left: 0, top: offset, width: region.width, height, overflow: "hidden" }}>
            {piece.source === "library" ? (
              <LibraryPiece piece={piece} width={region.width} height={height} seconds={seconds} />
            ) : (
              <StageContext.Provider value={{ width: region.width, height }}>
                <ProceduralPiece piece={piece} anchor={shownPose(scene) === "none" ? "start" : "center"} />
              </StageContext.Provider>
            )}
          </div>
        );
      })}
    </div>
  );
};

const sceneAt = (scenes: TimedFilmScene[], time: number) => scenes.find((scene) => time >= scene.start && time < scene.end) ?? scenes[scenes.length - 1];

export const Film = ({ plan, words, audioFile }: FilmProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const active = plan.scenes.length ? sceneAt(plan.scenes, time) : undefined;
  return (
    <AbsoluteFill style={{ background: "#F3F0E6", overflow: "hidden" }}>
      <Paper />
      {audioFile ? <Audio src={staticFile(audioFile)} /> : null}
      {plan.scenes.map((scene, index) => {
        const from = Math.round(scene.start * fps);
        const next = plan.scenes[index + 1];
        const until = next ? next.start : plan.durationSec;
        const duration = Math.max(1, Math.round((until - scene.start) * fps));
        return (
          <Sequence key={scene.id} from={from} durationInFrames={duration} premountFor={fps} style={{ zIndex: 2 }}>
            <SceneStage scene={scene} />
          </Sequence>
        );
      })}
      {plan.scenes.map((scene) => (
        <Sequence key={`${scene.id}-tick`} from={Math.round(scene.start * fps)} durationInFrames={6} premountFor={FPS}>
          <Audio src={staticFile("sfx/tick.wav")} volume={0.08} />
        </Sequence>
      ))}
      {active?.kicker ? <Kicker text={active.kicker} /> : null}
      {active ? <Character pose={shownPose(active)} side={active.character.side} start={active.start} time={time} /> : null}
      {active ? <Caption words={words} time={time} character={{ ...active.character, pose: shownPose(active) }} /> : null}
    </AbsoluteFill>
  );
};
