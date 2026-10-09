# Motion Style Guide

**Project:** AI Motion Graphics Studio — Creative Engineering  
**Version:** 1.3 — 2026-10-09  
**Status:** Approved operational studio memory.  
**Purpose:** Help future agents make consistent visual decisions inside the approved structured film architecture.

## 1. Authority and scope

This guide records approved quality rules and the current implementation scope. It does not replace the governing source documents.

- **Existing constraints:** Preserve `StructuredFilm`, the persistent named spine with active/completed states, one persistent chapter stage, the annotation layer, presenter, and captions. The stage must not obscure the spine. `layoutFor` retains ownership of frame placement.
- Preserve supplied scripts verbatim, intentional full narration coverage, Eric A, and the recorded ElevenLabs alignment as production timing authority. Do not alter narration to accommodate a visual.
- Preserve worked examples, narration-supported metaphor bindings, and recap chapters where supported by the script. Do not invent a narrated case for a supplied script that has none.
- RemotionUI remains a toolbox. Decide the explanation before selecting materials. This guide selects no animation framework.
- Corporate Defector's canonical assets and Character Bible remain identity authority. No redesign is authorized.

**Source responsibilities:** `MASTER_HANDOFF_AI_MOTION_GRAPHICS_STUDIO.md` is the primary authority for overall project state, approved direction, and agent ownership. `creative-standard.md` defines quality; `CREATIVE_SYSTEM_HANDOFF.md` defines creative architecture; `PRODUCTION_INTEGRATION_HANDOFF.md` describes the current production path and limitations; `Corporate_Defector_Character_Bible_v1.md` governs character identity. If this guide conflicts with the master handoff, another governing document, or a later approved decision, the higher or newer authority controls. This guide cannot silently amend them.

**Status labels:** **Existing** = already established constraint. **Approved** = an authoritative output-quality rule or implementation capability, not a claim that the current builder already implements every behavior. **Deferred** = not approved for the active implementation phase.

The current builder implements one dominant constructed chapter stage that can combine materials and progress through narration-directed internal states. It does not authorize stacked competing full-height stages, removal or weakening of the spine, or model control of macro placement. Reference layout flexibility translates into freedom inside the approved stage.

## 2. Evidence basis

All ten videos in `Video references Good.zip` were inspected through chronological frame samples, with denser sequences for selected mechanisms and transitions. The 170.944-second `latest production render.mp4` was sampled across its timeline, with closer inspection of model/context and limits sequences and selected 330px-wide comparisons. Supporting handoffs, creative standard, Character Bible, and reference transcripts were read.

This is visual sequence evidence, not a continuous audiovisual or frame-accurate motion audit. Timestamps below are approximate navigation ranges from each file's start. Caption text supports some narration comparisons; production alignment claims come from the handoff. Exact easing, entrance duration, velocity, settling time, and audiovisual offsets were not measured. No universal values are inferred.

### Observed positive examples

| ID | File / time | What is visible |
| --- | --- | --- |
| P1 | `ref-1-styleA.mp4`, 00:21–00:27 | Request marks approach a counter; the count rises to 100; a red boundary and 429 rejection appear; a clock indicates the window boundary. Sparse graphics carry the mechanism. |
| P2 | `ref-5.mp4`, 00:56–01:10 | A brain connects through hands to application windows. API labels and permitted actions appear beside the connections. The view shifts toward the application being discussed. |
| P3 | `ref-5.mp4`, 01:11–01:32 | The same refund case accumulates lookup, check, refund, reply, and logging results. A completion stamp follows the visible work. |
| P4 | `ref-8.mp4`, 01:18–01:40 | A spreadsheet row changes from Draft to Ready and In progress. The workflow and row views retain the same product identity. The status field becomes the visual focus. |
| P5 | `ref-10.mp4`, 00:28–00:58 | A shared environment reveals front end, back end, and database areas. Inactive areas become subordinate; the view pulls back to show their relationship. |
| P6 | `ref-5.mp4`, 01:39–01:50 | Previously introduced brain, instructions, context, tools, and loop appear together in a system overview. Familiar objects support the recap. |

### Observed production counterexamples

All C examples refer to `latest production render.mp4`.

| ID | Time | What is visible |
| --- | --- | --- |
| C1 | 00:45–00:57 | Context is selected while captions still discuss labeling the damage claim; Rule is selected as captions explain what context can see. Callout/stamp changes also shift the panel vertically. |
| C2 | 01:15–01:40 | The Tools record already shows order facts and “Replacement order” before the caption reaches “Then it creates a replacement.” The lower card repeats several record facts. |
| C3 | 01:43–02:00 | Allowed and human-review destinations are already populated. “LIMIT = A LINE THE AGENT MAY” omits the prohibition. Adding the status/stamp shifts the board downward. |
| C4 | 02:05–02:25 | The Outcome record combines reply, refund, and summary rows. Fragments include “Sorry about the” and “Closed: Order.” The case status changes to HELD during captions introducing a hypothetical refund request. |
| C5 | 02:30–02:45 | The recap initially shows WAITING, later ANSWERED. Notification cards enter above/across the spine; much of the central stage is empty. |

These observations support the recommendations below. The recommendations are inferences about better studio behavior, not claims that every reference obeys every rule.

## 3. Approved operational rules

### G01 — Give the picture a visible action

Describe the explanatory action before naming a component: a request crosses a connection, a value accumulates, an item is selected, a boundary blocks an action, or one state becomes another. Let the picture show the relationship that matters. For a comparison, make the relevant difference inspectable; motion is not mandatory when a clear static comparison teaches best.

**Reject:** a topic heading and decorative movement, or a record of results used in place of showing the process. **Basis:** P1–P3; C2.

### G02 — Persist objects while their state progresses

Maintain recognizable identity, labels, and spatial relationships across related beats. Introduce the object, reveal needed information, show the change, and retain the consequence long enough to understand it. A persistent object need not remain visually frozen; unrelated replacement is not continuity.

**Reject:** premature outcomes or cosmetic persistence while all teaching happens in captions. **Basis:** P3–P4; C2. Beat-level stage mutation is an approved generalized implementation capability under E1.

### G03 — Establish a clear attention hierarchy

Make the current explanatory object or relationship dominant inside the stage. Use contrast, emphasis, and selective detail to distinguish the current focus from context. Maintain shared edges and intentional spacing. Multiple related elements may form one explanation; do not create several competing centers of attention.

**Reject:** equally weighted headline, stage, callout, stamp, and caption, or repeated information that creates extra reading. **Basis:** P2, P4–P5; C2–C3.

### G04 — Size the stage content for the teaching task

Use enough of the available stage for the essential action and labels to read at phone width. Evaluate the occupied explanatory area, not the component's nominal bounding box. Empty space is useful when it isolates a focal point or leaves room for a meaningful reveal. Preserve the spine and compositor-owned presenter/caption regions.

**Reject:** tiny teaching detail inside a large panel, unexplained empty expanses, or content escaping its region. Do not shrink every component to solve one component's overflow. No universal occupancy percentage is established. **Basis:** P1, P4–P5; C5.

### G05 — Make annotations clarify a referent

Use a callout to explain something specific, a highlight to direct attention, a metaphor pill to bind a narrated concept, and a stamp to mark an earned result. Each annotation must add meaning rather than restate the stage. Preserve consistent styling and existing renderer-owned placement. If the current slots cannot express the needed relationship, flag that gap.

**Reject:** detached commentary, contradictory status, decorative success stamps, or filling every slot by habit. **Basis:** P2–P4; C2–C3. Renderer-controlled object-attached placement is an approved generalized implementation capability under E3.

### G06 — Sequence motion as explanation

Use an intelligible causal order: establish the relevant object → perform the action → expose the consequence → allow inspection. Group simultaneous changes only when they represent one event. Important changes must follow the appropriate event in the recorded narration; a component's autonomous animation is not semantic timing authority.

**Reject:** outcomes visible before their cause, unrelated looping motion, or motion that continually competes with reading. This is sequence logic, not a fixed four-beat template. **Basis:** P1, P3–P4; C1–C2.

### G07 — Reframe for a reason

Preserve orientation when moving between details and the larger explanation. A useful move follows a connection, reveals a related area, or brings a meaningful field into focus. Reference pans and pullbacks are examples of attention management inside our stage, not permission to move the persistent spine.

Across chapter boundaries, either carry a recognizable object or relationship forward or make the reset intentional. The incoming stage must not reveal an outcome before narration introduces it. The persistent spine remains fixed.

**Reject:** displacing the main object solely to accommodate a new annotation without an intentional visual transition. No universal camera move, easing, or duration is prescribed. **Basis:** P2, P4–P5; C1, C3. Stage-local reframing is an approved generalized implementation capability under E2.

### G08 — Fit meaning as well as text

Check essential labels, values, and relationships at approximately 330px-wide viewing size as well as full resolution. Preserve clear type roles and concise wording. Background interface detail may establish context, but essential teaching cannot depend on unreadable microtext. Use complete labels; shortening must preserve negation, quantities, conditions, and identity.

**Reject:** clipped or orphaned text, missing “not,” cryptic sentence fragments, or essential meaning lost through word-boundary fitting. Repair visual wording or composition without changing supplied narration. Existing text budgets remain in force pending approved changes. **Basis:** P1, P4; C3–C4; creative standard §§8, 13.

### G09 — Use color to encode meaning

Retain the existing paper/light base, dark ink, and restrained coral emphasis. Reserve outcome green/red for supported success/failure or the established semantic state; preserve the spine's existing active/completed conventions. Keep category or application colors purposeful and subordinate. Reinforce state with words or shape, not color alone.

**Reject:** automatic green decoration, success before completion, or native component styling that dominates the film's identity. Do not copy another reference's palette as a new studio identity. **Basis:** P1, P3–P4; creative standard §9 and existing spine behavior.

### G10 — Let the presenter support attention

Use the existing `lead`, `beside`, and `away` decisions and compositor behavior. Corporate Defector should remain recognizable and should direct attention toward the explanation without covering essential content. Character identity is locked; prominence serves the chapter. Simple motion is sufficient. Do not make continuous presenter motion a quality requirement.

**Reject:** redesign, identity drift, presenter overlap with teaching content, or unnecessary motion during a reading-heavy moment. Do not redefine presenter scale from another character's proportions. **Basis:** positive-reference overview inspection; creative standard §10; Character Bible §§5, 7, 9–10. Blocking with the existing approved assets (yielding before a full-stage mechanism, returning afterwards, a pose change without a cut) is implemented. New poses, gaze, or pointing art require new approved assets.

### G11 — Make recaps retrieve and connect

Where the script supports a recap, reuse recognizable objects, labels, and meaningful final states. Make the parts' relationship or cumulative result visible. Preserve the chapter rail and case identity while reducing detail to the recap's purpose.

**Reject:** unrelated new furniture, a list detached from what the viewer learned, off-stage recap content, or an unexplained reset of the case. **Basis:** P6; C5.

### G12 — Keep captions supportive and faithful

Preserve the existing recording-aligned caption system and house styling. Keep the spoken phrase legible, clear of essential stage content, and checked against intended platform UI zones. The visual explanation should remain intelligible when captions are mentally removed. Use stage labels for visual relationships rather than duplicating every spoken phrase.

**Reject:** captions as the sole explanation or a layout fix that compromises their visibility. No caption-engine or narration change is authorized. **Basis:** reference overview inspection; C2; creative standard §§12–14 and production handoff §1.

### G13 — Maintain worked-example state truth

Track the same case across chapter boundaries. Its status, stage contents, annotations, and recap must agree with the narrated situation. Distinguish an actual event, a hypothetical branch, and a retrospective explanation. A conditional refund example must not silently overwrite the actual replacement outcome. Reversals are valid only when the story establishes them; progress need not be mechanically monotonic.

**Reject:** unexplained WAITING after resolution, contradictory simultaneous outcomes, an unlabeled hypothetical presented as history, or unsupported completion. A recap may revisit earlier steps while keeping them identifiable as a review. Do not add facts to make the state model easier. **Basis:** P3–P4; C4–C5; worked-example policy in both handoffs.

## 4. Implementation methods and approval status

| ID | Method | Status and implementation boundary |
| --- | --- | --- |
| E1 | Composite or bespoke chapter construction with narration-directed stage changes | **Approved for generalized implementation.** Preserve one dominant chapter stage, the approved film structure, and recorded timing. Do not stack competing full-height stages. |
| E2 | Stable stage anchors plus selective internal reframing | **Approved for generalized implementation where useful.** Reframing must clarify a mechanism without annotation-driven drift, loss of context, or chrome movement. |
| E3 | Object-attached annotations inside a renderer-controlled composition | **Approved for generalized implementation where useful.** Maintain text fit, stage bounds, and renderer ownership of macro placement. |
| E4 | Designed illustrated objects or environments when the explanation needs them | **Deferred.** Preserve Corporate Defector identity; no framework or asset-generation method is selected. |

Do not promote exact motion timings, easing curves, density limits, occupancy percentages, or presenter animation recipes into persistent rules without measured examples and rendered tests.

## 5. Review card for future chapter inspection

For each weak moment, record: **timestamp; intended understanding; observed defect; relevant G-rule; proposed correction; visible acceptance condition.** Inspect the moving sequence as well as entry/action/result frames; stills cannot establish timing quality alone.

Ask:

1. What action or relationship does the picture make understandable?
2. Is the case identity and actual/hypothetical state truthful across this chapter and its neighbors?
3. Can the essential information be read at phone size, with spine and captions intact?
4. Does each movement or annotation clarify attention rather than compete with it?
5. Does the result appear at the appropriate narrated event and remain understandable afterward?

Classify failures as **mechanical** (fit/bounds), **semantic** (meaning/state/timing), or **design** (hierarchy/attention/style). Passing a render or schema check does not establish creative quality. This review card specifies evaluation questions, not an implemented repair system.

## 6. Reconciliation record

**Approved:** G01–G13 are authoritative operational quality rules. Existing constraints in §1 remain unchanged. These rules define desired output; they do not claim the current builder can already produce every behavior.

**Implementation status:** By explicit owner decision on 2026-10-08, the earlier Tools-only bounded-experiment restriction is superseded. E1, E2, and E3 are approved for generalized implementation across suitable chapters and scripts. They must remain within the approved structured architecture: one dominant chapter stage, renderer-controlled stage-local geometry, `layoutFor` macro placement, persistent spine, supplied-script preservation, recorded narration timing, and separate presenter/caption layers. This is capability approval, not a requirement that every chapter use every method. E4 and new presenter pose assets remain deferred. Presenter blocking with existing assets is implemented (G10). New frameworks, universal numeric motion presets, asset-identity changes, and raw full-frame model coordinates require separate approval. No narration or canonical character assets were changed by this decision.

**2026-10-09:** Motion Choreography & Renderer Expressiveness v1 passed Source of Truth. Its acceptance record is `out/motion-v1/ACCEPTANCE_EVIDENCE.md`. G01–G13 are unchanged by that phase. No timing, easing, spring, distance or layout value from the Mara film is promoted into this guide.

## 7. How the rules are executed now

The G-rules map onto implemented channels. The channels are architecture; the numbers inside them are not rules.

- **G01 / G06 (visible, causal action):** typed motion shapes `traverse` / `return` / `transform` / `block` / `accumulate`. Each launches at or after its aligned cue and lands its consequence on arrival.
- **G02 (persistence and progression):** persistent ID-keyed objects whose state parameters change in place. Carry moves the same rendered object.
- **G03 (hierarchy):** one active object at a time — the action in flight, else the latest change, else the shot focus. Supporting objects stay subordinate.
- **G04 / G08 (teaching scale, fit):** renderer-owned layout from typed shot intent, with progressive disclosure of state and detail.
- **G07 (reframing):** shot boundaries (`carry` / `transform` / `reframe` / `reset`) stage departures, rearrangement and arrivals.
- **G10 (presenter):** `lead` / `beside` / `away` with blocking that uses only existing assets.
- **G11 (recap):** recap retrieves established object IDs and recalls them in narrated order.
- **G13 (state truth):** actual ledger; dashed hypothetical branch; RECAP-tagged retrospective states. Proven every frame by the Tier 2 motion audit.

Current authoritative baseline: `out/motion-v1/mara/film.mp4`. Direct before-comparison: `out/continuity-v1/mara-v1-production/film.mp4`. Cold-script fixture: Larkspur, `out/continuity-v1/larkspur-verified/film.mp4`.

## 8. Known limits and next phase

Non-blocking limits recorded at Motion v1 acceptance:

- labels briefly fade during major reframes;
- some secondary text sits near the lower edge of phone readability;
- comparison layouts can tighten when the presenter is beside them;
- some multi-object transitions are momentarily busy;
- a reserved slot can wait empty before its object arrives;
- presenter performance is limited by existing pose assets;
- generic library components use cue-gated snapshots, not interpolated prop transitions;
- choreography is creatively proven on one story only;
- music/SFX production is absent;
- E4 illustrated environments remain deferred.

The next approved phase is **Real-Production Generalization & Delivery Readiness**: the next genuine studio script through the unchanged production path. Its constraints are in `MASTER_HANDOFF_AI_MOTION_GRAPHICS_STUDIO.md` §0. A G-rule changes only when evidence from more than one film supports the change.
