# Codex Handoff

This file is for continuing the project from another Codex thread or device.

## Current Repository State

- Repo: `wengzeyin/auto-cutout-tool`
- Branch: `main`
- Last confirmed sync: `2026-07-13`, local `main` matches `origin/main` at `Track small element QA scores`.
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
- Current pushed head: `Track small element QA scores`.
- Safe next algorithm targets:
  - Improve real matte behavior for light illustration interiors beyond synthetic coverage.
  - Continue SVG quality work: path simplification, color-region merging, and fewer editable paths without blocky outlines.
  - Tune multi-element splitting with real QA assets once full browser QA screenshots/reports are available.
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
- Dark solid backgrounds are handled even when the general image-type classifier mislabels sticker sheets as photo-like; light solid backgrounds are limited to product/line-art/unknown cases so white-background stickers and illustrations still use the refined path.
- Fast-path results skip generic matte refinement to avoid restoring dark background pixels as line art.
- Added dark-halo cleanup for black backgrounds: near-black pixels touching transparent edges are suppressed while internal black text/lines remain.
- Browser smoke test: black-background sticker mock completed in ~0.3s with transparent corners and `darkHaloRatio` 0; white paper mock completed in ~4.1s with transparent corners.
- Full browser QA on `2026-07-13 14:18` passed with 15/15 rows, average score 4.79, and no baseline regressions.

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
  - `node qa/test-validate-report.mjs`
  - `node qa/test-compare-report.mjs`
  - `node qa/test-runner-health.mjs`
  - `node qa/test-summary-risk.mjs`
- For UI-only edits, also manually check upload, process, result download, and mobile layout.
