/**
 * Action registry v1. Verbs: traverse, return, transform.
 * A step becomes visible when its cue phrase has been spoken.
 */
import { interpolate } from "remotion";
import { useBeatClock, useWordClock } from "./beat-clock";
import { phraseTime } from "./hold";
import { coral, fontFamily, good, ink, inkSoft, monoFamily, paper } from "../design";

export type ActionVerb = "traverse" | "return" | "transform";

export type ActionStep = {
  verb: ActionVerb;
  cue: string;
  label: string;
  payload: string;
};

const verbOf = (value: unknown): ActionVerb => (value === "return" || value === "transform" ? value : "traverse");

export const actionProps = (raw: Record<string, unknown>) => {
  const steps = (Array.isArray(raw.steps) ? raw.steps : [])
    .map((entry) => {
      const item = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : null;
      if (!item) return null;
      const cue = String(item.cue ?? "").replace(/\s+/g, " ").trim();
      const label = String(item.label ?? "").replace(/\s+/g, " ").trim();
      if (!cue || !label) return null;
      return {
        verb: verbOf(item.verb),
        cue: cue.slice(0, 80),
        label: label.slice(0, 48),
        payload: String(item.payload ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
      };
    })
    .filter((step): step is ActionStep => Boolean(step))
    .slice(0, 6);
  return {
    actor: String(raw.actor ?? "Sender").slice(0, 24),
    actorDetail: String(raw.actorDetail ?? "").slice(0, 36),
    boundary: String(raw.boundary ?? "").slice(0, 16),
    boundaryDetail: String(raw.boundaryDetail ?? "").slice(0, 24),
    destination: String(raw.destination ?? "Result").slice(0, 28),
    steps,
  };
};

export const ActionStage = ({ props }: { props: Record<string, unknown> }) => {
  const clock = useBeatClock();
  const words = useWordClock();
  const spec = actionProps(props);
  const on = spec.steps.map((step) => {
    const at = phraseTime(words, step.cue);
    return at != null && clock.time >= at;
  });
  const active = spec.steps.reduce((latest, step, index) => (on[index] ? step : latest), spec.steps[0]);
  const boundaryOn = spec.steps.some((step, index) => on[index] && step.verb === "traverse" && index > 0);
  const returned = [...spec.steps].reverse().find((step, index) => on[spec.steps.length - 1 - index] && (step.verb === "return" || step.verb === "transform"));
  const result = [...spec.steps].reverse().find((step, index) => on[spec.steps.length - 1 - index] && step.verb === "transform" && /creat|replac|new order|done/i.test(`${step.cue} ${step.label}`));
  const lines = (returned?.payload || "").split("|").map((line) => line.trim()).filter(Boolean).slice(0, 3);
  const x = result ? 620 : returned ? interpolate(clock.progress, [0, 1], [480, 620], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : boundaryOn ? interpolate(clock.progress, [0, 0.65], [150, 500], { extrapolateRight: "clamp" }) : 150;

  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", fontFamily }}>
      <div style={{ fontWeight: 800, fontSize: 44, letterSpacing: -1, color: ink, padding: "8px 48px 0", lineHeight: 1.05 }}>
        {active?.label || spec.actor}
      </div>
      <svg width="100%" height="440" viewBox="0 0 1000 440">
        <rect x="36" y="110" width="240" height="150" rx="18" fill={paper} stroke={ink} strokeWidth="4" />
        <text x="156" y="180" textAnchor="middle" fill={ink} fontSize="34" fontWeight="800" fontFamily={fontFamily}>{spec.actor}</text>
        <text x="156" y="218" textAnchor="middle" fill={inkSoft} fontSize="22" fontFamily={fontFamily}>{spec.actorDetail}</text>
        <line x1="276" y1="185" x2="410" y2="185" stroke={boundaryOn ? coral : inkSoft} strokeWidth="6" />
        <rect x="410" y="90" width="140" height="190" rx="16" fill={paper} stroke={boundaryOn ? coral : inkSoft} strokeWidth="4" />
        {boundaryOn ? <text x="480" y="175" textAnchor="middle" fill={ink} fontSize="30" fontWeight="800" fontFamily={monoFamily}>{spec.boundary}</text> : null}
        {boundaryOn ? <text x="480" y="210" textAnchor="middle" fill={inkSoft} fontSize="20" fontFamily={fontFamily}>{spec.boundaryDetail}</text> : null}
        <line x1="550" y1="185" x2="680" y2="185" stroke={returned ? coral : inkSoft} strokeWidth="6" />
        <rect x="680" y="80" width="280" height="230" rx="18" fill={paper} stroke={returned ? ink : inkSoft} strokeWidth="4" />
        <text x="820" y="140" textAnchor="middle" fill={ink} fontSize="28" fontWeight="800" fontFamily={fontFamily}>{spec.destination}</text>
        {lines.map((line, index) => (
          <text key={line} x="820" y={190 + index * 40} textAnchor="middle" fill={result ? good : ink} fontSize="26" fontFamily={fontFamily}>{line}</text>
        ))}
        <circle cx={Math.min(x, 640)} cy="185" r="16" fill={coral} />
      </svg>
      {result ? (
        <div style={{ margin: "0 48px", border: `3px solid ${coral}`, borderRadius: 16, padding: "14px 20px", fontWeight: 800, fontSize: 34, color: ink }}>
          {result.label}
        </div>
      ) : null}
    </div>
  );
};
