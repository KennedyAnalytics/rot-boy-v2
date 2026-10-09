import type { ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { bad, card, coral, fontFamily, good, ink, inkSoft, monoFamily, paper } from "../design";
import type { Block, BoardFilmProps, BoardScene, IconName, Tone } from "./types";
import { SCENE_FRAMES } from "./types";

const toneColor = (tone: Tone) => (tone === "coral" ? coral : tone === "good" ? good : tone === "bad" ? bad : ink);

const Icon = ({ name, color }: { name: IconName; color: string }) => {
  const common = { fill: "none", stroke: color, strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<IconName, ReactNode> = {
    bolt: <path {...common} d="M13 2 L5 14 H11 L9 22 L19 9 H13 Z" />,
    coin: (
      <>
        <ellipse {...common} cx="12" cy="12" rx="8" ry="8" />
        <path {...common} d="M12 7 V17 M9.5 9.5 H13.5 a2 2 0 0 1 0 4 H10.5 a2 2 0 0 0 0 4 H14.5" />
      </>
    ),
    page: (
      <>
        <path {...common} d="M7 3 H14 L19 8 V21 H7 Z" />
        <path {...common} d="M14 3 V8 H19 M10 13 H16 M10 17 H14" />
      </>
    ),
    tray: (
      <>
        <path {...common} d="M4 9 H20 L18 20 H6 Z" />
        <path {...common} d="M8 9 V6 H16 V9" />
      </>
    ),
    person: (
      <>
        <circle {...common} cx="12" cy="8" r="3" />
        <path {...common} d="M6 20 C7 15 17 15 18 20" />
      </>
    ),
    gear: (
      <>
        <circle {...common} cx="12" cy="12" r="3" />
        <path {...common} d="M12 3 V6 M12 18 V21 M3 12 H6 M18 12 H21 M5.5 5.5 L7.5 7.5 M16.5 16.5 L18.5 18.5 M18.5 5.5 L16.5 7.5 M7.5 16.5 L5.5 18.5" />
      </>
    ),
    check: <path {...common} d="M5 12 L10 17 L19 7" />,
    stop: (
      <>
        <circle {...common} cx="12" cy="12" r="8" />
        <path {...common} d="M8 8 L16 16" />
      </>
    ),
    arrow: <path {...common} d="M5 12 H18 M13 7 L18 12 L13 17" />,
  };
  return (
    <svg width={36} height={36} viewBox="0 0 24 24" aria-hidden>
      {paths[name]}
    </svg>
  );
};

const titleSize = (value: string, width: number) => {
  const fitted = width / (Math.max(value.length, 1) * 0.62);
  return Math.max(40, Math.min(76, Math.floor(fitted)));
};

const enter = (frame: number, start: number) => {
  const opacity = interpolate(frame, [start, start + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(frame, [start, start + 12], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return { opacity, transform: `translateY(${y}px)` };
};

const PlateStack = ({ block }: { block: Extract<Block, { kind: "plates" }> }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    {block.items.map((item) => (
      <div
        key={item.label}
        style={{
          border: `2.5px solid ${toneColor(item.tone)}`,
          borderRadius: 16,
          background: card,
          padding: "18px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily, fontWeight: 800, fontSize: 28, letterSpacing: -0.6, color: ink, lineHeight: 1 }}>{item.label}</div>
          {item.detail ? <div style={{ marginTop: 6, fontFamily, fontWeight: 600, fontSize: 18, color: inkSoft }}>{item.detail}</div> : null}
        </div>
        {item.icon ? <Icon name={item.icon} color={toneColor(item.tone)} /> : null}
      </div>
    ))}
  </div>
);

const Meter = ({ block, frame }: { block: Extract<Block, { kind: "meter" }>; frame: number }) => {
  const width = interpolate(frame, [8, 36], [0, block.fill * 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <div>
      <div style={{ fontFamily: monoFamily, fontWeight: 600, fontSize: 16, letterSpacing: 1.6, color: inkSoft }}>{block.label.toUpperCase()}</div>
      <div style={{ marginTop: 16, height: 32, borderRadius: 8, background: "#E6E0D4", position: "relative" }}>
        <div style={{ width: `${width}%`, height: "100%", borderRadius: 8, background: ink }} />
        {block.limit ? <div style={{ position: "absolute", right: 0, top: -10, width: 4, height: 52, background: bad }} /> : null}
      </div>
      <div style={{ marginTop: 18, fontFamily, fontWeight: 800, fontSize: 92, letterSpacing: -3, lineHeight: 0.9, color: ink }}>{block.value}</div>
      {block.unit ? <div style={{ marginTop: 8, fontFamily: monoFamily, fontWeight: 600, fontSize: 16, letterSpacing: 1.4, color: inkSoft }}>{block.unit.toUpperCase()}</div> : null}
    </div>
  );
};

const Record = ({ block }: { block: Extract<Block, { kind: "record" }> }) => (
  <div style={{ border: `2.5px solid ${ink}`, borderRadius: 16, background: card, overflow: "hidden" }}>
    {block.caption ? <div style={{ padding: "16px 22px 12px", fontFamily: monoFamily, fontWeight: 600, fontSize: 14, letterSpacing: 1.5, color: inkSoft }}>{block.caption.toUpperCase()}</div> : <div style={{ height: 8 }} />}
    {block.rows.map((row) => (
      <div key={row.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, padding: "14px 22px", borderTop: "1px solid #E4DDD0" }}>
        <span style={{ fontFamily: monoFamily, fontWeight: 600, fontSize: 15, letterSpacing: 1.1, color: inkSoft }}>{row.key.toUpperCase()}</span>
        <span style={{ fontFamily, fontWeight: 800, fontSize: 28, letterSpacing: -0.5, color: toneColor(row.tone) }}>{row.value}</span>
      </div>
    ))}
  </div>
);

const Stamp = ({ block, frame }: { block: Extract<Block, { kind: "stamp" }>; frame: number }) => {
  const scale = interpolate(frame, [16, 26], [1.15, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const opacity = interpolate(frame, [16, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const color = block.tone === "bad" ? bad : good;
  return (
    <div style={{ width: "fit-content", opacity, transform: `rotate(-8deg) scale(${scale})`, border: `3px solid ${color}`, color, borderRadius: 4, padding: "8px 16px", fontFamily, fontWeight: 800, fontSize: 26, letterSpacing: 1.4, lineHeight: 1 }}>
      {block.text.toUpperCase()}
    </div>
  );
};

const Flow = ({ block }: { block: Extract<Block, { kind: "flow" }> }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
    {block.items.map((item, index) => (
      <div key={item.label}>
        {index > 0 ? <div style={{ width: 2, height: 18, marginLeft: 27, background: ink }} /> : null}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, border: `2.5px solid ${ink}`, background: index === block.items.length - 1 ? coral : card, flex: "0 0 auto" }} />
          <div style={{ flex: 1, border: `2.5px solid ${ink}`, borderRadius: 14, background: card, padding: "14px 18px" }}>
            <div style={{ fontFamily, fontWeight: 800, fontSize: 26, letterSpacing: -0.4, color: ink }}>{item.label}</div>
            {item.detail ? <div style={{ marginTop: 4, fontFamily, fontWeight: 600, fontSize: 16, color: inkSoft }}>{item.detail}</div> : null}
          </div>
        </div>
      </div>
    ))}
  </div>
);

const Pair = ({ block }: { block: Extract<Block, { kind: "pair" }> }) => (
  <div style={{ display: "flex", gap: 16 }}>
    {[block.left, block.right].map((side, index) => (
      <div key={side.label} style={{ flex: 1, minWidth: 0, border: `2.5px solid ${index === 1 ? coral : ink}`, borderRadius: 16, background: card, padding: "18px 16px" }}>
        {side.detail ? <div style={{ fontFamily: monoFamily, fontWeight: 600, fontSize: 13, letterSpacing: 1.3, color: inkSoft }}>{side.label.toUpperCase()}</div> : null}
        <div style={{ marginTop: side.detail ? 10 : 0, fontFamily, fontWeight: 800, fontSize: 28, letterSpacing: -0.6, lineHeight: 1.05, color: ink }}>{side.detail || side.label}</div>
      </div>
    ))}
  </div>
);

const BlockView = ({ block, frame }: { block: Block; frame: number }) => {
  if (block.kind === "statement") {
    return <div style={{ fontFamily, fontWeight: 800, fontSize: titleSize(block.text, 520), letterSpacing: -1.8, lineHeight: 0.92, color: toneColor(block.tone), textTransform: "uppercase" }}>{block.text}</div>;
  }
  if (block.kind === "sentence") {
    return <div style={{ fontFamily, fontWeight: 700, fontSize: 32, letterSpacing: -0.6, lineHeight: 1.15, color: ink }}>{block.text}</div>;
  }
  if (block.kind === "plates") return <PlateStack block={block} />;
  if (block.kind === "meter") return <Meter block={block} frame={frame} />;
  if (block.kind === "record") return <Record block={block} />;
  if (block.kind === "stamp") return <Stamp block={block} frame={frame} />;
  if (block.kind === "flow") return <Flow block={block} />;
  return <Pair block={block} />;
};

const Column = ({ scene, frame }: { scene: BoardScene; frame: number }) => {
  const wide = scene.character === "none";
  const left = wide ? 88 : scene.side === "left" ? 500 : 72;
  const width = wide ? 904 : 508;
  return (
    <div style={{ position: "absolute", left, top: 88, width, zIndex: 2, display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <div style={{ fontFamily: monoFamily, fontWeight: 600, fontSize: 16, letterSpacing: 1.8, color: inkSoft }}>{scene.kicker.toUpperCase()}</div>
        {scene.title ? <div style={{ marginTop: 10, fontFamily, fontWeight: 800, fontSize: titleSize(scene.title, width), letterSpacing: -1.8, lineHeight: 0.92, color: ink, textTransform: "uppercase", whiteSpace: "nowrap" }}>{scene.title}</div> : null}
        <div style={{ marginTop: 16, height: 2, background: ink, width: "100%" }} />
      </div>
      {scene.blocks.map((block, index) => (
        <div key={`${block.kind}-${index}`} style={{ ...enter(frame, 4 + index * 8), ...(block.kind === "stamp" ? { alignSelf: "flex-start", width: "fit-content" } : null) }}>
          <BlockView block={block} frame={frame} />
        </div>
      ))}
    </div>
  );
};

const Presenter = ({ scene, frame }: { scene: BoardScene; frame: number }) => {
  if (scene.character === "none") return null;
  const rise = interpolate(frame, [0, 12], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const side = scene.side;
  return (
    <Img
      src={staticFile(scene.character === "tablet" ? "character/tablet.png" : "character/present.png")}
      style={{
        position: "absolute",
        bottom: 36,
        left: side === "left" ? -36 : undefined,
        right: side === "right" ? -36 : undefined,
        height: 1040,
        opacity,
        transform: `translateY(${rise}px) scaleX(${side === "right" ? -1 : 1})`,
        zIndex: 3,
      }}
    />
  );
};

const Caption = ({ text }: { text: string }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 72, display: "flex", justifyContent: "center", zIndex: 5 }}>
    <div style={{ maxWidth: 820, background: ink, color: "#F7F4EE", fontFamily, fontWeight: 700, fontSize: text.length > 52 ? 28 : 34, lineHeight: 1.15, letterSpacing: -0.4, padding: "16px 28px", borderRadius: 14, boxShadow: "4px 4px 0 rgba(22,24,29,0.28)", textAlign: "center" }}>
      {text}
    </div>
  </div>
);

const Frame = ({ scene, frame }: { scene: BoardScene; frame: number }) => (
  <AbsoluteFill style={{ background: paper }}>
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: 20 }, (_, index) => (
        <line key={`v${index}`} x1={48 + index * 56} y1={0} x2={48 + index * 56} y2="100%" stroke="#E3DCCE" strokeWidth={1} />
      ))}
      {Array.from({ length: 36 }, (_, index) => (
        <line key={`h${index}`} x1={0} y1={48 + index * 56} x2="100%" y2={48 + index * 56} stroke="#E3DCCE" strokeWidth={1} />
      ))}
    </svg>
    <Column scene={scene} frame={frame} />
    <Presenter scene={scene} frame={frame} />
    <Caption text={scene.narration} />
  </AbsoluteFill>
);

export const BoardFilm = ({ scenes }: BoardFilmProps) => {
  const frame = useCurrentFrame();
  const index = Math.min(scenes.length - 1, Math.floor(frame / SCENE_FRAMES));
  const scene = scenes[index];
  const local = frame - index * SCENE_FRAMES;
  if (!scene) return null;
  return <Frame scene={scene} frame={local} />;
};

export const boardDuration = (props: BoardFilmProps) => Math.max(SCENE_FRAMES, props.scenes.length * SCENE_FRAMES);
