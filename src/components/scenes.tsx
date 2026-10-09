import { interpolate } from "remotion";
import type { CSSProperties } from "react";
import { bad, coral, fontFamily, good, ink, inkSoft, paper } from "../design";
import type { DrawNode, InkName, TimedScene } from "../types";

const inkOf = (name: InkName) => {
  if (name === "soft") return inkSoft;
  if (name === "coral") return coral;
  if (name === "good") return good;
  if (name === "bad") return bad;
  if (name === "paper") return paper;
  if (name === "none") return "transparent";
  return ink;
};

const strokeWidth = (weight: 1 | 2 | 3) => (weight === 1 ? 1.5 : weight === 3 ? 4 : 2.5);

const lifeOf = (progress: number, appear: number) => Math.min(1, Math.max(0, (progress - appear) / Math.max(0.08, 1 - appear)));

const reveal = (progress: number, appear: number) => {
  if (appear <= 0.001) return { opacity: 1, y: 0 };
  const end = Math.min(1, appear + 0.12);
  return {
    opacity: interpolate(progress, [appear, end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    y: interpolate(progress, [appear, end], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  };
};

const typeStyle = (node: DrawNode): CSSProperties => {
  if (node.role === "display" || node.shape === "count") {
    return { fontFamily, fontWeight: 800, fontSize: node.shape === "count" ? 108 : 64, letterSpacing: -1.6, lineHeight: 0.92, textTransform: "uppercase" };
  }
  if (node.role === "note") {
    return { fontFamily, fontWeight: 600, fontSize: 20, letterSpacing: 0.2, lineHeight: 1.2 };
  }
  return { fontFamily, fontWeight: 700, fontSize: 28, letterSpacing: -0.4, lineHeight: 1.05 };
};

const dash = (node: DrawNode, life: number) => {
  if (!node.draw) return {};
  return { strokeDasharray: 280, strokeDashoffset: 280 * (1 - life) };
};

const TextBlock = ({ node, value }: { node: DrawNode; value: string }) => (
  <div style={{ ...typeStyle(node), color: inkOf(node.ink), width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: node.role === "display" ? "flex-start" : "center", textAlign: node.role === "display" ? "left" : "center" }}>
    {value}
  </div>
);

const Marks = ({ node, life }: { node: DrawNode; life: number }) => {
  const total = Math.max(1, node.count);
  const columns = Math.max(1, node.columns);
  const shown = Math.max(1, Math.round(life * total));
  const color = inkOf(node.ink);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 6, width: "100%", height: "100%", alignContent: "start" }}>
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          style={{
            width: "100%",
            aspectRatio: "1",
            maxHeight: 18,
            borderRadius: node.mark === "dot" ? 99 : 2,
            background: index < shown ? color : "transparent",
            border: `1.5px solid ${index < shown ? color : "#D5D0C6"}`,
          }}
        />
      ))}
    </div>
  );
};

const NodeView = ({ node, progress }: { node: DrawNode; progress: number }) => {
  const motion = reveal(progress, node.appear);
  const life = lifeOf(progress, node.appear);
  const dx = node.slide ? node.slide.dx * life : 0;
  const dy = node.slide ? node.slide.dy * life : 0;
  const color = inkOf(node.ink);
  const fill = inkOf(node.fill);

  if (node.shape === "line") {
    const x1 = node.x + dx;
    const y1 = node.y + dy;
    const x2 = node.x2 + dx;
    const y2 = node.y2 + dy;
    const thickness = strokeWidth(node.weight);
    if (Math.abs(y2 - y1) < 1.2 || Math.abs(x2 - x1) < 1.2) {
      const across = Math.abs(x2 - x1) >= Math.abs(y2 - y1);
      const style: CSSProperties = {
        position: "absolute",
        background: color,
        opacity: motion.opacity,
        translate: `0 ${motion.y}px`,
      };
      const span = node.draw ? life : 1;
      if (across) {
        style.left = `${Math.min(x1, x2)}%`;
        style.width = `${Math.max(Math.abs(x2 - x1) * span, 0.6)}%`;
        style.top = `calc(${(y1 + y2) / 2}% - ${thickness / 2}px)`;
        style.height = thickness;
      } else {
        style.top = `${Math.min(y1, y2)}%`;
        style.height = `${Math.max(Math.abs(y2 - y1) * span, 0.6)}%`;
        style.left = `calc(${(x1 + x2) / 2}% - ${thickness / 2}px)`;
        style.width = thickness;
      }
      return <div style={style} />;
    }
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.max(Math.abs(x2 - x1), 1);
    const height = Math.max(Math.abs(y2 - y1), 1);
    return (
      <svg style={{ position: "absolute", left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`, overflow: "visible", opacity: motion.opacity, translate: `0 ${motion.y}px` }} viewBox={`${left} ${top} ${width} ${height}`} preserveAspectRatio="none">
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={Math.max(width, height) * 0.03} strokeLinecap="round" {...dash(node, life)} />
      </svg>
    );
  }

  const box: CSSProperties = {
    position: "absolute",
    left: `${node.x + dx}%`,
    top: `${node.y + dy}%`,
    width: `${Math.max(node.w, 1)}%`,
    height: `${Math.max(node.h, 1)}%`,
    opacity: motion.opacity,
    translate: `0 ${motion.y}px`,
  };

  if (node.shape === "path") {
    return (
      <svg style={{ ...box, overflow: "visible" }} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <path d={node.d} fill={fill} stroke={color} strokeWidth={strokeWidth(node.weight)} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" {...dash(node, life)} />
      </svg>
    );
  }

  if (node.shape === "rect" || node.shape === "ellipse") {
    return (
      <div style={box}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {node.shape === "ellipse" ? (
            <ellipse cx={50} cy={50} rx={46} ry={46} fill={fill} stroke={color} strokeWidth={strokeWidth(node.weight)} vectorEffect="non-scaling-stroke" {...dash(node, life)} />
          ) : (
            <rect x={2} y={2} width={96} height={96} rx={node.radius} fill={fill} stroke={node.ink === "none" ? "transparent" : color} strokeWidth={strokeWidth(node.weight)} vectorEffect="non-scaling-stroke" {...dash(node, life)} />
          )}
        </svg>
        {node.text ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
            <TextBlock node={{ ...node, role: node.role === "display" ? "label" : node.role }} value={node.text} />
          </div>
        ) : null}
        {node.children.map((child, index) => (
          <NodeView key={index} node={child} progress={progress} />
        ))}
      </div>
    );
  }

  return (
    <div style={box}>
      {node.shape === "text" ? <TextBlock node={node} value={node.text} /> : null}
      {node.shape === "count" ? <TextBlock node={node} value={`${Math.round(node.from + (node.to - node.from) * life)}${node.suffix ? ` ${node.suffix}` : ""}`} /> : null}
      {node.shape === "swap" ? <TextBlock node={{ ...node, role: "display", ink: life > 0.45 ? "coral" : node.ink }} value={life > 0.45 ? node.after : node.before} /> : null}
      {node.shape === "marks" ? <Marks node={node} life={life} /> : null}
      {node.children.map((child, index) => (
        <NodeView key={index} node={child} progress={progress} />
      ))}
    </div>
  );
};

export const SceneBody = ({ scene, progress }: { scene: TimedScene; progress: number }) => {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", fontFamily, color: ink }}>
      <NodeView node={scene.picture} progress={progress} />
    </div>
  );
};
