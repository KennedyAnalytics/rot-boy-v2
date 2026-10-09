# Creative system handoff

This file is the authoritative description of how a film is directed. §0 gives the current architecture as of 9 October 2026. §1 onward records the structured-film R&D that established the grammar; those sections remain the rationale and have been corrected where they described now-superseded limits. `references/grok-CURSOR_HANDOFF-v1.md` remains useful for the vendored library, the narration implementation and repository history.

`references/creative-standard.md` remains the quality bar. Nothing here replaces it. Project state and phase authority are in `MASTER_HANDOFF_AI_MOTION_GRAPHICS_STUDIO.md`.

---

## 0. Current creative architecture — 9 October 2026

The four-layer grammar is unchanged: persistent spine, one dominant stage, renderer-placed annotation, and presenter + caption. Three accepted phases built on it:

- Generalized Visual Builder;
- Continuity & Film Direction v1;
- Motion Choreography & Renderer Expressiveness v1 — passed; acceptance record `out/motion-v1/ACCEPTANCE_EVIDENCE.md`; authoritative Mara baseline `out/motion-v1/mara/film.mp4`.

### Pass ordering

> structure → whole-film FilmDirection → beats → stages → recorded alignment → render

### FilmDirection

Typed `FilmDirection` (`src/film/direction.ts`) is decided for the whole film before beats and stages. It holds:

- a short visual through-line;
- persistent objects (`message`, `agent`, `document`, `package`, `boundary`) with exact introduction cues;
- events with exact sentence-scoped phrase cues, `actual` / `hypothetical` / `recap` mode, and the Action Registry verbs `traverse` / `return` / `transform`;
- shots per chapter with boundary intent (`carry`, `transform`, `reframe`, `reset`), composition (`detail`, `system`, `comparison`, `recap`), focus, presenter mode and recap references.

The model never supplies coordinates, colours or camera values. Recap events never mutate actual history. Hypotheticals never overwrite actual state.

### Directed stage and motion choreography

When a plan carries a FilmDirection, one persistent `DirectedStage` renders the whole film. Beneath it, a pure choreography layer (`src/film/choreography.ts`) turns direction plus alignment into what is drawn:

- **One deterministic scene per frame.** `sceneAt(time)` is shared by the renderer and the Tier 2 motion audit.
- **Persistent ID-keyed glyphs** (`src/film/glyphs.tsx`) with continuous state parameters. State changes are physical changes of the same object: waking, opening, writing, a door swinging, a refusal bar, a completion seal. The state line morphs in place.
- **Executable motion vocabulary** `traverse`, `return`, `transform`, `block`, `accumulate`, with outcomes `progress`, `complete`, `refused`. Shapes derive from typed structure: source, causal ancestry, target kind, mode, and preserved negation in the state text. Never from chapter or topic names.
- **Alignment controls timing.** An action launches at or after its exact cue and its consequence lands on arrival. Waiting is allowed only for a reframing object to settle.
- **Carry preserves the rendered object.** Boundaries are staged: departures clear, carried objects rearrange from their live positions, arrivals land.
- **Hypotheticals** split a visibly distinct dashed copy from the actual object and merge it back when the branch closes.
- **Recap** retrieves established object IDs, recalls them in narrated order, and discloses each recalled state as it is narrated.
- **Layout stays renderer-owned**, derived from typed shot intent (detail, system, comparison lanes, recap), presenter-aware, with one active object at a time.
- **Presenter blocking uses existing assets only.** He yields before full-stage mechanisms, returns afterwards, and changes pose without a cut.

### Non-directed chapter stages

Chapters without a FilmDirection still use the constructed chapter stage below. Mutable library state changes only at aligned phrase cues (`src/film/state-cues.ts`). It is a cue-gated snapshot, not an interpolated transition.

### Documented non-blocking limits

These are listed once, in `MASTER_HANDOFF_AI_MOTION_GRAPHICS_STUDIO.md` §9. Choreography is creatively proven on Mara only. Generalization waits for the next real studio script, in the approved, not-yet-started phase **Real-Production Generalization & Delivery Readiness**.

### The constructed chapter stage

A chapter stage is one dominant constructed composition. It may be:

- a library component;
- a house procedural graphic;
- a bespoke React/SVG `diagram`;
- one dominant piece plus one compact supporting `record`, `set`, or `compare` strip.

Two competing library components or stacked full-height stages are still refused. `layoutFor` remains the only macro placer.

Each beat now carries:

- `mode`: `actual`, `hypothetical`, or `recap`;
- a `reveal` list;
- the narration-derived chapter clock.

Diagram nodes, record rows, and flow steps may carry `atBeat`. Conditional states are visibly labeled, such as `IF REFUND`, and do not overwrite actual case history. Component tabs and notification toasts are gated to the current beat instead of advancing on an autonomous component clock.

G01–G13 from `MOTION_STYLE_GUIDE.md` are supplied to the structure, direction, beat and stage calls as quality constraints. They do not select components or prescribe a template. Silence holds the latest started beat (`holdAt`). The action registry (`traverse`, `return`, `transform`) is selected from stage data, and there is no chapter-name renderer branch.

### Presenter assets

- `corporate-defector-presenting.webm` for `lead`;
- `corporate-defector-tablet-idle.webm` for `beside`;
- static PNG fallback;
- no presenter for `away`.

The Character Bible and canonical still remain identity ground truth.

### Critique

`server/critique.ts` performs deterministic plan critique and targeted re-beat/re-stage of weak chapters. It is a repair aid, not a visual judge. Visual judgement is Tier 3 vision critique on rendered frames and sequences, with human phone-scale inspection as final authority.

---

## 1. What this phase established

The previous system directed a film **scene by scene**: for each passage of narration it decided what to show, then picked a component for it. Every scene unmounted the picture and mounted a new one. The reference films do not work that way.

Studying the ten films in `references/Video references Good/` frame by frame showed that eight of the ten share one structure, and the two that do not (`ref-1-styleA`, `ref-2-styleA`, named as a variant) are the same grammar executed more sparsely. That structure is four independent layers:

| Layer | What it is | Lifetime |
| --- | --- | --- |
| **Spine** | A named, numbered rail of 3–6 chapters across the top. Current chapter coral, finished ones green. | The whole film |
| **Stage** | One object that presents the chapter's information. | One chapter |
| **Annotation** | Metaphor pill, callout card, verdict stamp, status chip. | One beat |
| **Presenter + caption** | The character at the bottom edge, and the caption pill. | The whole film |

Plus three devices that run across the layers:

- **A worked example** — one named case (`Invoice 2087`, `Trail Pack 28L`) introduced early, carried to the last line, visibly changing state.
- **Metaphor binding** — every abstract term bound to a physical thing and stated on screen as `TERM = THING`.
- **A recap** — the parts listed again before the close.

The system now produces all of this from a topic string. That is the architecture to preserve.

---

## 2. What is authoritative

### The structured pipeline (new, authoritative)

| File | Role |
| --- | --- |
| `src/director/prompt.ts` → `scriptSystem` | Script pass. Rewritten this phase. |
| `src/film/structure-prompt.ts` | The three creative prompts: `structureSystem`, `beatSystem`, `stageSystem`. |
| `src/film/structure-types.ts` | Plan types: `StructuredPlan`, `Chapter`, `Beat`, `WorkedExample`, `Presenter`, `Tone`. |
| `src/film/structure-normalize.ts` | Validation, coverage enforcement, text fitting, `auditStructure`. |
| `src/film/layers.tsx` | `Spine`, `StatusChip`, `MetaphorPill`, `Callout`, `PresenterLayer`, `CaptionPill`, `StageSlot`, and `layoutFor` — the only thing that decides where anything sits. |
| `src/film/procedural.tsx` | The seven house stages. Rewritten this phase. |
| `src/film/StructuredFilm.tsx` | The renderer. Composition id `StructuredFilm` in `src/Root.tsx`. |
| `server/direct-structure.ts` | `directStructure()` — runs the three passes, enforces coverage, writes traces. |
| `scripts/proof-structure.ts` | The end-to-end test entry point. |
| `src/film/stage-fit.json` | Per-component reference boxes, generated by `scripts/measure-stages.mjs`. |

### Shared, still authoritative

`src/film/retrieve.ts` (rescored this phase), `src/film/normalize.ts` (`piecesFrom`, `inferPiece`, `proceduralProps` — all touched this phase), `src/film/identity.ts`, `src/film/registry.tsx`, `src/film/catalog.json`, `src/design.ts`, `src/timing.ts`, `src/components/chrome.tsx` (`Paper`, `Character`), `server/llm.ts`, `server/voice.ts`, `server/render.ts`.

### Production path

`/api/direct` calls `directStructure`. The studio player renders `StructuredFilm`. `server/render.ts` renders composition `StructuredFilm`, and it bundles on every render so a narration file written after startup is actually in the frame. A finished script is passed through; `/api/script` still writes only when the input is a topic or outline. After Eric A records, `timeChapters` in `src/timing.ts` walks the word timestamps onto the chapters. `realizeNarration` is used only when the recording fails.

`scripts/produce.ts` is that same sequence from the command line, against a studio that is already running. `scripts/proof-structure.ts` remains the silent topic harness.

The first supplied-script production run is `out/prod-supplied/`, with notes in that folder. Two production defects showed up there and were fixed in code: the alignment filter dropped any word containing a quote, and record captions were hard-sliced mid-word. On that run, the oversized portrait stage box let a corner-anchored `notification-stack` draw over the spine. That was recorded, not redesigned.

---

## 3. The script pass

`scriptSystem` in `src/director/prompt.ts`.

**A supplied script is preserved by default.** The topic → script pass is an *additional* workflow, not a replacement. When the creator provides a finished script, that script is the narration, word for word; nothing rewrites, trims or re-paces it.

The server path already behaves this way. `needsNarration` in `src/director/brief.ts` treats input as a topic only when it has two or more bullets, fewer than 45 words, or fewer than three sentence-ending marks; anything longer is passed through. `/api/direct` takes a script and never calls the writer.

`scripts/proof-structure.ts` always calls `writeScript` because it is a topic-to-film test harness. That is a property of the test script, not of the architecture. When wiring the structured pipeline into the studio, keep the existing split: `/api/script` writes only when asked, `/api/direct` directs whatever script it is given.

A supplied script may not declare a spine, bind metaphors or carry a worked example. The structure pass handles that — it reads the mechanism and chooses the division the script actually walks, and sets `example: null` rather than inventing a case the narration never mentions. A plainer script yields a plainer film, which is correct. Do not "improve" a supplied script to make the structure pass's job easier.

**Why it changed.** The old prompt asked for 150–210 words of plain narration. The reference transcripts are 395 and 685 words at ~180 wpm (`references/txt transcripts/`), and they *are* the storyboard: they declare the count, name the metaphors, and introduce the worked example out loud. A 60-second script structurally cannot hold five chapters, a worked example and a recap, so no amount of downstream direction could reach the references.

**What it now requires**, in the prompt's own order:

1. Declare the structure in the opening — name the idea, say how many parts, say the stakes. The count is real and each part is named out loud when reached.
2. Bind every abstract term to a concrete thing in its own short sentence. These become the on-screen labels.
3. Carry one worked example the whole way. Invent the case freely; never invent research findings, market figures, benchmarks, prices or adoption rates presented as fact.
4. Walk the mechanism part by part. Sentences mostly under 18 words.
5. Recap the parts in order, then land the payoff.

Length 380–650 words. No stage directions — an early run produced "and now it turns coral", which the narrator would have read aloud; the prompt now forbids describing the picture.

Observed output: 449–534 words across nine runs, every one containing a declared count, 4–5 metaphor bindings, a named example and a recap.

---

## 4. The film-structure pass

`structureSystem`, one call over the whole script. Output normalized by `structureFrom` in `src/film/structure-normalize.ts`.

Decides, for the film: `title`, `spine` (3–6 chapter names), `example`. For each chapter: `name`, `sentenceIndexes`, `stage` (the object in ordinary words), `persists`, `changes`, `payoff`, `presenter`, `facts`, `needs`, `recap`, `illustrationGap`.

**Coverage is enforced.** Chapters must partition every sentence, contiguously, starting at sentence 0. `structureFrom` accepts only the contiguous run from the start and reports the first hole; `directStructure` retries up to three times and then **throws**. A sentence that is never directed fails the request. This is deliberate and matches the lesson in `creative-standard.md` §16 — a generic fallback scene that hides a dropped half of the narration is worse than a failure.

**The spine is the film's chapters, not the subject's parts.** A script teaching five parts usually also has an opening, a run-through, a recap and a close. The first structured run collapsed 40% of the film into one chapter; the prompt now says a chapter carrying more than about a quarter of the sentences is doing more than one job, and `auditStructure` warns above 30%.

---

## 5. Spine and chapter system

`Spine` in `src/film/layers.tsx`. A dark rail at the top, every chapter named and visible for the whole film, current one coral, finished ones green.

`ChapterRail` in `src/components/chrome.tsx` is the earlier version of the same idea and was **never used by any renderer**. It hides the label of every inactive chapter, which loses the "you are 3 of 5" reading that makes the reference rail work. Treat it as legacy.

Spine labels are capped at 10 characters by `spineLabel`, which prefers dropping a leading article over truncating a word. Longer labels squeeze their neighbours out of the rail.

---

## 6. Worked example behaviour

`WorkedExample` is `{ name, what }`. The `name` rides in a status chip beside its live state on every frame, so it is a tag, not a description — capped at 18 characters and word-fitted. An early run produced "Harbor Bakery, menu ro" on every frame.

The state is per beat (`Beat.state`, `Beat.stateTone`) and is what makes the example visibly change. Observed progression from one run:

```
WAITING → LATE → PAST DUE → WAITING → UNPAID → WAITING → APPROVED → AT REVIEW → SENT
```

If the script genuinely has no worked example the structure pass sets `example: null` rather than inventing one the narration never mentions, and `auditStructure` warns.

**Policy, as approved:** fictional named cases are allowed and encouraged when they read as examples. Fabricated real-world facts, statistics, prices or research findings are not.

---

## 7. Metaphor system

`Beat.pill` is `{ term, is }`, rendered by `MetaphorPill` as `TERM = THING` on a coral pill under the stage.

This is the single most-used teaching device in the references — `MODEL = THE BRAIN`, `THE DOOR = API`, `CONTEXT = WHAT IT CAN SEE`, `TOOLS = ITS HANDS`. The script pass writes the binding into the narration; the beat pass surfaces it on the beat where the narration first binds the term and leaves it up while that idea is live.

Budgets: `term` 18 characters, `is` 22. Anything longer is dropped rather than truncated, because the pill does not wrap.

---

## 8. Layering

### Stage

One dominant stage, mounted once and held. This is the central behavioural change from the old system, where every scene unmounted the picture. A chapter stage persists across its beats. A directed film keeps one `DirectedStage` for the whole film, and its persistent objects change state, act and move instead of being replaced (§0).

A chapter stage is chosen by `stageSystem`, one call per chapter, as one dominant composition (§0). Two full-height pieces are never stacked. That halves each one's height, and a component that scales against a portrait reference box then renders at roughly half size: an early run put a five-item list and a ledger table in one chapter, and both came out at about 7px. The references never stack two full objects either. A second fact that must be seen belongs in a compact supporting strip or the annotation layer.

**Stage sizing is per component.** `stageBox` in `layers.tsx` reads `stage-fit.json`:

- A component with a **portrait reference box** (`u = Math.min(width / A, height / B)` with `B > A`) is given a box at its own aspect at full width, centred on the region. This maximises its scale unit. `kanban-move` in the old 968×1464 slot rendered at `u = 1.63` with 26px card titles; at its own aspect it reaches `u = 2.17` with 35px titles. 25 components are in this class.
- A component with **no reference box** fills whatever box it is handed, so it gets the region exactly. 177 components are in this class. Handing one an over-tall box is how the old film spread a four-step timeline over 1200px of empty paper.

Regenerate `stage-fit.json` with `node scripts/measure-stages.mjs` after re-vendoring the library.

### Annotation

Four slots, filled per beat by `beatSystem`, placed entirely by the renderer. The model never supplies a coordinate. This is the deliberate answer to the raw-coordinate failure in `creative-standard.md` §16 — the annotation grammar is recovered without giving a model a drawing surface.

| Slot | Shape | Budget |
| --- | --- | --- |
| `state` | status chip text | 13 chars |
| `pill` | `{ term, is }` | 18 / 22 |
| `card` | `{ kicker, rows[{label, value, tone}] }`, 2–3 rows | 22 / 24 / 14 |
| `stamp` | `{ label, ring, tone }` | 10 / 20 |

`tone` is `neutral | accent | good | bad`. Green and red are for a real pass or fail only.

Over-budget text is **fitted to a word boundary or dropped**, never hard-sliced. The first structured run produced "Emails a paid clie" and "stay inside the li".

### Presenter

`PresenterLayer`, bottom-left, in front of the stage. `Chapter.presenter` is `lead | beside | away`, mapping to scale `0.52 | 0.42 | 0`.

`Character` in `src/components/chrome.tsx` hard-codes a 1200px image in a 560×1240 box — **62% of a 1920 frame**, with no prop to change it. The references put him at 20–25%. `layoutFor` scales the existing component rather than editing it: `1200 × 0.42 = 504px`, which is 26%.

This was the single largest compositional error in the old output and it was one hardcoded number. The Character Bible §5.2 and §9.2 already specified the correct behaviour; the renderer contradicted it.

### Chrome and layout

`layoutFor` in `layers.tsx` decides macro vertical position (`GRID` holds the current values). It solves from the top for chrome and from the bottom for the annotation stack, clearing the presenter; the stage takes what is left. In a directed film, the choreography layer places objects inside that stage region from typed shot intent. Nothing in either comes from a model.

---

## 9. Stage retrieval

`shortlist(query, limit, exclude, stagesOnly)` in `src/film/retrieve.ts`. Four changes this phase:

**Stage eligibility.** About 55 of the 135 `material` components cannot carry a chapter — type effects, annotation primitives, captions, audio furniture, broadcast chrome. They are listed in `NOT_A_STAGE` and excluded when `stagesOnly` is set. The structured pipeline always sets it; the old pipeline does not, so its behaviour is unchanged. Several of these are now used by the annotation layer instead. An early run chose `marker-highlight` as a chapter stage and rendered two beats with nothing on screen.

**Whole-token matching.** The old scorer matched substrings against one concatenated string, so "note" hit `notification-stack` and `arrow-annotate`, and a query about an approval card returned `calendar-month-fill`, `claude-chat` and `kanban-move`. Tokens are now matched whole, with singular/plural folding, and a hit on the component's own name scores higher than one in its description.

**A minimum score, and no fill-to-limit.** A short list is an honest short list. Padding to eight is how `code-accordion` became "a wall of labelled doors".

**The query is the object, not the content.** `facts` are the chapter's proper nouns and numbers — `Invoice 2087`, `$1,800`, `Harbor Street Bakery`. They match no component and dilute every real token. The query is `needs` (twice) plus `stage`.

Measured on the five chapters that previously failed: `tab-switch-panel` moved from 4th to 1st for a drafting panel, `feature-list` from 5th to 2nd for a control panel, and the `calendar-month-fill` / `quote-card` / `opencode` / `v0` noise disappeared.

Ten synonym rules were added for the object vocabulary the structure pass actually emits — buttons, panels, drafts, folders, approvals, rules, lists, settings.

---

## 10. Procedural stages and the visual floor

`src/film/procedural.tsx`. Seven house stages: `set`, `flow`, `compare`, `record`, `count`, `meter`, `fact`.

**These are a deliberate choice, not a fallback.** They are part of the toolbox (§12), not a lesser substitute for it. `stageSystem` decides in order: use a component if one in the shortlist presents this *shape* of information; otherwise use the graphic whose shape matches; never repeat the previous chapter's graphic.

**Why the floor was rebuilt.** The old procedural graphics capped every panel at 860px in a 1080 frame and set supporting text at 18px — roughly half the library's own documented minimums (headline 84 / supporting 44 / label 32 at 1080, in `src/remotion/lib/layout.ts`). That is why a procedural chapter read as unfinished next to a library one. They now fill the region, meet those minimums, and carry a **headline**, which is the single change that makes a graphic read as a chapter rather than a card floating on paper.

**`set` is new.** Two to six peer items in a grid, optionally numbered. `inferPiece` previously rendered every 3-or-more fact list as `flow`, asserting an order that was usually not there and making every procedural chapter look identical — the fixed-menu failure from §16. A set of peers and an ordered sequence are now different shapes.

`set` and `flow` are **adaptive**: when a stamp or a tall callout squeezes the region, the cell steps down rather than letting the last row clip. `StageFrame` also clips at the bottom as a safety net, because a centred flex child taller than its box overflows in both directions and rides up over the headline.

**`inferPiece` is the last resort only** — the path taken when a reply cannot be parsed at all. It builds from `facts` with the chapter's payoff as the headline. Across the last 30 stage calls it fired zero times.

---

## 11. Audit and validation

`auditStructure` in `src/film/structure-normalize.ts` returns warnings; it does **not** reject a plan. Current checks:

- spine shorter than 3 or longer than 6
- no worked example
- no recap chapter
- a chapter carrying more than 30% of the sentences
- three consecutive chapters on the same stage
- a chapter with no stage, or more than two pieces
- a chapter covering more than two sentences in one beat
- a chapter with no annotation on any beat
- stage props longer than 900 characters
- more than four columns or lanes on a stage
- a column or lane label over 12 characters
- a card title inside N columns longer than roughly `36 / N` characters
- every chapter using the same presenter mode

Hard failures, which throw: no chapters returned; chapters not covering every sentence.

`piecesFrom` in `normalize.ts` drops unknown component names, components with missing required props, and components needing an image, video or map tile. It accepts a graphic named in either `graphic` or `component` and with `source` of either `procedural` or `graphic` — models reliably write `{"source":"graphic","component":"set"}`, and the strict read silently discarded those replies and fell through to `inferPiece`. **This single bug accounted for three of six chapters falling back in one run.**

Traces are written to `public/jobs/structure-<timestamp>/`: `script.txt`, `structure-attempt-N.txt`, `structure.json`, `beats-N.txt`, `stage-N.txt` (query, shortlist, replies, final choice), `plan.json`, `coverage.json`.

---

## 12. RemotionUI's intended role

**RemotionUI is the toolbox the system builds scenes with. It is not a catalogue of finished scenes to pick from.**

The order of reasoning is fixed and matters:

> decide the visual explanation first → then use, combine, layer and configure materials to construct it

Never the reverse. "Which component exists?" is not a creative question, and a component that happens to be retrievable is not an answer to "what would make this idea easiest to understand?" (`creative-standard.md` §15). The structure pass deliberately describes each chapter's object in **ordinary words** — "a wall of labelled doors", "a control panel with three buttons", "a two-column sheet" — and is forbidden from naming components, precisely so the explanation is decided before any material is considered.

A frame is **constructed**, not selected. What reaches the screen is an assembly:

- a **stage** — a library component, or a procedural graphic, configured with this chapter's own words
- an **annotation layer** over it — metaphor pill, callout card, verdict stamp, status chip, chosen per beat
- **chrome** — the spine and the example's live state
- the **presenter**, scaled to the chapter's role

No preset supplies that combination. `layoutFor` assembles it, and the same stage carries a different composition on every beat because the layers above it change. The three passes decide *what the viewer must understand*, *what object makes it visible*, and *what is annotated on it moment to moment* — in that order.

Within that, a component earns a chapter when it presents the *shape* of information the chapter needs — a board of work in columns, a tree of named items, a table of rows, a panel with tabs, a form filling in, a terminal, a chat. It does not have to match the narration's metaphor; it has to hold the information. When nothing in the toolbox presents that shape, the house's own drawn objects do, and that is a construction decision rather than a failure to find a preset.

The library is not too high-level. The old architecture was too flat: it had **one slot where the references have four layers**, and the annotation primitives it already owned (`arrow-annotate`, `badge-stamp`, `callout-spotlight`, `marker-highlight`, `connector-lines`) were pooled as candidates for that single slot, where keyword retrieval could never select them. They are now the annotation layer, placed by the renderer — materials used as materials.

Every text prop a component takes must be set or blanked explicitly. `badge-stamp` defaults to `ringText: "REMOTIONUI"`, `ringTextBottom: "VERIFIED BUILD"`, `sublabel: "2026"`, and printed all three into a frame during the proof. `presentProps` in `src/film/identity.ts` only blanks `subtitle`, `helper` and `footnote` — that list is hand-maintained and incomplete.

---

## 13. Legacy and obsolete

Nothing was deleted. Nothing in this table is called by the structured pipeline.

| Path | Status |
| --- | --- |
| `src/film/prompt.ts` (`explanationSystem`, `materialSystem`) | **Superseded** by `structure-prompt.ts`. Still used by `direct-visual.ts`. |
| `src/film/Film.tsx` | **Superseded** by `StructuredFilm.tsx`. Still a registered composition; not used by the studio or `server/render.ts`. |
| `server/direct-visual.ts` | **Superseded** by `direct-structure.ts`. Not called by `/api/direct`. |
| `src/components/chrome.tsx` → `ChapterRail`, `contentBox`, `Caption`, `Kicker` | Dead or superseded. `Paper` and `Character` are still used. |
| `src/proof/ProofFrame.tsx`, composition `CompositionProof` | The hand-authored proof. Keep as a reference for what a correct frame looks like; it is not part of the pipeline. |
| `scripts/proof-unseen.ts`, `scripts/render-unseen-stills.ts` | Tests for the old pipeline. |
| `src/Explainer.tsx`, `src/components/scenes.tsx`, `src/types.ts` `DrawNode`, `src/director/prompt.ts` `directorSystem`, `src/director/normalize.ts` `normalizePlan`, `server/llm.ts` `directFilm`, `src/director/local.ts` | Legacy coordinate pipeline. `scriptSystem` and `extractJson` from these files **are** still used. |
| `src/board/**`, `server/direct-board.ts`, `server/proof-board.ts`, composition `BoardProof` | Legacy fixed-block experiment. |

`directorSystem` in `src/director/prompt.ts` is worth reading before changing creative prompts. It is the best-written creative prompt in the repository and encodes most of the reference grammar; it failed because it asked a model for x/y coordinates, not because its thinking was wrong.

---

## 14. What was tested

**The composition proof** — hand-authored, one frame set, to test whether the substrate could reach reference composition at all. `out/proof/`. It established that the gap was layering, scale and placement, not the component library.

**Nine end-to-end structured runs across four topics.** Every run took only a topic string; no hand-authoring.

| Run | Topic | Words | Duration | Library stages | Spine |
| --- | --- | --- | --- | --- | --- |
| `out/structure` | accounting / invoices | 494 | 205s | 3 of 6 | Case>Intake>Model>Tools>Review>Shape |
| `out/s-new` | design studio / feedback | 534 | 219s | 2 of 6 | Capture>Split>Flag>Make>Check>Loop |
| `out/s-stab` | design studio / feedback | 465 | 191s | 1 of 6 | Feedback>Gather>Sort>Decide>Make>The loop |
| `out/s-inv` | accounting / invoices | 449 | 187s | 0 of 6 | Case>Trigger>The brain>Checkpoint>Hands>Loop |
| `out/r1` | design studio / feedback | 463 | 192s | 4 of 6 | The case>Collect>Split>Apply>Check>The week |
| `out/r2` | accounting / invoices | 499 | 205s | 3 of 6 | Ledger>Brain>Hands>Rules>Handoff>The shape |
| `out/r3` | consultant / prospect research | 509 | 210s | 1 of 6 | Trigger>Brief>Tools>Model>Handoff>Recap |
| `out/f1` | consultant / prospect research | 528 | 215s | 3 of 6 | Cold call>Trigger>Sources>Agent>Brief>Thursday |
| `out/f2` | ecommerce / overnight support | 521 | 211s | 2 of 6 | Trigger>Model>Context>Tools>Limits>Recap |

`r1`–`f2` are the five runs on the final code. Across those 30 chapters: **13 library stages, 17 deliberate graphics, mean 5.2 distinct stage types per film, 4 audit warnings total, 0 validation retries, 0 silent fallbacks.**

### What the tests established

- The structural grammar is produced autonomously. Every run yielded a 3–6 chapter spine, a carried worked example with real state progression, metaphor pills, per-beat annotation, varied presenter modes, a recap chapter and full sentence coverage.
- Structure *shape* is stable across runs and topics. Stage *choices* vary.
- The procedural floor is no longer visibly weaker. `out/r3` was rendered in full specifically because it was the worst mix (1 library / 5 graphics) and it reads as one coherent film.
- In the two fully rendered films the weakest frames were **library** components clipping their own text, not graphics.

### Artifacts

Each run directory holds `script.txt`, `summary.json` (spine, example, per-chapter and per-beat detail, warnings), `props.json`, and `stills/`. Full renders: `out/structure/film.mp4` (205s), `out/f2/film.mp4` (211s), `out/structure/excerpt.mp4`. The hand-authored proof is `out/proof/`. Model traces are in `public/jobs/structure-*/`.

---

## 15. Creative architecture to preserve

Do not undo these without evidence from rendered frames at phone scale.

1. **Explanation first, materials second.** Decide what the viewer must understand and what object makes it visible, in ordinary words, before any component is named. Then build that out of the toolbox. A frame is constructed from layers, never selected as a preset.
2. **Four layers, separately owned.** Spine, stage, annotation, presenter. The stage never owns chrome; the model never owns position.
3. **A stage is mounted once and held.** Its objects keep their identity while their state changes on narrated cues; they are never swapped for unrelated redraws.
4. **The film-structure pass, then whole-film FilmDirection, run before any scene work.** Chapters, persistent objects, events and shots are decided for the whole script at once.
5. **The spine is persistent and names every chapter.**
6. **One worked example, carried, with a per-beat state.**
7. **Metaphors as `TERM = THING` pills**, bound in the narration first.
8. **One dominant stage.** It may be a library component, a house graphic, a bespoke diagram, an action exchange, one dominant piece plus a compact strip, or the persistent directed stage. Two stacked full-height objects are not allowed.
9. **Placement is renderer-owned.** `layoutFor` places chrome, presenter and captions. The choreography layer places stage objects from typed shot intent. No model-supplied coordinates, ever.
10. **Presenter at 20–26% of frame height, bottom-left, varying by chapter role.**
11. **Procedural graphics are a peer of library components**, not a fallback, and must stay at the same visual floor.
12. **Text budgets are enforced in code**, fitted to a word boundary or dropped.
13. **Coverage is a hard failure.** No generic scene may hide uncovered narration.
14. **Script, structure and picture are one object.** The script declares what the film will show.
15. **A supplied script is preserved verbatim.** The writer runs only when asked for one.
16. **Recorded narration is the timing authority in production.** Estimated timing is a preview.

---

## 16. Remaining issues

These are implementation and production problems, not architecture questions. The documented non-blocking limits from Motion v1 acceptance are in `MASTER_HANDOFF_AI_MOTION_GRAPHICS_STUDIO.md` §9.

**Toolbox behaviour.** Composed stages, cue-gated library state and the directed choreography stage are implemented (§0). Library prop changes are still cue-gated snapshots, not interpolated transitions. Implement interpolation only when a real story naturally exercises it.

**Chapter-stage watch items** (non-directed path; recheck on the next real script):
- **Library components can clip their own internal text.** `kanban-move` portrait wrapping was repaired in Continuity v1. `comparison-table` and `roadmap-lanes` have not been re-verified. Tier 3 now flags clipping on rendered frames.
- **Component-native backgrounds bleed through.** A pink radial wash appears behind some library stages. `presentProps` neutralises a background only where a `backgroundColor` prop exists; the blanking list is hand-maintained.
- **Stage-choice variance across runs.** The same topic produces different stage choices run to run. No longer harmful — the variance no longer yields broken stages — but it makes regression testing awkward. Consider seeding or pinning for repeatability.
- **Repeated `record` openings.** Chapter 1 chose `record` in all five final runs. Defensible for introducing a named case, but it means every film opens the same way. Five samples is too few to tune on; watch it across more runs before adding a nudge.
- **Occasional chapters with no annotation.** `out/f1` had two, flagged by the audit. This is a beat-pass weakness, not a stage one.

**Not attempted, deliberately**
- **The illustration / environment capability.** The references lean heavily on illustrated rooms, desks, doors, brains and props. Nothing in the catalog draws them. The structure pass can flag `illustrationGap` on a chapter, and the field is carried through to `summary.json`, but nothing consumes it. This was kept out of scope on instruction and remains the largest single gap against the references.

**Timing: estimated in test, recorded in production**
- **The structured runs were intentionally silent.** `scripts/proof-structure.ts` calls `realizeNarration` only — no ElevenLabs, no audio, `audioFile: null`. Captions follow the estimated word clock at 175 wpm. That was the right call for creative-system work: it removed an API dependency and a variable from every iteration.
- **In production, the existing ElevenLabs / Eric A path is the timing authority.** Real word timestamps from `synthesize` in `server/voice.ts`, walked onto the plan by `alignNarration` in `src/timing.ts`, govern caption sync, beat boundaries and chapter durations. `realizeNarration` is a preview estimate and nothing more; it must not be treated as the clock once a recording exists.
- The R&D phase did not change the narration implementation. Voice, settings and alignment are as described in `grok-CURSOR_HANDOFF-v1.md`.
- **Tested on `out/prod-supplied/`.** `timeChapters` wraps the chapters and calls `alignNarration`. On that film every narration token matched the recording in order, chapter boundaries tracked the words, and the caption at each sampled frame was the line being spoken. One bug had to be fixed first: `wordsFromAlignment` dropped any token containing a quotation mark, and the clock drifted from `"damaged item claim"` to the end of the film.
- The estimate is close — the reference transcripts measure ~180 wpm against the code's 175 — so expect adjustment, not redesign.
- Durations land at 187–219s. That is inside the reference range (`ref-3` 186s, `ref-8` 224s) but long for TikTok. Shorter films are a script-length decision, not an architecture one.

---

## 17. Running it

```
npx tsx scripts/proof-structure.ts "<topic>"            # writes out/structure
OUT_NAME=myrun npx tsx scripts/proof-structure.ts "..."  # writes out/myrun

npx remotion still  StructuredFilm out/structure/f.png --frame=600 --props=out/structure/props.json
npx remotion render StructuredFilm out/structure/film.mp4 --props=out/structure/props.json
npx remotion studio                                      # StructuredFilm, CompositionProof, Film, Explainer, BoardProof

node scripts/measure-stages.mjs                          # regenerate stage-fit.json after re-vendoring
npx tsc --noEmit
```

Requires `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` in the environment. There is no `.env` in this checkout.

`scripts/proof-structure.ts` is a silent, topic-driven test harness: it always writes a script and never calls ElevenLabs. Production needs neither of those behaviours — it preserves a supplied script (§3) and takes its timing from the recording (§16).

**Judge everything at phone scale.** A frame that reads at 1080px wide and fails at 330px is a failed frame. The clearest single demonstration in this phase was a side-by-side of the old and new output downscaled to 330px: the old frames were unreadable except for the caption, and that was the same library, the same resolution and the same render path.
