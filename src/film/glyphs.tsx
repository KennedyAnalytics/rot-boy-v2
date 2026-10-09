/**
 * Designed stage objects. Each kind draws from continuous state parameters,
 * so a change of state is a physical change of the same object rather than a
 * swapped picture. Drawn in a ±75 unit box around the origin.
 */
import type { ReactElement } from 'react';
import { coral, good, ink, paper } from '../design';
import type { GlyphState, Kind } from './choreography';

export type GlyphPalette = { ink: string; fill: string; shade: string; accent: string; paper: string; dash?: string };

export const solidPalette: GlyphPalette = { ink, fill: '#FBF9F4', shade: '#E7E0D2', accent: coral, paper: '#FFFFFF' };
export const ghostPalette: GlyphPalette = { ink: coral, fill: 'rgba(251,249,244,0.7)', shade: 'rgba(226,91,58,0.10)', accent: coral, paper: 'rgba(255,255,255,0.8)', dash: '11 8' };
export const shadowPalette: GlyphPalette = { ink: 'rgba(28,33,43,0.13)', fill: 'rgba(28,33,43,0.13)', shade: 'rgba(28,33,43,0.13)', accent: 'rgba(28,33,43,0.13)', paper: 'rgba(28,33,43,0.13)' };

const SW = 5;
const clamp = (v: number) => Math.min(1, Math.max(0, v));

const Message = ({ g, p }: { g: GlyphState; p: GlyphPalette }) => {
  const tip = 12 - 118 * g.open;
  const flap = <path d={`M-72 -46 L0 ${tip} L72 -46 Z`} fill={tip < -46 ? p.shade : p.fill} stroke={p.ink} strokeWidth={SW} strokeLinejoin="round" strokeDasharray={p.dash} />;
  const lift = 46 * g.open;
  return (
    <g>
      <rect x={-72} y={-46} width={144} height={98} rx={12} fill={p.shade} stroke={p.ink} strokeWidth={SW} strokeDasharray={p.dash} />
      {tip < -46 ? flap : null}
      {g.open > 0.02 ? (
        <g transform={`translate(0 ${-lift})`}>
          <rect x={-54} y={-34} width={108} height={78} rx={6} fill={p.paper} stroke={p.ink} strokeWidth={4} />
          <path d="M-38 -14 H22 M-38 4 H38 M-38 22 H14" stroke={p.ink} strokeWidth={4} strokeLinecap="round" opacity={0.75} />
          <path d="M-38 -14 H-10" stroke={p.accent} strokeWidth={5} strokeLinecap="round" />
        </g>
      ) : null}
      <path d="M-72 -40 L0 14 L72 -40 V52 H-72 Z" fill={p.fill} stroke={p.ink} strokeWidth={SW} strokeLinejoin="round" strokeDasharray={p.dash} />
      <path d="M-72 52 L-16 8 M72 52 L16 8" stroke={p.ink} strokeWidth={4} strokeLinecap="round" opacity={0.6} />
      {tip >= -46 ? flap : null}
      {g.unread > 0.01 ? <circle cx={62} cy={-44} r={16 * g.unread} fill={p.accent} stroke={p.paper} strokeWidth={5} /> : null}
    </g>
  );
};

const Agent = ({ g, p }: { g: GlyphState; p: GlyphPalette }) => {
  const eye = Math.max(1.8, 11 * g.awake);
  const lit = g.awake > 0.5;
  return (
    <g>
      <path d="M-58 76 Q-58 48 -30 46 H30 Q58 48 58 76 Z" fill={p.shade} stroke={p.ink} strokeWidth={SW} strokeLinejoin="round" strokeDasharray={p.dash} />
      <rect x={-12} y={32} width={24} height={16} fill={p.fill} stroke={p.ink} strokeWidth={4} />
      <line x1={0} y1={-60} x2={0} y2={-80} stroke={p.ink} strokeWidth={SW} strokeLinecap="round" />
      <circle cx={0} cy={-86} r={9} fill={lit ? p.accent : p.fill} stroke={p.ink} strokeWidth={4} />
      <rect x={-62} y={-62} width={124} height={98} rx={30} fill={p.fill} stroke={p.ink} strokeWidth={SW} strokeDasharray={p.dash} />
      <rect x={-46} y={-44} width={92} height={60} rx={15} fill={p.dash ? 'rgba(226,91,58,0.18)' : ink} />
      <ellipse cx={-19} cy={-15} rx={8.5} ry={eye} fill={lit ? '#F4EFE4' : '#7D8693'} />
      <ellipse cx={19} cy={-15} rx={8.5} ry={eye} fill={lit ? '#F4EFE4' : '#7D8693'} />
      {lit ? <path d="M-10 4 Q0 10 10 4" fill="none" stroke="#F4EFE4" strokeWidth={3.5} strokeLinecap="round" opacity={clamp((g.awake - 0.5) * 2)} /> : null}
    </g>
  );
};

const Document = ({ g, p }: { g: GlyphState; p: GlyphPalette }) => {
  const rows = [
    { y: -32, x2: 16, accent: true },
    { y: -10, x2: 34, accent: false },
    { y: 12, x2: 34, accent: false },
    { y: 34, x2: 34, accent: false },
    { y: 54, x2: 4, accent: false },
  ];
  return (
    <g>
      <path d="M-56 -72 H26 L56 -42 V72 H-56 Z" fill={p.fill} stroke={p.ink} strokeWidth={SW} strokeLinejoin="round" strokeDasharray={p.dash} />
      <path d="M26 -72 V-42 H56" fill={p.shade} stroke={p.ink} strokeWidth={SW} strokeLinejoin="round" />
      {rows.map((r, i) => {
        const k = clamp(g.lines * rows.length - i);
        return k > 0 ? <line key={i} x1={-36} y1={r.y} x2={-36 + (r.x2 + 36) * k} y2={r.y} stroke={r.accent ? p.accent : p.ink} strokeWidth={r.accent ? 6 : 4.5} strokeLinecap="round" opacity={r.accent ? 1 : 0.72} /> : null;
      })}
    </g>
  );
};

const Package = ({ p }: { g: GlyphState; p: GlyphPalette }) => (
  <g>
    <path d="M-66 -28 L0 -60 L66 -28 L0 4 Z" fill={p.fill} stroke={p.ink} strokeWidth={SW} strokeLinejoin="round" strokeDasharray={p.dash} />
    <path d="M-66 -28 L0 4 V72 L-66 40 Z" fill={p.fill} stroke={p.ink} strokeWidth={SW} strokeLinejoin="round" strokeDasharray={p.dash} />
    <path d="M66 -28 L0 4 V72 L66 40 Z" fill={p.shade} stroke={p.ink} strokeWidth={SW} strokeLinejoin="round" strokeDasharray={p.dash} />
    <path d="M-33 -44 L33 -12" stroke={p.accent} strokeWidth={9} strokeLinecap="round" />
    <path d="M-50 18 L-22 32 M-50 32 L-32 41" stroke={p.ink} strokeWidth={4} strokeLinecap="round" opacity={0.6} />
  </g>
);

const Boundary = ({ g, p }: { g: GlyphState; p: GlyphPalette }) => {
  const w = 100 * (1 - 0.74 * g.door);
  const lean = 16 * g.door;
  return (
    <g>
      <rect x={-50} y={-74} width={100} height={148} fill={p.dash ? 'rgba(226,91,58,0.12)' : '#2A303B'} />
      {g.door > 0.05 ? <rect x={-50} y={-74} width={100} height={148} fill={p.dash ? p.accent : '#FFE3BF'} opacity={(p.dash ? 0.3 : 0.95) * g.door} /> : null}
      <path d={`M-50 -74 L${-50 + w} ${-74 + lean} V${74 - lean} L-50 74 Z`} fill={p.fill} stroke={p.ink} strokeWidth={SW} strokeLinejoin="round" strokeDasharray={p.dash} />
      {w > 34 ? <circle cx={-50 + w - 15} cy={6} r={6} fill={p.ink} /> : null}
      <rect x={-50} y={-74} width={100} height={148} fill="none" stroke={p.ink} strokeWidth={7} strokeLinejoin="round" strokeDasharray={p.dash} />
      <line x1={-74} y1={76} x2={74} y2={76} stroke={p.ink} strokeWidth={SW} strokeLinecap="round" />
    </g>
  );
};

/** A software window with a table: spreadsheets, CRM records, lists, forms. */
const Sheet = ({ g, p }: { g: GlyphState; p: GlyphPalette }) => (
  <g>
    <rect x={-78} y={-64} width={156} height={128} rx={12} fill={p.fill} stroke={p.ink} strokeWidth={SW} strokeDasharray={p.dash} />
    <path d="M-78 -40 H78" stroke={p.ink} strokeWidth={4} />
    <circle cx={-62} cy={-52} r={4.5} fill={p.accent} />
    <circle cx={-48} cy={-52} r={4.5} fill={p.ink} opacity={0.45} />
    <circle cx={-34} cy={-52} r={4.5} fill={p.ink} opacity={0.45} />
    <rect x={-66} y={-32} width={132} height={14} rx={3} fill={p.accent} opacity={0.85} />
    {[-6, 14, 34].map((y, i) => (
      <g key={y} opacity={clamp(g.lines * 3 - i)}>
        <path d={`M-66 ${y} H66`} stroke={p.ink} strokeWidth={3} opacity={0.25} />
        <rect x={-66} y={y + 4} width={34} height={8} rx={2} fill={p.ink} opacity={0.55} />
        <rect x={-24} y={y + 4} width={62} height={8} rx={2} fill={p.ink} opacity={0.35} />
      </g>
    ))}
    <path d="M-30 -32 V54" stroke={p.ink} strokeWidth={2.5} opacity={0.22} />
  </g>
);

const bodies: Record<Kind, (props: { g: GlyphState; p: GlyphPalette }) => ReactElement> = {
  message: Message,
  agent: Agent,
  document: Document,
  package: Package,
  boundary: Boundary,
  sheet: Sheet,
};

/** A refusal: across a door it is a barred gate; across anything else, a strike. */
const Bar = ({ kind, k, p }: { kind: Kind; k: number; p: GlyphPalette }) => {
  if (k <= 0.01) return null;
  if (kind === 'boundary') {
    const drop = (1 - k) * -80;
    return (
      <g transform={`translate(0 ${drop})`} opacity={clamp(k * 2)}>
        <rect x={-78} y={-11} width={156} height={22} rx={11} fill={p.accent} stroke={p.dash ? p.accent : ink} strokeWidth={4} />
        <rect x={-14} y={-38} width={28} height={24} rx={5} fill={p.accent} stroke={p.dash ? p.accent : ink} strokeWidth={4} />
        <path d="M-8 -38 V-48 Q0 -58 8 -48 V-38" fill="none" stroke={p.dash ? p.accent : ink} strokeWidth={4} />
      </g>
    );
  }
  const len = 98 * k;
  return <line x1={-len * 0.72} y1={len * 0.72} x2={len * 0.72} y2={-len * 0.72} stroke={p.accent} strokeWidth={13} strokeLinecap="round" opacity={0.92} />;
};

const Seal = ({ k }: { k: number }) => {
  if (k <= 0.01) return null;
  const pop = k * (1 + 0.28 * Math.sin(k * Math.PI));
  return (
    <g transform={`translate(60 -58) scale(${pop})`}>
      <circle r={27} fill={good} stroke={paper} strokeWidth={5} />
      <path d="M-12 1 L-3 10 L13 -9" fill="none" stroke="#FFFFFF" strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
};

export const Glyph = ({ kind, g, palette = solidPalette, shadow = true }: { kind: Kind; g: GlyphState; palette?: GlyphPalette; shadow?: boolean }) => {
  const Body = bodies[kind];
  return (
    <g>
      {shadow ? (
        <g transform="translate(6 7)">
          <Body g={g} p={shadowPalette} />
        </g>
      ) : null}
      <Body g={g} p={palette} />
      <Bar kind={kind} k={g.bar} p={palette} />
      <Seal k={g.seal} />
    </g>
  );
};

export const restGlyph: GlyphState = { awake: 1, unread: 0, open: 0, seal: 0, bar: 0, door: 0, lines: 1, question: 0 };
