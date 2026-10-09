import { coral, good, ink, paper } from "../design";
import { catalogByName } from "./retrieve";

const palette = [coral, ink, "#8A8175", good, "#D64545"];

export const gateSemanticProps = (name: string, props: Record<string, unknown>, beatIndex: number) => {
  if (name === "tab-switch-panel") {
    const tabs = Array.isArray(props.tabs) ? props.tabs.length : 1;
    return {
      ...props,
      startIndex: Math.min(beatIndex, Math.max(0, tabs - 1)),
      firstSwitchAtSeconds: 999,
      switchEverySeconds: 999,
    };
  }
  if (name === "notification-stack" && Array.isArray(props.toasts)) {
    return {
      ...props,
      align: "bottom-left",
      lifeSeconds: 40,
      staggerSeconds: 999,
      toasts: props.toasts.map((toast, index) => ({
        ...(toast && typeof toast === "object" ? (toast as object) : {}),
        atSeconds: index <= beatIndex ? 0.2 : 999,
      })),
    };
  }
  return props;
};

export const presentProps = (name: string, props: Record<string, unknown>, seconds: number) => {
  const spec = catalogByName.get(name);
  const allowed = new Set((spec?.props ?? []).map((prop) => prop.name));
  const next: Record<string, unknown> = { ...props };
  if (allowed.has("theme")) next.theme = "light";
  if (allowed.has("backgroundColor")) next.backgroundColor = paper;
  if (allowed.has("accentColor")) next.accentColor = coral;
  if (allowed.has("validColor")) next.validColor = good;
  if (allowed.has("speed")) {
    const explicit = Number(props.speed);
    const speed = Number.isFinite(explicit) && explicit > 0 ? explicit : 3.3 / Math.max(seconds, 2.4);
    next.speed = Math.max(0.6, Math.min(1.25, Number(speed.toFixed(2))));
  }
  if (allowed.has("colors") && Array.isArray(next.colors)) {
    next.colors = (next.colors as unknown[]).map((_, index) => palette[index % palette.length]);
  }
  for (const name of ["subtitle", "helper", "footnote"]) {
    if (allowed.has(name) && (next[name] == null || next[name] === "")) next[name] = "";
  }
  return next;
};
