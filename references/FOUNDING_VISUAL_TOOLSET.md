# Founding Visual Toolset

Status: **frozen founding set**  
Registry: `src/founding-toolset/registry.ts`  
Review composition: `FoundingToolsetGallery`  
Accepted on: 2026-10-09

## Architecture

The toolset has four layers:

1. **Narrative core.** `FilmDirection`, `DirectedStage`, persistent house glyphs and the choreography vocabulary remain the film's causal language. Stable object IDs carry identity across shots.
2. **Business/UI materials.** Studio-owned typed components provide app windows, CRM records, data tables, inboxes, metrics, forms, booking, workflow, status, progress, tabs and notifications. They use studio tokens and expose state as props.
3. **Video-native materials.** A small approved subset of the already vendored RemotionUI catalog supplies shapes that materially benefit from video-native implementation.
4. **Motion and primitives.** Deterministic reveal, count and attention wrappers plus small status/navigation primitives support hierarchy and state. Bespoke React/SVG remains the escape hatch.

The machine-readable registry records stable ID, source, semantic categories, intents, role, state/choreography/phone/identity flags, inputs, motion behavior, limits, provenance and local path. `discoverMaterials()` searches those meanings. Future learning systems should store the stable material ID, not a package or component display name.

The broad vendor catalog still exists as reviewed source material, but `src/film/retrieve.ts` now restricts director retrieval to the approved founding RemotionUI names. This freezes routine acquisition without deleting the retained vendor source.

## Sources inspected and decisions

### House visual system

Approved: persistent narrative glyphs, `DirectedStage`, `sceneAt`, state labels, worked-example identity and cue-aligned choreography. These remain the primary narrative language.

### Action Registry

Approved: the production choreography vocabulary `traverse`, `return`, `transform`, `block`, and `accumulate`. The older standalone `ActionStage` continues to accept its three v1 verbs; new directed films use the complete choreography vocabulary. No arbitrary animation component replaces action semantics.

### RemotionUI

The current official catalog and the repository's local 217-item catalog were inspected. Approved from the local copy:

- `kanban-move`
- `comparison-table`
- `form-fill-sequence`
- `notification-stack`
- `timeline-steps`
- `calendar-month-fill`
- `stat-card`
- `data-flow-pipes`
- `progress-bar`

These cover board, comparison, form, notification, process, scheduling, metric, system-flow and bounded-progress needs. Their local implementations are already frame-driven and do not fetch examples at render time. Production state still enters through cue-gated props.

Rejected as founding materials:

- autonomous spectacle backgrounds, particle fields, light tunnels and decorative 3D: weak explanatory value and unnecessary rendering cost;
- glitch, neon, scramble, wave and liquid text families: redundant with stronger hierarchy/reveal tools and easy to misuse;
- social/broadcast chrome and finished composition templates: they compete with house direction;
- hover/cursor demonstrations as general stages: desktop interaction does not survive phone viewing;
- maps, media and device mockups that require uncontrolled external imagery or tiles for ordinary use;
- audio furniture as a visual foundation: it does not explain the studio's core business/software subjects.

### UIAble

The official component repository and its business-app focus were inspected. The useful roles were approved and reimplemented locally: cards/records, tables, lists/inbox, forms, calendar/booking, metrics and workflow status. UIAble was not added as a dependency because its web application stack, interaction behaviors and styling system are broader than the renderer needs.

Rejected: direct package integration, large desktop dashboards, hover-first controls, dialogs/menus needing browser focus management, and components whose useful behavior is already covered by the local adapters.

### React Bits

The official component index and repository were inspected. Approved as local deterministic adaptations: content reveal, numeric count, a single attention pulse and a restrained grid-background role. Each animation derives only from the Remotion frame.

Rejected: cursor/hover effects, perpetual loops, distortions, magnet/tilt treatments, decorative 3D and effect-first text. They add motion without improving explanation, hierarchy, transition, state or attention.

### shadcn-compatible primitives

The official shadcn component catalog was inspected. Approved as locally owned patterns: badge/status, tabs, progress and compact notification/card treatment. They use plain React/CSS because a Radix/Tailwind dependency graph is unnecessary for rendered frames.

Rejected: broad registry installation, navigation/menu/dialog/provider systems, resizable panels and form infrastructure whose browser accessibility behavior is not exercised by Remotion.

### Bespoke React/SVG

Approved and intentionally unrestricted by taxonomy when a film needs a truthful object the founding set cannot express. It must still use typed inputs, local assets, deterministic timing and phone-scale review.

## Semantic vocabulary

The founding registry currently covers:

`record`, `card`, `message`, `inbox`, `spreadsheet`, `table`, `dashboard`, `metric`, `timeline`, `kanban`, `calendar`, `booking`, `status`, `notification`, `form`, `document`, `app-window`, `navigation`, `chart`, `checklist`, `comparison`, `progress`, `container`, `text-treatment`, `transition`, `background`, `attention-effect`, `workflow`, `narrative-object`, `action`.

These are search facets, not scene templates. A director asking for “a customer record whose status changes” can discover `ui.crm-record`, status materials, timelines and notifications. A director asking for “a spreadsheet testing fake leads” can discover `ui.app-window`, `ui.data-table`, status and attention materials.

## Studio adaptation

All new materials route through `src/founding-toolset/tokens.ts`, which owns typography, palette, spacing, borders, corners, shadows, motion durations and phone constraints. The adapters expose typed data and state. They contain no hover state, random values, wall-clock timers, effects or remote assets.

Phone rules in the adapter layer are a maximum of four table columns, five visible rows/steps, short status labels and minimum body/label targets. The review artifact samples every gallery page at 330 pixels wide.

## Director and choreography integration

- `discoverMaterials()` returns stable material records by intent and semantic category.
- RemotionUI retrieval is limited to approved `catalogName` values.
- Stateful adapters accept explicit props rather than managing invisible browser state.
- Persistent identity materials accept stable IDs; house glyphs remain the default across whole-film continuity.
- `Reveal`, `Count` and `Attention` are frame-derived and can be started at cue-derived frames.
- FilmDirection, choreography and `sceneAt` remain the production timing authority. The registry does not place, compose or direct anything.

## Dependencies and runtime ownership

No package was installed or changed. Approved vendor implementations and all adapters are local repository files. Gallery content uses no remote image, CSS, script, API, example or registry request. The existing production font integration remains the sole font path and was exercised during the evidence render.

## Verification and evidence

Run:

```powershell
npm.cmd run typecheck
node --import tsx scripts/verify-founding-toolset.ts
node --import tsx scripts/render-founding-toolset.ts
```

Evidence is written under `out/founding-toolset/`:

- six full-resolution 1080×1920 review frames;
- `founding-toolset-gallery.mp4`;
- `phone-contact-sheet.png`, with six 330×586 phone samples;
- `render-verification.json`, including a same-frame byte determinism check;
- `registry-verification.json` and `material-registry.json`.

Known limits:

- The UI adapters are production materials, not a clone of a commercial application.
- A dense data table still needs editorial selection; four columns is the founding phone-safe ceiling.
- The founding glyph vocabulary has six kinds. Film-specific metaphors continue through bespoke React/SVG.
- The old standalone `ActionStage` exposes three verbs; complete five-verb motion semantics live in production choreography.
- Production fonts use the studio's existing approved Google Fonts loader during bundling/rendering.

## Founding-set governance

Routine external-library expansion stops here. A new third-party component or library may enter the production toolbox only when all of these are true:

1. a real production exposes a missing reusable capability;
2. the founding toolset cannot reasonably express it through composition, extension, simplification or bespoke React/SVG;
3. the candidate materially solves that specific gap;
4. it is inspected, adapted, typed, rendered, phone-reviewed and deterministic before approval; and
5. the founder requested the specific tool, when the addition originates as a founder request.

Prefer extending or recombining existing material IDs. Record a learned combination as a skill that references those IDs; do not install another library to encode a composition technique.

## Scope confirmation

This work adds the bounded material foundation and review gallery only. It does not start a creative production phase, change an approved film, overwrite a baseline, redesign Corporate Defector, or alter narration, alignment, renderer authority, QC tiers, FilmDirection, DirectedStage, choreography or `sceneAt`.
