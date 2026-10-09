import { bad, card, coral, fontFamily, good, grid, ink, inkSoft, monoFamily, paper } from "../design";

/** Studio-owned visual contract. External source styling stops here. */
export const materialTokens = {
  color: { ink, inkSoft, paper, surface: card, grid, accent: coral, good, bad, white: "#FFFFFF" },
  type: { body: fontFamily, mono: monoFamily },
  space: { xs: 8, sm: 14, md: 22, lg: 32, xl: 48 },
  radius: { chip: 999, control: 10, card: 18, window: 26 },
  border: { thin: 2, strong: 3 },
  shadow: "5px 6px 0 rgba(28,33,43,0.14)",
  motion: { revealFrames: 10, stateFrames: 12, attentionFrames: 18 },
  phone: { minimumBodyPx: 28, minimumLabelPx: 24, maximumColumns: 4 },
} as const;
