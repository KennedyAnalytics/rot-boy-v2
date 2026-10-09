/**
 * A stage-local diagram. Nodes appear on the beat that speaks them.
 * Geometry stays inside the stage. layoutFor still owns the frame.
 */
import { spokenYet, useBeatClock } from "./beat-clock";
import { coral, fontFamily, good, ink, inkSoft, monoFamily, paper } from "../design";

export type DiagramNode = {
  id: string;
  label: string;
  detail: string;
  atBeat: number;
  tone: "if" | "accent" | "good" | "bad" | "neutral";
};

export type DiagramLink = { from: string; to: string; label: string };

const toneBorder = (tone: DiagramNode["tone"]) =>
  tone === "good" ? good : tone === "bad" ? "#D64545" : tone === "accent" || tone === "if" ? coral : ink;

export const BespokeDiagram = ({
  title,
  nodes,
  links,
}: {
  title: string;
  nodes: DiagramNode[];
  links: DiagramLink[];
}) => {
  const clock = useBeatClock();
  const visible = nodes.filter((node) => {
    if (node.atBeat > clock.index) return false;
    if (node.tone === "if" && clock.mode !== "hypothetical") return false;
    return spokenYet(`${node.label} ${node.detail}`, clock.spoken, true);
  });
  const shown = visible;
  const ids = new Set(shown.map((node) => node.id));

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "8px 48px 0", boxSizing: "border-box", overflow: "hidden" }}>
        {title && spokenYet(title, clock.spoken) ? (
          <div style={{ fontFamily, fontWeight: 800, fontSize: title.length > 42 ? 40 : 48, letterSpacing: -1.1, lineHeight: 1.05, color: ink, marginBottom: 18 }}>
            {title}
          </div>
        ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
        {shown.map((node, index) => {
          const incoming = links.some((link) => link.to === node.id && ids.has(link.from));
          return (
            <div key={node.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {index > 0 && incoming ? (
                <div style={{ width: 4, height: 18, marginLeft: 28, background: inkSoft, opacity: 0.45 }} />
              ) : null}
              <div
                style={{
                  background: paper,
                  border: `3px ${node.tone === "if" ? "dashed" : "solid"} ${toneBorder(node.tone)}`,
                  borderRadius: 18,
                  padding: "16px 22px",
                  boxShadow: "5px 5px 0 rgba(28,33,43,0.1)",
                }}
              >
                {node.tone === "if" ? (
                  <div style={{ fontFamily: monoFamily, fontSize: 18, letterSpacing: 1.4, color: coral, marginBottom: 4 }}>IF</div>
                ) : null}
                <div style={{ fontFamily, fontWeight: 800, fontSize: 36, letterSpacing: -0.6, color: ink, lineHeight: 1.05 }}>{node.label}</div>
                {node.detail ? (
                  <div style={{ fontFamily, fontWeight: 500, fontSize: 26, color: inkSoft, marginTop: 6, lineHeight: 1.2 }}>{node.detail}</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
