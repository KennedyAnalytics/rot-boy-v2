import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useRef, useState } from "react";
import { needsNarration } from "../src/director/brief";
import { StructuredFilm } from "../src/film/StructuredFilm";
import type { StructuredPlan, TimedStructuredPlan } from "../src/film/structure-types";
import { timeChapters } from "../src/timing";
import type { CharacterMode, Word } from "../src/types";

type Status = { llm: "anthropic" | "openai" | null; voice: boolean };
type RenderState = { id: string; progress: number; done: boolean; error: string | null; url: string | null };

export const App = () => {
  const player = useRef<PlayerRef>(null);
  const [status, setStatus] = useState<Status>({ llm: null, voice: false });
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [script, setScript] = useState("");
  const [title, setTitle] = useState("");
  const [plan, setPlan] = useState<TimedStructuredPlan | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [audioFile, setAudioFile] = useState<string | null>(null);
  const [builtFrom, setBuiltFrom] = useState<string | null>(null);
  const [characterMode, setCharacterMode] = useState<CharacterMode>("auto");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [render, setRender] = useState<RenderState | null>(null);

  useEffect(() => {
    void fetch("/api/status")
      .then((response) => response.json())
      .then((body: Status) => setStatus(body))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!render || render.done) return;
    const timer = window.setInterval(() => {
      void fetch(`/api/render/${render.id}`)
        .then((response) => response.json())
        .then((body: RenderState) => setRender(body));
    }, 800);
    return () => window.clearInterval(timer);
  }, [render]);

  const post = async <T,>(url: string, body: unknown): Promise<T> => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as T & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Request failed.");
    return payload;
  };

  const make = async (source?: { topic?: string; script?: string }) => {
    const nextTopic = (source?.topic ?? topic).trim();
    const nextScript = (source?.script ?? script).trim();
    const material = nextScript || nextTopic;
    if (!material) {
      setError("Paste a script or type a topic first.");
      return;
    }
    setError(null);
    setWarnings([]);
    setRender(null);
    setPlan(null);
    try {
      let spoken = nextScript;
      let spokenTitle = title;
      if (!spoken || needsNarration(spoken)) {
        setStage("Writing the narration");
        const written = await post<{ title: string; script: string }>("/api/script", { topic: material, notes });
        spoken = written.script.trim();
        spokenTitle = written.title;
        if (!nextTopic) setTopic(spokenTitle);
        setScript(spoken);
        setTitle(spokenTitle);
      }
      setStage("Structuring the film");
      const directed = await post<{ plan: StructuredPlan; warnings: string[] }>("/api/direct", {
        script: spoken,
        notes,
        characterMode,
      });
      setStage("Recording Eric A");
      let audio: string | null = null;
      let spokenWords: Word[] | null = null;
      let voiceError: string | null = null;
      try {
        const voice = await post<{ audioFile: string; words: Word[] }>("/api/voice", { script: spoken });
        audio = voice.audioFile;
        spokenWords = voice.words;
      } catch (caught) {
        voiceError = caught instanceof Error ? caught.message : "Eric A could not record this script.";
      }
      const timed = timeChapters(directed.plan.chapters, spokenWords);
      const nextPlan: TimedStructuredPlan = {
        title: directed.plan.title,
        spine: directed.plan.spine,
        example: directed.plan.example,
        direction:directed.plan.direction,
        safeProfile:directed.plan.safeProfile,
        chapters: timed.chapters,
        durationSec: timed.durationSec,
      };
      setPlan(nextPlan);
      setWords(timed.words);
      setAudioFile(audio);
      setBuiltFrom(spoken);
      setTitle(nextPlan.title || spokenTitle);
      setWarnings([
        ...(directed.warnings ?? []),
        ...(voiceError ? [voiceError] : []),
        ...(timed.clock === "estimate" && !voiceError ? ["Timing is an estimate. Eric A did not record."] : []),
      ]);
      setActive(0);
      setStage(null);
      player.current?.seekTo(0);
    } catch (caught) {
      setStage(null);
      setError(caught instanceof Error ? caught.message : "Could not make the video.");
    }
  };

  const renderVideo = async () => {
    if (!plan) return;
    setError(null);
    setRender(null);
    try {
      const job = await post<RenderState>("/api/render", {
        plan,
        words,
        audioFile: builtFrom === script.trim() ? audioFile : null,
      });
      setRender(job);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not render.");
    }
  };

  const seek = (index: number) => {
    setActive(index);
    const chapter = plan?.chapters[index];
    if (chapter) player.current?.seekTo(Math.round(chapter.start * 30));
  };

  const stale = Boolean(plan && builtFrom && builtFrom !== script.trim());
  const busy = stage !== null;

  return (
    <div className="app">
      <section className="panel">
        <p className="kicker">Defector</p>
        <h1>Paste a script. Get a video.</h1>
        <p className="lede">
          A topic, an outline, or a finished script. A finished script is read as written. The film is structured into chapters, Eric A records it, and that recording sets the timing.
        </p>

        <label htmlFor="topic">Topic</label>
        <input id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="5 AI employees you can hire before your first human" />

        <label htmlFor="script">Script</label>
        <textarea id="script" value={script} onChange={(event) => setScript(event.target.value)} placeholder="Paste a full script, or leave this empty and use the topic." />

        <label htmlFor="notes">Notes for this video</label>
        <textarea id="notes" style={{ minHeight: 72 }} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional. Something the pictures must show, or must avoid." />

        <label htmlFor="character">Corporate Defector</label>
        <select id="character" value={characterMode} onChange={(event) => setCharacterMode(event.target.value as CharacterMode)}>
          <option value="auto">Appears when the chapter calls for him</option>
          <option value="always">In every chapter</option>
          <option value="never">Leave him out</option>
        </select>

        <div className="row">
          <button disabled={busy} onClick={() => void make()} type="button">{busy ? stage : "Make the video"}</button>
        </div>

        <div className="note">
          {status.llm ? `Direction uses ${status.llm === "anthropic" ? "Claude" : "OpenAI"}.` : "No language-model key yet. Add one to .env before making a video."}
          {status.voice ? " Eric A is available." : " Add ELEVENLABS_API_KEY to narrate."}
        </div>
        {stale ? <div className="warn">The script changed after this preview. Make the video again to design the new words.</div> : null}
        {warnings.map((warning) => <div className="warn" key={warning}>{warning}</div>)}
        {error ? <div className="error">{error}</div> : null}
      </section>

      <section className="story">
        <p className="kicker">{title || "Nothing designed yet"}</p>
        <h2 style={{ margin: "0 0 16px", letterSpacing: "-0.04em" }}>Chapters</h2>
        {plan ? (
          <>
            <p className="lede" style={{ marginBottom: 16 }}>
              {plan.spine.join("  ·  ")}
              {plan.example ? `  —  ${plan.example.name}` : ""}
            </p>
            {plan.chapters.map((chapter, index) => (
              <button className={index === active ? "scene active" : "scene"} key={chapter.id} onClick={() => seek(index)} type="button">
                <div className="meta">
                  <span>{chapter.name}{chapter.recap ? "  ·  recap" : ""}</span>
                  <span>{chapter.presenter === "away" ? "Picture only" : chapter.presenter === "lead" ? "Defector leads" : "Defector beside"}</span>
                </div>
                <p>{chapter.beats.map((beat) => beat.narration).join(" ")}</p>
                <p className="intent">{chapter.stage}</p>
                <p className="intent">
                  {chapter.built}
                  {chapter.illustrationGap ? ` · illustration later: ${chapter.illustrationGap}` : ""}
                </p>
              </button>
            ))}
          </>
        ) : <p className="lede">The chapters for your script will show up here after you make the video.</p>}
      </section>

      <aside className="stage">
        {plan ? (
          <div className="phone">
            <Player
              ref={player}
              key={`${builtFrom}-${plan.durationSec}-${audioFile ?? "silent"}`}
              component={StructuredFilm}
              inputProps={{ plan, words, audioFile }}
              durationInFrames={Math.max(30, Math.ceil(plan.durationSec * 30))}
              fps={30}
              compositionWidth={1080}
              compositionHeight={1920}
              style={{ width: "100%", height: "100%" }}
              controls
              clickToPlay
              initialFrame={0}
              acknowledgeRemotionLicense
            />
          </div>
        ) : (
          <div className="phone empty">
            <p>{busy ? stage : "Your video will play here."}</p>
            <button disabled={busy} onClick={() => void make()} type="button">{busy ? stage : "Make the video"}</button>
          </div>
        )}
        <div className="actions">
          {busy ? <div className="note">{stage}. This script is being made now.</div> : null}
          <button disabled={!plan || busy || Boolean(render && !render.done)} onClick={() => void renderVideo()} type="button">Render MP4</button>
          {render ? (
            <>
              <div className="progress"><span style={{ width: `${Math.round(render.progress * 100)}%` }} /></div>
              <div className="note">{render.error ? render.error : render.done ? "Ready to post." : `Rendering ${Math.round(render.progress * 100)}%`}</div>
              {render.url ? <a className="download" href={render.url} download>Download the video</a> : null}
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
};
