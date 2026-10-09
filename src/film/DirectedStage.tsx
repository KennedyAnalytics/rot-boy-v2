/**
 * The directed stage. FilmDirection decides what persists, transforms,
 * carries and resets; `choreography.ts` decides how it performs; this file
 * only draws the scene it is given for the current frame.
 */
import { useMemo } from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { soundCues, type SoundCue } from './sound';
import { Character } from '../components/chrome';
import { coral, fontFamily, good, ink, inkSoft, monoFamily } from '../design';
import { buildChoreography, PLATE, presenterAt, sceneAt, TYPE, type ObjectView, type StateLabel, type TokenView } from './choreography';
import { Glyph, ghostPalette, restGlyph, solidPalette } from './glyphs';
import { layoutFor, presenterBounds, SAFE_PROFILES, Spine, StatusChip } from './layers';
import { executionFor, usesHouseGlyphs } from './film-spec';
import { GrammarStage, type GrammarModel } from './grammars';
import { holdAt } from './hold';
import type { StructuredFilmProps } from './structure-types';

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};

const stateColor = (s: StateLabel, ghost: boolean) => (ghost || s.outcome === 'refused' ? coral : s.outcome === 'complete' ? good : '#454D59');

/**
 * The state line morphs in place: the old state is struck through and lifts
 * away, then the new one rises into the same line and glows briefly.
 */
const StateLine = ({ state, size, time, ghost, emphasis }: { state: StateLabel; size: number; time: number; ghost: boolean; emphasis: boolean }) => {
  const dt = time - state.since;
  const changed = Boolean(state.prev && state.prev !== state.text);
  const strike = smooth(dt / 0.2);
  const out = smooth((dt - 0.16) / 0.24);
  const k = changed ? smooth((dt - 0.3) / 0.32) : smooth(dt / 0.35);
  const glow = emphasis ? Math.max(0, 1 - (dt - 0.3) / 1.6) * (dt > 0.3 ? 1 : 0) : 0;
  const color = stateColor(state, ghost);
  const text = state.tag === 'IF' ? `IF: ${state.text}` : state.text;
  return (
    <div style={{ position: 'relative', marginTop: 8, fontSize: size, fontWeight: 700, lineHeight: 1.1, letterSpacing: -0.3 }}>
      {changed && out < 1 ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, color: inkSoft, opacity: 1 - out, transform: `translateY(${-24 * out}px)` }}>
          <span style={{ position: 'relative' }}>
            {state.prev}
            <span style={{ position: 'absolute', left: 0, top: '52%', height: 4, width: `${strike * 100}%`, background: coral, borderRadius: 2 }} />
          </span>
        </div>
      ) : null}
      <div style={{ opacity: k, transform: `translateY(${(1 - k) * 22}px)` }}>
        {state.tag === 'RECAP' ? (
          <span style={{ fontFamily: monoFamily, fontSize: Math.round(size * 0.66), fontWeight: 600, letterSpacing: 1.5, color: inkSoft, border: `2px solid ${inkSoft}`, borderRadius: 6, padding: '1px 7px', marginRight: 10, verticalAlign: '0.12em' }}>RECAP</span>
        ) : null}
        <span style={{ color, background: glow > 0 ? `rgba(226,91,58,${0.16 * glow})` : 'transparent', borderRadius: 8, padding: '0 6px', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{text}</span>
      </div>
    </div>
  );
};

const Label = ({ view, time }: { view: ObjectView; time: number }) => {
  const type = TYPE[view.tier];
  const top = view.y + PLATE * view.s + 14;
  const strong = view.tier !== 'secondary' || view.active > 0.5;
  // A windowed sheet already shows its states as rows; the label names it and
  // keeps only an IF/RECAP tag line.
  const windowed = sheetWindowed(view);
  const detail = !windowed && view.showDetail && type.detail ? view.state?.detail ?? (view.intro || undefined) : undefined;
  const state = windowed && !view.state?.tag ? null : view.state;
  const detailK = view.state ? smooth((time - view.state.since - 0.25) / 0.4) : 1;
  // A label never clips: in a narrow cell it shrinks until its longest word fits.
  const longestWord = Math.max(...view.label.split(/\s+/).map((w) => w.length), 1);
  const labelSize = Math.min(type.label, (view.width - 24) / (longestWord * 0.6));
  return (
    <foreignObject x={view.x - view.width / 2 + view.shake} y={top} width={view.width} height={420} opacity={view.opacity * view.labelOpacity} style={{ overflow: 'visible' }}>
      <div style={{ textAlign: 'center', fontFamily, display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: 'rgba(243,240,230,0.94)', borderRadius: 12, padding: '2px 10px 6px', maxWidth: view.width }}>
          <div style={{ fontSize: labelSize, fontWeight: 800, lineHeight: 1.06, letterSpacing: -0.6, color: view.ghost ? coral : strong ? ink : '#3B424D' }}>{view.label}</div>
          {state ? <StateLine state={state} size={type.state} time={time} ghost={view.ghost} emphasis={view.tier !== 'secondary' || view.active > 0.5} /> : null}
          {detail ? <div style={{ marginTop: 10, fontSize: type.detail, fontWeight: 500, lineHeight: 1.18, color: view.ghost ? coral : '#2E3540', opacity: detailK }}>{detail}</div> : null}
        </div>
      </div>
    </foreignObject>
  );
};

const Attachment = ({ kind, index, s, time, at }: { kind: ObjectView['kind']; index: number; s: number; time: number; at: number }) => {
  const k = smooth((time - at) / 0.35);
  // Right side of the plate, away from the label below it.
  const angle = (([36, 2, 72][index % 3] ?? 36) * Math.PI) / 180;
  const r = PLATE * 0.92;
  return (
    <g transform={`translate(${Math.cos(angle) * r} ${Math.sin(angle) * r}) scale(${0.3 * k})`} opacity={k}>
      <circle r={88} fill="#FBF9F4" stroke={coral} strokeWidth={7} />
      <Glyph kind={kind} g={restGlyph} shadow={false} />
    </g>
  );
};

/** A sheet at teaching size is a real window whose rows are its own history. */
export const sheetWindowed = (view: ObjectView) => view.kind === 'sheet' && view.s >= 1.25;
const SheetWindow = ({ view, time }: { view: ObjectView; time: number }) => {
  const R = PLATE * view.s * (1 + view.squash);
  // Primary tables use their full column; type stays phone-legible.
  const primary = view.tier === 'primary';
  const w = primary ? view.width : Math.min(view.width + 20, 2.5 * R);
  const h = 2 * R;
  const ROW_H = primary ? 64 : 50;
  const fontSize = primary ? 40 : 30;
  const x0 = view.x - w / 2 + view.shake;
  const y0 = view.y - R;
  const titleH = 46;
  const capacity = Math.max(2, Math.floor((h - titleH - 14) / ROW_H));
  const rows = view.rows;
  const latest = rows.at(-1);
  const settle = latest ? smooth((time - latest.since) / 0.35) : 1;
  const target = Math.max(0, rows.length - capacity);
  const before = Math.max(0, rows.length - 1 - capacity);
  const offset = before + (target - before) * settle;
  const edge = view.ghost ? coral : view.active > 0.5 ? coral : ink;
  return (
    <g opacity={view.opacity}>
      {!view.ghost ? <rect x={x0 + 7} y={y0 + 8} width={w} height={h} rx={18} fill="rgba(28,33,43,0.13)" /> : null}
      <rect x={x0} y={y0} width={w} height={h} rx={18} fill={view.ghost ? 'rgba(251,249,244,0.75)' : '#FBF9F4'} stroke={edge} strokeWidth={view.active > 0.5 || view.ghost ? 5 : 4} strokeDasharray={view.ghost ? '14 10' : undefined} />
      <path d={`M${x0} ${y0 + titleH} H${x0 + w}`} stroke={edge} strokeWidth={3} opacity={0.6} />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={x0 + 24 + i * 20} cy={y0 + titleH / 2} r={6.5} fill={i === 0 ? coral : ink} opacity={i === 0 ? 1 : 0.35} />
      ))}
      <foreignObject x={x0 + 8} y={y0 + titleH + 6} width={w - 16} height={h - titleH - 14}>
        <div style={{ height: '100%', overflow: 'hidden', fontFamily }}>
          <div style={{ transform: `translateY(${-offset * ROW_H}px)` }}>
            {rows.map((row, i) => {
              const isLatest = i === rows.length - 1 && row.current;
              const typed = Math.ceil(row.text.length * clamp((time - row.since) / 0.45));
              const mark = smooth((time - row.since - 0.35) / 0.25);
              const markColor = row.outcome === 'refused' ? coral : row.outcome === 'complete' ? good : inkSoft;
              // A row never clips its words: a long state shrinks to fit beside its mark.
              const room = w - 16 - 26 - (row.outcome !== 'progress' ? fontSize + 10 : 0);
              const rowSize = Math.min(fontSize, room / (row.text.length * 0.56));
              return (
                <div key={row.key} style={{ height: ROW_H, display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px', borderBottom: '2px solid rgba(28,33,43,0.08)', background: isLatest ? `rgba(226,91,58,${0.13 * (1 - 0.5 * settle)})` : 'transparent', borderLeft: `6px solid ${isLatest ? coral : 'transparent'}`, color: view.ghost ? coral : isLatest ? ink : '#4A525E' }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: rowSize, fontWeight: isLatest ? 700 : 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip', textDecoration: row.outcome === 'refused' && !isLatest ? 'line-through' : 'none' }}>
                    {row.text.slice(0, typed)}
                    {isLatest && typed < row.text.length ? <span style={{ borderLeft: `3px solid ${ink}`, marginLeft: 2 }} /> : null}
                  </span>
                  {row.outcome !== 'progress' ? (
                    <span style={{ width: fontSize, height: fontSize, borderRadius: fontSize / 2, background: markColor, color: '#FFFFFF', fontSize: fontSize * 0.62, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${mark * (1 + 0.25 * Math.sin(mark * Math.PI))})`, flexShrink: 0 }}>
                      {row.outcome === 'complete' ? '✓' : '✕'}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

const ObjectGlyph = ({ view, time }: { view: ObjectView; time: number }) => {
  if (sheetWindowed(view)) return <SheetWindow view={view} time={time} />;
  const scale = view.s * (1 + view.squash + 0.05 * view.active);
  const R = PLATE;
  const ring = view.ring;
  const circumference = 2 * Math.PI * (R + 4);
  const dim = view.tier === 'secondary' && view.active < 0.5 && !view.ghost;
  return (
    <g transform={`translate(${view.x + view.shake} ${view.y}) scale(${scale})`} opacity={view.opacity}>
      {view.active > 0 && !view.ghost ? <circle r={R + 10 / scale} fill={coral} opacity={0.07 * view.active} /> : null}
      <circle r={R} fill={view.ghost ? 'rgba(251,249,244,0.6)' : '#FBF9F4'} stroke={view.ghost ? coral : '#DED6C6'} strokeWidth={(view.ghost ? 4 : 3) / Math.max(1, scale * 0.8)} strokeDasharray={view.ghost ? '10 8' : undefined} />
      {/* Constant on-screen weight: activation must not thicken with object size. */}
      {ring > 0 ? (
        <circle r={R + 3 / scale} fill="none" stroke={coral} strokeWidth={6.5 / scale} strokeLinecap="round" strokeDasharray={`${circumference * ring} ${circumference}`} transform="rotate(-90)" />
      ) : null}
      <g opacity={dim ? 0.78 : 1} transform="scale(0.98)">
        <Glyph kind={view.kind} g={view.glyph} palette={view.ghost ? ghostPalette : solidPalette} shadow={!view.ghost} />
      </g>
      {view.attachments.map((a, i) => (
        <Attachment key={`${a.kind}-${i}`} kind={a.kind} index={i} s={view.s} time={time} at={a.t} />
      ))}
    </g>
  );
};

const Token = ({ token }: { token: TokenView }) => (
  <g opacity={token.opacity}>
    <path d={token.path} fill="none" stroke={token.replay ? inkSoft : coral} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={token.dashed ? '0.025 0.02' : `${token.trail} 1`} opacity={token.dashed ? 0.55 * token.trail : 0.42} />
    <g transform={`translate(${token.x} ${token.y}) scale(${token.s})`}>
      <circle r={PLATE + 6} fill="#FBF9F4" stroke={token.replay ? inkSoft : coral} strokeWidth={9} strokeDasharray={token.dashed ? '16 12' : undefined} />
      <g transform="scale(0.92)">
        <Glyph kind={token.kind} g={restGlyph} shadow={false} palette={token.dashed && !token.replay ? ghostPalette : solidPalette} />
      </g>
    </g>
  </g>
);

const PresenterTrack = ({ layers, safeProfile }: { layers: ReturnType<typeof presenterAt>; safeProfile: 'reels' | 'tiktok' }) => (
  <>
    {layers.map((l) => (
      <div
        key={l.pose}
        style={{ position: 'absolute', left: 18, bottom: SAFE_PROFILES[safeProfile].presenterInset, transform: `translate(${l.dx}px, ${l.dy}px) scale(${l.scale})`, transformOrigin: 'bottom left', opacity: l.opacity, zIndex: 4 }}
      >
        <Character pose={l.pose === 'lead' ? 'present' : 'tablet'} motion={l.pose === 'lead' ? 'presenting' : 'tablet'} side="left" start={0} time={2} />
      </div>
    ))}
  </>
);

/** One short one-shot per performed event; the cue list comes from the motion plan. */
const SoundDesign = ({ cues }: { cues: SoundCue[] }) => (
  <>
    {cues.map((cue, i) => (
      <Sequence key={`${cue.kind}-${i}`} from={Math.max(0, Math.round(cue.at * 30))} durationInFrames={30} layout="none">
        <Audio src={staticFile(`sfx/${cue.kind}.wav`)} volume={cue.gain} />
      </Sequence>
    ))}
  </>
);

export const DirectedStage = ({ plan, words, time, sfx = false }: Pick<StructuredFilmProps, 'plan' | 'words'> & { time: number; sfx?: boolean }) => {
  const direction = plan.direction!;
  const safeProfile = plan.safeProfile ?? 'reels';
  const choreo = useMemo(() => buildChoreography(direction, words, plan.chapters, { safeProfile, durationSec: plan.durationSec }), [direction, words, plan.chapters, safeProfile, plan.durationSec]);
  const cues = useMemo(() => (sfx ? soundCues(choreo, words) : []), [choreo, sfx, words]);
  const chapter = holdAt(plan.chapters, time)!;
  const index = plan.chapters.indexOf(chapter);
  const scene = sceneAt(choreo, time, plan.chapters);
  const layout = layoutFor({ hasChip: true, hasStamp: false, hasPill: false, cardRows: 0, presenter: 'away', safeProfile, directed: true });
  const ordered = [...scene.objects].sort((a, b) => a.active - b.active || (a.tier === 'primary' ? 1 : 0) - (b.tier === 'primary' ? 1 : 0));
  const region = choreo.region;
  const epoch = holdAt(choreo.epochs, time);
  const execution = epoch ? executionFor(plan.executions, epoch.shot) : undefined;
  const house = usesHouseGlyphs(execution);
  const grammar: GrammarModel | null = !house && execution && epoch ? {
    medium: execution.medium,
    materialId: execution.materialId,
    grammar: execution.grammar,
    title: choreo.byId.get(epoch.shot.focus)?.label ?? chapter.name,
    facts: chapter.facts,
    rows: choreo.events.filter((event) => event.land <= time && event.mode !== 'hypothetical').slice(-6).map((event) => ({
      id: event.objectId,
      label: choreo.byId.get(event.objectId)?.label ?? event.objectId,
      state: event.state,
      outcome: event.outcome,
    })),
    nodes: choreo.objects.filter((object) => object.at <= time + 0.001).map((object) => ({ id: object.id, label: object.label })),
    edges: choreo.events.filter((event) => event.from && event.land <= time && event.mode === 'actual').map((event) => ({ from: event.from as string, to: event.objectId })),
    source: plan.sources?.find((source) => source.id === execution.sourceId) ?? null,
    progress: Math.min(1, Math.max(0, (time - epoch.start) / Math.max(0.4, (Number.isFinite(epoch.end) ? epoch.end : plan.durationSec) - epoch.start))),
    branch: scene.inBranch ? scene.status : null,
  } : null;
  const presenterHead = presenterAt(choreo, time, safeProfile).reduce((top, layer) => Math.min(top, presenterBounds(layer.scale, safeProfile).top), region.y1);
  const grammarHeight = Math.max(360, Math.min(region.y1, presenterHead - 28) - region.y0);
  return (
    <AbsoluteFill>
      <Spine chapters={plan.spine} active={index} />
      {plan.example && scene.status ? <StatusChip label={plan.example.name} state={scene.inBranch ? `ACTUAL: ${scene.status}` : scene.status} tone="neutral" /> : null}
      {/* Above the stage layer: objects retrieved from the spine pass behind the title. */}
      <div style={{ position: 'absolute', left: region.x0, top: layout.stageTop, right: 1080 - region.x1, fontFamily, fontSize: 44, fontWeight: 800, color: ink, lineHeight: 1.1, letterSpacing: -0.5, zIndex: 5 }}>{direction.throughLine}</div>
      {grammar ? (
        <div style={{ position: 'absolute', left: region.x0, top: region.y0, width: Math.max(280, region.x1 - region.x0), height: grammarHeight, zIndex: 3, overflow: 'hidden' }}>
          <GrammarStage model={grammar} />
        </div>
      ) : null}
      {house ? <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0, overflow: 'visible', fontFamily, zIndex: 3 }}>
        {scene.lanes ? (
          <g opacity={scene.lanes.opacity}>
            <text x={region.x0 + 4} y={region.y0 - 2} fill={inkSoft} fontFamily={monoFamily} fontSize={26} fontWeight={600} letterSpacing={2}>ACTUAL</text>
            <line x1={region.x0} x2={region.x1} y1={scene.lanes.y} y2={scene.lanes.y} stroke={coral} strokeWidth={4} strokeDasharray="14 12" />
            <g transform={`translate(${(region.x0 + region.x1) / 2} ${scene.lanes.y})`}>
              <rect x={-150} y={-26} width={300} height={52} rx={26} fill={coral} />
              <text x={0} y={11} textAnchor="middle" fill="#FFFFFF" fontSize={30} fontWeight={800} letterSpacing={1}>HYPOTHETICAL</text>
            </g>
          </g>
        ) : null}
        {scene.connectors.map((c) => (
          <path key={c.key} d={c.path} fill="none" stroke={c.hot ? coral : ink} strokeWidth={c.dashed ? 3 : 4} strokeLinecap="round" opacity={c.opacity * (c.hot ? 0.75 : 0.26)} pathLength={1} strokeDasharray={c.dashed ? '0.02 0.02' : `${c.draw} 1`} />
        ))}
        {ordered.map((v) => (
          <ObjectGlyph key={v.id} view={v} time={time} />
        ))}
        {scene.ghosts.map((v) => (
          <ObjectGlyph key={`ghost-${v.id}`} view={v} time={time} />
        ))}
        {ordered.map((v) => (
          <Label key={`label-${v.id}`} view={v} time={time} />
        ))}
        {scene.ghosts.map((v) => (
          <Label key={`ghost-label-${v.id}`} view={v} time={time} />
        ))}
        {scene.tokens.map((t) => (
          <Token key={t.key} token={t} />
        ))}
      </svg> : null}
      <PresenterTrack layers={presenterAt(choreo, time, safeProfile)} safeProfile={safeProfile} />
      {cues.length ? <SoundDesign cues={cues} /> : null}
    </AbsoluteFill>
  );
};
