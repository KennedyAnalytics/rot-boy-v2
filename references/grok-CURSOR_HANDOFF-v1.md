# Cursor handoff

This file describes the repository as it exists after the RemotionUI integration and the unseen print-shop render. It is a status record, not a design spec. Creative quality is defined in `references/creative-standard.md` and the videos in `references/Video references Good/`. Inspect those yourself.

Last updated from the working tree on 8 October 2026.

## Product goal

Build a local application that accepts a topic or a script and produces a 1080×1920 educational motion-graphics video for TikTok / Instagram Reels.

The quality bar is the supplied reference films, not a component demo. Narration, timing, pictures, and render are meant to run on this machine, using external APIs for the language model and for the cloned voice.

## Current application

The runnable app is `defector-studio`. `npm run dev` starts `server/dev.ts`, which serves the studio UI and the API on `http://127.0.0.1:8787`.

### How a video is requested

`studio/App.tsx` has three inputs: topic, script, and optional notes, plus a Corporate Defector mode (`auto`, `always`, `never`). "Make the video" posts through the local API.

`src/director/brief.ts` (`needsNarration`) treats the input as a topic or outline when it has at least two bullets, fewer than 45 words, or fewer than three sentence-ending punctuation marks. In that case the app writes a script first. A longer pasted script is used as the narration.

### Script generation

`POST /api/script` calls `writeScript` in `server/llm.ts`. The prompt is `scriptSystem` in `src/director/prompt.ts`. It asks for JSON `{ title, script }`, plain spoken text, roughly 150–210 words, concrete nouns and numbers, no outline returned as the script.

### Language model

`server/llm.ts` `complete()` uses Anthropic if `ANTHROPIC_API_KEY` is set, otherwise OpenAI. Defaults in code, overridable by env:

- Anthropic model: `claude-sonnet-5-5` (`ANTHROPIC_MODEL`)
- OpenAI model: `gpt-4.1` (`OPENAI_MODEL`), with `response_format: json_object`

`.env.example` lists the keys. This checkout has no `.env` file. When this machine ran the latest test, the keys were present in the process environment, and Anthropic was preferred because that key was set. There is no local model.

### Narration and timing

`POST /api/voice` calls `synthesize` in `server/voice.ts`. See the Narration section below.

Timing is in `src/timing.ts`.

- `splitSentences` splits on `.!?`.
- `realizeNarration` estimates timing at about 175 words per minute, with 0.42s after a sentence-ending word, 0.06s between beats, 0.16s between scenes, 0.2s head, 0.45s tail.
- `alignNarration` walks ElevenLabs word timestamps onto those beats when a recording exists.

The latest print-shop render did not call ElevenLabs. `scripts/proof-unseen.ts` timed the film with `realizeNarration` only. `out/unseen/props.json` has `audioFile: null`. Captions in that MP4 follow the estimated word clock, not a recorded performance.

### Creative direction

`POST /api/direct` calls `directVisual` in `server/direct-visual.ts`. It does not call the older coordinate director.

The pipeline is two model passes per film, plus deterministic normalization:

1. Explanation pass, prompt `explanationSystem` in `src/film/prompt.ts`. Windows of up to 6 sentences. Up to 3 attempts. On an empty accept, the window shrinks (minimum 2). Output cap 8000 tokens. If a reply hits `max_tokens` and does not end with `}`, the last scene object in that reply is dropped. Coverage must be contiguous from the cursor; a hole stops acceptance at the hole and the next call continues there. If a sentence cannot be covered, the request throws. Traces go to `public/jobs/direct-<timestamp>/`.
2. Material pass, prompt `materialSystem` in the same file. One call per scene, output cap 5000 tokens. A second call happens when the explanation approach was `designed` or `mixed`, a shortlist existed, and the first assembly contained no library piece.
3. `sceneFrom` in `src/film/normalize.ts` turns that into a `FilmPlan`.

The explanation pass is told the previous scene's `intent` and asked to extend the picture when the idea continues.

The material pass is told which library component names were already used. It is asked not to repeat one unless the object is evolving. Retrieval itself does not hide those names, except during the repetition repair below.

If three consecutive scenes share the same primary library component, the middle scene is reassembled with that name blocked.

`auditPlan` records warnings for an empty scene, more than two pieces, a props JSON longer than 900 characters, three identical primaries in a row, and a film whose every scene has the same `pose:built` signature. Warnings do not reject the plan. The print-shop run returned none.

### Long scripts

There is no single full-script director call. The 6-sentence window is the current mechanism for avoiding truncated JSON. A script that fails to cover a sentence fails the request instead of inserting a generic leftover scene.

### How scenes are represented

Active plan type: `src/film/types.ts`.

A scene has an id, kicker, chapter, intent, persists, changes, payoff, character pose and side, narration beats, pieces, an optional `illustrationGap` string, and a `built` label. Pieces are either:

- `source: "library"` with a component name and a props object, or
- `source: "procedural"` with graphic `fact`, `count`, `meter`, `record`, `flow`, or `compare`.

No coordinates are stored. Figure numbers are rewritten in `sceneFrom` to `FIG. 01  —  …` in scene order. The heading is the text after an em dash in the model's kicker, clipped to 28 characters.

If `approach` is `gap` and `illustrationGap` is set, the material pass is skipped and `inferPiece` builds a procedural graphic from the facts. If `illustrationGap` is set but `approach` is not `gap`, the gap is stored and a component can still be chosen. The print-shop scene 3 did that: kanban plus a written gap about the physical press.

### Remotion render

Active composition id is `Film` in `src/Root.tsx`, component `src/film/Film.tsx`, 1080×1920, 30 fps. `calculateMetadata` sets duration from `plan.durationSec`.

Each scene is a `<Sequence>` over its timed span. Library pieces render through `src/film/registry.tsx` inside `StageContext` (`src/remotion/lib/stage.tsx`). A render error in one piece is caught and replaced with `inferPiece`.

`server/render.ts` bundles `src/index.ts` and renders composition `Film` to `public/jobs/<id>/video.mp4`. Programmatic `bundle()` does not load `remotion.config.ts` by itself, so `server/render.ts` and `scripts/render-unseen-stills.ts` pass `withAlias` from `remotion.config.ts`. The `@` alias maps to `src/`.

Preview is `@remotion/player` in `studio/App.tsx`, also composition `Film`.

A quiet tick (`public/sfx/tick.wav`, volume 0.08) plays at each scene start.

### Corporate Defector in the renderer

See the Corporate Defector section. Behavior that is currently code, not identity:

- `sceneFrom` sets pose to `none` when any piece is a library component, unless character mode is `always`.
- `Film.tsx` `shownPose` hides the character whenever any piece is a library component, including when the saved plan says `present` and including `always`. The rendered print-shop film follows `shownPose`.
- Procedural-only scenes still place him on the left or right. The content column then starts at x=520 and is about 504px wide. The pose image is large and bottom-aligned, not a corner sticker. The `present` pose is mirrored when `side` is `right`. The `tablet` pose is not mirrored.

### Captions

`Caption` in `src/components/chrome.tsx` shows a short phrase of the current words in a black rounded pill, live word in white, other words in `#B7BDC7`. It is the app's caption, not a RemotionUI caption component. It sits near the bottom. The picture region reserves 320px at the bottom so the pill is less likely to cover the graphic.

### Preview and render

Studio: topic or script, notes, character mode, then script (if needed), direct, voice, preview. Render MP4 is a separate button and uses the timed plan currently in the player.

One-off test scripts, not the studio:

- `scripts/proof-unseen.ts` — direct a hardcoded script, write `out/unseen/props.json` and `summary.json`. No voice.
- `scripts/render-unseen-stills.ts` — stills at 72% through each scene.
- `npx remotion render src/index.ts Film out/unseen/film.mp4 --props=out/unseen/props.json` — the MP4 that was produced.

`npm run still` still targets the legacy `Explainer` composition, not `Film`.

## RemotionUI state

RemotionUI is a copy-paste registry (`remotion-ui` CLI 0.9.1 was used to `init --existing`). Components are source files in this repo. Nothing imports them from an npm package named remotion-ui. `remotion-ui.json` records the preset and aliases.

`npx remotion-ui add` did not reliably install dependencies on this Windows machine (`spawnSync npm ENOENT`). `scripts/vendor-remotionui.mjs` wrote the registry file contents instead. `scripts/fetch-catalog.mjs` wrote `src/film/catalog.json` from `https://remotionui.com/ai/components/<name>.json`. npm dependencies listed by the registry were installed into `package.json` (`@remotion/three`, `@remotion/transitions`, `maplibre-gl`, `three`, `@react-three/fiber`, `@react-three/drei`, `@paper-design/shaders-react`, `@turf/turf`, and the matching `@remotion/*` 4.0.533 packages).

### Counts and locations

`src/film/catalog.json` has 254 entries:

| scope | count | what the catalog uses it for |
| --- | --- | --- |
| material | 135 | eligible for scene retrieval |
| utility | 37 | installed source, not retrieved, not in `registry.tsx` |
| transition | 32 | installed source, not retrieved, not in `registry.tsx` |
| template | 20 | in `registry.tsx`, not in the shortlist |
| wrapper | 18 | in `registry.tsx`, not in the shortlist |
| background | 12 | in `registry.tsx`, not in the shortlist |

`src/film/registry.tsx` statically imports 185 components (everything except utility and transition). Files live under `src/remotion/primitives`, `src/remotion/scenes`, `src/remotion/lib`, `src/remotion/hooks`, and `src/compositions`.

`Root.tsx` does not register those components as their own Studio compositions. Only `Film`, `Explainer`, and `BoardProof` are registered.

### What the models see

The explanation model is told, in prose, that a later step can present phones, laptops, browsers, terminals, code, diffs, file trees, charts, meters, funnels, tables, comparisons, forms, search, notifications, kanban, timelines, roadmaps, org charts, calendars, documents, quotes, dashboards, connectors, cursors, and kinetic type. It is told not to name components.

The material model sees at most 8 catalog rows from `shortlist()` in `src/film/retrieve.ts`: name, description, prop name/type/required/description, and a usage example clipped in the catalog (about 900 characters). It also sees the six procedural graphic schemas in `materialSystem`. It may only emit library names from that shortlist. Unknown names, missing required props, and components flagged as needing media are dropped. If nothing valid remains, `inferPiece` builds a procedural graphic from the facts.

### How retrieval works

Token overlap against name, description, tags, and tasks, plus a hand-written synonym table that adds a fixed score to specific component names. At most two hits from the same tag family, then fill to 8.

Excluded from the shortlist even when they are `material`:

- any name starting with `map-` (tile-based maps)
- `device-mockup-zoom`, `media-frame`, `media-sequence`, `image-expand`, `b-roll-stack`, `zoom-pan-frame`, `text-mask-video`

The synonym table still names some of those (`device-mockup-zoom`, `map-flight`, `media-frame`). The filter removes them afterward, so those synonyms do not currently produce a candidate.

`globe-arc` and `globe-points-3d` are not removed by the `map-` prefix. Templates, wrappers, and backgrounds are never shortlisted. They can still render if something puts their name on a piece, because they are in `registry.tsx`.

### Theme and restyle currently applied

These are edits on top of the vendored source:

- `scripts/apply-stage.mjs` rewrites library `useVideoConfig` imports to `useStageConfig` from `src/remotion/lib/stage.tsx`, so a component laid out inside a slot uses the slot's width and height. `fps` and duration stay on the real composition. 152 files were rewritten this way.
- The same script pointed several sans Google font imports (Inter, Geist, and others) at Archivo. 57 files changed. Mono imports such as JetBrains Mono were left.
- `src/remotion/lib/code-syntax.tsx` `CODE_THEMES` light and dark palettes were recolored toward paper `#F3F0E6`, ink `#1C212B`, and coral `#E25B3A`. Many scenes read this palette.
- `src/remotion/lib/layout.ts` caps safe-area padding at 40px horizontal and 56px vertical.
- `presentProps` in `src/film/identity.ts` forces `theme: "light"`, `backgroundColor` to paper, `accentColor` to coral, and `validColor` to green when those props exist. It sets `speed` from scene duration (about 3.3s of designed motion, clamped 0.6–1.25). It blanks unset `subtitle`, `helper`, and `footnote` so defaults such as the form's "Takes about a minute." do not appear. It strips `holdSeconds`, `frame`, `children`, and color fields out of the model props before those overrides.

House tokens for procedural graphics and chrome are in `src/design.ts`: Archivo, IBM Plex Mono, paper, ink, coral `#E25B3A`, good `#2F8F5B`, bad `#D64545`. Frame is 1080×1920 at 30 fps. The background is the graph-paper `Paper` component in `src/components/chrome.tsx`.

### Limitations already hit

- Vendored components are full-frame scenes. Inside a slot they reflow to the slot size, but their internal composition (centered cards, tall empty columns, large step spacing) is still the component's.
- Two pieces stack vertically with explicit heights. The material prompt says never use three. Phone width is why side-by-side library scenes are not laid out.
- A component whose render throws is replaced by a procedural fallback. That fallback is not reviewed by the model.
- There is no pixel or DOM check on the studio render path. Still review was a manual script.
- `catalog.json` is a snapshot of the remote prop docs. It can drift from the vendored source.
- Re-running `scripts/vendor-remotionui.mjs` would overwrite theme, font, and stage-import edits.
- Map tiles, image `src` components, and 3D/shader scenes are installed. The print-shop test did not exercise them. Headless WebGL and map styles were not validated here.
- The Windows RemotionUI CLI could not spawn `npm`. `scripts/install-remotionui.mjs` is the failed path. `scripts/vendor-remotionui.mjs` is the path that populated the tree.

## Current creative-direction system

This is what the code does. It is not a claim that the split is the right creative system.

### What the director outputs

JSON scenes with `sentenceIndexes`, `intent`, `persists`, `changes`, `payoff`, `dominates`, character pose and side, kicker, `needs`, `facts`, `approach` (`designed`, `procedural`, `mixed`, `gap`), and `illustrationGap`.

`facts` are supposed to be short labels and numbers taken from the narration. `needs` are ordinary-language objects.

### What it does not output

Component names, pixel coordinates, paths, font sizes, or colors. The material pass is a separate model call and is the step that names components and fills props.

### Passages and continuity

Up to six sentences per call. The next call receives the previous scene's intent string only, not the previous picture, props, or component. Continuity of the actual graphic depends on the material model reading "Already used" and choosing to evolve or change.

### What the viewer must understand

That is the `intent` string, plus persists / changes / payoff / dominates. The material prompt repeats those fields and the narration text. The renderer does not draw `intent`. It draws pieces.

### How the visual is built

`piecesFrom` keeps at most two pieces. Library props are filtered to names listed on that component in `catalog.json`. Procedural props are coerced into the six graphic shapes. `inferPiece` is the fallback: key/value lines become a record, three or more lines become a flow, two lines become a compare, a number becomes a count, otherwise a fact.

`Film.tsx` gives one library component the full content width when it is the picture. Procedural graphics use flex layout in `src/film/procedural.tsx` (ink stroke, paper card, coral on the last or contrasting item). With no character, procedural blocks align to the top of the region. With a character, they vertically center in the side column.

### Creative rules currently encoded in code or prompts

These are implementation choices sitting next to `references/creative-standard.md`. They are not the same document.

From `explanationSystem` and `materialSystem`:

- one mechanism can span sentences; a new scene starts when the idea turns
- do not name components in the first pass
- presenter on an opening, turn, or close; `none` when the explanation needs width
- do not invent statistics; words come from the narration
- one object, or two if both must be seen; stack on a tall phone
- a fork is a comparison, not one sequence; a board is a board, not a word list
- do not pick a component that needs an image, video, or map tile
- kickers look like `FIG. 01  —  THE TICKET`

From renderer and tokens:

- paper grid, ink, coral emphasis, green/red only on the procedural pass/fail colors
- Archivo and IBM Plex Mono for house type
- black caption pill
- library components forced to the light/paper/coral overrides above
- character removed from any scene that contains a library component (`shownPose`)

`creative-standard.md` is the separate quality document. It describes the reference films. The prompts and tokens above are what this checkout actually enforces.

## Narration

Implementation: `server/voice.ts`.

Current settings sent to ElevenLabs `text-to-speech/{id}/with-timestamps`:

- voice: the account voice whose name matches `/eric a/i`, unless `ELEVENLABS_VOICE_ID` is set
- model: `eleven_multilingual_v2` unless `ELEVENLABS_MODEL` is set
- `stability: 0.46`
- `similarity_boost: 0.8`
- `style: 0.2`
- `use_speaker_boost: true`
- `speed: 1.05`
- sentences joined with `<break time="0.4s" />`

If that SSML request fails, the same endpoint is called again with plain text and no breaks. Word timings come from the character alignment. Tokens that look like SSML leftovers are dropped.

The comment at the top of `voice.ts` records the pacing the settings were aimed at: reference narration around 170–185 words per minute, short pauses inside a thought, about 0.38–0.5s after a sentence, longer turns between ideas. The code does not implement those pause lengths separately. It inserts one 0.4s break between sentences and sets speed to 1.05.

Performance references on disk:

- `references/reference-ai-voice/ref-4_converted.mp3`
- `references/reference-ai-voice/ref-6_converted.mp3`
- `references/reference-ai-voice/ref-8_converted.mp3`

Those filenames line up with `ref-4.mp4`, `ref-6.mp4`, and `ref-8.mp4` in `references/Video references Good/`.

What is in use: Eric A through ElevenLabs, with the settings above, then `alignNarration` when the call succeeds. The studio still produces a silent timed preview if the voice call fails.

What is imperfect: the break tag is a single compromise, not the pause pattern described in the file comment; alignment can include junk around the tag, which the filter tries to remove; the print-shop MP4 has no voice at all. Residual fidelity limits that come from the microphone used to make the current Eric A clone are not treated as a defect in this pipeline.

## Corporate Defector

There is no separate Character Bible file in the repo. The written rules are section 10 of `references/creative-standard.md`: he is a recurring presenter, the approved art is the identity, he is not to be redesigned, he is not required in every frame, and he should not occupy the canvas when the explanation needs it.

Canonical art in `references/my-character/`:

- `Hooded masked figure presenting to the right.png` (897374 bytes)
- `Hooded Corporate Defector With Tablet.png` (813011 bytes)

The renderer does not read that folder. It reads:

- `public/character/present.png` (897374 bytes, same size as the presenting file)
- `public/character/tablet.png` (813011 bytes, same size as the tablet file)

Poses in code: `present`, `tablet`, `none`. Sides: `left`, `right`. Drawing is `Character` in `src/components/chrome.tsx`: bottom-aligned, about 1200px tall in the legacy layout math, shadow ellipse, slight bob. `present` on the right is scaled `scale: "-1 1"`.

Locked identity is the two PNGs and the instruction not to redesign them. Placement, scale, when he appears, and the `shownPose` override are current renderer behavior.

## Major experiments and findings

### 1. Small fixed visual vocabulary

`src/board/` and `server/direct-board.ts`. The model picked from statement, sentence, plates, meter, record, stamp, flow, and pair. A layout component (`BoardFilm.tsx`) placed them. No coordinates.

What worked: objects were aligned, legible, and on-paper. Nearby sentences could share a scene.

What failed: different ideas collapsed into the same few cards and meters. The pictures were repetitive.

Lesson recorded in `creative-standard.md` section 16: a tiny menu is not a creative system.

### 2. Raw mark / coordinate drawing

`src/types.ts` `DrawNode`, `src/director/prompt.ts` `directorSystem`, `src/components/scenes.tsx`, `src/Explainer.tsx`. The model emitted a tree of text, rect, ellipse, line, path, marks, count, swap, and group in a 0–100 space.

What worked: the picture could be an object that was not on the small menu.

What failed: the model was also doing illustration, type, alignment, and coordinates. Output collided, clipped, and looked undesigned. `src/director/local.ts` is a non-LLM fallback that draws a generic rect, line, and ellipse from the first words of a sentence.

Lesson recorded in the creative standard: low-level drawing freedom did not produce reference-level design.

### 3. Long-director output truncation

One director call for a whole script, especially with a coordinate tree, hit the output token limit. The JSON ended mid-scene. Early versions could continue with a generic picture for the uncovered sentences, which hid the miss.

Lesson: a technically complete timeline could still drop the back half of the narration. Coverage has to be checked.

### 4. Passage-based full-script direction

`server/llm.ts` `directFilm` (legacy coordinate path) and `server/direct-visual.ts` (current path) both walk the script in windows, accept only a covered prefix, and throw if a sentence is never directed. The current window is 6 sentences. The old coordinate function used 8.

What worked: the print-shop script's sentences are all present on scenes in `out/unseen/summary.json`.

What is still thin: the only continuity passed forward is the previous intent sentence, plus a list of component names at material time.

### 5. RemotionUI discovery and integration

The library was brought in as editable source so the picture could start from designed objects (forms, boards, tables, timelines) instead of rectangles. Retrieval was added so the explanation model would not pick from a 254-name enum.

What worked: the print-shop frames contain real form, kanban, table, and timeline components, themed toward paper and coral, with house captions and kickers. Type is inside the components rather than hand-placed.

What failed or stayed awkward: the CLI install on Windows; full-frame components inside a phone slot; default component layout and chrome; character overlap until `shownPose` removed him from library scenes; invented component defaults until subtitle/helper/footnote were blanked.

### 6. Latest unseen print-shop test

See the next section. It was one generated film, not a hand-authored scene list. It is the current sample of this pipeline, not a tuned demo.

## Latest output

Script, from `scripts/proof-unseen.ts`:

> A neighborhood print shop used to take orders on paper slips. Now the order starts on the website. The customer uploads a file, picks a size, and sets a due date. Those three facts become one ticket. The ticket waits at the counter until a press is free. At the press, someone opens the file and checks the color against the proof. If the color is off, the ticket goes back and the due date does not move. If the color holds, the sheets go to the finishing table. Finishing checks the cut and bags the job. Only then does a text go to the customer. The bag is already on the shelf when the text arrives. The customer does not call to ask where the order is. The shop can see every open ticket, and which ones are late, on one board.

Notes passed to direction: "Phone frame. Paper, ink, and coral. Do not invent numbers that were not spoken." Character mode: `auto`. No voice.

Title on the plan: "From Paper Slip to Press". Duration about 57.8 seconds. Trace: `public/jobs/direct-1791442398972/`.

| Scene | Narration covered | Plan `built` | Plan character | Gap |
| --- | --- | --- | --- | --- |
| 1 | Paper slips, then the website | `compare` | present | none |
| 2 | File, size, due date, one ticket | `form-fill-sequence` | none | none |
| 3 | Counter, then press and color check | `kanban-move` | none | press and physical proof sheet |
| 4 | Color off loops; color holds goes to finishing | `comparison-table` | none | none |
| 5 | Cut, bag, shelf, text, customer does not call | `timeline-steps` | present in the saved plan | none |
| 6 | Open tickets and which are late, one board | `kanban-move` | none | none |

The rendered MP4 hides the character on scene 5 because `shownPose` treats any library piece as `none`. Scene 1 still shows him, because `compare` is procedural.

Outputs:

- `out/unseen/film.mp4` (about 6.2 MB, 1733 frames, no audio)
- `out/unseen/scene-1.png` … `scene-6.png` (frame at 72% of each scene, after the character-collision re-render)
- `out/unseen/props.json`, `out/unseen/summary.json`
- `out/unseen/props-v1.json` is an earlier direction of the same script (tab switch, form, kanban, procedural flow, timeline, fact, flow). It is not the MP4.

Observed on the rendered stills, for the next agent to judge against the references:

- Scene 1 is two labeled cards beside the character.
- Scene 2 is a filled form with a coral "Ticket created" button on the paper grid. The "Takes about a minute." default is not on this render.
- Scene 3 is two kanban columns. At the sampled frame the card in Press still reads "Waiting for a press".
- Scene 4 is a comparison table: color off / color holds, with checks and an x.
- Scene 5 is a tall coral timeline, "No call", four steps, no character in the picture. Steps are widely spaced.
- Scene 6 is a three-column board labeled Making / Finishing / Bagging with Ticket A–G marked Open or Late. Those ticket names are not in the script.
- Kickers and the black caption pill are house chrome. The objects inside are largely the components' own cards, columns, and fields.
- Large empty regions remain around the form, the board, and the timeline.

An earlier still set, before `shownPose` and the caption reserve, had the character's hand over a timeline label and the form's default subtitle. Those stills were overwritten by the re-render.

## Current known creative gap

The print-shop film is more mechanically finished than the coordinate-drawn frames: type sits in components, alignment is the component's, captions and the paper grid are consistent, and different scenes use different objects.

It is not considered on par with the reference films.

Symptoms visible in this output and called out in `creative-standard.md` section 16:

- Component defaults and component chrome still read as product UI placed on the house background.
- Scene composition is often one centered or top-weighted object plus empty paper, rather than a frame composed as a whole.
- Continuity between scenes is a cut to the next component. The previous object does not stay and change.
- The character appears as a side presenter on a procedural card, or not at all, rather than as part of a designed frame.
- Placeholder labels (Ticket A–G, "Waiting for a press" inside the Press column) show up even when the prompt says not to invent.
- The physical press and proof were named as an illustration gap and were not drawn. The scene used a kanban anyway.
- Motion is whatever the chosen component already does, plus a tick. There is no film-level motion design in the plan.

Those are observations. The next agent should watch `out/unseen/film.mp4` and the reference videos and decide what they mean.

## Previous code that may be obsolete

Nothing was deleted for this handoff.

| Path | Status |
| --- | --- |
| `server/dev.ts`, `server/direct-visual.ts`, `server/llm.ts` (`complete`, `writeScript`), `server/voice.ts`, `server/render.ts`, `server/env.ts` | Active server |
| `studio/App.tsx`, `studio/main.tsx` | Active UI. Player and render target `Film` |
| `src/film/**` | Active picture system |
| `src/remotion/**`, `src/compositions/**`, `src/film/catalog.json`, `src/film/registry.tsx`, `remotion-ui.json` | Active installed library |
| `src/components/chrome.tsx` (`Paper`, `Kicker`, `Caption`, `Character`) | Active, also used by legacy `Explainer` |
| `src/design.ts`, `src/timing.ts`, `src/index.ts`, `src/Root.tsx` | Active. `Root.tsx` also registers legacy compositions |
| `src/Explainer.tsx`, `src/components/scenes.tsx`, `src/types.ts` `DrawNode` / `VideoPlan`, `src/director/prompt.ts` `directorSystem`, `src/director/normalize.ts` `normalizePlan`, `server/llm.ts` `directFilm` | Legacy coordinate pipeline. Not called by `/api/direct`. `scriptSystem` in `prompt.ts` is still the script writer. `extractJson` in `normalize.ts` is still used by the active director |
| `src/director/local.ts` | Legacy non-LLM picture fallback. Studio no longer calls it |
| `src/board/**`, `server/direct-board.ts`, `server/proof-board.ts`, composition `BoardProof` | Legacy fixed-block experiment |
| `scripts/proof-unseen.ts`, `scripts/render-unseen-stills.ts` | Test scripts for the print-shop film |
| `scripts/vendor-remotionui.mjs`, `scripts/fetch-catalog.mjs`, `scripts/apply-stage.mjs`, `scripts/build-registry.mjs` | How the library was vendored, indexed, restyled, and registered. Re-running vendor or apply-stage will rewrite library source |
| `scripts/install-remotionui.mjs`, `scripts/clean-semicolons.mjs` | Install attempt that failed on Windows; one-off semicolon cleanup |
| `public/jobs/direct-*`, `public/jobs/voice-*`, `public/jobs/board-proof/` | Historical traces. The print-shop trace that matches the MP4 is `public/jobs/direct-1791442398972/` |
| `out/unseen/props-v1.json` | Earlier generation of the same script. Not the MP4 |

Safe to delete only after checking those imports. `directorSystem` is unused by the studio but still exported. `normalizePlan` is only used by `directFilm`.

## Reference folder

`references/` is the packet that should travel with the repo. Paths are as stored, including spaces.

### `creative-standard.md`

Quality bar for the product: what the reference films feel like, composition, continuity, type, color, the Corporate Defector rules, motion, captions, mobile framing, and failure modes already seen. It says it is not an implementation spec.

### `Video references Good/`

Visual quality bar. Files:

- `ref-1-styleA.mp4`
- `ref-2-styleA.mp4`
- `ref-3.mp4`
- `ref-4.mp4`
- `ref-5.mp4`
- `ref-6.mp4`
- `ref7.mp4` (no hyphen)
- `ref-8.mp4`
- `ref-9.mp4`
- `ref-10.mp4`

### `reference-ai-voice/`

Narration performance audio: `ref-4_converted.mp3`, `ref-6_converted.mp3`, `ref-8_converted.mp3`.

### `txt transcripts/`

- `transcript 1.txt` — timed spoken transcript, AI employee / N8N / spreadsheet system, ending in a profile-link close.
- `transcript 2.txt` — timed spoken transcript, four levels of using AI at work, ending in a community close.
- `ref-1-styleA_script.txt` — short untimed script for a fixed-window rate limiter. It matches the name `ref-1-styleA.mp4` but this file does not state that it is an official transcript of that video.

### `my-character/`

The two approved Corporate Defector drawings listed above. Identity source. The runtime copies are `public/character/present.png` and `public/character/tablet.png`.

### `app-reference/website-reference.txt`

One line: `https://www.brainrotshorts.com/ai-motion-graphics-generator`

### `failed videos/`

- `failed experiment.mp4` (about 54 MB)
- `failed experiment 2.mp4` (about 23 MB)

Kept as earlier output that was not accepted. The filenames do not say which pipeline rendered them. Compare them to the reference films and to `out/unseen/film.mp4` rather than trusting a label.

### Latest generated film (not inside `references/`)

`out/unseen/film.mp4` and `out/unseen/scene-1.png` through `scene-6.png`.

## Open questions

- Is a two-call split (explanation, then component assembly) actually how this film should be directed?
- Should the explanation model ever see component names, prop shapes, or rendered frames?
- Is keyword-and-synonym retrieval selecting the objects the narration needs, or the nearest catalog metaphor?
- When should a RemotionUI scene be used, when should a small procedural graphic be used, and when is the honest result an illustration that does not exist yet?
- Can these components be restyled into the reference films' identity, or do they remain a different visual language even after the paper/ink/coral overrides?
- What should happen to full-frame components on a 1080×1920 canvas so the frame is composed rather than a single widget floating on paper?
- How should one object persist and change across sentences, instead of each scene mounting a new component?
- When does Corporate Defector belong in a frame that also contains a designed component, and how is that composed without covering the information?
- What visual system should carry places, rooms, and props that the component library does not contain?
- Is estimated timing without a voice an acceptable preview, and does the current 0.4s break plus speed 1.05 match the reference narration closely enough?
- Which legacy modules (`Explainer`, `board`, `directFilm`, `local`) are still useful as reference, and which are noise?
- Does the print-shop film fail in the same way as `references/failed videos/`, or in a different way?
