export type MaterialSource =
  | "house"
  | "action-registry"
  | "remotion-ui"
  | "uiable-adapted"
  | "react-bits-adapted"
  | "shadcn-adapted"
  | "bespoke"
  | "arsenal";

export type MaterialCategory =
  | "record" | "card" | "message" | "inbox" | "spreadsheet" | "table"
  | "dashboard" | "metric" | "timeline" | "kanban" | "calendar" | "booking"
  | "status" | "notification" | "form" | "document" | "app-window" | "navigation"
  | "chart" | "checklist" | "comparison" | "progress" | "container"
  | "text-treatment" | "transition" | "background" | "attention-effect"
  | "workflow" | "narrative-object" | "action"
  | "browser" | "capture" | "diagram" | "conversation" | "map" | "device" | "annotation";

export type MaterialDefinition = {
  id: string;
  name: string;
  source: MaterialSource;
  categories: MaterialCategory[];
  intents: string[];
  visualRole: "stage" | "support" | "annotation" | "motion" | "foundation";
  stateful: boolean;
  choreographable: boolean;
  phoneSafe: boolean;
  persistentIdentity: boolean;
  inputs: string[];
  animation: string;
  limitations: string[];
  provenance: string;
  localPath: string;
  catalogName?: string;
};

export type MaterialQuery = {
  text?: string;
  categories?: MaterialCategory[];
  stateful?: boolean;
  choreographable?: boolean;
  phoneSafe?: boolean;
  persistentIdentity?: boolean;
  limit?: number;
};
