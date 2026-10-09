import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";

const archivo = loadArchivo("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

const mono = loadMono("normal", {
  weights: ["500", "600"],
  subsets: ["latin"],
});

export const fontFamily = archivo.fontFamily;
export const monoFamily = mono.fontFamily;

export const ink = "#1C212B";
export const inkSoft = "#5C6570";
export const paper = "#F3F0E6";
export const grid = "#E4DDD0";
export const card = "#FBF9F4";
export const line = "#1C212B";
export const coral = "#E25B3A";
export const good = "#2F8F5B";
export const bad = "#D64545";
export const mute = "#8B938C";
export const captionDim = "#B7BDC7";

export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;
