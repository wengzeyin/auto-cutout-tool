# Codex Handoff

This file is for continuing the project from another Codex thread or device.

## Current Repository State

- Repo: `wengzeyin/auto-cutout-tool`
- Branch: `main`
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
- The first commit improves multi-element split QA and fixes Windows QA runner path handling.
- The second commit completes Stage 1 of the UI pass and adds this handoff file.
- The third commit completes Stage 2 of the UI pass with clearer progress states and mobile ordering.
- The fourth commit completes Stage 3 of the UI pass with accessible preview controls and keyboard navigation.
- The fifth commit completes Stage 4 of the UI pass with denser, more usable element asset cards.
- The sixth commit completes Stage 5 of the UI pass with inline button icons, restrained motion, reduced-motion support, and polished empty states.

## Product Direction

UI/UX Stage 1-5 is complete. Next work may continue algorithm quality optimization, especially image type routing, matte protection, multi-element splitting, SVG quality, and QA regression coverage.

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
