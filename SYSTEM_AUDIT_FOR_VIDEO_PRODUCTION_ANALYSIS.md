# System Audit for Video Production Analysis

Date: 9 October 2026  
Repository: `rot-boy-v2`  
Scope: the directed production path as it exists in code. This report does not propose a redesign.

The creative source of truth on that path is one executable FilmSpec. The model that writes it is the only planner. Downstream picture, timing, and material binding are code.

---

## 1. Executive summary

This system turns a finished spoken script into a vertical (1080×1920) educational motion-graphics film. A presenter (Corporate Defector) stands beside a stage that is supposed to teach the mechanism in the narration, with word-aligned captions and a persistent chapter rail.

The current production path is `scripts/produce.ts` talking to the studio server in `server/dev.ts`. Planning is one model call, `directStructure()` in `server/direct-structure.ts`, which must return a FilmSpec. Narration (ElevenLabs) runs at the same time. Word timestamps become the clock. Remotion’s `StructuredFilm` composition renders the picture. After that, one compact vision review can run. A repair, if it runs, is one patch of named chapters.

The AI controls the semantic plan: chapter cuts, a worked example, up to twelve named objects, cue-locked events, shots, a visual medium, a material id, a grammar name, and optional public-page sources. It does not place pixels, write components, or invent artwork during the run.

Deterministic code owns sentence coverage, cue checks, beat boundaries, choreography, layout, captions, capture policy, grammar-repeat checks, and the picture itself. `src/film/choreography.ts` decides where objects sit and when they move. `src/film/DirectedStage.tsx` and `src/film/grammars.tsx` draw the frame.

The final renderer is Remotion 4.0.533, composition id `StructuredFilm`, registered in `src/Root.tsx`. Output is H.264, 1080×1920, 30 fps, via `server/render.ts` or `scripts/render-continuity.ts`.

The system is strongest at causal continuity on a fixed house stage: the same objects persist, actual state does not change before its spoken cue, hypotheticals and recaps are separate from history, and the presenter plus captions stay in a known phone layout.

What constrains the picture is the scene model. A shot is a choice among registered mediums and materials. The directed renderer then draws one of a small set of layouts, or the six house glyphs. A large vendored component catalog exists in the repo and is not what this path mounts.

---

## 2. Current end-to-end production flow

Hot path, input to MP4:

1. **Script input.** `scripts/produce.ts` reads a text file, strips `**` and `__`, and refuses the file if `needsNarration()` in `src/director/brief.ts` thinks it is a topic rather than a finished script. Optional `--storyboard=` JSON is passed through. Optional `--plan=` skips planning and loads a plan JSON.

2. **Planning.** `POST /api/direct` in `server/dev.ts` calls `directStructure()`. That function calls `complete()` in `server/llm.ts` once, with up to three attempts if `compileFilmSpec()` rejects the JSON. The system prompt is `filmSpecSystem` in `src/film/film-spec.ts` (the old direction rules plus the FilmSpec shape and the material index). If the storyboard already validates, the model is not called.

3. **FilmSpec.** `compileFilmSpec()` checks chapter coverage, builds `FilmDirection` through `directionFrom()` in `src/film/direction.ts`, checks material ids against founding plus arsenal registries, requires a source record for capture mediums, and rejects consecutive shots that share a grammar unless `intentionalRepeat` and `repeatReason` are set. It writes one beat per sentence in code (`beatsForChapter`). Pieces are a bookkeeping field. The directed picture does not read them.

4. **Narration.** In parallel with planning, `POST /api/voice` calls `synthesize()` in `server/voice.ts` (ElevenLabs, word timestamps). `produce.ts` waits for both.

5. **Timing.** `timeChapters()` in `src/timing.ts` aligns each beat’s narration to the word list. Production throws if the clock is not `"alignment"` or if fewer than 90% of narration tokens match.

6. **Scene construction.** The timed plan, words, and audio path are `StructuredFilmProps`. When `plan.direction` is set, `StructuredFilm` in `src/film/StructuredFilm.tsx` mounts `DirectedStage` for the whole film. It does not mount per-chapter `pieces`.

7. **Material selection.** The model copies a material id from the index embedded in the prompt. There is no retrieval call on this path. `src/film/retrieve.ts` (`shortlist`) is not imported by `direct-structure.ts`.

8. **Browser capture.** After the spec validates, `acquireSources()` in `server/capture.ts` screenshots any source that has a public `https` URL and no local file. Policy is `assertPublicHttps()` in `src/film/source-policy.ts`. The tool is headless Chrome or Edge, one viewport, one PNG. `POST /api/capture` and `scripts/capture-source.ts` do the same thing outside a film run.

9. **Remotion composition.** `StructuredFilm` draws the paper background, narration audio, optional music, the directed stage, and `CaptionPill`. `server/render.ts` bundles `src/index.ts` and renders composition `StructuredFilm`.

10. **Captions.** `CaptionPill` in `src/film/layers.tsx` shows a short phrase of the aligned words. The model does not write caption text.

11. **Audio.** Narration is the voice file. `DirectedStage` can play cue-triggered SFX from `src/film/sound.ts` when `sound.sfx` is set. `produce.ts` does not set that flag, so a default produce run is narration plus picture. `scripts/remix-audio.ts` replaces the audio stream with `ffmpeg` and copies the video stream.

12. **Rendering.** The studio render job writes `public/jobs/<id>/video.mp4`. `produce.ts` copies it to `out/<name>/film.mp4`.

13. **QC / critic.** `produce.ts` does not call `scripts/technical-qc.ts`, `scripts/audit-motion.ts`, `scripts/audit-captions.ts`, or `scripts/conform-plan.ts`. Those remain manual scripts. The automatic review is `reviewCompact()` in `scripts/compact-review.ts`: three frames, one vision call. `scripts/review-film.ts` is a manual multi-strip review and is not the default.

14. **Repair.** If the compact review returns a blocking defect and a FilmSpec is present, `repairFilmSpec()` in `server/repair-spec.ts` makes one model call. `applySpecPatch()` replaces shots and events only for the named chapters and rejects a patch that touches every chapter. `scripts/splice-span.ts` can re-render that time range and splice it, copying the original audio. One round. A failed repair is written to `repair-failed.txt` and the existing picture is kept.

15. **Delivery.** `out/<name>/` holds `film.mp4`, `props.json`, `film-spec.json`, `voice.mp3`, `timing.json`, `summary.json`, and `telemetry.json`.

### Active vs not on this path

| Path | Status |
|---|---|
| `scripts/produce.ts` → `/api/direct` → `directStructure` → FilmSpec → `/api/voice` → `StructuredFilm` / `DirectedStage` | Active hot path |
| `studio/App.tsx` `POST /api/direct` and `/api/voice` | Same planner and voice, driven from the UI |
| `server/llm.ts` `writeScript` via `POST /api/script` | Optional topic-to-script. `produce.ts` refuses outlines |
| `server/direct-visual.ts` | Legacy per-passage planner. Used by `scripts/proof-unseen.ts`, not by `server/dev.ts` |
| `server/direct-board.ts` | Not imported by `server/dev.ts` |
| `src/film/structure-prompt.ts` `beatSystem` / `stageSystem` | Prompt text for the old per-chapter passes. Not called by `directStructure` |
| `src/film/retrieve.ts` shortlist | Used by `direct-visual.ts` and the old stage pass, not by FilmSpec |
| `src/film/Film.tsx`, `src/board/BoardFilm.tsx`, `src/Explainer.tsx`, demo compositions under `src/compositions/` | Other Remotion compositions. Not the directed film |
| `src/film/registry.tsx` `library` | Mounted only by `ChapterStage` when `plan.direction` is absent. A FilmSpec always sets `direction`, so this map is off the hot path |

---

## 3. What the Creative Director can actually do

The director is the model that fills a FilmSpec. It cannot open the repo and edit it during a run.

| Capability | Class | How it actually works |
|---|---|---|
| Create arbitrary new compositions | **Not available** | A shot picks `medium` from a fixed list of 13 and a `materialId` from the registry. `DirectedStage` either draws house glyphs or one grammar component in `grammars.tsx`. |
| Create arbitrary SVG artwork | **Not available** | House objects are six kinds drawn by `src/film/glyphs.tsx`: `message`, `agent`, `document`, `package`, `boundary`, `sheet`. The model chooses kind, label, and state text. It does not supply paths. |
| Write or modify React scene code | **Not available** | No production step writes or patches `.tsx`. `bespoke.react-svg` is a registry entry. The directed renderer does not mount `src/film/bespoke.tsx`. |
| Choose existing UI components | **Partial** | It may name `ui.*` and `remotion-ui.*` ids. `GrammarStage` does not mount the vendored Remotion scene. `Software()` in `grammars.tsx` maps a few ids onto studio cards (record, table, inbox, form, calendar, metric). Other ids fall through to a five-step workflow lane inside a window chrome. |
| Retrieve components by capability | **Partial** | The prompt inlines `executableMaterialIndex()` (id, name, one intent line). `discoverMaterials()` in `src/founding-toolset/registry.ts` exists and is not called during planning. `shortlist()` is not on this path. |
| Use external component libraries | **Partial** | Libraries are installed and many are vendored under `src/remotion/`. The director cannot address them except through the material ids above, and most of those ids do not mount the vendored component. |
| Capture real websites | **Partial** | One public `https` URL becomes one PNG via headless Chrome/Edge (`server/capture.ts`). No login, no private network, no multi-page crawl. The grammar frames, crops, and highlights that PNG. |
| Record browser interaction | **Not available** | Nothing drives clicks, typing, or scrolling. `screen_recording_scene` plays a local video file if one was already supplied. It does not record a session. |
| Retrieve images from the web | **Partial** | The only fetch is the full-page screenshot above. There is no image search and no hotlink of arbitrary image URLs into the stage. |
| Generate images | **Not available** | `generated_image_scene` and `real_world_image_scene` display `localPath` if a file is already in `public/`. If it is missing, the frame shows the provenance string. No image model is called. |
| Generate video | **Not available** | `generated_video_shot` uses Remotion `OffthreadVideo` when `localPath` ends in mp4, webm, or mov. Nothing generates that file. |
| Create diagrams | **Partial** | `diagram_scene` / `arsenal.process-diagram` draws up to five labeled rows from objects and landed states. The layout is fixed. The model does not draw boxes, arrows, or a custom graph. |
| Create charts / data visualizations | **Partial** | `data_visualization_scene` shows one spoken figure and up to two metric cards with decorative bars. It is not a data-bound chart. The vendored chart primitives are not mounted. |
| Control camera / reframing | **Partial** | Shot fields `composition` (`detail`, `system`, `comparison`, `recap`) and `boundary` (`carry`, `transform`, `reframe`, `reset`) change glyph scale and layout inside `choreography.ts`. The model cannot set coordinates, zoom curves, or a camera path. Grammar panels do not reframe; they replace the glyph stage. |
| Build layered environments | **Not available** | The frame stack is fixed: paper, spine, through-line, stage, presenter, captions. The model does not add, order, or mask layers. |
| Create masks / clipping / composites | **Partial** | Capture crops and a highlight box are fractions on the screenshot. There is no mask authoring, track matte, or blend control. |
| Construct / reconstruct interfaces | **Partial** | Software shots are house-drawn cards filled with object labels and event states, not a reconstruction of a real product UI. A real interface appears only as a captured PNG. |
| Manipulate imported media | **Partial** | Crop and highlight on a still. A supplied video plays in a device frame. No trim UI, no per-layer edit, no color grade, no cutout. |
| Create new reusable materials during production | **Not available** | Ids are compile-time constants in `src/founding-toolset/registry.ts` and `arsenal.ts`. An unknown id fails validation. |

---

## 4. Visual tool inventory

### Founding material registry

`src/founding-toolset/registry.ts` holds 29 ids. The FilmSpec prompt lists them. On the directed path, only the house and action ids reliably change the glyph picture:

- `house.persistent-glyph`, `house.directed-stage`, `action.motion-verbs` — the choreography stage. Six SVG kinds, cue-locked motion (`traverse`, `return`, `transform`, plus derived `block` and `accumulate` in `choreography.ts`).
- `ui.*` adapters in `src/founding-toolset/materials.tsx` — window, record, table, inbox, form, booking calendar, metric, workflow, badges, tabs, progress, notification. Reachable only when `GrammarStage` selects them. Several `ui.*` ids are not special-cased and become the workflow lane.
- `remotion-ui.*` entries point at vendored files (`kanban-move`, `comparison-table`, `form-fill-sequence`, `notification-stack`, `timeline-steps`, `calendar-month-fill`, `stat-card`, `data-flow-pipes`, `progress-bar`). The directed renderer does not import those scene modules. A few ids are aliased onto the studio cards above.
- `motion.reveal`, `motion.count`, `motion.attention`, `motion.grid` — small helpers. Not a shot the director can aim at, except `motion.grid` as a registry row.
- `primitive.*` — badge, tabs, progress, notification. Used inside the studio cards, not as free-standing shots.
- `bespoke.react-svg` — registry row for `src/film/bespoke.tsx`. Not mounted when a FilmSpec is present.

### Arsenal grammars

`src/founding-toolset/arsenal.ts` adds 13 ids, drawn by `src/film/grammars.tsx`:

| Id | What the frame actually is |
|---|---|
| `arsenal.browser-capture` | Window chrome around a PNG, optional crop and highlight |
| `arsenal.interface-capture` | Same capture frame |
| `arsenal.process-diagram` | Up to five numbered rows |
| `arsenal.numeric-stage` | One large figure and two metric cards |
| `arsenal.document-page` | A paper page of landed states or facts |
| `arsenal.conversation` | Up to four chat bubbles |
| `arsenal.comparison-split` | Two columns |
| `arsenal.timeline-rail` | A vertical rail of events. Also used when the grammar string is `timeline` |
| `arsenal.map-schematic` | A grid with up to five pins. Not a geographic map |
| `arsenal.device-frame` | A bezel around a capture or a local video |
| `arsenal.product-still` | A still in the capture frame, or a gap plate |
| `arsenal.text-treatment` | One large line |
| `arsenal.mixed-annotation` | Capture frame plus a status badge |

### Remotion UI scenes and primitives

`src/remotion/scenes/` and `src/remotion/primitives/` are a large local catalog (charts, maps, devices, code, chat, transitions, 3D). `src/film/registry.tsx` maps many of them into `library` for the non-directed `ChapterStage`. `DirectedStage` does not consult `library`.

`src/film/catalog.json` indexes 254 entries (135 `material`, 32 `transition`, 20 `template`, 18 `wrapper`, 12 `background`, 37 `utility`). The founding set marks 10 of those names as approved catalog materials. Approval is a registry fact. It does not mean the FilmSpec renderer instantiates them.

### House picture

- Glyphs: `src/film/glyphs.tsx`.
- Choreography and reframing: `src/film/choreography.ts` (`sceneAt`).
- Chrome: spine, status chip, caption pill in `src/film/layers.tsx`.
- Presenter: `Character` in `src/components/chrome.tsx`, images `public/character/present.png` and `tablet.png`, plus webm loops `corporate-defector-presenting.webm` and `corporate-defector-tablet-idle.webm`.
- Paper background and type: `src/design.ts`. Body is Archivo, mono is IBM Plex Mono, both from `@remotion/google-fonts`.

### Diagrams, charts, capture, media

- Diagrams, charts, documents, conversations, timelines, and the schematic map are the arsenal components above. They share one data feed: objects that have been introduced and events whose cue time has passed.
- Browser capture is a PNG plus `provenance.json` under `public/sources/<id>/`.
- Screenshot handling is that PNG, with optional crop and highlight fractions.
- Image and video handling is `Img` or `OffthreadVideo` from Remotion when `localPath` is set.
- Transitions on this path are cuts implied by shot and chapter changes. `@remotion/transitions` is used in demo compositions, not in `StructuredFilm`.
- Motion primitives (springs, staggers, wipes, shaders) live under `src/remotion/` and run only if some other composition mounts them.

### External libraries installed

See section 5. Installed does not mean the director can call them.

---

## 5. Component-library usage

| Library | What it is in this repo | Exposed to the directed director? | Dynamic discovery? | Notes |
|---|---|---|---|---|
| `remotion` and `@remotion/renderer`, `bundler`, `cli`, `player` | The picture engine | The renderer is the engine. The director does not call Remotion APIs | No | This is the production renderer |
| `@remotion/google-fonts` | Archivo and IBM Plex Mono on the directed film. Many other families are loaded inside vendored scenes | Type is fixed. The director does not pick a font | No | |
| `@remotion/captions` | Used by some demo compositions | Directed captions are `CaptionPill`, not this package | No | |
| `@remotion/transitions` | `TransitionSeries` in `src/compositions/*` | Not used by `StructuredFilm` | No | The directed film cuts |
| `@remotion/light-leaks` | `src/remotion/primitives/transition-light-leak.tsx` | Not on the directed path | No | |
| `@remotion/media`, `media-utils`, `paths`, `layout-utils` | Vendored scenes and path helpers | Not selected by FilmSpec | No | |
| `@remotion/three` plus `three` plus `@react-three/fiber` plus `@react-three/drei` | 3D scenes such as `text-extrude-3d` and `product-turntable-3d` | Not on the directed path | No | |
| `@paper-design/shaders-react` | Grain, warp, and dither backgrounds under `src/remotion/primitives/` | Not on the directed path | No | |
| `maplibre-gl` and `@turf/turf` | `map-canvas`, `map-route`, `map-markers`, `map-flight` | Not on the directed path. The arsenal “map” is a drawn schematic | No | A real map library is installed and unused by production |
| React 19 | UI runtime | The director does not author components | No | |
| Express | Studio HTTP API | Not a visual tool | No | |

There is no shadcn, Radix, or UIAble package in `package.json`. The founding ids `shadcn-adapted` and `uiable-adapted` are local reimplementations in `materials.tsx` (badge, tabs, progress, window, table, form). The directed software shots use those reimplementations, not the vendored Remotion scenes that already depict kanban, forms, calendars, timelines, and tables.

`src/film/retrieve.ts` can name vendored scenes such as `line-chart-draw`, `map-flight`, and `terminal-simulator`. That retriever is on the legacy visual path, not on FilmSpec. Even if a FilmSpec names a `remotion-ui.*` id, `GrammarStage` still does not import the scene file.

---

## 6. Scene-construction model

A directed film is a `TimedStructuredPlan` (`src/film/structure-types.ts`) plus optional `executions` and `sources` (`src/film/spec-types.ts`).

- **Schema.** Chapters partition sentences. Each chapter has beats (one per sentence, derived in code). `FilmDirection` holds objects, events, and shots. Each shot has an execution: `medium`, `materialId`, `grammar`, `sourceId`, `intentionalRepeat`, `repeatReason`.
- **Grammar.** A short name. Consecutive shots may not share one unless the repeat is flagged and explained.
- **Medium.** One of 13 strings in `VISUAL_MEDIUMS`.
- **Material.** A registry id. It selects a branch in `grammars.tsx` or the house glyph stage.
- **Objects.** Id, label, one of six kinds, an introduction cue, a detail string. Cap of 12, labels capped at 28 characters.
- **Position.** Computed. `choreography.ts` lays glyphs out from composition and presenter keep-out. The prompt tells the model not to emit coordinates. Grammar panels are a single rectangle in the stage region, ending above the presenter’s head.
- **Animation.** Glyph motion comes from event action and cue time (`sceneAt`). Grammar panels do not interpolate their own intros from frame 0; they show whatever events have landed by the current time. Capture highlight fades in after 35% of the shot. A recording shows a playhead.
- **Camera / reframing.** `composition` and `boundary` on the glyph stage only. See section 3.
- **Persistence.** Object identity survives across shots. A grammar shot hides the glyphs and shows small identity chips for objects already introduced.
- **State.** Events are `actual`, `hypothetical`, or `recap`. Actual history is what later shots can treat as true. Hypotheticals are a dashed branch. Recap does not rewrite history. `outcome` is `progress`, `complete`, or `refused`.
- **Transitions.** No transition operator. The next shot replaces the stage.
- **Captions.** `CaptionPill` from word times. Always on when a chapter is active.
- **Presenter.** Shot field `lead`, `beside`, `away`, or `address`. `presenterAt()` maps that to the character asset and a scale. `away` removes the character. The studio can force the presenter off or on via `characterMode` in `server/dev.ts` before the plan is returned.

**The system is a renderer that selects from predefined scene and material types.** It is not an editable motion-design workstation. The model fills a schema. Code chooses geometry, component, and timing. There is no layer tree the model can open, no path editor, and no ability to drop a new component into the frame beyond the ids already compiled into `grammars.tsx` and the glyph stage.

---

## 7. Asset workflow

| Asset | How it enters | Provenance and storage | What production can do with it |
|---|---|---|---|
| Local still or video | `SourceAsset.localPath` relative to `public/` | The spec’s `provenance` string. No checksum on the hot path | Framed, cropped, highlighted. Video plays if the extension matches. Not cut into layers |
| Page capture | `acquireSources()` after planning, or `scripts/capture-source.ts` | `public/sources/<id>/capture.png` and `provenance.json` (url, time, browser, byte size, `policy: public-https`) | Same framing as a local still. One screenshot, not a DOM |
| External URL | Only `https`, no credentials, no local or private hosts | Rejected otherwise. A failed capture leaves `localPath` null and records the error on `provenance` | The frame then shows the error text instead of a picture |
| Generated image or video | Not produced by the pipeline | A medium name can declare the intent. The file has to already exist | Gap plate when missing |
| Downloaded media | Not a general downloader | Capture is the only fetch | PNG only |
| Narration audio | ElevenLabs in `server/voice.ts` | Copied to `out/<name>/voice.mp3` and under `public/jobs/` | Clock for cues and captions. Remix replaces the stream without re-rendering picture |
| SFX and music | Files in `public/sfx/`. Music path on `props.sound` | `produce.ts` does not attach `sound` | Optional at render time if a caller sets the prop |
| Fonts | Loaded in `src/design.ts` at render | Google fonts via Remotion | Fixed families |
| Character | Files in `public/character/` | Studio-owned | Two poses. Placement is code |

Imported media is one rectangle in the grammar frame. It is not decomposed into objects. House objects remain the only things with identity, cues, and motion verbs. A screenshot does not become those objects.

Reuse is by path. A later FilmSpec can point `localPath` at an existing `public/sources/...` file and skip capture.

---

## 8. Review and revision loop

**Preview.** The studio UI and Remotion’s player can show `StructuredFilm`. `scripts/render-stills.ts` renders PNGs at chosen times. Neither is inside `produce.ts`.

**Review of a render.** Default: `reviewCompact()` extracts three frames with ffmpeg (about 1.2s, the midpoint, and near the end) and sends them in one vision call. The model returns defects with time, severity, issue, and a repair sentence. It does not return object ids or layer edits. `scripts/review-film.ts` can score many strips against a longer rubric. Production does not call it.

**Deterministic QC.** `scripts/technical-qc.ts` (resolution, fps, black frames, long silence), `scripts/audit-motion.ts`, `scripts/audit-captions.ts`, and `scripts/conform-plan.ts` exist. `produce.ts` does not run them. Planning does run `directionFrom()`, coverage checks, material checks, and `auditStructure()`.

**Repair request.** Blocking defects from the compact review, with a chapter id inferred from the timestamp.

**What the repair can change.** One model call returns replacement shots and events for those chapters only. `applySpecPatch()` revalidates the whole spec. Narration, word times, and untouched chapters stay. The repair does not edit pixels, SVG, or React.

**Rerender.** `splicePictureSpan()` renders the frame range and splices it, copying the original audio. If that throws, `repair-failed.txt` is written and the previous MP4 remains.

**Retries.** FilmSpec validation: up to three model attempts, each shown the previous error. Voice and render failures fail the run. The critic is not looped. Repair is one attempt.

**Can the AI inspect a rendered scene and then directly modify the specific objects or layers causing the problem?**

No. The critic sees three frames and returns prose plus a timestamp. The repair model may replace shots and events on the chapters that contain that time. It cannot point at a layer, a glyph node, a crop, or a line of component code. If the defect is in the renderer (the wrong component for a material id, clipping inside a card), a spec patch cannot fix it.

---

## 9. State and continuity system

These mechanisms are implemented and enforced in code. They are the part of the system that survives a change of grammar.

- **Sentence ownership.** `structureFrom()` keeps only a contiguous chapter run from sentence 0. A hole fails the spec. Every sentence is in one chapter. `produce.ts` checks that the beats’ narration, joined, matches the script after whitespace normalization.

- **Beat ownership.** `beatsForChapter()` makes one beat per sentence. The beat’s mode and state text are copied from events whose cue sentence is that index. `cueTime()` in `src/film/direction.ts` looks up the phrase only inside that sentence’s word window, so an earlier copy of the same words does not fire the cue.

- **Persistent object identity.** Object ids are stable for the film. Shots reference those ids. Glyph choreography keeps an object once it has been introduced. Grammar shots list the same ids as chips. The cap is 12 unique ids. `caseObjectId` picks which object drives the status chip.

- **Actual, hypothetical, and recap.** Event `mode` is one of those three. `choreography.ts` treats actual events as the ledger. Hypotheticals open a dashed branch and do not replace the ledger. Recap events can be shown as recall; they do not rewrite the actual history. A chapter flagged `recap` forces non-hypothetical beats toward recap in `chapterFrom()`.

- **State truth.** A state is not drawn before its cue time. Launch of a motion is at or after the cue; the landed state waits until the motion arrives (`choreography.ts`). Grammar rows are filtered with `event.land <= time`. Outcomes are only `progress`, `complete`, and `refused`.

- **Worked example.** `example.name` and `example.what` come from the spec. The chip shows `example.name` plus the case object’s actual state. The name is clipped to a short tag in `exampleFrom()`.

- **Timing and cue checks.** `directionFrom()` requires each cue phrase to be an exact contiguous substring of the numbered sentence. Actions are `traverse`, `return`, or `transform`. `from` must be another object or null. Every chapter needs a shot whose cue sentence sits inside that chapter. `produce.ts` then requires word-level alignment and at least 90% token match before render.

- **Storyboard lock-in.** `storyboardCompiles()` accepts a storyboard that is already a valid FilmSpec and skips the model. If the model fills gaps, `assertStoryboardHonored()` requires supplied sentence spans and supplied shot mediums to survive. A storyboard is not a second planner. It is the same spec, partially filled.

- **Grammar repeat rule.** After shots are ordered by sentence, `compileFilmSpec()` throws if two consecutive shots share a `grammar` string unless the later shot sets `intentionalRepeat: true` and a non-empty `repeatReason`. The reason is stored. It is not interpreted. The check is on the name the model chose, not on whether the renderer drew two different pictures. Two different grammar strings can still land in the same `Software()` layout.
