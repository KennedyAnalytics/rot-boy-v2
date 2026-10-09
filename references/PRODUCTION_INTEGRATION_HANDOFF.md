# Production integration handoff

This file describes how the approved creative architecture is wired into the running studio, how films are rendered and checked, and where production evidence lives. It does not replace the creative architecture (`CREATIVE_SYSTEM_HANDOFF.md`). Project state and phase authority are in `MASTER_HANDOFF_AI_MOTION_GRAPHICS_STUDIO.md`.

Reading order: `MASTER_HANDOFF_AI_MOTION_GRAPHICS_STUDIO.md` → `creative-standard.md` → `CREATIVE_SYSTEM_HANDOFF.md` → this file → `MOTION_STYLE_GUIDE.md` → `STUDIO_MEMORY.md`. `grok-CURSOR_HANDOFF-v1.md` remains useful for repository history, the vendored RemotionUI library and narration internals. Its descriptions of `/api/direct`, the `Film` composition and estimated-only timing are out of date.

Start the studio with `npm run dev` (`http://127.0.0.1:8787`).

---

## 0. Current production status — 9 October 2026

Motion Choreography & Renderer Expressiveness v1 passed. Its acceptance record is `out/motion-v1/ACCEPTANCE_EVIDENCE.md`.

### Baselines

| Role | Path |
| --- | --- |
| Authoritative Mara baseline | `out/motion-v1/mara/film.mp4` |
| Direct before-comparison (Continuity v1) | `out/continuity-v1/mara-v1-production/film.mp4` |
| Verified cold-script fixture (Larkspur) | `out/continuity-v1/larkspur-verified/film.mp4` |
| Preserved regression baselines | `out/prod-harden/film.mp4`, `out/prod-cold/film.mp4` |
| Historical | `out/prod-gate/` (gate), `out/prod-builder/` (negative gap-leak fixture), `out/prod-supplied/` (first production run) |

Do not overwrite a baseline. New work writes new output paths.

### Production wiring

- `/api/direct` → `directStructure` (`server/direct-structure.ts`). Order: structure → whole-film `FilmDirection` (`src/film/direction.ts`, trace `film-direction.json`) → beats → stages. Beats and stages receive the typed direction.
- `/api/voice` → `synthesize` (`server/voice.ts`) records Eric A. `timeChapters` (`src/timing.ts`) aligns the recorded words. Recorded alignment is the clock.
- Composition `StructuredFilm` (`src/film/StructuredFilm.tsx`):
  - When the plan carries a `FilmDirection`, one persistent `DirectedStage` renders the whole film.
  - Otherwise the chapter-stage path renders library, procedural, bespoke and action pieces, with library state gated to aligned cues (`src/film/state-cues.ts`).
- `DirectedStage` (`src/film/DirectedStage.tsx`) only draws the scene returned by `sceneAt(time)` from the pure choreography layer (`src/film/choreography.ts`). Objects are drawn by `src/film/glyphs.tsx`.
- `holdAt` (`src/film/hold.ts`): silence holds the latest started beat and chapter.
- `layoutFor` (`src/film/layers.tsx`) owns chrome, presenter and caption placement. The choreography layer owns stage-local placement from typed shot intent.
- `scripts/produce.ts` is the same sequence from the command line. `REUSE_PROPS` reuses an approved recording.

### Rendering

- Studio route `/api/render` → `server/render.ts`: a single-pass render that bundles on every render. It does not remove its bundle afterwards and has no chunked mode.
- `scripts/render-continuity.ts <props> <out.mp4>`: evidence renders with production fonts and a JPEG intermediate, CRF 16. It removes its own bundle. When disk is constrained, these are supported production paths:
  - `--chunk-frames=N`: video renders in N-frame segments whose frame caches are released per segment. Audio renders once and is stream-copied together with the video.
  - `--public-subset`: bundles only the film's narration plus shared `character/`, `sfx/` and `illustrations/` assets, instead of every job's audio.
  - Named cleanup: a render removes only its own intermediates. Other sessions' temporary files are not deleted without owner approval.
- `scripts/render-stills.ts`: production stills at chosen times, for repair loops. Not acceptance evidence on its own.

### QC tiers

| Tier | Tooling |
| --- | --- |
| 1 — technical | `scripts/technical-qc.ts` |
| 2 — deterministic | `scripts/conform-plan.ts` (gaps, cues, presenter bounds against `reels` / `tiktok` profiles); `scripts/audit-continuity-candidate.ts` (script, audio and alignment preservation, cue regressions); `scripts/gap-regression.ts`; **`scripts/audit-motion.ts`** — permanent for directed films: per-frame state truth, cue ≤ launch ≤ land < next cue, shape prerequisites, IF/RECAP scoping, carry identity, presenter bounds; its `--self-test` mutation check must stay detectable |
| 3 — vision | `scripts/inspect-render.ts` (gap and targeted phone frames); `scripts/compare-continuity.ts` (G01–G13 before/after); `scripts/compare-motion.ts` with `scripts/motion-evidence.py` (ordered before/after motion sequences). Real authenticated providers only (`server/vision.ts`). Provider, model, request ID and raw response are kept. Counts are evidence, not calibrated scores. Flags are adjudicated against saved frames and recorded cues. |

`scripts/motion-plan.ts` prints the derived motion plan (shapes, launch and land times, layout epochs) for a directed film.

### Known production limits

- The studio `/api/render` route does not yet use the disk-safe render paths or bundle cleanup.
- Anthropic API credits were exhausted during the last two phases. The configured OpenAI provider supplied the Tier 3 reviews, with provenance recorded.
- The non-blocking visual limits recorded at Motion v1 acceptance are listed in `MASTER_HANDOFF_AI_MOTION_GRAPHICS_STUDIO.md` §9.

### Next approved phase

**Real-Production Generalization & Delivery Readiness**: the next genuine studio script through this unchanged path. Constraints are in `MASTER_HANDOFF_AI_MOTION_GRAPHICS_STUDIO.md` §0. Not started.

---

## 1. Production behavior

- A finished script is preserved. `needsNarration` in `src/director/brief.ts` treats input as a topic or outline only when it has two or more bullets, fewer than 45 words, or fewer than three sentence-ending marks. Anything longer is the narration.
- A topic or outline goes to `POST /api/script` (`writeScript` in `server/llm.ts`, prompt `scriptSystem` in `src/director/prompt.ts`), and only then into direction.
- Eric A voice settings: `eleven_multilingual_v2`, stability 0.46, similarity 0.8, style 0.2, speaker boost, speed 1.05, and a 0.4s break between sentences.
- The recording is the timing authority. `realizeNarration` runs only when the recording fails, and the studio then warns that the clock is an estimate.
- Captions are `CaptionPill` in `src/film/layers.tsx`. They highlight the word whose timestamp contains the current frame.
- The final render is 1080×1920 H.264 at 30 fps, with the narration muxed as AAC.

Authoritative request path:

```
studio/App.tsx
  → POST /api/script          only when needsNarration is true
  → POST /api/direct          directStructure(): structure → FilmDirection → beats → stages
  → POST /api/voice           synthesize()
  → timeChapters()            recorded alignment (estimate only if the voice fails)
  → Player component StructuredFilm
  → POST /api/render          composition StructuredFilm → public/jobs/render-<id>/video.mp4
```

Keys are read from the process environment: `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`, and `ELEVENLABS_API_KEY`. This checkout has no `.env`. `server/dev.ts` raises the HTTP request timeout to 30 minutes, because direction is many model calls.

Presenter mode comes from direction (`lead` / `beside` / `away`). The studio control defaults to `auto`. `always` promotes `away` to `beside`; `never` sets every chapter to `away` (`applyPresenter` in `server/dev.ts`).

---

## 2. First real production test (history)

Input: the supplied overnight email-agent script (Mara, order #1042). 521 words, 61 sentences, preserved verbatim. Output: `out/prod-supplied/film.mp4`, 170.9s, 1080×1920, Eric A, 100% alignment. Trace: `public/jobs/structure-1791476662824/`. Notes: `out/prod-supplied/NOTES.md`.

That run used one immutable stage piece per chapter and annotation-only beat changes. Both limits have since been superseded by composed and bespoke stages, cue-gated library state, FilmDirection and the directed choreography stage. The run is retained as the earliest production regression baseline.

## 3. Production bugs found and fixed (history)

- **Quoted words dropped from alignment:** `wordsFromAlignment` deleted any token containing a quotation mark, so the clock drifted. Fixed by `ssmlJunk` in `server/voice.ts`, which drops only SSML break fragments.
- **Record captions truncated mid-word:** fixed with word-boundary fitting (`fitWords`) in `src/film/normalize.ts`.
- **Second render could not see new narration:** a cached bundle missed new job audio. `server/render.ts` now bundles for every render.
- **Narration-gap leak:** silence fell through to a chapter's final beat and exposed future state. Fixed by `holdAt`; regression `scripts/gap-regression.ts`.
- **Render disk exhaustion (Motion v1):** per-render bundles copied all of `public/` and were never removed, and frames were cached to disk. Fixed in `scripts/render-continuity.ts` with bundle cleanup, `--public-subset` and `--chunk-frames`.

---

## 4. What creative architecture must be preserved

`CREATIVE_SYSTEM_HANDOFF.md` is the creative architecture, and `creative-standard.md` the quality bar. Preserve:

- the persistent spine naming every chapter;
- one dominant stage — for directed films, one persistent `DirectedStage` with ID-keyed objects;
- the renderer-placed annotation layer and status chip;
- the presenter at the approved scales (`lead` 0.52, `beside` 0.42, `away` 0) and the caption pill;
- one worked example with a truthful actual / hypothetical / recap ledger;
- metaphor bindings, and a recap when the script supports one;
- recorded narration as the timing authority, and supplied scripts verbatim;
- `layoutFor` macro placement and renderer-owned stage layout, with no model coordinates;
- coverage as a hard failure;
- text fitted to word boundaries, never sliced.

---

## 5. RemotionUI role

**RemotionUI is the toolbox the AI uses to build scenes. It is not a catalog of finished scenes to select from.**

> decide the visual explanation first → then choose/build the materials needed

The structure pass describes each chapter's object in ordinary words and is forbidden from naming components. A frame is an assembly: stage, annotation, chrome, presenter. A component earns a place when it presents the shape of the information. When nothing in the toolbox has that shape, a house graphic, a bespoke diagram or a directed glyph is a construction decision, not a failed lookup.

---

## 6. Current toolbox behavior

- A chapter stage may be a library component, a house procedural graphic, a bespoke React/SVG diagram, an action exchange, or one dominant piece plus a compact supporting strip. Competing full-height stages are refused.
- Mutable library state changes only at aligned phrase cues. Autonomous component clocks are neutralized. Library state is a cue-gated snapshot, not an interpolated transition.
- A directed film renders objects, actions, branches and recap through the choreography layer with the typed motion vocabulary `traverse` / `return` / `transform` / `block` / `accumulate`.
- `presentProps` in `src/film/identity.ts` forces house theme and colours where those props exist, and blanks some helper text. That list is hand-maintained.
- `stageBox` gives portrait-reference components their own aspect at full width. Do not shrink every portrait component to fix one component's overflow.

---

## 7. Philosophy for the next agent

**Give the agent maximum creative freedom inside a strong harness, not maximum freedom on a blank canvas.**

> strong references + structured film grammar + professional tools + creative coding freedom + render-aware critique

Judge at phone width. A frame that reads at 1080 and fails at 330 is a failed frame. Repair the weak chapters; do not regenerate the whole film to fix one stage.

---

## 8. Authoritative files and paths

### Studio routing

- `server/dev.ts` — `/api/status`, `/api/script`, `/api/direct`, `/api/voice`, `/api/render`.
- `studio/App.tsx` — studio UI and `StructuredFilm` player.
- `src/director/brief.ts` — `needsNarration`.

### Structured direction

- `server/direct-structure.ts` — `directStructure`: structure, FilmDirection, beats, stages, coverage.
- `src/film/direction.ts` — `FilmDirection` types, `directionFrom` validation, `cueTime` exact-phrase cue timing, `directionSystem`.
- `src/film/structure-prompt.ts`, `src/film/structure-types.ts`, `src/film/structure-normalize.ts`.
- `src/director/prompt.ts` — `scriptSystem` (`directorSystem` there is the legacy coordinate prompt).

### Narration and timing

- `server/voice.ts` — `synthesize`, `ssmlJunk`, `wordsFromAlignment`.
- `src/timing.ts` — `timeChapters` (production clock), `alignNarration`, `realizeNarration` (estimate), `splitSentences`.

### Rendering

- `src/film/StructuredFilm.tsx` — production composition.
- `src/film/DirectedStage.tsx` — directed stage renderer.
- `src/film/choreography.ts` — motion plan, layout epochs, `sceneAt`, `presenterAt`.
- `src/film/glyphs.tsx` — designed objects with continuous state parameters.
- `src/film/state-cues.ts` — cue-gated library state.
- `src/film/layers.tsx` — `layoutFor`, `Spine`, `StatusChip`, `CaptionPill`, `PresenterLayer`, safe-area profiles.
- `src/film/hold.ts` — `holdAt`, `narrationGaps`.
- `server/render.ts` — studio render. `scripts/render-continuity.ts` — evidence and disk-safe render.
- `src/design.ts` — 1080×1920, 30 fps, paper, ink, coral.

### RemotionUI retrieval and materialization

- `src/film/retrieve.ts`, `src/film/normalize.ts`, `src/film/procedural.tsx`, `src/film/bespoke.tsx`, `src/film/action-stage.tsx`, `src/film/registry.tsx`, `src/film/catalog.json`, `src/film/stage-fit.json`, `src/film/identity.ts`.

### Presenter and character

- `Character` in `src/components/chrome.tsx`. Assets: `public/character/` (WEBM for `lead` / `beside`, PNG fallbacks). Identity source: `references/my-character/`. Do not redesign.

### Production output

- `out/motion-v1/` — current phase output and acceptance evidence. Start here.
- `out/continuity-v1/` — previous phase output and the Larkspur fixture.
- `public/jobs/structure-<timestamp>/` — direction traces. `public/jobs/voice-<timestamp>/` — recordings and `words.json`.

### Legacy, still in the tree, not the production path

Do not wire the studio back to these.

| Path | Status |
| --- | --- |
| `server/direct-visual.ts`, `src/film/prompt.ts` | Old scene-by-scene director. |
| `src/film/Film.tsx` | Old renderer. Still a registered composition; not used by the studio. |
| `src/components/chrome.tsx` → `ChapterRail`, `Caption`, `Kicker` | Superseded. `Paper` and `Character` are still used. |
| `scripts/proof-structure.ts` | Silent topic harness with estimated timing and no audio. Not production. |
| `scripts/proof-unseen.ts`, `scripts/render-unseen-stills.ts` | Tests of the old `Film` path. |
| `src/Explainer.tsx`, `src/components/scenes.tsx`, `DrawNode`, `directorSystem`, `normalizePlan`, `directFilm`, `src/director/local.ts` | Legacy coordinate pipeline. |
| `src/board/**`, `server/direct-board.ts`, composition `BoardProof` | Legacy fixed-block experiment. |
| `src/proof/ProofFrame.tsx`, composition `CompositionProof` | Hand-authored reference frame. |
| `out/structure/`, `out/f1/`, `out/f2/`, `out/r1/`–`out/r3/`, `out/s-*`, `out/unseen/` | Silent R&D renders. Not production. |

---

## 9. What the next agent should not do

- Reopen narration R&D without a new, reproducible production failure.
- Rewrite a supplied script by default.
- Revert `/api/direct`, the player or the renderer to `directVisual` / `Film`.
- Treat RemotionUI as a preset menu.
- Add script-specific or chapter-name renderer branches.
- Redesign Corporate Defector.
- Treat `scripts/proof-structure.ts` or the silent R&D films as the production path.
- Promote one film's motion constants into studio doctrine.
- Overwrite a retained baseline.
