import { Composition } from "remotion";
import { boardDuration, BoardFilm } from "./board/BoardFilm";
import type { BoardFilmProps } from "./board/types";
import { FPS, HEIGHT, WIDTH } from "./design";
import { Explainer } from "./Explainer";
import { blankFilm } from "./film/blank";
import { Film } from "./film/Film";
import type { FilmProps } from "./film/types";
import { ProofFrame } from "./proof/ProofFrame";
import { StructuredFilm } from "./film/StructuredFilm";
import type { StructuredFilmProps } from "./film/structure-types";
import { realize } from "./timing";
import type { ExplainerProps, VideoPlan } from "./types";
import {FoundingToolsetGallery, GALLERY_DURATION} from "./founding-toolset/gallery";

const blank: VideoPlan = {
  title: "Empty",
  chrome: "kicker",
  chapters: ["Start"],
  scenes: [
    {
      id: "empty",
      chapter: "Start",
      kicker: null,
      intent: "Waiting for a script.",
      character: { pose: "none", side: "left" },
      beats: [{ narration: "Paste a script." }],
      picture: {
        appear: 0,
        shape: "group",
        x: 0,
        y: 0,
        w: 100,
        h: 100,
        x2: 0,
        y2: 0,
        ink: "ink",
        fill: "none",
        weight: 2,
        radius: 0,
        draw: false,
        slide: null,
        text: "",
        role: "display",
        d: "",
        count: 1,
        columns: 1,
        mark: "square",
        from: 0,
        to: 1,
        suffix: "",
        before: "",
        after: "",
        children: [],
      },
    },
  ],
};

const demo = realize(blank);
const sample = blankFilm();

const boardSample: BoardFilmProps = {
  title: "Sample",
  scenes: [
    {
      id: "sample",
      kicker: "FIG. 01  —  THE LIMIT",
      title: "A ceiling",
      narration: "Give the agent a ceiling before it spends anything.",
      character: "present",
      side: "left",
      blocks: [{ kind: "meter", label: "Budget", value: "$20", unit: "dollars", fill: 1, limit: true }],
    },
  ],
};

export const Root = () => {
  return (
    <>
      <Composition
        id="Film"
        component={Film}
        durationInFrames={Math.ceil(sample.durationSec * FPS)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ plan: sample, words: [], audioFile: null } satisfies FilmProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.max(FPS, Math.ceil(props.plan.durationSec * FPS)),
        })}
      />
      <Composition
        id="Explainer"
        component={Explainer}
        durationInFrames={Math.ceil(demo.plan.durationSec * FPS)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ plan: demo.plan, words: demo.words, audioFile: null } satisfies ExplainerProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.max(FPS, Math.ceil(props.plan.durationSec * FPS)),
        })}
      />
      <Composition
        id="StructuredFilm"
        component={StructuredFilm}
        durationInFrames={FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={
          {
            plan: { title: "Empty", spine: ["Start"], example: null, chapters: [], durationSec: 1 },
            words: [],
            audioFile: null,
          } satisfies StructuredFilmProps
        }
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.max(FPS, Math.ceil(props.plan.durationSec * FPS)),
        })}
      />
      <Composition
        id="CompositionProof"
        component={ProofFrame}
        durationInFrames={320}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="BoardProof"
        component={BoardFilm}
        durationInFrames={boardDuration(boardSample)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={boardSample}
        calculateMetadata={({ props }) => ({
          durationInFrames: boardDuration(props),
        })}
      />
      <Composition
        id="FoundingToolsetGallery"
        component={FoundingToolsetGallery}
        durationInFrames={GALLERY_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
