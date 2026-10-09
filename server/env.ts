import fs from "fs";
import path from "path";

export const loadEnv = () => {
  const file = path.resolve(".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
};

export const llmProvider = (): "anthropic" | "openai" | null => {
  // An explicit choice wins over key presence (a key can exist without credit).
  const chosen = process.env.LLM_PROVIDER;
  if (chosen === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (chosen === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
};
