import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption, ChapterRail, Character, contentBox, Kicker, Paper } from "./components/chrome";
import { SceneBody } from "./components/scenes";
import { FPS } from "./design";
import type { Chrome, ExplainerProps, TimedScene } from "./types";

const SceneView = ({ scene, chrome, duration }: { scene: TimedScene; chrome: Chrome; duration: number }) => {
  const local = useCurrentFrame();
  const progress = Math.min(1, local / Math.max(1, duration - 1));
  const box = contentBox(scene, chrome);
  return (
    <div style={{ position: "absolute", left: box.left, top: box.top, width: box.width, height: box.height }}>
      <SceneBody scene={scene} progress={progress} />
    </div>
  );
};

const sceneAt = (scenes: TimedScene[], time: number) => {
  return scenes.find((scene) => time >= scene.start && time < scene.end) ?? scenes[scenes.length - 1];
};

export const Explainer = ({ plan, words, audioFile }: ExplainerProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const active = sceneAt(plan.scenes, time);

  return (
    <AbsoluteFill style={{ background: "#F3F0E6", overflow: "hidden" }}>
      <Paper />
      {audioFile ? <Audio src={staticFile(audioFile)} /> : null}
      {plan.scenes.map((scene) => {
        const from = Math.round(scene.start * fps);
        const duration = Math.max(1, Math.round((scene.end - scene.start) * fps));
        return (
          <Sequence key={`${scene.id}-tick`} from={from} durationInFrames={6} premountFor={FPS}>
            <Audio src={staticFile("sfx/tick.wav")} volume={0.08} />
          </Sequence>
        );
      })}
      {plan.chrome === "rail" ? <ChapterRail chapters={plan.chapters} active={active?.chapter ?? plan.chapters[0]} /> : null}
      {plan.chrome === "kicker" && active?.kicker ? <Kicker text={active.kicker} /> : null}
      {plan.scenes.map((scene, index) => {
        const from = Math.round(scene.start * fps);
        const next = plan.scenes[index + 1];
        const until = next ? next.start : plan.durationSec;
        const duration = Math.max(1, Math.round((until - scene.start) * fps));
        return (
          <Sequence key={scene.id} from={from} durationInFrames={duration} premountFor={FPS} style={{ zIndex: 5 }}>
            <SceneView scene={scene} chrome={plan.chrome} duration={Math.max(1, Math.round((scene.end - scene.start) * fps))} />
          </Sequence>
        );
      })}
      {active ? <Character pose={active.character.pose} side={active.character.side} start={active.start} time={time} /> : null}
      {active ? <Caption words={words} time={time} character={active.character} /> : null}
    </AbsoluteFill>
  );
};
