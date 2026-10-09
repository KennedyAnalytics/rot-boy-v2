import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve("src") },
  },
  root: path.resolve("studio"),
  publicDir: path.resolve("public"),
  server: {
    host: "127.0.0.1",
    fs: { allow: [path.resolve(".")] },
  },
});
