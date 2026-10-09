# Motion studio: build, keep, or replace

Independent architecture and economics review. 9 October 2026.

Evidence is the repository and `out/live-v1/llm-provenance.jsonl` (83 calls, last line 2026-10-09 16:40:32 UTC). List prices are OpenAI standard gpt-5.6-sol rates as published: $4 / $0.40 / $5 / $20 per million input, cached input, cache-write, and output tokens. Reasoning tokens are already inside output tokens. This is not an invoice.

**Verdict.** Do not rebuild this studio as the same chain of model calls. Keep the picture system. The film people can see is one frontier plan (`FilmDirection`) drawn by deterministic Remotion code (`DirectedStage`, `sceneAt`, house glyphs). The studio still pays gpt-5.6-sol at high reasoning effort for per-chapter beats and stage picks that `StructuredFilm` does not draw once `plan.direction` exists. That is the main economic defect. It is not a multi-agent system, and n8n would not fix it.

| Figure | Value |
| --- | --- |
| Logged list-price, all 83 calls | $11.76 |
| Morning production window | $8.45 |
| Share of output tokens that are reasoning | about 70% |
| Full 346 s render, local Remotion | about 11 min |

Nothing in the production code was changed to produce this review.

---

## 1. How a supplied script actually becomes an MP4

Entry point is `scripts/produce.ts`. It requires the Express studio in `server/dev.ts` on `127.0.0.1:8787`. A finished script is refused if it looks like a topic. Markdown emphasis is stripped. The spoken words must survive unchanged. There is no queue, no workflow engine, and no agent-to-agent channel. A person or a coding assistant runs the later scripts by hand.

| Step | What runs | Kind | Drawn in live-v1? |
| --- | --- | --- | --- |
| 1. Structure | One gpt-5.6-sol call, whole script. Spine, example, chapter sentence ranges. Up to 3 attempts. | Model | Spine, example chip, chapter clock |
| 2. FilmDirection | One gpt-5.6-sol call. Objects, events, shots, through-line. Up to 3 attempts; failures resend the previous JSON. | Model | Yes. This is the picture. |
| 3. Beats | One call per chapter, serial. Pills, cards, stamps, beat grouping. | Model | Grouping feeds cue windows. Annotations are not painted. |
| 4. Stage | One call per chapter, serial, optional retry. Picks a founding-toolset component. | Model | No. Bypassed when direction exists. |
| 5. inspectPlan | Deterministic checks on pieces and beats. May re-call beats and stage for up to 4 chapters. | Code, then more model calls | Repair targets the unused layer. |
| 6. Voice | ElevenLabs Eric A, with-timestamps, model `eleven_multilingual_v2`. SSML breaks, plain-text fallback. | API | Yes. The clock. |
| 7. timeChapters | Word alignment becomes beat and chapter times. An estimate clock aborts the run. | Code | Yes. |
| 8. Render | `scripts/render-continuity.ts`. Remotion `StructuredFilm`. If `plan.direction` is set, only `DirectedStage`. | Code | Yes. |
| 9. Tier 1 and 2 | technical-qc, motion audit, caption audit, conformance. ffmpeg and frame checks. | Code | Gate, not a picture. |
| 10. Tier 3 | `scripts/review-film.ts`. Phone strips, batches of 3, gpt-5.6-sol high vision. Writes defects. Does not patch. | Model | Judgment only. |
| 11. Repair | `scripts/repair-direction.ts` applies a hand-written JSON patch. Narration splice is a separate script. | Code; author outside runtime | Yes, after a human or coding agent writes the patch. |

Sources: `scripts/produce.ts`, `server/direct-structure.ts`, `server/dev.ts`, `src/film/StructuredFilm.tsx` (the branch that renders `DirectedStage` when direction exists), `out/live-v1/ACCEPTANCE_EVIDENCE.md`.

```
Script
  ├─ Structure call ── Beats + stage calls     (stored on the plan, not painted)
  └─ FilmDirection ── DirectedStage ── MP4      (this is the picture)
```

## 2. Runtime reasoning inventory

These roles share one provider switch (`LLM_PROVIDER`), one model (`OPENAI_MODEL=gpt-5.6-sol`), and one effort (`OPENAI_REASONING_EFFORT=high`). They differ by system prompt. They never talk to each other. The next role reads a file or a JSON field.

Development tools that edited the repo (Claude Code, Codex, Cursor agents) are outside this list. On this run they became the repair author after API credits died. That was an accident, not a designed runtime role.

| Role | Prompt | Context | Contract | Frontier? | Concurrent? |
| --- | --- | --- | --- | --- | --- |
| Structure director | `structureSystem` | Full numbered script, style rules, notes | Chapters that partition every sentence | Useful, not the picture | Must finish before FilmDirection |
| Film director | `directionSystem` | Script, structure, creator notes, renderer channel list | FilmDirection v1: objects, events, shots | Yes. This is the creative spend. | After structure. One call. |
| Beat director | `beatSystem` | One chapter, style rules, a slice of FilmDirection | Annotation slots and beat ranges | No. Slots are not drawn. | Serial per chapter today |
| Stage picker | `stageSystem` | Chapter brief, founding shortlist, full direction JSON in the notes | One component or graphic | No. Not drawn on this path. | Serial; includes the whole direction payload |
| Plan critic | `inspectPlan` | Chapters in memory | Defect list. No model. | Code | Instant |
| Vision critic | `review-film.ts` rubric | 330 px strip plus the words spoken in that span | Verdicts and defects. No patch. | Judgment yes. Sol-high on every strip is excess. | 3 at a time |
| Narration | ElevenLabs voice settings | Full script | Audio plus word times | Voice API, not an LLM | Could start with the script; currently waits |
| Repair author | None in runtime | Critic notes, the human or coding agent | `direction-repair.json` | Outside the product | Manual |

## 3. What actually orchestrates

`produce.ts` is a straight HTTP sequence: status, `/api/direct`, `/api/voice`, local timing, `/api/render`. `directStructure` is a `for` loop. Render progress is polled every 5 seconds. After that, separate commands render, audit, review, patch, and mix.

The OpenAI Responses client polls up to 45 minutes. The Express server request timeout is 30 minutes. A long FilmDirection call can outlive the HTTP request that started it. Provenance is appended only when `LLM_PROVENANCE_LOG` is set, and only for the Responses API.

## 4. Logged gpt-5.6-sol spend

Every completed call in the provenance log is `gpt-5.6-sol`, effort `high`, Responses API, `background: true`. Purpose is only `direction` or `vision`. The log cannot name structure versus beats versus stage. The slice labels below are reconstructed from token shape and timestamps, checked against `studio.log` and `studio-4.log`.

Cache-write tokens partition input (they almost equal uncached input). They are priced at $5 per million, not added on top of the $4 input rate. Cached hits were about 7% in the morning.

| Block | List-price USD |
| --- | --- |
| Direction, morning | $7.28 |
| Vision, morning | $1.17 |
| Vision, afternoon | $3.31 |
| **All 83 calls** | **$11.76** |

Afternoon rows are the later critic continuation (final / final2 / final3 strips), all vision.

### Where the morning $7.28 of direction went

| Slice | Calls | List price | Inference |
| --- | --- | --- | --- |
| Probe | 2 | about $0 | 6 s |
| Natural pass, used | 16 | $3.03 | 25.1 min |
| c1 attempts that did not ship | 14 | $2.81 | included in the morning window |
| c1 pass that rendered | 14 | $2.30 | through 08:30 UTC |

### Output tokens, reasoning versus visible JSON

Thousands of tokens.

| Block | Reasoning | Visible output |
| --- | --- | --- |
| Direction | 201k | 92k |
| Vision, morning | 38k | 13k |
| Vision, afternoon | 111k | 38k |

Reasoning is 69% of morning output and 75% of afternoon vision output. High effort is the price and the wait.

The log does not explain a $20 invoice by itself. At these rates the file prices to $11.76. That excludes ElevenLabs, whisper-1, gpt-4o-mini-transcribe, gpt-audio-1.5, any call that died before a provenance line was written, and any other project on the same credit balance. Narration repair used those audio models; they are not in this log. A 346-second Eric A read is a small bill next to Sol. Exact dollars charged cannot be reconstructed.

## 5. Why the morning took hours

| Interval (UTC) | What the timestamps show | Class |
| --- | --- | --- |
| 07:16–07:39 | Natural direction. 16 serial Sol calls. FilmDirection itself was 205 s and 22k output tokens. | Structural |
| 07:39–07:50 | Natural render. `film.mp4` mtime 07:50. About 11 minutes for 10,374 frames at concurrency 4, CRF 16, JPEG 95. | Structural for this length |
| 07:55–08:30 | c1 re-direction overlapped the natural vision review. Three FilmDirection attempts (216 s, 148 s, 155 s) resending about 18k input tokens, then a fresh run that succeeded. | Accidental retries plus a full second plan |
| 08:30–08:41 | c1 render, again about 11 minutes. | Structural |
| 08:41–09:35 | c2 picture repair, then c3/c4/c5 full re-renders to tune a mix, then a fast loudness master that copied the video stream. | Mix re-renders are accidental |
| 15:40–16:40 | 32 more vision calls, about 36 minutes of inference, plus c6 and c7 renders. The critic was still writing at the end of this read. | Repeated review |

Structural waits: high-effort reasoning on every call, chapters processed one at a time, voice only after direction returns, critic only after a full encode, and a 346-second frame render.

Accidental waits: validation retries that paste the failed FilmDirection back into the prompt, a second full direction because the first c1 plan failed three times, four-plus vision passes over overlapping strips (hook, first 30 seconds, and chapter 1 cover the same opening), and re-encoding the picture to change audio gain.

## 6. Duplication

| Repeated work | Evidence |
| --- | --- |
| Four creative passes over one script | structure, FilmDirection, beats, stage. The last two do not paint when direction is set. |
| Stage prompt carries the entire FilmDirection | Chapter calls jump from about 8k to about 12–18k input tokens. Same objects the director just wrote. |
| Failed direction is sent back wholesale | `direct-structure.ts` slices the previous reply to 60,000 characters and asks for a full rewrite. |
| High effort on slot filling | Beat and stage calls still spend 4k–9k reasoning tokens and 40–140 seconds. |
| Overlapping critic strips | hook-0-3s, first-30s, and chapter-01 are three Sol vision calls on one opening. |
| Same film reviewed many times | Natural (8), c1 (3 completed, 3 credit failures), then afternoon batches totaling 32 calls. |
| Picture encoded to audition a mix | c3, c4, c5 share the c2 picture (acceptance note: PSNR 77 dB) and each took a full render. |
| Founding-toolset retrieval on a path the renderer skips | `stageFor` shortlists materials. `DirectedStage` draws the six glyph kinds. |

## 7. Expensive reasoning that earned its place

The natural FilmDirection call (205 seconds, 22,381 output tokens, about $0.50 at list price) is the creative act: a roofing through-line, stable object ids, hypothetical branches, and a sheet that types rows on the spoken phrase. The acceptance note is explicit that gpt-5.6-sol caught two blocking state-truth conflicts the deterministic audits passed, because those audits check timing, not meaning. A critic that sees frames is worth keeping. Running that critic at Sol-high, on overlapping strips, four times, is not.

| Keep paying for | Stop paying Sol-high for |
| --- | --- |
| One whole-film FilmDirection, with the renderer contract in the prompt | Per-chapter beat annotations |
| One independent frame review when Tier 2 is green and a human has not looked | Per-chapter component picking on the directed path |
| A targeted JSON patch when the critic names a real defect | Re-sending an entire rejected FilmDirection as the next prompt |
| ElevenLabs word alignment as the clock | A second full direction because the first attempt failed validation |

## 8. Storyboard layer

A new storyboard stage would add cost. The studio already has two planners before anything is drawn. Structure is the chapter outline. FilmDirection is the storyboard: objects, cues, shots, and the through-line, written with the execution limits in `directionSystem` (six kinds, phrase must occur in the sentence, max six objects a shot, no coordinates). The founding toolset is not what that prompt spends its freedom on. The prompt spends it on glyph kinds the renderer can actually perform.

Use FilmDirection as the storyboard. Do not add a third planner. It already cuts wasted scene construction when it is the only plan the renderer obeys. It reduces downstream reasoning only if beats and stage leave the hot path. It improves coherence because one call owns identity across chapters. Another model pass in front of it would repeat the script and the tool list at frontier prices.

The useful gap is narrower. Structure and FilmDirection could be one call. Beat boundaries can be one sentence each, in code, because `cueTime` already scopes a phrase to the sentence inside the beat. Stage selection matters again only if a future film paints founding-toolset UI inside a shot. That choice can be a field on the shot, filled by the same FilmDirection call, validated against `foundingMaterials`.

## 9. If starting over

Same outcome: paste a finished script, optionally a storyboard, press Generate, receive a 1080×1920 narration-driven explainer of about 90–120 seconds, with no timeline edit. The picture stays programmatic. Generated video clips do not keep a lead, a machine, and a spreadsheet as the same objects for two minutes.

| Stage | Role | Model | Frontier? | Parallel? |
| --- | --- | --- | --- | --- |
| Plan | One FilmDirection. An optional user storyboard is validated, not rewritten, where it already matches the script. | gpt-5.6-sol, high or medium, once | Yes | Voice starts at the same time |
| Narration | Eric A, timestamps | ElevenLabs | Voice vendor | With planning |
| Clock and captions | Align words, phrase chunks, cue times | Code | No | After voice returns |
| Picture | DirectedStage, glyphs, founding UI only when a shot names a material id | Remotion, local | No | After plan and clock |
| Sound | Event cues plus a bed, mixed in ffmpeg against the narration stem | Code | No | Audio mix after picture encode; video stream copied |
| QC | Tier 1 and Tier 2 | Code | No | On the encode |
| Review | One contact sheet plus hook stills. Defects only. No automatic full re-plan. | gpt-5.6-luna or terra, medium | Judgment, cheap | After stills exist |
| Repair | JSON patch, validator, one re-render | Sol only if the patch itself needs a creative rewrite | Rare | After a real defect |

### Orchestration

Keep a single Node runner. It already speaks Remotion, ffmpeg, and the validators. Give it a run folder: inputs, one plan, token lines with a stage name, render seconds, and a status. Retries belong on the FilmDirection validator, with the error string and without pasting the whole failed JSON back in. Chapters do not need a model fan-out once beats are code.

n8n, Temporal, and a queue are a poor fit at two films a day. The failure modes are long reasoning calls and a local renderer, which a visual workflow tool handles worse than a script: 45-minute polls, a webpack bundle of `public/`, and a typed patch validator. Temporal earns its place if many films run unattended and a crash must resume mid-render. That is not the current constraint. The constraint is paying for planners that do not draw.

## 10. Commercial stack, if this repo had never been built

A realistic creator stack is ElevenLabs or a similar cloned voice, a caption tool, and either a motion template product or a generated-video product. Template tools ship faster and cheaper and look like templates. Clip generators can spend more per second than this studio and still look like B-roll: no stable object id, no cue-locked state, no phone-scale type that is the teaching.

| Job | Buy this | Where it wins | Where it loses the product |
| --- | --- | --- | --- |
| Voice | ElevenLabs | Already the right vendor | Does not design the picture |
| Captions | A caption product | Faster to a first subtitle | Phrase-accurate teaching captions are already solved in-repo |
| Picture | Runway, Kling, Veo, or similar | Texture and live-action B-roll | Identity, state, and exact on-screen words drift |
| Motion templates | CapCut, Descript, similar | Speed, price, posting | Looks assembled. Fights the teaching standard. |
| Workflow | n8n or Zapier | Glue between SaaS accounts | Cannot host this renderer or this validator |
| Labor | A motion designer in Cavalry or After Effects | Taste on a single film | Two films a day with no timeline edit is a staffing plan, not a product |

Buy the voice and the planner model. Keep the renderer. Commodity pieces are narration, the frontier model API, storage, and loudness metering. The durable piece is the directed stage: persistent objects, cue-locked state, phone layout, and audits that fail a film for showing a result before it is spoken.

## 11. What is worth preserving, and what is not

**Worth preserving**

- FilmDirection contract and `directionFrom` validation.
- `sceneAt` as the only timing authority for the picture.
- Persistent glyph identity, hypothetical ghosts, sheet rows typed on cues.
- Word-aligned captions and the Tier 2 caption audit.
- Presenter poses driven by shots, using existing art.
- Deterministic sound cues caused by events, and the measured ducking.
- Tier 1 technical QC and the motion audit.
- Script lock: the plan may not rewrite narration.

**Complexity that is not earning its keep**

- The beat and stage model loops on every directed film.
- `inspectPlan` repairs aimed at pieces the directed renderer ignores.
- High reasoning effort as a global environment switch.
- Two visual languages in one plan: glyph direction and library pieces.
- Hand-run script sequence with no run ledger.
- Full-frame re-encode to change a mix.
- The older `directFilm` windowed director in `server/llm.ts`, unused by `produce.ts`.
- Coding agents as the fallback critic when credits run out.

## 12. Observability today

| Question | Today |
| --- | --- |
| Exact film cost | No dollar field. List price has to be computed outside the app. |
| Cost per stage | No. Every planner call is `purpose=direction`. |
| Tokens by model | Yes, for Responses API calls. One model in this file. |
| Stage duration | Inference seconds yes. Render duration is file mtime, not a field in `render-environment.json`. |
| Retry count | Inferred from repeated input sizes. Not labeled. |
| Repair-loop cost | The afternoon vision block is separable by timestamp. The patch author is unlogged. |
| Narration cost and time | Not in this log. |
| Which candidate a call belongs to | No film id on the line. Overlapping c1 direction and natural vision share one file. |

## 13. Steady-state economics

Target: 90–120 second films, about 60 a month.

live-v1 was a 346-second, 116-sentence research film with a full re-direction, narration splice, five picture encodes for a mix, and repeated critics. Multiplying its $11.76 by 60 describes a research month, not a publishing month. The figures below are steady-state production after that research, scaled from the call shape in the log. A Sol-high call has a reasoning floor of roughly one to three minutes even when the JSON is smaller. Ranges are estimates. Narration assumes a short ElevenLabs clip at roughly $0.30–$0.80, not a line item from this repo.

Estimated USD per finished 90–120 s film, one clean pass, modest retry. Render compute on the current desktop is treated as sunk.

| | As built (shorter film, unused passes still run) | Hybrid: one Sol plan, cheap critic, code beats | Commercial video gen plus voice |
| --- | --- | --- | --- |
| Model / API per film | $1.60–$2.80 | $0.45–$1.10 | $0.20–$0.50 for a thin planner |
| Narration | $0.30–$0.80 | $0.30–$0.80 | $0.30–$0.80 |
| Video or media API | $0 | $0 | $8–$18 |
| Render | Local, about 4–6 min | Local, about 4–6 min | Vendor seconds, billed above |
| Per film, clean | about $2.20–$4.00 | about $0.90–$2.00 | about $9–$20, and the wrong look |
| 60 films | about $130–$240 | about $55–$120 | about $540–$1,200 |
| Subscriptions | None required beyond API credit | Same. An ElevenLabs plan can replace per-character billing. | Video-gen plan plus voice plan, often $30–$100 before overages |

Development and research are separate. live-v1’s logged $11.76, the unlogged audio checks, and a day of coding-agent repair are research cost. They should not be in the marginal cost of film number 30.

The generated-video bar assumes on the order of $1 per 10 seconds of commercial clips. That stack still fails object continuity.

## 14. Latency for a routine two-minute film

Must stay in order: plan, then validate the JSON; voice alignment, then cue times (voice itself can overlap the plan); render after plan and clock exist; frame review after frames exist; a repair render after a patch validates.

Can overlap: narration with FilmDirection; music bed and SFX files with planning (they are already deterministic); caption chunking with planning; Tier 1 probes as soon as the encode finishes, while stills are cut for the critic.

| Path | End to end | Dominant wait |
| --- | --- | --- |
| Current code, 4 chapters, Sol-high, one critic | about 20–28 min | Serial chapter calls, then a full render, then vision |
| Hybrid, voice overlapped, one Sol plan, cheaper critic | about 8–14 min | FilmDirection reasoning, then about 4–6 min render |
| Hybrid plus a repair | about 15–22 min | Second render |

## 15. Recommendation

Retain the studio. Simplify the production path. Do not replace Remotion with a video generator, and do not wrap the pipeline in n8n.

The next production runner should do five things:

1. Generate narration while a single FilmDirection call runs.
2. Derive beats in code.
3. Render `DirectedStage`.
4. Mix audio without re-encoding the picture.
5. Send one cheap vision pass over the hook and a contact sheet, and patch only when that pass names a defect Tier 2 cannot see.

Leave founding-toolset UI for shots that explicitly ask for a software surface, chosen inside that same plan and checked against the frozen registry.

Expected steady state: about $1–$2 and about 10–15 minutes for a routine two-minute film, about $55–$120 a month at 60 films, before a voice subscription. The live-v1 morning is evidence of what Sol-high on every intermediate JSON costs. It is not the cost of the picture.
