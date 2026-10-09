import type { CSSProperties, ReactElement } from "react";
import { Easing, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { captionDim, fontFamily, HEIGHT, ink, inkSoft, monoFamily, paper, WIDTH } from "../design";
import type { Chrome, TimedScene, Word } from "../types";

export const Paper = () => {
  const lines: ReactElement[] = [];
  for (let x = 48; x < WIDTH; x += 56) {
    lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={HEIGHT} stroke="#E3DCCE" strokeWidth={1} />);
  }
  for (let y = 48; y < HEIGHT; y += 56) {
    lines.push(<line key={`h${y}`} x1={0} y1={y} x2={WIDTH} y2={y} stroke="#E3DCCE" strokeWidth={1} />);
  }
  return (
    <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", inset: 0 }}>
      <rect width={WIDTH} height={HEIGHT} fill={paper} />
      {lines}
    </svg>
  );
};

export const ChapterRail = ({ chapters, active }: { chapters: string[]; active: string }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 52,
        left: 56,
        right: 56,
        height: 72,
        borderRadius: 40,
        background: ink,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 6,
        zIndex: 6,
      }}
    >
      {chapters.map((chapter, index) => {
        const on = chapter === active;
        const done = chapters.indexOf(active) > index;
        return (
          <div key={chapter} style={{ display: "flex", alignItems: "center", gap: 8, flex: on ? 1.4 : 0.7, minWidth: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                background: on ? "#E25B3A" : done ? "#2F8F5B" : "#3A4150",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily,
                fontWeight: 700,
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {index + 1}
            </div>
            {on ? (
              <div
                style={{
                  color: "white",
                  fontFamily,
                  fontWeight: 700,
                  fontSize: 22,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                {chapter}
              </div>
            ) : null}
            {index < chapters.length - 1 ? (
              <div style={{ height: 2, background: "#3A4150", flex: 1, minWidth: 12 }} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export const Kicker = ({ text }: { text: string }) => (
  <div
    style={{
      position: "absolute",
      top: 78,
      left: 72,
      fontFamily,
      fontWeight: 600,
      fontSize: 20,
      letterSpacing: 3.2,
      color: inkSoft,
      textTransform: "uppercase",
      zIndex: 6,
    }}
  >
    {text}
  </div>
);

const phraseAt = (words: Word[], time: number): Word[] => {
  if (words.length === 0) return [];
  let index = words.findIndex((word) => time >= word.start && time < word.end + 0.04);
  if (index < 0) {
    index = words.findIndex((word) => word.start > time);
    index = index < 0 ? words.length - 1 : Math.max(0, index - 1);
  }
  let start = index;
  let count = 1;
  let width = words[index]?.text.length ?? 0;
  while (start > 0 && count < 5 && width < 28 && !/[.!?]$/.test(words[start - 1].text)) {
    start -= 1;
    count += 1;
    width += words[start].text.length + 1;
  }
  const phrase = [words[start]];
  let end = start;
  while (end + 1 < words.length && phrase.length < 5 && width < 32 && !/[.!?]$/.test(words[end].text)) {
    end += 1;
    width += words[end].text.length + 1;
    phrase.push(words[end]);
  }
  return phrase;
};

export const Caption = ({
  words,
  time,
  character,
}: {
  words: Word[];
  time: number;
  character: { pose: "tablet" | "present" | "none"; side: "left" | "right" };
}) => {
  const phrase = phraseAt(words, time);
  if (phrase.length === 0) return null;
  const beside = character.pose !== "none";
  const left = beside && character.side === "left" ? 470 : 72;
  const right = beside && character.side === "right" ? 470 : 72;
  return (
    <div
      style={{
        position: "absolute",
        left,
        right,
        bottom: 168,
        display: "flex",
        justifyContent: "center",
        zIndex: 8,
      }}
    >
      <div
        style={{
          background: "#16181D",
          color: "white",
          borderRadius: 10,
          padding: "16px 26px",
          fontFamily,
          fontWeight: 700,
          fontSize: 34,
          lineHeight: 1.15,
          letterSpacing: -0.4,
          boxShadow: "4px 4px 0 rgba(22,24,29,0.35)",
          maxWidth: 760,
          textAlign: "center",
        }}
      >
        {phrase.map((word, i) => {
          const live = time >= word.start && time < word.end + 0.05;
          return (
            <span key={`${word.start}-${i}`} style={{ color: live ? "#FFFFFF" : captionDim }}>
              {word.text}
              {i < phrase.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const Character = ({
  pose,
  side,
  start,
  time,
  motion = "still",
}: {
  pose: "present" | "tablet" | "none";
  side: "left" | "right";
  start: number;
  time: number;
  motion?: "presenting" | "tablet" | "still";
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clipFrames = 4 * fps;
  const loopFrom = Math.floor(frame / clipFrames) * clipFrames;
  if (pose === "none") return null;
  const local = Math.max(0, time - start);
  const rise = interpolate(local, [0, 0.35], [28, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(local, [0, 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bob = Math.sin((frame / fps) * 1.6) * 3;
  const flip = side === "right" && pose === "present";
  return (
    <div
      style={{
        position: "absolute",
        bottom: 12,
        left: side === "left" ? -20 : undefined,
        right: side === "right" ? -20 : undefined,
        width: 560,
        height: 1240,
        opacity,
        translate: `0 ${rise + bob}px`,
        zIndex: 3,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 18,
          width: 240,
          height: 28,
          borderRadius: "50%",
          background: "rgba(28,33,43,0.16)",
          filter: "blur(6px)",
        }}
      />
      {motion === "still" ? (
        <Img
          src={staticFile(pose === "tablet" ? "character/tablet.png" : "character/present.png")}
          style={{
            height: 1200,
            width: "auto",
            objectFit: "contain",
            scale: flip ? "-1 1" : "1 1",
          }}
        />
      ) : (
        <Sequence from={loopFrom} durationInFrames={clipFrames} layout="none">
          <OffthreadVideo
            src={staticFile(motion === "presenting" ? "character/corporate-defector-presenting.webm" : "character/corporate-defector-tablet-idle.webm")}
            transparent
            muted
            style={{ height: 1200, width: "auto", objectFit: "contain" }}
          />
        </Sequence>
      )}
    </div>
  );
};

export const contentBox = (scene: TimedScene, chrome: Chrome) => {
  const top = chrome === "rail" ? 180 : 156;
  if (scene.character.pose === "none") {
    return { left: 72, top, width: WIDTH - 144, height: 1320 };
  }
  if (scene.character.side === "left") {
    return { left: 500, top: 188, width: 520, height: 1180 };
  }
  return { left: 64, top: 188, width: 520, height: 1180 };
};

export const cardStyle = (extra?: CSSProperties): CSSProperties => ({
  background: "#FBF9F4",
  border: `2px solid ${ink}`,
  borderRadius: 14,
  boxShadow: "0 16px 40px rgba(28,33,43,0.05)",
  ...extra,
});

export const labelStyle: CSSProperties = {
  fontFamily: monoFamily,
  fontWeight: 600,
  fontSize: 16,
  letterSpacing: 1.4,
  textTransform: "uppercase",
  color: inkSoft,
};
