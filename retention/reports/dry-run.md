# Disk retention dry run

Generated: 2026-10-09T04:54:51.305Z

No files were deleted. This report is a plan.

## Total

- Repo size: **3.59 GB (3,859,531,968 bytes)**
- Files walked: 38,297
- Safe recoverable space: **87.47 MB (91,718,507 bytes)**
- Confirmed duplicates held by the 12-hour write window: **138.77 MB (145,511,057 bytes)**
- Additional space only if aggressive mode is invoked later: **1.68 GB (1,806,091,324 bytes)**
- Render caches inside that aggressive total: 1.17 GB (1,255,309,073 bytes)

## Largest directories

| Bytes | Path |
| ---: | --- |
| 1,806,091,324 | `node_modules` |
| 1,066,420,158 | `out` |
| 928,759,285 | `node_modules/.cache` |
| 685,113,495 | `out/continuity-v1` |
| 520,615,817 | `public` |
| 517,818,165 | `public/jobs` |
| 462,906,183 | `references` |
| 282,144,288 | `node_modules/.remotion` |
| 170,469,900 | `references/Video references Good` |
| 125,423,151 | `node_modules/@remotion` |
| 76,524,413 | `references/failed videos` |
| 61,038,494 | `out/motion-v1` |
| 56,903,184 | `out/prod-gate` |
| 49,581,501 | `node_modules/@rspack` |
| 46,434,058 | `out/structure` |
| 46,332,272 | `out/prod-supplied` |
| 44,405,500 | `node_modules/.vite` |
| 41,131,390 | `out/prod-cold` |
| 37,075,884 | `out/prod-builder` |
| 33,709,164 | `out/f2` |
| 33,591,367 | `references/latest production render` |
| 32,827,430 | `node_modules/hls.js` |
| 32,730,306 | `node_modules/@babel` |
| 28,099,870 | `node_modules/maplibre-gl` |
| 27,550,016 | `node_modules/stats-gl` |
| 26,936,979 | `node_modules/three-stdlib` |
| 26,496,685 | `out/prod-harden` |
| 23,625,066 | `node_modules/typescript` |
| 20,443,256 | `node_modules/three` |
| 20,412,943 | `node_modules/@mediapipe` |

## Largest files outside node_modules

| Bytes | Path |
| ---: | --- |
| 167,329,606 | `references/Video references Good.zip` |
| 66,240,693 | `public/jobs/render-1791364383064/video.mp4` |
| 53,941,863 | `public/jobs/render-1791392632323/video.mp4` |
| 53,941,863 | `references/failed videos/failed experiment.mp4` |
| 47,314,142 | `references/Video references Good/ref-9.mp4` |
| 33,628,944 | `public/jobs/render-1791477142317/video.mp4` |
| 33,591,367 | `out/prod-supplied/film.mp4` |
| 33,591,367 | `public/jobs/render-1791478194701/video.mp4` |
| 33,591,367 | `references/latest production render/latest production render.mp4` |
| 32,003,395 | `out/structure/film.mp4` |
| 31,881,389 | `out/motion-v1/mara-candidate-1/film.mp4` |
| 31,657,205 | `references/Video references Good/ref-10.mp4` |
| 30,264,900 | `out/f2/film.mp4` |
| 30,176,885 | `out/continuity-v1/mara-production/film.mp4` |
| 29,698,895 | `public/jobs/render-1791488812238/video.mp4` |
| 29,187,847 | `public/jobs/render-1791489428749/video.mp4` |
| 28,968,506 | `out/prod-builder/film.mp4` |
| 28,968,506 | `public/jobs/render-1791489778255/video.mp4` |
| 28,394,840 | `out/prod-cold/film.mp4` |
| 28,394,840 | `public/jobs/render-1791500980453/video.mp4` |
| 27,847,245 | `out/continuity-v1/larkspur/film.mp4` |
| 26,012,384 | `public/jobs/render-1791497676040/video.mp4` |
| 26,012,275 | `out/prod-gate/film.mp4` |
| 26,012,275 | `public/jobs/render-1791498143968/video.mp4` |
| 26,002,019 | `public/jobs/render-1791497107476/video.mp4` |

## Category breakdown

| Category | Files | Bytes |
| --- | ---: | ---: |
| Render cache | 418 | 1,255,309,073 |
| Dependencies (node_modules) | 32,646 | 550,782,251 |
| Authoritative acceptance evidence | 2,622 | 505,532,007 |
| References, handoffs, and Studio Memory | 39 | 462,906,183 |
| Unique studio renders (kept for review) | 8 | 252,172,883 |
| Reproducible intermediate output | 21 | 237,196,497 |
| Regression evidence | 189 | 207,939,415 |
| Authoritative / protected | 1,321 | 179,581,488 |
| Referenced comparison renders | 106 | 102,186,170 |
| Current active-phase work | 175 | 61,038,494 |
| Narration and alignment | 24 | 25,400,160 |
| Unclassified (kept) | 48 | 10,109,517 |
| Source code | 362 | 3,072,277 |
| Historical job traces | 299 | 3,048,625 |
| Corporate Defector assets | 4 | 2,790,879 |
| Project configuration | 13 | 432,982 |
| Temporary output | 2 | 33,067 |

## Protected landmarks

These paths are checked on every run. A plan that includes one of them fails before any deletion.

- `out/continuity-v1/mara-v1-production/film.mp4` — Current authoritative Mara baseline and visual-direction reference (present)
- `out/continuity-v1/larkspur-verified/film.mp4` — Current Larkspur cold-script validation fixture (present)
- `out/prod-harden/film.mp4` — Before/after and regression baseline (present)
- `out/prod-cold/film.mp4` — Earlier cold-path regression baseline (present)
- `out/prod-gate/film.mp4` — Operational baseline after the Render Truth gate (present)
- `out/prod-builder/film.mp4` — Negative narration-gap fixture (present)
- `out/prod-supplied/film.mp4` — Earlier static-stage regression baseline (present)
- `out/continuity-v1/ACCEPTANCE_EVIDENCE.md` — Continuity v1 acceptance evidence (present)
- `out/motion-v1` — Current Motion Choreography phase output (present)
- `public/jobs/reuse-mara/voice.mp3` — Mara narration referenced by current and continuity props (present)
- `public/jobs/voice-1791500948631/voice.mp3` — Larkspur and prod-cold narration (present)
- `public/jobs/voice-1791500948631/words.json` — Larkspur and prod-cold word alignment (present)
- `public/jobs/voice-1791477106811/voice.mp3` — prod-supplied narration (present)
- `public/jobs/voice-1791477106811/words.json` — prod-supplied word alignment (present)
- `public/character/corporate-defector-presenting.webm` — Corporate Defector lead asset (present)
- `public/character/corporate-defector-tablet-idle.webm` — Corporate Defector beside asset (present)
- `references/my-character/Corporate_Defector_Character_Bible_v1.md` — Character identity source (present)
- `references/STUDIO_MEMORY.md` — Studio Memory (present)
- `references/MASTER_HANDOFF_AI_MOTION_GRAPHICS_STUDIO.md` — Source-of-truth handoff (present)

New baselines belong in `retention/protected-manifest.json`. Add a `protected` entry and, when the file is a film or narration asset that must never be deleted, a `landmarks` entry.

## Safe disposable set

Safe mode deletes only these paths. Each studio-render file matches a protected file by SHA-256. Temporary logs are listed by name in the manifest.

### `public/jobs/render-1791392632323` — 53.63 MB (56,240,264 bytes) (whole folder)

- `public/jobs/render-1791392632323/video.mp4` — 51.44 MB (53,941,863 bytes) matches `references/failed videos/failed experiment.mp4`
  - Byte-identical to protected references/failed videos/failed experiment.mp4
- `public/jobs/render-1791392632323/voice.mp3` — 2.19 MB (2,298,401 bytes) matches `public/jobs/voice-1791392475954/voice.mp3`
  - Byte-identical to protected public/jobs/voice-1791392475954/voice.mp3

### `public/jobs/render-1791477142317` — 2.60 MB (2,728,899 bytes) (listed files only; the folder stays)

- `public/jobs/render-1791477142317/voice.mp3` — 2.60 MB (2,728,899 bytes) matches `public/jobs/reuse-mara/voice.mp3`
  - Byte-identical to protected public/jobs/reuse-mara/voice.mp3

### `public/jobs/render-1791478037218` — 2.60 MB (2,728,899 bytes) (whole folder)

- `public/jobs/render-1791478037218/voice.mp3` — 2.60 MB (2,728,899 bytes) matches `public/jobs/reuse-mara/voice.mp3`
  - Byte-identical to protected public/jobs/reuse-mara/voice.mp3

### `public/jobs/render-1791478142989` — 2.60 MB (2,728,899 bytes) (whole folder)

- `public/jobs/render-1791478142989/voice.mp3` — 2.60 MB (2,728,899 bytes) matches `public/jobs/reuse-mara/voice.mp3`
  - Byte-identical to protected public/jobs/reuse-mara/voice.mp3

### `public/jobs/render-1791478194701` — 2.60 MB (2,728,899 bytes) (listed files only; the folder stays)

- `public/jobs/render-1791478194701/voice.mp3` — 2.60 MB (2,728,899 bytes) matches `public/jobs/reuse-mara/voice.mp3`
  - Byte-identical to protected public/jobs/reuse-mara/voice.mp3

### `public/jobs/render-1791488812238` — 2.60 MB (2,728,899 bytes) (listed files only; the folder stays)

- `public/jobs/render-1791488812238/voice.mp3` — 2.60 MB (2,728,899 bytes) matches `public/jobs/reuse-mara/voice.mp3`
  - Byte-identical to protected public/jobs/reuse-mara/voice.mp3

### `public/jobs/render-1791489428749` — 2.60 MB (2,728,899 bytes) (listed files only; the folder stays)

- `public/jobs/render-1791489428749/voice.mp3` — 2.60 MB (2,728,899 bytes) matches `public/jobs/reuse-mara/voice.mp3`
  - Byte-identical to protected public/jobs/reuse-mara/voice.mp3

### `public/jobs/render-1791489778255` — 2.60 MB (2,728,899 bytes) (listed files only; the folder stays)

- `public/jobs/render-1791489778255/voice.mp3` — 2.60 MB (2,728,899 bytes) matches `public/jobs/reuse-mara/voice.mp3`
  - Byte-identical to protected public/jobs/reuse-mara/voice.mp3

### `public/jobs/render-1791497107476` — 2.60 MB (2,728,899 bytes) (listed files only; the folder stays)

- `public/jobs/render-1791497107476/voice.mp3` — 2.60 MB (2,728,899 bytes) matches `public/jobs/reuse-mara/voice.mp3`
  - Byte-identical to protected public/jobs/reuse-mara/voice.mp3

### `public/jobs/render-1791497676040` — 2.60 MB (2,728,899 bytes) (listed files only; the folder stays)

- `public/jobs/render-1791497676040/voice.mp3` — 2.60 MB (2,728,899 bytes) matches `public/jobs/reuse-mara/voice.mp3`
  - Byte-identical to protected public/jobs/reuse-mara/voice.mp3

### `public/jobs/render-1791498143968` — 2.60 MB (2,728,899 bytes) (listed files only; the folder stays)

- `public/jobs/render-1791498143968/voice.mp3` — 2.60 MB (2,728,899 bytes) matches `public/jobs/reuse-mara/voice.mp3`
  - Byte-identical to protected public/jobs/reuse-mara/voice.mp3

### `public/jobs/render-1791500151416` — 2.60 MB (2,728,899 bytes) (listed files only; the folder stays)

- `public/jobs/render-1791500151416/voice.mp3` — 2.60 MB (2,728,899 bytes) matches `public/jobs/reuse-mara/voice.mp3`
  - Byte-identical to protected public/jobs/reuse-mara/voice.mp3

### `public/jobs/render-1791500506454` — 2.60 MB (2,728,899 bytes) (listed files only; the folder stays)

- `public/jobs/render-1791500506454/voice.mp3` — 2.60 MB (2,728,899 bytes) matches `public/jobs/reuse-mara/voice.mp3`
  - Byte-identical to protected public/jobs/reuse-mara/voice.mp3

### `public/jobs/render-1791364383064` — 2.57 MB (2,698,388 bytes) (listed files only; the folder stays)

- `public/jobs/render-1791364383064/voice.mp3` — 2.57 MB (2,698,388 bytes) matches `public/jobs/voice-1791363904479/voice.mp3`
  - Byte-identical to protected public/jobs/voice-1791363904479/voice.mp3

### `out` — 32.29 KB (33,067 bytes) (listed files only; the folder stays)

- `out/remotionui-install.log` — 31.33 KB (32,087 bytes)
  - Install log. The vendored library and package manifest remain.
- `out/tsc.txt` — 980 B (980 bytes)
  - Typecheck log. Re-run tsc to regenerate.

Safe total: **87.47 MB (91,718,507 bytes)** across 17 files.

## Held back

These matched a disposable rule but were modified within 12 hours, so they stay.

- `public/jobs/render-1791478194701/video.mp4` — 32.04 MB (33,591,367 bytes). Byte-identical to protected out/prod-supplied/film.mp4, but modified within 12 hours
- `public/jobs/render-1791489778255/video.mp4` — 27.63 MB (28,968,506 bytes). Byte-identical to protected out/prod-builder/film.mp4, but modified within 12 hours
- `public/jobs/render-1791498143968/video.mp4` — 24.81 MB (26,012,275 bytes). Byte-identical to protected out/prod-gate/film.mp4, but modified within 12 hours
- `public/jobs/render-1791500506454/video.mp4` — 24.44 MB (25,631,686 bytes). Byte-identical to protected out/prod-harden/film.mp4, but modified within 12 hours
- `public/jobs/render-1791500980453/video.mp4` — 27.08 MB (28,394,840 bytes). Byte-identical to protected out/prod-cold/film.mp4, but modified within 12 hours
- `public/jobs/render-1791500980453/voice.mp3` — 2.78 MB (2,912,383 bytes). Byte-identical to protected public/jobs/voice-1791500948631/voice.mp3, but modified within 12 hours

## Aggressive mode (not part of the safe delete)

Invoke this only after review, and not while a render, typecheck, or install is running. Protected paths are refused even in this mode. Applying aggressive mode deletes `node_modules` once. The cache paths below sit inside it, so their sizes are not added on top.

- `node_modules/.cache` — 885.73 MB (928,759,285 bytes)
  - Regenerate: The next Remotion bundle() or webpack build rebuilds this directory. Stop any in-progress render first. No package reinstall is required for this folder alone.
- `node_modules/.remotion` — 269.07 MB (282,144,288 bytes)
  - Regenerate: Remotion downloads Chrome headless shell again on the next render. That requires network access. Do not remove it during an active render.
- `node_modules/.vite` — 42.35 MB (44,405,500 bytes)
  - Regenerate: The next Vite dev or build prebundles dependencies again. No package reinstall is required for this folder alone.
- `node_modules` — 1.68 GB (1,806,091,324 bytes)
  - Regenerate: Reinstall with: node scripts/npm.mjs ci   This also removes the webpack cache, the Remotion browser, and the Vite cache. Do not run it while another agent is installing, typechecking, or rendering.

## Review before any broader deletion

These are large or unnamed, and they are **not** in the delete set.

| Bytes | Path | Why it stays |
| ---: | --- | --- |
| 167,329,606 | `references/Video references Good.zip` | Large archive. The style guide cites the zip by name, so the extracted folder does not make the zip disposable. |
| 137,786,820 | `out/continuity-v1/mara-verified` | Superseded Mara candidate. ACCEPTANCE_EVIDENCE says rejected candidates remain as loop history. |
| 129,261,784 | `out/continuity-v1/mara-delivery-final` | Earlier delivery candidate retained as loop history, not the current baseline. |
| 74,044,776 | `out/continuity-v1/mara-production` | Earlier production candidate retained as loop history. |
| 66,240,693 | `public/jobs/render-1791364383064` | Unique studio render. No protected file has the same bytes, so it stays. |
| 59,868,238 | `out/continuity-v1/larkspur` | Earlier Larkspur candidate. The current fixture is larkspur-verified. |
| 46,434,058 | `out/structure` | Referenced comparison film. Not production, and not approved for automatic deletion. |
| 43,415,562 | `out/continuity-v1/larkspur-delivery` | Earlier Larkspur delivery candidate retained as loop history. |
| 36,184,558 | `out/continuity-v1/larkspur-final` | Earlier Larkspur candidate retained as loop history. |
| 33,709,164 | `out/f2` | Referenced comparison film. |
| 33,628,944 | `public/jobs/render-1791477142317` | Unique studio render. No protected file has the same bytes, so it stays. |
| 29,698,895 | `public/jobs/render-1791488812238` | Unique studio render. No protected file has the same bytes, so it stays. |
| 29,187,847 | `public/jobs/render-1791489428749` | Unique studio render. No protected file has the same bytes, so it stays. |
| 26,012,384 | `public/jobs/render-1791497676040` | Unique studio render. No protected file has the same bytes, so it stays. |
| 26,002,019 | `public/jobs/render-1791497107476` | Unique studio render. No protected file has the same bytes, so it stays. |
| 25,622,687 | `public/jobs/render-1791500151416` | Unique studio render. No protected file has the same bytes, so it stays. |
| 15,779,414 | `public/jobs/render-cold-1791393913593` | Unique studio render. No protected file has the same bytes, so it stays. |
| 12,454,629 | `out/continuity-v1/mara-baseline-critic` | Baseline critique frames cited by the acceptance narrative. |
| 10,415,329 | `out/continuity-v1/real-critic` | Failed real-provider critique retained as loop history. |
| 5,898,250 | `out/diagnosis` | Comparison stills. Not named by the current source-of-truth docs. Kept until someone reviews them. |
| 1,656,411 | `out/floor` | Silent still set. Not named by the current source-of-truth docs. Kept until someone reviews them. |

## Commands

```
node scripts/retention/disk-cleanup.mjs dry-run
node scripts/retention/disk-cleanup.mjs apply --confirm safe
node scripts/retention/disk-cleanup.mjs apply --aggressive --confirm aggressive
```

Safe apply deletes the safe set above and nothing else. Aggressive apply deletes the safe set and the aggressive set. Neither command runs unless `--confirm` matches the mode.

