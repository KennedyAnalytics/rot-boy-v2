import { createContext, useContext } from "react";
import { useVideoConfig, type VideoConfig } from "remotion";

export const StageContext = createContext<{ width: number; height: number } | null>(null);

/** Library components ask for the video size. Inside a slot, that size is the slot. */
export const useStageConfig = (): VideoConfig => {
  const config = useVideoConfig();
  const stage = useContext(StageContext);
  if (!stage) return config;
  return { ...config, width: stage.width, height: stage.height };
};
