import path from "node:path";
import { Config } from "@remotion/cli/config";

Config.setEntryPoint("./src/index.ts");
Config.setPublicDir("./public");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

export const withAlias = <T extends { resolve?: { alias?: unknown } }>(current: T): T => {
  const previous = current.resolve?.alias;
  const alias = {
    ...(previous && typeof previous === "object" && !Array.isArray(previous) ? previous : {}),
    "@": path.resolve("src"),
  };
  return { ...current, resolve: { ...current.resolve, alias } };
};

Config.overrideWebpackConfig((current) => withAlias(current));
