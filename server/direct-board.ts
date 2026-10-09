import fs from "fs";
import path from "path";
import { boardSystem } from "../src/board/prompt";
import { normalizeBoard } from "../src/board/normalize";
import { extractJson } from "../src/director/normalize";
import { splitSentences } from "../src/timing";
import { complete } from "./llm";

export const directBoard = async (script: string) => {
  const sentences = splitSentences(script);
  const passage = sentences.map((sentence, index) => `${index}. ${sentence}`).join("\n");
  const trace = path.resolve("public", "jobs", "board-proof");
  fs.mkdirSync(trace, { recursive: true });
  const ask = async (extra: string, attempt: number) => {
    const completion = await complete(boardSystem, `${extra}\n\nDirect only these sentences.\n\n${passage}`, 6000);
    fs.writeFileSync(path.join(trace, `reply-${attempt}.txt`), completion.text);
    return { completion, film: normalizeBoard(extractJson(completion.text), script) };
  };
  try {
    return await ask("This is the whole film.", 1);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "The film was incomplete.";
    return ask(`The last reply could not be used: ${reason}. Cover every numbered sentence with a real object. Use only the block kinds named in the instructions.`, 2);
  }
};
