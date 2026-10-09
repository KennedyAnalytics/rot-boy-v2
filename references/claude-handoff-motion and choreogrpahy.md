# AI Motion Graphics Studio
## Codex / OpenAI API Implementation Handoff
### Phase: Motion Choreography & Renderer Expressiveness v1

# 1. Mission

Implement the first bounded **Motion Choreography & Renderer Expressiveness** phase for the AI Motion Graphics Studio.

The studio already has an approved whole-film visual direction system.

Do not redesign it.

The purpose of this phase is to make the approved FilmDirection system **perform with materially richer motion, clearer physical causality, stronger object behavior, and more premium visual execution**.

The current system already knows:

- what should persist;
- what should transform;
- what should carry;
- what should reset;
- which objects recur;
- how the presenter should behave;
- how chapters relate;
- when mutable state should appear.

This phase must improve **how those decisions are visibly executed**.

Core question:

> How should the existing directed visual system physically perform so the viewer experiences motion that explains, transforms, connects, and directs attention rather than merely changing snapshots?

The target is not “more animation.”

The target is:

> **more expressive, more physical, more intentional explanatory motion.**

---

# 2. Current authoritative baselines

## Mara visual-direction baseline

`out/continuity-v1/mara-v1-production/film.mp4`

Status:

> current operational Mara baseline and current visual-direction reference

This is the primary comparison target for this phase.

## Larkspur cold-script fixture

`out/continuity-v1/larkspur-verified/film.mp4`

Status:

> current cold-script validation fixture

Larkspur is not the creative-quality benchmark.

## Preserved earlier baselines

`out/prod-harden/film.mp4`

Status:

> before/after and regression baseline

`out/prod-cold/film.mp4`

Status:

> earlier cold-path regression baseline

Do not overwrite any retained baseline.

Produce new phase-specific output paths.

---

# 3. Current approved architecture

The following architecture is authoritative and should remain intact unless a concrete blocker proves otherwise.

## FilmDirection

Typed whole-film `FilmDirection` is approved.

Approved ordering:

> structure → FilmDirection → beats → stages → alignment → render

FilmDirection currently provides typed decisions for concepts including:

- persistent object identity;
- chapter entry/exit state;
- boundary intent;
- composition mode;
- presenter mode;
- focus;
- recap references;
- actual / hypothetical / recap state;
- carry / transform / reset behavior.

Do not replace FilmDirection.

This phase consumes it.

## Timing authority

Actual ElevenLabs word alignment remains authoritative.

Sentence- and phrase-aligned cues are production timing authority.

Do not replace this with:

- beat guesses;
- fixed durations;
- music-grid timing;
- ASR timing;
- arbitrary choreography clocks.

## Structured film grammar

Keep:

1. persistent spine;
2. directed stage;
3. annotations;
4. presenter;
5. captions.

## QC architecture

Keep:

- Tier 1 technical QC;
- Tier 2 deterministic conformance;
- Tier 3 visual/art-direction critique.

## Action Registry

Action Registry v1 remains accepted production architecture.

Do not reintroduce topic/chapter-name routing.

Action selection must remain based on the shape of what is happening.

## Renderer

Keep the current Remotion / React / SVG / procedural / bespoke rendering stack.

Do not migrate frameworks merely to gain animation novelty.

If a concrete renderer limitation emerges, document it with evidence.

---

# 4. Documents and implementation to inspect

Before changing architecture, inspect the current authoritative project state.

Read:

- `MASTER_HANDOFF_AI_MOTION_GRAPHICS_STUDIO.md`
- `references/creative-standard.md`
- `references/MOTION_STYLE_GUIDE.md`
- `references/CREATIVE_SYSTEM_HANDOFF.md`
- `references/PRODUCTION_INTEGRATION_HANDOFF.md`
- `references/STUDIO_MEMORY.md`
- `references/Codex -OpenAI API Implementation Handoff.txt`
- Corporate Defector Character Bible
- `out/continuity-v1/ACCEPTANCE_EVIDENCE.md`
- current Continuity v1 implementation under `src/film/`
- current FilmDirection schema/types
- current `DirectedStage`
- current Action Registry
- current alignment/cue helpers
- current QC scripts
- current Mara plan/props/direction artifacts
- current Larkspur artifacts

Inspect the actual current renders.

Do not infer current visual behavior from code alone.

---

# 5. Why this phase exists

Continuity & Film Direction v1 solved the major structural creative problem.

The Mara film now:

- behaves as one directed visual explanation;
- carries recurring objects;
- uses causal sequencing;
- varies composition;
- integrates presenter presence intentionally;
- retrieves earlier objects during recap;
- distinguishes actual, hypothetical, and recap state;
- avoids the previous chapter-card feeling.

But the renderer still has clear expressive limitations.

Current documented limits include:

- generic library components often change as cue-driven snapshots rather than animated transformations;
- `carry` and `transform` are structurally correct but often visually shallow;
- some action execution remains abstract line/icon motion;
- many states visibly “switch” rather than physically evolve;
- object activation is not always obvious enough;
- presenter performance remains mostly static;
- contextual visual authorship is constrained by fixed constructions;
- some diagram labels remain too detailed at phone scale;
- several useful action shapes are not yet richly represented.

This phase addresses those limits.

---

# 6. Primary phase goal

The governing owner goal is:

> **Make the visuals as close to perfect as possible within the current approved architecture.**

The phase should not pass simply because new motion primitives exist.

It must visibly improve the film.

The new Mara render should feel:

- more physical;
- more fluid;
- more causal;
- more intentional;
- more premium;
- easier to follow;
- less mechanically assembled;
- more like professionally choreographed motion design.

---

# 7. Choreography principle

Use this as the main creative rule:

> Motion must reveal meaning, state, causality, hierarchy, or continuity.

Do not animate simply for energy.

A valid motion should answer at least one question:

- What changed?
- Where did it go?
- What caused this?
- What is active?
- What should I look at?
- What persisted?
- What transformed?
- What was blocked?
- What accumulated?
- What returned?
- What became the result?

If motion does none of these, question whether it belongs.

---

# 8. Required capability: real animated state transformation

This is a core acceptance requirement.

Where mutable components currently jump between cue-driven snapshots, introduce reusable motion semantics for truthful state change.

Examples may include:

- card changes status while preserving identity;
- record expands and gains a field;
- item moves between workflow columns;
- notification opens into its underlying record;
- tab selection physically reveals a new state;
- one object becomes a transformed version of itself;
- a value fills, increments, accumulates, or resolves;
- a status visibly changes from pending → processing → complete.

The key invariant:

> The viewer should be able to see what changed and understand that the later state belongs to the same object.

Do not merely crossfade unrelated snapshots when persistent identity matters.

---

# 9. Required capability: richer `carry`

Continuity v1 can declare `carry`.

This phase must make `carry` visibly meaningful.

A carried object should preserve enough of:

- position;
- identity;
- scale relationship;
- shape;
- color/state semantics;
- visual memory

that the viewer understands:

> this is the same thing continuing.

The implementation may reposition or reframe it, but the continuity should be legible.

Avoid:

> disappear → unrelated redraw elsewhere

when `carry` is intended.

---

# 10. Required capability: richer `transform`

`transform` must become more expressive than:

> old state gone → new state appears.

Where practical, the viewer should perceive:

> old object → changed object.

Examples:

- email becomes a structured request;
- request becomes an action;
- raw information becomes a record;
- order becomes replacement;
- inputs combine into a result;
- workflow expands into a larger system;
- several items collapse into a summary object.

Exact animation technique is your decision.

The semantic relationship matters more than any particular tween.

---

# 11. Action vocabulary expansion

Do not create a giant universal verb catalog.

Extend the executable vocabulary only where naturally useful to the actual Mara story or the current visual system.

Candidate motion semantics include:

- `traverse`
- `return`
- `transform`
- `select`
- `block`
- `accumulate`
- `reveal`
- `split`
- `merge`
- `resolve`
- `handoff`
- `compare`

Do not implement all of these merely because they are listed.

Select the smallest reusable vocabulary that materially improves the current film.

Each new action shape should:

- be typed;
- have real renderer execution;
- support alignment-based cue timing;
- avoid chapter-specific branching;
- be reusable by future stories.

---

# 12. Physical action behavior

Increase physical clarity.

Examples of desired behavior:

## Traverse

An object should visibly move from source to destination.

The viewer should understand:

- where it came from;
- where it went;
- what boundary it crossed.

## Return

Returned information should visibly reconnect with the initiating context.

Avoid disconnected “result appears” behavior where physical return would clarify causality.

## Select

Selection should make the chosen item visibly distinct and focus attention.

## Block

A blocked path should visibly stop, reject, deflect, lock, or otherwise communicate refusal.

## Accumulate

Multiple pieces should visibly collect into a larger state, count, stack, bundle, or aggregate.

## Transform

Identity should survive through the state change whenever possible.

Use your own judgment on exact visual execution.

---

# 13. Object activation

Improve the clarity of which object is currently active.

The active object may communicate activation through combinations of:

- motion;
- scale;
- focus;
- local contrast;
- annotation;
- isolation;
- connector behavior;
- position change;
- surrounding de-emphasis.

Do not rely only on color.

The viewer should rarely have to ask:

> Which thing is the narration talking about right now?

---

# 14. Composition choreography

Motion is not only object animation.

Improve how the overall composition moves through ideas.

Possible behaviors include:

- push into detail;
- pull back to system view;
- shift focus while preserving context;
- let an object migrate into the next chapter;
- let the presenter surrender the frame;
- let annotations disappear when the mechanism becomes primary;
- expand one object to become the next stage;
- collapse a mechanism back into the persistent model.

Do not mechanically use the same transition pattern repeatedly.

FilmDirection should still determine the intent.

This phase improves the execution.

---

# 15. Reframing

G07 remains authoritative.

Reframing should occur for a reason.

Examples:

- reveal a hidden relationship;
- move from object detail to system context;
- isolate the next active mechanism;
- create room for causal action;
- make recap retrieval obvious.

Avoid camera-like motion that exists only to make the film feel busy.

---

# 16. Presenter choreography

Corporate Defector identity remains locked.

Do not redesign the character.

Current limitations are primarily performance and blocking.

Within currently available assets, improve how presenter presence supports attention.

Examples:

- enter only when useful;
- remain still while object motion carries explanation;
- yield space before full-stage mechanisms;
- visually point toward the current active region when the available pose supports it;
- avoid competing motion between presenter and stage;
- preserve safe-zone compliance.

Do not fabricate unsupported character motion if the production assets do not support it.

If richer presenter performance clearly requires new assets, document that as a bounded capability gap rather than inventing inconsistent animation.

---

# 17. Phone-scale simplification

Continue reducing detail that does not survive phone-scale viewing.

Do not solve this by shrinking text.

Prefer:

- fewer simultaneous labels;
- progressive disclosure;
- larger active values;
- contextual annotation;
- motion that reveals meaning instead of static explanatory copy;
- replacing words with obvious physical behavior when possible.

A motion sequence should often let the renderer remove text because the behavior itself communicates the idea.

---

# 18. Motion hierarchy

Not everything should move at once.

At any point, establish:

- primary motion;
- secondary supporting motion;
- held context.

Avoid simultaneous independent animation that splits attention.

The active teaching object should dominate.

Annotations, presenter, spine, and supporting UI should remain subordinate unless intentionally taking focus.

---

# 19. Persistent-stage choreography

Continuity v1 introduced the persistent directed stage.

Deepen it.

The stage should increasingly feel like a living visual system rather than a sequence of mounted layouts.

Use the existing persistent stage to support:

- object carry-over;
- accumulation;
- state evolution;
- scale change;
- transformation;
- recap retrieval.

Do not preserve objects forever.

Use explicit reset when continuing them would create clutter or false continuity.

---

# 20. Recap choreography

Recap should continue retrieving familiar objects.

This phase should improve how that retrieval feels.

Prefer:

- familiar objects returning;
- earlier states collapsing into a summary;
- known objects arranging into the final model;
- visible progression from earlier state to final state.

Avoid replacing the recap with a fresh list of bullets.

---

# 21. Action Registry relationship

Do not discard Action Registry v1.

Decide whether Motion Choreography should:

- extend the registry;
- add renderer primitives consumed by the registry;
- add reusable transition/choreography helpers beneath it;
- or use a combination.

Choose the smallest coherent architecture.

Do not create parallel action systems.

---

# 22. Renderer expressiveness

This phase should reduce dependence on overly fixed constructions.

That does not mean removing the library.

The goal is:

> library components should become materials that can participate in richer directed motion.

Look for opportunities to make existing components more composable through:

- stable object IDs;
- exposed anchors;
- state interpolation;
- enter/exit semantics;
- object references;
- motion channels;
- per-object focus state;
- persistent identity.

Avoid making every component universally configurable.

Implement only what the real film demonstrates is necessary.

---

# 23. No arbitrary universal motion constants

Do not impose universal:

- easing values;
- spring values;
- beat durations;
- transition durations;
- movement distances.

Measure and tune against rendered evidence.

Reusable defaults are acceptable if they remain contextual and overrideable.

The motion style should emerge from the actual film and positive references, not one global numeric recipe.

---

# 24. State truth remains mandatory

G13 remains authoritative.

Richer animation must not weaken state truth.

Do not animate:

- future state before narration;
- hypothetical state as actual;
- recap state as new live state;
- result before causal step;
- completed state while action is still being introduced.

Alignment authority remains the timing source.

Motion interpolation must respect cue boundaries.

---

# 25. QC expansion

Do not turn aesthetic judgments into brittle deterministic tests.

But extend deterministic checks where appropriate.

Possible examples:

- required action cue exists before state transition;
- persistent object identity survives carry/transform boundaries;
- transformed object has a valid prior source;
- presenter bounds remain compliant;
- no object reports a state before its cue;
- animation starts/ends within valid timing range.

Use Tier 2 for deterministic truth.

Use Tier 3 for:

- whether motion reads clearly;
- whether action feels physical enough;
- whether hierarchy is obvious;
- whether transitions feel intentional;
- whether motion is distracting;
- whether visual density remains legible;
- whether the film feels premium.

---

# 26. Real vision/critic loop is required

The real visual-intelligence loop is required for acceptance.

Do not substitute:

- deterministic fixtures;
- mocked critic output;
- hand-authored acceptance;
- local fake direction.

Use configured authenticated production providers.

Preserve:

- provider provenance;
- raw critic response;
- model identity where available.

Cross-provider counts must not be treated as calibrated numeric scores.

The critic is evidence, not an absolute oracle.

Rendered human/source-of-truth inspection remains final authority.

---

# 27. Provider behavior

Continuity v1 established that authenticated production-provider fallback is acceptable when:

- the intended provider is unavailable;
- a configured production provider is used;
- provenance is retained;
- raw responses are preserved;
- no substitute evidence is silently introduced.

Maintain that behavior.

Do not treat one provider’s critic count as directly comparable to another provider’s count.

---

# 28. Real render loop is required

Do not pass this phase on component previews alone.

Render the actual Mara film.

At minimum:

1. implement;
2. render;
3. inspect;
4. run QC;
5. run visual critic;
6. identify meaningful remaining defects;
7. repair;
8. rerender;
9. compare against the approved Continuity v1 baseline.

Repeat as needed within the bounded phase.

---

# 29. Primary comparison

Compare the final candidate against:

`out/continuity-v1/mara-v1-production/film.mp4`

at phone scale.

The new version should be materially better on:

- G01 visible explanatory action;
- G02 object persistence/state progression;
- G03 attention hierarchy;
- G04 teaching scale;
- G06 causal motion;
- G07 intentional reframing;
- G10 presenter behavior;
- G11 recap retrieval;
- G13 state truth.

Additionally evaluate:

- physicality;
- continuity of motion;
- object activation clarity;
- transform legibility;
- carry legibility;
- motion hierarchy;
- premium feel;
- reduction of snapshot-like state changes.

---

# 30. Larkspur role

Keep Larkspur as the current cold-path regression fixture.

This phase does not require Larkspur to become a creative benchmark.

Use it to ensure new motion/choreography infrastructure does not break:

- cue-aware internal state;
- cold-script compatibility;
- state truth;
- production rendering;
- QC;
- generic components.

Do not force new choreography into Larkspur merely to prove a vocabulary item.

---

# 31. Do not reopen

Do not reopen:

- FilmDirection;
- Remotion;
- narration voice;
- ElevenLabs model;
- supplied-script preservation;
- alignment authority;
- structured film grammar;
- persistent spine;
- Corporate Defector identity;
- Action Registry principle;
- QC tier separation;
- safe-area system;
- Studio Memory governance;
- current authoritative baselines.

Do not reintroduce:

- chapter-name renderer branches;
- unrestricted raw-coordinate generation;
- one-shot mega-prompts;
- generic AI B-roll;
- music-grid timing;
- a second animation framework without concrete evidence.

---

# 32. Studio-memory rule

Follow:

`references/STUDIO_MEMORY.md`

Per-film motion repair does not automatically become studio-wide doctrine.

Hard rule:

> A bug does not become a style rule.

Prefer:

> deterministic lesson → code + regression

Prefer:

> repeated creative lesson → candidate → evidence → promotion

Do not promote new universal choreography rules solely from one Mara render.

---

# 33. Scope discipline

Do not attempt to solve every renderer limitation in v1.

Prioritize changes that produce the largest visible improvement in the actual Mara film.

A good v1 should prove:

- richer animated state transformation;
- more expressive carry/transform;
- clearer physical action;
- stronger object activation;
- stronger composition choreography;
- preserved state truth;
- no regression in continuity.

Do not overbuild an abstract animation framework.

---

# 34. Acceptance requirements

Motion Choreography & Renderer Expressiveness v1 does not pass merely because new primitives exist.

It must demonstrate rendered improvement.

## A. Animated state transformation

PASS only if at least several meaningful Mara state changes visibly transform rather than merely swap snapshots.

## B. Carry/transform execution

PASS only if recurring objects visibly preserve identity through carry/transform moments.

## C. Physical action

PASS only if causal actions are materially clearer and more physical than the Continuity v1 baseline.

## D. Object activation

PASS only if the currently narrated object/action is easier to identify at phone scale.

## E. Composition choreography

PASS only if the overall film feels more fluid and less mechanically mounted without becoming visually busy.

## F. Presenter behavior

PASS only if presenter motion/presence supports attention and does not compete with mechanisms.

## G. Phone-scale readability

PASS only if motion and progressive disclosure reduce or preserve visual density rather than worsening it.

## H. State truth

PASS only if richer animation preserves phrase-aligned state truth.

## I. No architecture regression

PASS only if:

- FilmDirection remains authoritative;
- Action Registry remains generic;
- cold-path rendering remains functional;
- QC remains operational;
- narration and baselines remain unchanged.

## J. Visual-quality bar

Most importantly:

> The new Mara render must look materially more polished, physical, intentional, and professionally choreographed than `out/continuity-v1/mara-v1-production/film.mp4`.

---

# 35. Evidence required

Return:

1. Summary of renderer/choreography architecture added or changed.
2. Files changed.
3. New or extended typed motion/action vocabulary.
4. How FilmDirection maps into choreography.
5. How alignment cues control animation state.
6. Animated state-transformation implementation.
7. Carry implementation.
8. Transform implementation.
9. Physical action implementation.
10. Object activation implementation.
11. Composition/reframing implementation.
12. Presenter choreography changes.
13. Phone-scale simplification changes.
14. Tier 1 results.
15. Tier 2 results.
16. Tier 3 critic results.
17. Provider provenance and raw critic-artifact locations.
18. Final Mara render path.
19. Larkspur regression result.
20. Before/after phone-scale evidence.
21. G01–G13 comparison against Continuity v1.
22. Remaining defects.
23. Any renderer limitation discovered.
24. Any capability intentionally not implemented and why.
25. Recommendation whether Motion Choreography & Renderer Expressiveness v1 passes.

Do not self-authorize a later phase.

Return the evidence to Source of Truth for final reconciliation.

---

# 36. Success definition

This phase succeeds when the system moves from:

> visually directed structured motion

toward:

> professionally choreographed explanatory motion.

The viewer should increasingly feel:

> the objects are behaving, changing, carrying meaning, and causing one another to change.

Not:

> the software is switching layouts.

The desired result is:

> **a film whose motion itself teaches.**