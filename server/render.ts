import path from "path";
import { withAlias } from "../remotion.config";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { StructuredFilmProps } from "../src/film/structure-types";
import { withOwnedRenderBundle } from "./render-bundle";

export type RenderJob = {
  id: string;
  progress: number;
  done: boolean;
  error: string | null;
  url: string | null;
};

const jobs = new Map<string, RenderJob>();

export const getRender = (id: string) => jobs.get(id) ?? null;

export const renderStructuredFilm = async (
  output: string,
  props: StructuredFilmProps,
  onProgress?: (progress: number) => void,
  frameRange?: [number, number],
) => {
  // bundle() copies public/ into os.tmpdir()/remotion-webpack-bundle-*.
  // The directory is removed after success and after failure. Encode settings are unchanged.
  await withOwnedRenderBundle(
    (onDirectoryCreated) =>
      bundle({
        entryPoint: path.resolve("src/index.ts"),
        webpackOverride: (current) => withAlias(current),
        onProgress: () => undefined,
        onDirectoryCreated,
      }),
    async (url) => {
      const composition = await selectComposition({ serveUrl: url, id: "StructuredFilm", inputProps: props });
      await renderMedia({
        composition,
        serveUrl: url,
        codec: "h264",
        outputLocation: output,
        inputProps: props,
        crf: 16,
        ...(frameRange ? { frameRange } : {}),
        onProgress: ({ progress }) => onProgress?.(progress),
      });
    },
  );
};

export const startRender = (id: string, props: StructuredFilmProps) => {
  const job: RenderJob = { id, progress: 0, done: false, error: null, url: null };
  jobs.set(id, job);
  const output = path.resolve("public", "jobs", id, "video.mp4");
  void renderStructuredFilm(output, props, (progress) => {
    job.progress = progress;
  })
    .then(() => {
      job.progress = 1;
      job.done = true;
      job.url = `/jobs/${id}/video.mp4`;
    })
    .catch((error: unknown) => {
      job.error = error instanceof Error ? error.message : "Render failed.";
      job.done = true;
    });
  return job;
};
