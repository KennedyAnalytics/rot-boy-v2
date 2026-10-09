# MASTER HANDOFF — AI Motion Graphics Studio
**Date:** 2026-10-09  
**Purpose:** Source-of-truth handoff for a fresh conversation or agent.

This is the primary authority for project state, approved direction, baselines, and the next phase. Where another document conflicts with it, this file controls.

---

# 0. Current state

## Phase record

| Phase | Result | Evidence |
| --- | --- | --- |
| Structured creative architecture (R&D) | Accepted architecture | `references/CREATIVE_SYSTEM_HANDOFF.md` |
| Generalized Visual Builder | Architecture accepted; first render failed visual validation | `out/prod-builder/` (negative fixture) |
| Render Truth & Visual Action Gate | Passed | `out/prod-gate/` |
| Production Hardening & Action Registry v1 | Passed | `out/prod-harden/`, `out/prod-cold/` |
| Continuity & Film Direction v1 | Passed | `out/continuity-v1/ACCEPTANCE_EVIDENCE.md` |
| **Motion Choreography & Renderer Expressiveness v1** | **Passed and complete** | **`out/motion-v1/ACCEPTANCE_EVIDENCE.md`** (authoritative acceptance record) |

## Baseline hierarchy

1. **Authoritative Mara baseline:** `out/motion-v1/mara/film.mp4`. This is the current visual and production reference for the Mara / Order #1042 film.
2. **Direct before-comparison baseline:** `out/continuity-v1/mara-v1-production/film.mp4`. Continuity v1 Mara is preserved, uses identical props, direction, narration and alignment, and is the comparison target for Motion v1's renderer changes.
3. **Verified cold-script fixture:** `out/continuity-v1/larkspur-verified/film.mp4` (Larkspur). It is a regression fixture, not a creative benchmark. `out/motion-v1/larkspur/film.mp4` is byte-identical to it.
4. **Preserved regression baselines:** `out/prod-harden/film.mp4` (Hardening Mara) and `out/prod-cold/film.mp4` (first cold-script run).
5. **Historical evidence:** `out/prod-gate/film.mp4` (gate evidence), `out/prod-builder/film.mp4` (negative gap-leak fixture), `out/prod-supplied/film.mp4` (first production run, static stages).

Do not overwrite any baseline. New work writes new output paths.

## Next approved phase: Real-Production Generalization & Delivery Readiness

Intent: run the next genuine studio script through the unchanged production path, and generalize only what that real story proves is missing.

Governing constraints:

- No synthetic test made only to force choreography.
- No script-specific renderer branches.
- No new animation framework.
- No forced action selection; action stays chosen from the shape of what is happening.
- Add a new motion verb only when a real story exposes a reusable missing capability.
- Implement generic library-state interpolation only if the story naturally exercises it.
- Keep all three QC tiers.
- Judge visual authorship at phone scale.
- Begin the deferred music/SFX delivery track once picture structure is stable.

This phase is approved but **not started**. It begins only when the owner or Source of Truth issues its handoff.

---

# 1. What We Are Building

We are building a **local autonomous AI motion-graphics video studio**.

The system should take either:

- a topic / outline, or
- a finished script

and produce a finished **1080×1920 vertical educational explainer video** for TikTok and Instagram Reels.

The user should not have to manually:

- build a timeline
- choose every scene
- position elements
- animate objects
- choose diagrams
- manually sync captions

The system should understand the narration, decide what the viewer should see, construct the visual explanation, narrate it with Eric A, and render the final MP4.

North star:

> **The result should feel like a professionally art-directed motion-graphics video, not an AI assembling templates.**

Core creative principle:

> **The picture should explain the narration, not merely repeat it.**

---

# 2. Production path

> supplied script or generated script  
> → structure  
> → whole-film FilmDirection  
> → beats  
> → stages  
> → Eric A narration through ElevenLabs  
> → recorded word alignment  
> → `StructuredFilm` (directed stage + choreography when a FilmDirection exists)  
> → Tier 1 / Tier 2 / Tier 3 QC  
> → final 1080×1920 MP4

A finished supplied script is preserved verbatim. A topic or outline goes through the script writer first.

Start the studio with `npm run dev`. It serves `http://127.0.0.1:8787`.

---

# 3. Authoritative documents

Read in this order:

1. this file — project state, baselines, next phase;
2. `references/creative-standard.md` — the quality bar;
3. `references/CREATIVE_SYSTEM_HANDOFF.md` — the creative architecture;
4. `references/PRODUCTION_INTEGRATION_HANDOFF.md` — production wiring, render and QC paths;
5. `references/MOTION_STYLE_GUIDE.md` — G01–G13 operational quality rules;
6. `references/STUDIO_MEMORY.md` — what is promoted, and how lessons get promoted;
7. `out/motion-v1/ACCEPTANCE_EVIDENCE.md` and `out/continuity-v1/ACCEPTANCE_EVIDENCE.md` — acceptance records for the two most recent phases;
8. `references/my-character/Corporate_Defector_Character_Bible_v1.md` — character identity;
9. `references/grok-CURSOR_HANDOFF-v1.md` — repository history, vendored RemotionUI, narration implementation details.

The phase handoffs in `references/` (`Codex -OpenAI API Implementation Handoff.txt`, `claude-handoff-motion and choreogrpahy.md`) are completed phase contracts, kept as history.

---

# 4. Authoritative architecture

## Film grammar

Four separately owned layers. This grammar is not reopened.

- **Spine:** a persistent named chapter rail; active chapter coral, completed chapters green.
- **Stage:** one dominant constructed composition. For a directed film, one persistent `DirectedStage` for the whole film.
- **Annotation:** status chip and object-attached labels and states, placed by the renderer.
- **Presenter + caption:** Corporate Defector and the phrase-aligned caption pill.

Cross-layer devices: one worked example carried with a truthful state ledger, metaphor bindings, a recap where the script supports one, and explicit `actual` / `hypothetical` / `recap` modes.

## FilmDirection (Continuity v1)

Typed whole-film `FilmDirection` (`src/film/direction.ts`) is produced after structure and before beats. It records:

- the visual through-line;
- persistent objects;
- sentence-scoped exact-phrase cues;
- actual / hypothetical / recap events;
- shots with boundary intent (`carry` / `transform` / `reframe` / `reset`), composition (`detail` / `system` / `comparison` / `recap`), focus, presenter mode and recap references.

Library components with mutable state change only at aligned phrase cues (`src/film/state-cues.ts`).

## Motion choreography (Motion v1)

- **Pure choreography layer beneath `DirectedStage`** (`src/film/choreography.ts`). It consumes FilmDirection unchanged and adds no model-authored fields.
- **Deterministic `sceneAt(time)`.** The renderer and Tier 2 call the same function, so what is audited is what is drawn.
- **Persistent ID-keyed glyphs with continuous state parameters** (`src/film/glyphs.tsx`). A change of state is a physical change of the same object, not a swapped picture.
- **Executable motion vocabulary:** `traverse`, `return`, `transform`, `block`, `accumulate`. The first three are the Action Registry v1 verbs. Shapes derive from typed event structure (source, causal ancestry, target kind, mode, outcome), never from chapter or topic names.
- **Outcome vocabulary:** `progress`, `complete`, `refused`.
- **Alignment controls timing.** An action launches at or after its exact cue. Its consequence lands on arrival, before that object's next cue.
- **Carry boundaries preserve the same rendered object.** Objects move from their live position; they are not redrawn.
- **Hypothetical branches use a visibly distinct dashed treatment** that splits from, and merges back into, the actual object.
- **Recap retrieves established object IDs** instead of recreating substitutes.
- **Layout stays renderer-owned**, derived from typed shot intent. Models never supply coordinates.

## Timing and layout authority

- ElevenLabs word alignment is the production timing authority.
- `holdAt`: silence holds the latest started beat and chapter.
- `layoutFor` owns macro placement of chrome, presenter and captions. The choreography layer owns stage-local placement.

## QC

- **Tier 1:** technical/container QC (`scripts/technical-qc.ts`).
- **Tier 2:** deterministic conformance — `scripts/conform-plan.ts`, `scripts/audit-continuity-candidate.ts`, and the permanent motion audit `scripts/audit-motion.ts` with its `--self-test` mutation check.
- **Tier 3:** real vision critique with provider provenance and raw responses (`scripts/inspect-render.ts`, `scripts/compare-continuity.ts`, `scripts/compare-motion.ts`). Critic counts are evidence, not calibrated scores. Human phone-scale inspection is final authority.

## Production render paths

`scripts/render-continuity.ts` renders a full film in one pass and removes its own bundle afterwards. When disk is constrained, the supported paths are:

- `--chunk-frames=N` — chunked video, stream-copied together;
- `--public-subset` — bundle only the film's narration plus shared house assets;
- named cleanup of the script's own intermediates.

---

# 5. Corporate Defector

The Corporate Defector is a locked recurring brand character. The Character Bible is identity ground truth. Do not redesign him.

- Production assets: `corporate-defector-presenting.webm` (`lead`), `corporate-defector-tablet-idle.webm` (`beside`), static PNG fallbacks; `away` omits him.
- Placement, scale and presence are creative decisions. He should not force every scene into the same layout. He steps away when the mechanism needs the frame.
- Approved blocking (Motion v1), within existing assets only:
  - he steps out before a full-stage mechanism and back in afterwards;
  - he changes pose with a short dip rather than a cut;
  - in lead compositions, his gesture points into the open column.
- Richer pointing, gaze or performance requires new approved pose assets.

---

# 6. Narration

Voice: **Eric A + Eleven Multilingual v2**.

Settings: stability 0.46, similarity 0.8, style 0.2, speaker boost on, speed 1.05, 0.4s break between sentences.

> **The current narration implementation is the preferred working baseline.**

Do not reopen narration R&D without a new reproducible production problem. The clone's remaining source-recording quality limitation is not a pipeline defect.

> **ElevenLabs word alignment is the timing authority.** Estimated timing is only for cheap preview / R&D runs.

---

# 7. RemotionUI — Critical Principle

RemotionUI is **the toolbox the AI uses to build scenes**, not a catalog of finished scenes to select from.

> **decide the visual explanation first → then choose/build the materials needed**

Never collapse the system into script → nearest component → render. Components are **materials**, not creative answers. The builder may combine, layer, restyle, persist and animate them, use house graphics and bespoke React/SVG/Remotion, or ignore the library when another construction explains the idea better.

---

# 8. Why the current system works

Earlier approaches failed in two opposite directions:

- **Fixed menu:** a tiny component vocabulary made different ideas collapse into the same visuals.
- **Raw coordinates:** model-drawn layouts produced clipping, collisions, poor proportions and amateur output.

The current solution:

> **strong harness + professional tools + creative freedom**

The harness constrains grammar, layout ownership, coverage, timing, character identity, typography floors and safe areas. Inside it, the system decides the explanation.

> **Give the agent maximum creative freedom inside a strong harness, not maximum freedom on a blank canvas.**

Reference videos are distilled into persistent memory (`MOTION_STYLE_GUIDE.md`) so different models keep one studio identity.

---

# 9. Documented non-blocking limits (after Motion v1)

These are known limits. None of them justifies rebuilding the harness.

- Labels briefly fade during major reframes.
- Some secondary text sits near the lower edge of phone-scale readability.
- Comparison layouts can become tight when the presenter is beside them.
- Some multi-object transitions are momentarily busy.
- Tools reserves the future order position before the order arrives.
- Presenter performance is constrained by the existing approved pose assets.
- Generic library components still use cue-gated snapshots rather than interpolated prop transitions.
- Choreography is creatively proven on Mara, but not yet on a second naturally motion-driven story.
- Specialized music/SFX production is absent.
- Illustrated environments (rooms, devices, richer props) remain deferred. Do not fake them with crude rectangles.

---

# 10. Production bugs already fixed (history)

- **Alignment quote bug:** quoted words were dropped from ElevenLabs alignment and later timing drifted. Fixed by filtering only SSML break artifacts.
- **Mid-word caption truncation:** record captions were hard-sliced. Fixed by fitting on word boundaries.
- **Stale Remotion bundle:** a second render could not see new narration. Fixed by bundling for every render.
- **Narration-gap leak:** silence fell through to a chapter's final beat. Fixed by `holdAt` and covered by `scripts/gap-regression.ts`.

---

# 11. Agent Orchestration

- **ChatGPT / OpenAI:** creative engineering, visual critique, research, architecture challenge, Source-of-Truth reconciliation.
- **Codex CLI:** direct repo implementation of approved phases.
- **Claude / Opus:** high-leverage architecture, deep diagnosis, complex implementation phases. Not for routine work cheaper agents can do.
- **Cursor / Grok:** execution, integration, debugging, production runs, cold testing.
- **Future DeepSeek:** a possible low-cost worker and second opinion.

Each implementation phase returns evidence to Source of Truth. It does not self-approve or start the next phase.

Do not A/B every model yet. The goal remains: **make one system genuinely good**.

---

# 12. Important Things NOT To Do

Do not:

- return to sparse kinetic typography
- rebuild the production architecture from scratch without evidence
- reopen narration R&D without a reproducible issue
- rewrite supplied scripts by default
- treat RemotionUI as a preset menu
- constrain visuals to a tiny fixed vocabulary
- give models raw coordinates as the main creative language
- reintroduce chapter-name renderer branches
- let the character dominate every frame
- assume more animation automatically fixes weak design
- promote one film's spring, easing, duration or distance values into universal rules
- add unnecessary SaaS infrastructure
- optimize for desktop instead of phone
- silently hide missing narration coverage with generic fallback scenes
- regenerate the entire film when one chapter is weak
- expand frameworks before testing whether they improve output

---

# 13. Project Philosophy

The end-state should feel like an AI motion-design studio. The model should reason:

> “What does the viewer need to understand here?” → “What is the strongest visual explanation?” → “Which tools build it?” → construct → animate → render → critique → repair

The system standardizes quality, identity, production reliability, motion grammar and brand consistency, while leaving room for the AI to invent the actual visual answer.

---

# 14. One-Sentence Source of Truth

> **Motion Choreography & Renderer Expressiveness v1 passed: `out/motion-v1/mara/film.mp4` is the authoritative Mara baseline, the choreography layer beneath `DirectedStage` is production architecture, and the next approved (not yet started) phase is Real-Production Generalization & Delivery Readiness on a genuine new studio script through the unchanged path.**
