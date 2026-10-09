# Studio memory governance

Two loops. They are not the same thing.

## Per-film loop

plan → render → Tier 1 technical QC → Tier 2 deterministic conformance → Tier 3 visual critique → targeted repair → corrected film

This loop changes that film. It does not change studio-wide memory.

Artifacts stay in the film's output directory:

- `technical-qc.json`
- `conformance.json`
- `continuity-audit.json`
- `motion-audit.json`
- `critic-*/critic.json`
- `REVIEW_ADJUDICATION.md`
- `NOTES.md`

## Studio-learning loop

multiple films + founder feedback → observation → candidate → evidence → promotion

A one-film observation stays in that film's notes unless it has a named code root cause or it shows up again on a different film.

## Promotion order

1. A code constraint and a regression test, when the failure is deterministic.
2. A G-rule in `MOTION_STYLE_GUIDE.md`, when the judgment is reusable and creative.
3. A renderer capability, when the picture needs a channel the builder does not have.

## Hard rule

A bug never becomes a style rule.

Example: the narration-gap leak was a bug. It was fixed in `holdAt` and covered by `scripts/gap-regression.ts`. It was not added as a new G-rule.

## What is promoted

- Silence holds the latest started beat and chapter (`src/film/hold.ts`).
- Tier 1, Tier 2 and Tier 3 inspection are part of every production run. Deterministic facts belong in Tier 2; vision judges visual quality; human phone-scale inspection is final.
- Action is selected from the shape of what is happening. Chapter titles never select renderers.
- Typed whole-film `FilmDirection` runs between structure and beats (Continuity v1). Mutable library state changes only at aligned phrase cues.
- Motion choreography (Motion v1) is production architecture:
  - a pure choreography layer beneath `DirectedStage`;
  - a deterministic `sceneAt(time)` shared by renderer and Tier 2;
  - persistent ID-keyed glyphs with continuous state parameters;
  - motion vocabulary `traverse` / `return` / `transform` / `block` / `accumulate`;
  - outcome vocabulary `progress` / `complete` / `refused`;
  - exact alignment cues govern action launch and consequence landing;
  - carry preserves the same rendered object;
  - hypotheticals use a dashed branch treatment;
  - recap retrieves established object IDs;
  - layout stays renderer-owned from typed shot intent.
- `scripts/audit-motion.ts` and its `--self-test` mutation check are permanent Tier 2 infrastructure for any directed film.
- Tier 3 keeps provider provenance and raw responses. Cross-provider or cross-run counts are not calibrated scores.
- Chunked rendering (`--chunk-frames`), public-asset subsetting (`--public-subset`), and named cleanup of a render's own intermediates are supported production-render paths when disk constraints require them.
- Safe-area checks use the profiles in `src/film/layers.tsx` (`reels`, `tiktok`). The numbers are those profiles, not a universal law.
- Evaluation overlays are not drawn in the MP4.

## What is not promoted

- Any `chapter.name` or script-specific branch.
- A single vision-model sentence as a permanent rule.
- Mara-specific motion constants: spring settings, easing curves, durations, travel distances, stagger delays, label-fade timing, row anchoring, type sizes. These are contextual defaults in code, tuned on one film, overrideable, and not doctrine.
- Per-film repairs from the Continuity v1 and Motion v1 loops (exact compositions, labels, cue phrases), except where they became code with a regression.
- A new presenter pose system. Presenter blocking uses existing approved assets only.
