/**
 * Explanatory grammars other than the house glyph stage.
 * Timing comes from props the directed stage already resolved. These
 * components do not read the frame clock, so a shot that starts mid-film
 * does not replay an intro from frame zero.
 */
import type { ReactNode } from "react";
import { Img, OffthreadVideo, staticFile } from "remotion";
import { AppWindow, BookingCalendar, DataTable, FormPanel, Inbox, MetricCard, RecordCard, StatusBadge, Workflow, type MessageRow, type TableRow } from "../founding-toolset/materials";
import { materialTokens as t } from "../founding-toolset/tokens";
import type { SourceAsset } from "./spec-types";

export type GrammarRow = { id: string; label: string; state: string; outcome: string };
export type GrammarModel = {
  medium: string;
  materialId: string;
  grammar: string;
  title: string;
  facts: string[];
  rows: GrammarRow[];
  nodes: { id: string; label: string }[];
  edges: { from: string; to: string }[];
  source: SourceAsset | null;
  progress: number;
  branch: string | null;
};

const shell = (children: ReactNode) => (
  <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>{children}</div>
);

const Identity = ({ nodes }: { nodes: GrammarModel["nodes"] }) => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {nodes.slice(0, 6).map((node) => (
      <span key={node.id} style={{ fontFamily: t.type.body, fontSize: 22, fontWeight: 700, color: t.color.ink, background: t.color.paper, border: `2px solid ${t.color.ink}`, borderRadius: 999, padding: "6px 12px" }}>
        {node.label}
      </span>
    ))}
  </div>
);

const CaptureFrame = ({ model, eyebrow }: { model: GrammarModel; eyebrow: string }) => {
  const source = model.source;
  const file = source?.localPath;
  const video = file ? /\.(mp4|webm|mov)$/i.test(file) : false;
  const crop = source?.crop;
  const highlight = source?.highlight;
  const showHighlight = highlight && model.progress > 0.35;
  return (
    <AppWindow title={model.title || source?.provenance || "Source"} eyebrow={eyebrow}>
      <div style={{ position: "relative", height: 420, borderRadius: 16, overflow: "hidden", background: t.color.paper, border: `2px solid ${t.color.grid}` }}>
        {file && video ? (
          <OffthreadVideo src={staticFile(file)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : file ? (
          <Img
            src={staticFile(file)}
            style={
              crop
                ? { position: "absolute", width: `${100 / crop.width}%`, height: `${100 / crop.height}%`, left: `${(-crop.x / crop.width) * 100}%`, top: `${(-crop.y / crop.height) * 100}%`, objectFit: "fill" }
                : { width: "100%", height: "100%", objectFit: "cover" }
            }
          />
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center", fontFamily: t.type.body, fontSize: 32, fontWeight: 700, color: t.color.inkSoft }}>
            {source ? source.provenance : "No source was supplied for this shot."}
          </div>
        )}
        {showHighlight ? (
          <div style={{ position: "absolute", left: `${highlight.x * 100}%`, top: `${highlight.y * 100}%`, width: `${highlight.width * 100}%`, height: `${highlight.height * 100}%`, border: `5px solid ${t.color.accent}`, borderRadius: 12, boxShadow: "0 0 0 6px rgba(226,91,58,0.18)" }}>
            <span style={{ position: "absolute", left: 0, top: -40, background: t.color.accent, color: "#fff", fontFamily: t.type.body, fontSize: 22, fontWeight: 800, padding: "4px 10px", borderRadius: 8 }}>{highlight.label}</span>
          </div>
        ) : null}
        {model.medium === "screen_recording_scene" ? (
          <div style={{ position: "absolute", left: 16, right: 16, bottom: 14, height: 10, borderRadius: 10, background: "rgba(28,33,43,0.25)" }}>
            <div style={{ width: `${Math.round(model.progress * 100)}%`, height: "100%", borderRadius: 10, background: t.color.accent }} />
          </div>
        ) : null}
      </div>
      {model.branch ? <StatusBadge label={`IF ${model.branch}`} tone="accent" /> : null}
    </AppWindow>
  );
};

const ProcessDiagram = ({ model }: { model: GrammarModel }) => {
  const active = model.rows.at(-1)?.id;
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 18, height: "100%" }}>
      {model.nodes.slice(0, 5).map((node, index) => (
        <div key={node.id} style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: node.id === active ? t.color.accent : t.color.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: t.type.mono, fontSize: 26, fontWeight: 700 }}>{index + 1}</div>
          <div style={{ flex: 1, padding: "16px 18px", borderRadius: 16, background: t.color.white, border: `3px solid ${node.id === active ? t.color.accent : t.color.ink}` }}>
            <div style={{ fontFamily: t.type.body, fontSize: 30, fontWeight: 800, color: t.color.ink }}>{node.label}</div>
            <div style={{ fontFamily: t.type.body, fontSize: 24, color: t.color.inkSoft, marginTop: 4 }}>{model.rows.find((row) => row.id === node.id)?.state ?? "Waiting"}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

const NumericStage = ({ model }: { model: GrammarModel }) => {
  const hero = model.facts.find((fact) => /\d/.test(fact)) ?? model.rows.at(-1)?.state ?? model.title;
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 22 }}>
      <div style={{ fontFamily: t.type.mono, fontSize: 22, letterSpacing: 1.6, color: t.color.inkSoft }}>SPOKEN FIGURE</div>
      <div style={{ fontFamily: t.type.body, fontSize: 92, fontWeight: 800, letterSpacing: -2, color: t.color.ink, lineHeight: 0.95 }}>{hero}</div>
      {model.rows.slice(-2).map((row) => (
        <MetricCard key={row.id} label={row.label} value={row.state} delta={row.outcome} tone={row.outcome === "refused" ? "bad" : row.outcome === "complete" ? "good" : "accent"} />
      ))}
    </div>
  );
};

const DocumentPage = ({ model }: { model: GrammarModel }) => (
  <div style={{ height: "100%", background: t.color.white, border: `3px solid ${t.color.ink}`, borderRadius: 8, boxShadow: t.shadow, padding: "36px 34px", display: "flex", flexDirection: "column", gap: 18 }}>
    <div style={{ fontFamily: t.type.mono, fontSize: 20, letterSpacing: 1.4, color: t.color.inkSoft }}>DOCUMENT</div>
    <div style={{ fontFamily: t.type.body, fontSize: 44, fontWeight: 800, color: t.color.ink, lineHeight: 1.05 }}>{model.title}</div>
    <div style={{ height: 3, background: t.color.ink }} />
    {(model.rows.length ? model.rows.map((row) => `${row.label}: ${row.state}`) : model.facts).slice(0, 6).map((line) => (
      <div key={line} style={{ fontFamily: t.type.body, fontSize: 30, fontWeight: 600, color: t.color.ink, borderBottom: `2px solid ${t.color.grid}`, paddingBottom: 10 }}>{line}</div>
    ))}
  </div>
);

const Conversation = ({ model }: { model: GrammarModel }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14, justifyContent: "flex-end", height: "100%" }}>
    {model.rows.slice(-4).map((row, index) => (
      <div key={row.id} style={{ alignSelf: index % 2 ? "flex-end" : "flex-start", maxWidth: "86%", background: index % 2 ? t.color.ink : t.color.white, color: index % 2 ? "#fff" : t.color.ink, border: `2px solid ${t.color.ink}`, borderRadius: index % 2 ? "22px 22px 6px 22px" : "22px 22px 22px 6px", padding: "16px 18px" }}>
        <div style={{ fontFamily: t.type.mono, fontSize: 18, opacity: 0.75 }}>{row.label}</div>
        <div style={{ fontFamily: t.type.body, fontSize: 30, fontWeight: 700, marginTop: 4 }}>{row.state}</div>
      </div>
    ))}
  </div>
);

const Comparison = ({ model }: { model: GrammarModel }) => {
  const pair = model.nodes.slice(0, 2);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, height: "100%" }}>
      {(pair.length ? pair : [{ id: "a", label: "Actual" }, { id: "b", label: "Alternative" }]).map((node, index) => {
        const row = model.rows.find((item) => item.id === node.id) ?? model.rows[index];
        return (
          <div key={node.id} style={{ background: t.color.white, border: `3px solid ${index ? t.color.accent : t.color.ink}`, borderRadius: 18, padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontFamily: t.type.mono, fontSize: 20, color: t.color.inkSoft }}>{index ? "ALTERNATIVE" : "ACTUAL"}</div>
            <div style={{ fontFamily: t.type.body, fontSize: 36, fontWeight: 800, color: t.color.ink }}>{node.label}</div>
            <div style={{ fontFamily: t.type.body, fontSize: 28, fontWeight: 650, color: t.color.inkSoft }}>{row?.state ?? "—"}</div>
          </div>
        );
      })}
    </div>
  );
};

const Timeline = ({ model }: { model: GrammarModel }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 0, justifyContent: "center" }}>
    {model.rows.slice(0, 5).map((row, index, all) => (
      <div key={row.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 22, height: 22, borderRadius: 22, background: index === all.length - 1 ? t.color.accent : t.color.ink }} />
          {index < all.length - 1 ? <div style={{ width: 4, flex: 1, minHeight: 36, background: t.color.grid }} /> : null}
        </div>
        <div style={{ paddingBottom: 18 }}>
          <div style={{ fontFamily: t.type.body, fontSize: 30, fontWeight: 800, color: t.color.ink }}>{row.label}</div>
          <div style={{ fontFamily: t.type.body, fontSize: 24, color: t.color.inkSoft }}>{row.state}</div>
        </div>
      </div>
    ))}
  </div>
);

const MapSchematic = ({ model }: { model: GrammarModel }) => {
  const pins = model.nodes.slice(0, 5);
  const spots = [
    { left: "18%", top: "30%" },
    { left: "62%", top: "22%" },
    { left: "40%", top: "58%" },
    { left: "70%", top: "68%" },
    { left: "24%", top: "74%" },
  ];
  return (
    <div style={{ position: "relative", height: "100%", borderRadius: 28, overflow: "hidden", background: "#E7EFE8", border: `3px solid ${t.color.ink}` }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${t.color.grid} 2px, transparent 2px), linear-gradient(90deg, ${t.color.grid} 2px, transparent 2px)`, backgroundSize: "72px 72px", opacity: 0.7 }} />
      <div style={{ position: "absolute", left: 20, top: 18, fontFamily: t.type.mono, fontSize: 20, letterSpacing: 1.4, color: t.color.inkSoft }}>SCHEMATIC</div>
      {pins.map((pin, index) => (
        <div key={pin.id} style={{ position: "absolute", left: spots[index].left, top: spots[index].top }}>
          <div style={{ width: 22, height: 22, borderRadius: 22, background: t.color.accent, border: "3px solid #fff" }} />
          <div style={{ marginTop: 6, background: t.color.white, borderRadius: 10, padding: "4px 8px", fontFamily: t.type.body, fontSize: 22, fontWeight: 800, color: t.color.ink }}>{pin.label}</div>
        </div>
      ))}
    </div>
  );
};

const Statement = ({ model }: { model: GrammarModel }) => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
    <div style={{ fontFamily: t.type.body, fontSize: 72, fontWeight: 800, letterSpacing: -1.5, lineHeight: 0.98, color: t.color.ink }}>{model.rows.at(-1)?.state || model.title}</div>
    <div style={{ width: `${Math.max(12, Math.round(model.progress * 100))}%`, height: 8, background: t.color.accent, borderRadius: 8 }} />
    {model.facts[0] ? <div style={{ fontFamily: t.type.body, fontSize: 30, color: t.color.inkSoft }}>{model.facts[0]}</div> : null}
  </div>
);

const Software = ({ model }: { model: GrammarModel }) => {
  const id = model.materialId;
  const rows: TableRow[] = model.rows.slice(0, 5).map((row) => ({
    id: row.id,
    cells: [row.label, row.state, row.outcome],
    tone: row.outcome === "refused" ? "bad" : row.outcome === "complete" ? "good" : "accent",
  }));
  const messages: MessageRow[] = model.rows.slice(0, 4).map((row) => ({ id: row.id, sender: row.label, subject: row.state, meta: row.outcome, unread: true }));
  let interior = <Workflow steps={(model.nodes.length ? model.nodes.map((node) => node.label) : model.facts).slice(0, 5)} active={Math.max(0, model.rows.length - 1)} />;
  if (id === "ui.crm-record" || id === "remotion-ui.kanban-move") {
    const row = model.rows.at(-1);
    interior = <RecordCard id={row?.id ?? "record"} name={row?.label ?? model.title} company={model.facts[0] ?? "Account"} status={row?.state ?? "Open"} fields={model.facts.slice(0, 4).map((fact) => ({ label: "Fact", value: fact }))} />;
  } else if (id === "ui.data-table" || id === "remotion-ui.comparison-table") {
    interior = <DataTable columns={["Name", "State", "Outcome"]} rows={rows.length ? rows : [{ id: "empty", cells: [model.title, "—", "—"] }]} selectedId={rows.at(-1)?.id} />;
  } else if (id === "ui.inbox" || id === "remotion-ui.notifications") {
    interior = <Inbox messages={messages.length ? messages : [{ id: "empty", sender: model.title, subject: "Waiting", meta: "" }]} selectedId={messages.at(-1)?.id} />;
  } else if (id.includes("calendar") || id === "ui.booking") {
    const days = (model.nodes.length ? model.nodes : model.rows.map((row) => ({ id: row.id, label: row.label }))).slice(0, 5).map((node, index) => ({ day: node.label.slice(0, 3), date: String(index + 1), slots: index === model.rows.length - 1 ? 0 : 2 }));
    interior = <BookingCalendar days={days.length ? days : [{ day: "Mon", date: "1", slots: 2 }]} selected={days[0]?.date} status={model.rows.at(-1)?.state ?? "Open"} />;
  } else if (id === "ui.form" || id === "remotion-ui.form-fill") {
    interior = <FormPanel fields={model.facts.slice(0, 4).map((fact, index) => ({ label: `Field ${index + 1}`, value: fact }))} filled={Math.min(4, model.rows.length)} status={model.rows.at(-1)?.state} />;
  } else if (id.includes("metric") || id.includes("stat") || id.includes("progress")) {
    interior = <MetricCard label={model.title} value={model.rows.at(-1)?.state ?? model.facts[0] ?? "—"} delta={model.rows.at(-1)?.outcome ?? ""} />;
  }
  return <AppWindow title={model.title} eyebrow="SOFTWARE" tabs={["Work", "Record"]} activeTab={0}>{interior}</AppWindow>;
};

const interior = (model: GrammarModel) => {
  if (model.materialId === "arsenal.text-treatment") return <Statement model={model} />;
  if (model.materialId === "arsenal.process-diagram" || model.medium === "diagram_scene") return <ProcessDiagram model={model} />;
  if (model.materialId === "arsenal.numeric-stage" || model.medium === "data_visualization_scene") return <NumericStage model={model} />;
  if (model.materialId === "arsenal.document-page" || model.medium === "document_scene") return <DocumentPage model={model} />;
  if (model.materialId === "arsenal.conversation") return <Conversation model={model} />;
  if (model.materialId === "arsenal.comparison-split") return <Comparison model={model} />;
  if (model.materialId === "arsenal.timeline-rail" || model.grammar === "timeline") return <Timeline model={model} />;
  if (model.materialId === "arsenal.map-schematic") return <MapSchematic model={model} />;
  if (model.materialId === "arsenal.device-frame" || model.medium === "generated_video_shot" || model.medium === "screen_recording_scene") {
    return (
      <div style={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ width: "92%", height: "96%", border: `10px solid ${t.color.ink}`, borderRadius: 42, overflow: "hidden", background: t.color.paper, padding: 12 }}>
          <CaptureFrame model={model} eyebrow={model.medium === "generated_video_shot" ? "VIDEO" : "DEVICE"} />
        </div>
      </div>
    );
  }
  if (model.materialId.startsWith("ui.") || model.materialId.startsWith("remotion-ui.") || model.medium === "ui_component_scene") return <Software model={model} />;
  if (model.materialId === "arsenal.mixed-annotation" || model.medium === "mixed_scene") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
        <div style={{ flex: 1, minHeight: 0 }}><CaptureFrame model={model} eyebrow="MIXED" /></div>
        {model.rows.at(-1) ? <StatusBadge label={model.rows.at(-1)!.state} tone="accent" /> : null}
      </div>
    );
  }
  return <CaptureFrame model={model} eyebrow={model.medium === "screen_recording_scene" ? "RECORDING" : "CAPTURE"} />;
};

export const GrammarStage = ({ model }: { model: GrammarModel }) => (
  <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ flex: 1, minHeight: 0 }}>{shell(interior(model))}</div>
    <Identity nodes={model.nodes} />
  </div>
);
