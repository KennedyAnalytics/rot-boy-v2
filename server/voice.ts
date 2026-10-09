import fs from "fs";
import path from "path";
import type { Word } from "../src/types";

/**
 * Reference narration sits around 170–185 words per minute.
 * Pauses inside a thought are about 0.22–0.32s. A finished sentence lands for
 * about 0.38–0.5s. Turns between ideas reach about 0.55s, then the next
 * sentence starts. Speed stays slightly brisk so the picture has time to read
 * without the voice drifting.
 */
const VOICE_SETTINGS = {
  stability: 0.46,
  similarity_boost: 0.8,
  style: 0.2,
  use_speaker_boost: true,
};

const shapeForSpeech = (script: string) =>
  script
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .join(' <break time="0.4s" /> ');

const resolveVoiceId = async (key: string) => {
  if (process.env.ELEVENLABS_VOICE_ID) return process.env.ELEVENLABS_VOICE_ID;
  const response = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": key },
  });
  const body = (await response.json()) as { voices?: { name: string; voice_id: string }[]; detail?: { message?: string } };
  if (!response.ok) throw new Error(body.detail?.message || "Could not list ElevenLabs voices.");
  const match = body.voices?.find((voice) => /eric\s*a/i.test(voice.name));
  if (!match) throw new Error('No ElevenLabs voice named "Eric A". Set ELEVENLABS_VOICE_ID in .env.');
  return match.voice_id;
};

const wordsFromAlignment = (alignment: {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}) => {
  const words: Word[] = [];
  let token = "";
  let start = 0;
  let end = 0;
  alignment.characters.forEach((character, index) => {
    if (character === " " || character === "\n") {
      if (token.trim()) words.push({ text: token.trim(), start, end });
      token = "";
      return;
    }
    if (!token) start = alignment.character_start_times_seconds[index] ?? 0;
    token += character;
    end = alignment.character_end_times_seconds[index] ?? start;
  });
  if (token.trim()) words.push({ text: token.trim(), start, end });
  // Drop the break tag's pieces. A bare quote match also deleted narration
  // such as `"damaged` and `claim."`, and the clock drifted for the rest of the film.
  return words.filter((word) => !ssmlJunk(word.text));
};

const ssmlJunk = (text: string) => {
  const word = text.trim();
  if (!word || word === "/>" || word === ">" || word === "<") return true;
  if (/^<\/?[A-Za-z]/.test(word)) return true;
  if (/^time=/i.test(word)) return true;
  if (/^["']?\d+(?:\.\d+)?s["']?$/i.test(word)) return true;
  return false;
};

/**
 * One sentence re-voiced with the production voice and settings, with the
 * neighbouring text as prosodic context. Used only to repair a verified,
 * bounded narration defect; returns audio plus its own word alignment.
 */
export const synthesizeSegment = async (text: string, previousText: string, nextText: string) => {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("Add ELEVENLABS_API_KEY to narrate with Eric A.");
  const voiceId = await resolveVoiceId(key);
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
      voice_settings: VOICE_SETTINGS,
      speed: 1.05,
      previous_text: previousText,
      next_text: nextText,
    }),
  });
  const body = (await response.json()) as {
    audio_base64?: string;
    alignment?: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };
    detail?: { message?: string } | string;
  };
  if (!response.ok || !body.audio_base64 || !body.alignment) {
    const detail = typeof body.detail === "string" ? body.detail : body.detail?.message;
    throw new Error(detail || `ElevenLabs request failed (${response.status}).`);
  }
  return { audio: Buffer.from(body.audio_base64, "base64"), words: wordsFromAlignment(body.alignment), voiceId };
};

export const synthesize = async (script: string, jobId: string) => {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("Add ELEVENLABS_API_KEY to .env to narrate with Eric A.");
  const voiceId = await resolveVoiceId(key);
  const speak = async (text: string) => {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
        voice_settings: VOICE_SETTINGS,
        speed: 1.05,
      }),
    });
    const body = (await response.json()) as {
      audio_base64?: string;
      alignment?: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };
      detail?: { message?: string } | string;
    };
    if (!response.ok || !body.audio_base64 || !body.alignment) {
      const detail = typeof body.detail === "string" ? body.detail : body.detail?.message;
      throw new Error(detail || `ElevenLabs request failed (${response.status}).`);
    }
    return body;
  };

  let spoken: Awaited<ReturnType<typeof speak>>;
  try {
    spoken = await speak(shapeForSpeech(script));
  } catch {
    spoken = await speak(script.replace(/\s+/g, " ").trim());
  }

  if (!spoken.audio_base64 || !spoken.alignment) throw new Error("ElevenLabs returned no audio.");
  const dir = path.resolve("public", "jobs", jobId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "voice.mp3"), Buffer.from(spoken.audio_base64, "base64"));
  const words = wordsFromAlignment(spoken.alignment);
  fs.writeFileSync(path.join(dir, "words.json"), JSON.stringify(words, null, 2));
  return { audioFile: `jobs/${jobId}/voice.mp3`, words };
};
