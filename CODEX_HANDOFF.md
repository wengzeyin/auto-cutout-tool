# Codex Handoff

This file is for continuing the project from another Codex thread or device.

## Current Repository State

- Repo: `wengzeyin/auto-cutout-tool`
- Branch: `main`
- Last confirmed sync: `2026-07-13`, local `main` matches `origin/main` at `Close SVG micro gaps and guard dark restore`.
- Pushed commits through `Polish UI icons and motion`:
  - `8da0f03 Improve split QA and Windows runner portability`
  - `Refine result-first UI workbench`
  - `Improve processing states and mobile flow`
  - `Improve preview controls accessibility`
  - `Upgrade element asset panel`
  - `Polish UI icons and motion`
- Current local algorithm work:
  - `Improve transparent material type detection`
  - `Protect transparent material matte`
  - `Tighten projection split QA`
  - `Improve precise SVG coordinate fidelity`
  - `Protect gray SVG line art`
  - `Track SVG fractional QA metric`
  - `Track small element QA scores`
  - `Add browser QA metric coverage and local model proxy`
  - `Add solid background fast cutout`
  - `Improve product matte routing`
  - `Relax product SVG grid alignment`
  - `Gate dark background matte cleanup`
  - `Clamp SVG cubic trace handles`
  - `Guard canvas readback performance`
  - `Add AI timeout guard`
  - `Protect clear tiny split elements`
  - `Close SVG micro gaps and guard dark restore`
  - `Normalize photo dense core alpha`
- The first commit improves multi-element split QA and fixes Windows QA runner path handling.
- The second commit completes Stage 1 of the UI pass and adds this handoff file.
- The third commit completes Stage 2 of the UI pass with clearer progress states and mobile ordering.
- The fourth commit completes Stage 3 of the UI pass with accessible preview controls and keyboard navigation.
- The fifth commit completes Stage 4 of the UI pass with denser, more usable element asset cards.
- The sixth commit completes Stage 5 of the UI pass with inline button icons, restrained motion, reduced-motion support, and polished empty states.

## Product Direction

UI/UX Stage 1-5 is complete. Next work may continue algorithm quality optimization, especially image type routing, matte protection, multi-element splitting, SVG quality, and QA regression coverage.

## Current Continuation Notes

- The latest algorithm work has focused on making quality regressions measurable before changing more core behavior.
- Current pushed head: `Normalize photo dense core alpha`.
- Safe next algorithm targets:
  - Continue performance work around actual AI fallback timeouts, cancellation, and large-image scan scheduling.
  - Improve real matte behavior for light illustration interiors beyond synthetic coverage.
  - Continue SVG quality work: path simplification, color-region merging, and fewer editable paths without blocky outlines.
  - Continue tuning multi-element splitting for real sticker packs: avoid both missed tiny assets and over-splitting body parts.
- Before changing algorithm thresholds, run the lightweight QA list at the bottom of this file. For larger behavior changes, run browser QA and compare against the previous report.

## Already Implemented Before UI Pass

- Local AI cutout flow
- refineMatte worker and fallback logic
- Image type presets
- Multi-element split, large-box split, projection split
- Manual selection/slice tools
- PNG / WebP / SVG / ZIP export
- Export scale 1x / 2x / 3x / custom
- QA asset set and QA reports
- QA validation and comparison scripts
- Recent split improvement for opaque subjects on low-alpha platforms

## Algorithm Continuation

### Transparent Material Detection - Done

- Added automatic `transparentMaterial` imageType detection for white-background, low-saturation, cool translucent subjects with highlight and soft-shadow cues.
- Added `transparent-glass-on-white` regression coverage in `qa/test-image-type.mjs`.
- Confirmed existing product, line-art, sticker, illustration, and photo image type cases still pass.

### Transparent Material Matte Protection - Done

- Raised transparent material solid/core thresholds so translucent glass-like regions are not forced opaque.
- Disabled core alpha normalization for `transparentMaterial` in both the main thread and matte worker paths.
- Added matte regression coverage for semi-transparent glass core, highlight, and soft edge preservation in `qa/test-matte-refine.mjs`.
- Confirmed lightweight QA still passes across matte, image type, multi-split, SVG, report validation, report comparison, runner health, and summary risk checks.

### Projection Split QA and Guardrails - Done

- Tightened projection-based large-box splitting so normal, peak, valley, stacked, and forced projection paths must pass a verified low-density cut between children.
- Mirrored projection split logic in `qa/test-multi-split.mjs` so the QA path covers the production projection splitter.
- Added regression cases for clear-gap large-box splitting and continuous strongly connected subjects that must not be projection-split.
- Confirmed lightweight QA still passes across matte, image type, multi-split, SVG, report validation, report comparison, runner health, and summary risk checks.

### Precise SVG Coordinate Fidelity - Done

- Increased exported SVG path coordinate precision from 1 decimal to 2 decimals, matching the QA vectorizer and reducing visibly blocky curve output.
- Added `fractionalCoordinateRatio` coverage in `qa/test-svg-vector.mjs` so precise SVG output must retain subpixel curve coordinates instead of reverting toward pixel-grid paths.
- Confirmed lightweight QA still passes across matte, image type, multi-split, SVG, report validation, report comparison, runner health, and summary risk checks.

### Gray SVG Line-Art Protection - Done

- Expanded SVG line-art protection from only near-black strokes to low-saturation medium-dark strokes, improving editable SVG results for gray/anti-aliased illustration and logo lines.
- Applied the same protected-line-art logic during color-key stabilization so neighboring regions do not absorb clear gray line strokes.
- Added `grayLineArea` regression coverage in `qa/test-svg-vector.mjs`.
- Confirmed lightweight QA still passes across matte, image type, multi-split, SVG, report validation, report comparison, runner health, and summary risk checks.

### SVG Fractional QA Metric - Done

- Added `svgFractionalCoordinateRatio` to generated QA metrics and QA HTML reports so precise SVG paths can be monitored for subpixel curve fidelity.
- Added a precise-mode blocky-risk condition when fractional SVG coordinates drop too low.
- Added validation and report-comparison gates for `svgFractionalCoordinateRatio`, including required-field coverage in `qa/validate-report.mjs` and regression detection in `qa/compare-report.mjs`.
- Confirmed lightweight QA still passes across matte, image type, multi-split, SVG, report validation, report comparison, runner health, and summary risk checks.

### Small Element QA Scores - Done

- Added `clearSmallElementCount`, `smallElementScoreMax`, and `smallElementScoreAverage` to generated QA metrics and QA HTML reports.
- Tightened `smallElementRisk` for multi-sticker cases so low-quality small detections can be flagged when no clear small element is found.
- Added validation and report-comparison gates for small-element scores in `qa/validate-report.mjs` and `qa/compare-report.mjs`.
- Confirmed lightweight QA still passes across matte, image type, multi-split, SVG, report validation, report comparison, runner health, and summary risk checks.

### Browser QA Metric Coverage - Done

- Added `qa/assert-report-metric-coverage.mjs` to assert real generated browser QA reports include `svgFractionalCoordinateRatio`, `clearSmallElementCount`, `smallElementScoreMax`, and `smallElementScoreAverage` in the expected scenario rows.
- Wired the coverage assertion into `qa/run-browser-qa.mjs`; full browser QA now fails if either score validation or real metric coverage fails.
- Added `qa/test-report-metric-coverage.mjs` for pass/fail fixture coverage.
- Full browser QA on `2026-07-13` passed with 15/15 rows, average score 4.79, and metric coverage `svgMetricRows: 7/7`, `smallElementMetricRows: 4/4`.

### Local Model Resource Proxy - Done

- Added a local `/__imgly/` proxy in `server.mjs` for IMG.LY background-removal resources during localhost/QA runs.
- The proxy caches resources under `.cache-imgly/`, retries remote fetches, and avoids fragile browser-side CDN failures during automated QA.
- `app.js` now points `removeBackground` to the local proxy only on `localhost` / `127.0.0.1`; GitHub Pages continues using the library default remote public path.

### Repeated Sticker Stack Split - Done

- Added a strong split-mode detector for tall, narrow repeated sticker stacks where independent stickers touch vertically and ordinary connected-component logic collapses a whole column into one element.
- Added `touching-vertical-sticker-stacks` regression coverage to `qa/test-multi-split.mjs`; expected result is 9 elements, while continuous subjects still remain unsplit.
- Full browser QA confirmed `11-sticker-pack.png` recovered from 3 elements back to 9 elements with no baseline regressions.

### Solid Background Fast Cutout - Done

- Added a local flood-fill cutout path for solid edge backgrounds so simple white/black background assets do not wait on the AI model.
- Dark solid backgrounds are handled even when the general image-type classifier mislabels sticker sheets as photo-like; light solid backgrounds now allow simple low-complexity paper/product subjects even when the broad classifier routes them through photo/sticker/illustration protection.
- Fast-path results skip generic matte refinement to avoid restoring dark background pixels as line art.
- Added dark-halo cleanup for black backgrounds: near-black pixels touching transparent edges are suppressed while internal black text/lines remain.
- Reduced light-solid flood tolerance from 52 to 30 because the RGB distance helper is averaged; the previous value could treat beige paper as white background and force the slow AI fallback.
- Added `qa/test-solid-background-fast-cutout.mjs` to assert black and white solid-background mocks finish quickly, keep transparent corners, avoid IMG.LY model requests, and do not create black edge halos.
- Browser regression test: black-background sticker mock completed in ~0.31s with `darkHaloRatio` 0; white paper mock completed in ~0.21s with no model-resource requests.
- Full browser QA on `2026-07-13 15:39` passed with 15/15 rows, average score 4.79, and no baseline regressions.

### Product Matte Routing - Done

- Added a complex-background product image-type heuristic for low-complexity, low-gradient product-like graphics on colored/non-white backgrounds, reducing false routing into the illustration pipeline.
- Added `flat-product-on-colored-bg` regression coverage in `qa/test-image-type.mjs` while preserving the existing flat-illustration, sticker, photo, line-art, product, and transparent-material cases.
- Added product-only smooth-edge matte retry logic: when product matte analysis sees high edge jaggedness or white-fringe risk, the app tries a cleaner/smoother product profile and adopts it only if edge quality improves without materially increasing light-region loss, line loss, semi-transparent core, white fringe, or alpha coverage loss.
- Added decision coverage for smooth-edge retry/accept/reject paths in `qa/test-matte-refine.mjs`.
- Full browser QA on `2026-07-13 15:54` passed with 15/15 rows, average score 4.79, and no baseline regressions.

### Product SVG Grid Relaxation - Done

- Added a product SVG `relaxGrid` path step that keeps the existing low-command quadratic path output but nudges long product outlines off integer pixel-grid coordinates.
- Avoided switching product SVG to full precise cubic mode after QA comparison showed command-density regressions despite smoother paths.
- Added product-vector regression coverage in `qa/test-svg-vector.mjs` for curve output, command density, grid alignment, and fractional coordinates.
- Full browser QA on `2026-07-13 16:06` passed with 15/15 rows, average score 4.79, and no baseline regressions.
- Baseline comparison showed product SVG command density stayed unchanged while `svgGridAlignedRatio` improved on all product rows: `05` 0.6560 -> 0.5045, `06` 0.6386 -> 0.4705, `09` 0.5704 -> 0.4239, `14` 0.5973 -> 0.4081.

### Dark Background Fringe Cleanup - Done

- Added connected dark-background fringe cleanup for black-background sticker assets so generated near-black/gray outlines connected to transparent background are removed.
- The cleanup preserves internal black text/lines by only propagating from transparent-connected dark-background pixels.
- Fast solid-background cutout now decides aggressive dark-fringe cleanup from foreground color saturation, so colorful black-background sticker sheets are cleaned even when broad image-type routing is imperfect.
- Low-saturation black-background illustration/high-contrast assets avoid the aggressive sticker cleanup path; dark-background line-art QA also ignores pixels matching the detected dark background when computing lost line art.
- Added a thicker `black-halo` browser regression case in `qa/test-solid-background-fast-cutout.mjs`; `black`, `black-halo`, and `white` mocks complete locally in under 1s with `darkHaloRatio` 0 and no IMG.LY model-resource requests.
- Tightened dark-background matte cleanup gating so low-saturation black/white illustrations keep gray anti-aliased edges instead of being treated as black-background sticker fringe.
- Full browser QA on `2026-07-13 16:43` passed with 15/15 rows, average score 4.79, 0 release blockers, and metric coverage intact.
- Baseline comparison passed with no regressions; `15-high-contrast-edge.png` recovered to matte 5 and `edgeJaggednessScore` 0.2993 while black-background sticker halo tests still report `darkHaloRatio` 0.

### SVG Cubic Handle Clamping - Done

- Added angle-aware cubic control-point scaling for precise SVG paths so sharp corners keep shorter handles while smooth curves still use cubic output.
- Clamped cubic handles relative to their traced segment length, with a tighter limit for protected line-art paths, reducing overshoot and the visible line-drawing feel in filled SVG exports.
- Added `cubicHandleOutlierRatio` regression coverage in `qa/test-svg-vector.mjs`; the SVG fixture currently reports `0`.
- Full browser QA on `2026-07-13 16:50` passed with 15/15 rows, average score 4.79, 0 release blockers, and metric coverage intact.
- Baseline comparison passed with no regressions; product SVG grid-alignment metrics remain improved across `05`, `06`, `09`, and `14`.

### Canvas Readback Performance Guard - Done

- Added `getReadbackContext()` and changed pixel-scanning canvases to request `{ willReadFrequently: true }` on their first 2D context creation, including source originals, cutout/refined canvases, masked element crop canvases, and vector-prep canvases.
- Added a browser QA console gate in `qa/run-browser-qa.mjs`; full QA now fails on `pageerror` or Canvas `willReadFrequently` warnings instead of burying performance regressions in console output.
- Full browser QA on `2026-07-13 17:00` passed with 15/15 rows, average score 4.79, 0 release blockers, `consoleFailures: []`, and `consoleMessages: []`.
- Baseline comparison passed with no regressions in score, component count, large-box risk, small-element risk, matte, or SVG metrics.

### AI Timeout Guard - Done

- Wrapped the IMG.LY `removeBackground` call in `runAiBackgroundRemoval()` with a timeout guard so a hanging AI/model path returns control to the UI instead of leaving the user waiting indefinitely.
- Timeout duration scales for large images and can be shortened through `window.__cutoutDebug.aiTimeoutMs` for QA; default normal-image timeout is 180s.
- Added `qa/test-ai-timeout-guard.mjs`, which simulates a non-solid image whose AI task never resolves and verifies the page recovers in under 1s, shows a timeout message, re-enables the process button, hides progress, and marks the queue item as failed.
- Full browser QA on `2026-07-13 17:07` passed with 15/15 rows, average score 4.79, 0 release blockers, `consoleFailures: []`, and `consoleMessages: []`.
- Baseline comparison passed with no regressions in score, component count, large-box risk, small-element risk, matte, or SVG metrics.

### Clear Tiny Split Elements - Done

- Added clear standalone tiny-element protection to the multi-object split absorption step. A small component with a compact strong-alpha core and a transparent gap from nearby large stickers is kept as its own element instead of being absorbed into the nearest large component.
- Added `clear-tiny-badges-near-large-stickers` regression coverage in `qa/test-multi-split.mjs`; expected output is 6-7 elements, preserving small badges near three larger stickers.
- Mirrored the production absorption and relaxed standalone-separation logic in the QA splitter so the regression exercises the real strategy.
- Full browser QA on `2026-07-13 17:15` passed with 15/15 rows, average score 4.79, 0 release blockers, `consoleFailures: []`, and `consoleMessages: []`.
- Baseline comparison passed with no regressions in score, component count, large-box risk, small-element risk, matte, or SVG metrics.

### SVG Micro Gap Closing - Done

- Added `closeVectorMicroGaps()` after vector color-key stabilization so tiny transparent cracks inside the same flat color are closed before region tracing.
- Added `connectedRegionCount` to vector groups so QA can distinguish actual connected filled regions from holes/loops.
- Added a cracked flat-art SVG regression in `qa/test-svg-vector.mjs`; the green same-color region now reports `crackedConnectedRegionCount: 1` and `crackedPathCount: 5`.
- Full browser QA on `2026-07-13 17:35` passed with 15/15 rows, average score 4.79, 0 release blockers, `consoleFailures: []`, and `consoleMessages: []`.
- Baseline comparison passed with no regressions; product `svgGridAlignedRatio` improved to `05` 0.4099, `06` 0.4110, `09` 0.4239, and `14` 0.3875.

### Dark Background Restore Guard - Done

- Prevented `restoreIllustrationDetails()` from restoring source pixels that match a detected black background and touch true transparent exterior. This avoids the app drawing black outlines back around black-background sticker assets after AI/refine cleanup.
- The guard uses near-zero transparent exterior as the signal, so internal black text and line art are still restored.
- Added a matte regression in `qa/test-matte-refine.mjs`: exterior black outline alpha stays `0`, while the internal dark line restores to alpha `235`.
- Black solid-background browser regression still passes for `black`, `black-halo`, and `white` cases with `darkHaloRatio` 0 and no IMG.LY model-resource requests.

### Photo Dense Core Alpha - Done

- Added photo-only dense-core alpha normalization before edge smoothing and a post-edge core normalization pass after `antiAliasHardEdges()`.
- The pass uses local alpha-neighborhood density, so dense subject interiors become solid while isolated hair/fur strands keep soft alpha.
- Mirrored the logic in `matte-worker.js` and `qa/test-matte-refine.mjs`; matte QA asserts dense photo core alpha `255`, post-edge core alpha `253`, and fine hair remains below hardening thresholds.
- Full browser QA on `2026-07-13 17:47` passed with 15/15 rows, average score 4.79, 0 release blockers, `consoleFailures: []`, and `consoleMessages: []`.
- Baseline comparison passed with no regressions; tracked photo `semiTransparentCoreRatio` improved on `01`, `02`, `03`, `04`, and `08`.

## UI Pass Plan

### Stage 1: P0 Result-First Layout - Done

- Refresh Hero with clear product value and a right-side before/after visual.
- Make upload entry obvious and readable.
- Keep workbench focused on source/result preview after upload.
- Keep result actions near the result card.
- Keep advanced settings collapsed by default.
- Reduce queue visual weight.
- Committed locally as `Refine result-first UI workbench`.

### Stage 2: P0 States and Mobile Flow - Done

- Add clearer processing stages.
- Improve completion and error states.
- Reorder mobile layout: upload, result, export, elements, queue, advanced.
- Committed locally as `Improve processing states and mobile flow`.
- Browser verification in the in-app browser was blocked by localhost URL policy; automatic QA and static checks passed.

### Stage 3: P1 Controls and Accessibility - Done

- Convert preview controls into accessible tabs.
- Add keyboard handling for preview tabs.
- Improve focus rings and disabled button explanations.
- Added `aria-selected`, `aria-pressed`, roving tab focus, arrow/Home/End keyboard handling, and disabled button hints.
- Committed locally as `Improve preview controls accessibility`.
- Browser verification in the in-app browser was still blocked by localhost URL policy; automatic QA and static checks passed.

### Stage 4: P1 Asset Panel - Done

- Upgrade element cards to feel like a design asset panel.
- Improve hover, selected, and batch actions.
- Add lazy/skeleton behavior if needed.
- Added clearer element headers, export metrics, content coverage, persistent action buttons, selected badges, and thumbnail click selection.
- Committed locally as `Upgrade element asset panel`.

### Stage 5: P1/P2 Visual Polish - Done

- Add a Lucide-style icon system or inline icon helper.
- Add restrained motion and reduced-motion support.
- Polish empty/error states.
- Added inline icon helper, button icons, reduced-motion media query, card motion polish, and stronger empty states.
- Committed locally as `Polish UI icons and motion`.

## Do Not Lose

- Run lightweight QA after UI edits:
  - `node qa/test-matte-refine.mjs`
  - `node qa/test-image-type.mjs`
  - `node qa/test-multi-split.mjs`
  - `node qa/test-svg-vector.mjs`
  - `node qa/test-ai-timeout-guard.mjs`
  - `node qa/test-validate-report.mjs`
  - `node qa/test-compare-report.mjs`
  - `node qa/test-runner-health.mjs`
  - `node qa/test-summary-risk.mjs`
  - `node qa/test-report-metric-coverage.mjs`
  - `node qa/test-solid-background-fast-cutout.mjs`
- For UI-only edits, also manually check upload, process, result download, and mobile layout.
