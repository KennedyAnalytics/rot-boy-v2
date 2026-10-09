/**
 * Executable visual contract shared by planning, the renderer, and capture.
 * One FilmSpec is the creative source of truth. These types are the part of
 * that contract the picture engine reads while it draws.
 */

export const VISUAL_MEDIUMS = [
  "house_graphic",
  "ui_component_scene",
  "captured_interface",
  "captured_website",
  "screenshot_scene",
  "screen_recording_scene",
  "diagram_scene",
  "data_visualization_scene",
  "document_scene",
  "generated_image_scene",
  "generated_video_shot",
  "real_world_image_scene",
  "mixed_scene",
] as const;

export type VisualMedium = (typeof VISUAL_MEDIUMS)[number];

export const CAPTURE_MEDIUMS: readonly VisualMedium[] = [
  "captured_interface",
  "captured_website",
  "screenshot_scene",
  "screen_recording_scene",
  "generated_image_scene",
  "generated_video_shot",
  "real_world_image_scene",
  "mixed_scene",
];

export type SourceKind = "screenshot" | "webpage" | "interface" | "recording" | "image" | "video" | "document";

/** Crop and highlight are fractions of the captured frame, origin top-left. */
export type SourceBox = { x: number; y: number; width: number; height: number };

export type SourceAsset = {
  id: string;
  kind: SourceKind;
  url: string | null;
  /** Path relative to public/, or null when the asset has not been acquired. */
  localPath: string | null;
  provenance: string;
  crop: SourceBox | null;
  highlight: (SourceBox & { label: string }) | null;
};

export type ShotExecution = {
  chapterId: string;
  phrase: string;
  sentence: number;
  medium: VisualMedium;
  materialId: string;
  sourceId: string | null;
  /** Explanatory grammar. Consecutive shots may repeat one only when the story asks for it. */
  grammar: string;
  intentionalRepeat: boolean;
  repeatReason: string | null;
};
