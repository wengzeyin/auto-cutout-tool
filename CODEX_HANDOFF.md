# Codex Handoff

This file is for continuing the project from another Codex thread or device.

## Current Repository State

- Repo: `wengzeyin/auto-cutout-tool`
- Branch: `main`
- Local-only commits not pushed yet:
  - `8da0f03 Improve split QA and Windows runner portability`
  - current `HEAD`: `Refine result-first UI workbench`
- The first commit improves multi-element split QA and fixes Windows QA runner path handling.
- The second commit completes Stage 1 of the UI pass and adds this handoff file.

## Product Direction

Next work is UI/UX only. Do not change the core cutout, element detection, or SVG algorithms unless explicitly requested.

Target: move the app from a parameter-heavy technical page to a result-first design workbench.

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

## UI Pass Plan

### Stage 1: P0 Result-First Layout - Done

- Refresh Hero with clear product value and a right-side before/after visual.
- Make upload entry obvious and readable.
- Keep workbench focused on source/result preview after upload.
- Keep result actions near the result card.
- Keep advanced settings collapsed by default.
- Reduce queue visual weight.
- Committed locally as `Refine result-first UI workbench`.

### Stage 2: P0 States and Mobile Flow

- Add clearer processing stages.
- Improve completion and error states.
- Reorder mobile layout: upload, result, export, elements, queue, advanced.
- Commit after local validation.

### Stage 3: P1 Controls and Accessibility

- Convert preview controls into accessible tabs.
- Add keyboard handling for preview tabs.
- Improve focus rings and disabled button explanations.
- Commit after local validation.

### Stage 4: P1 Asset Panel

- Upgrade element cards to feel like a design asset panel.
- Improve hover, selected, and batch actions.
- Add lazy/skeleton behavior if needed.
- Commit after local validation.

### Stage 5: P1/P2 Visual Polish

- Add a Lucide-style icon system or inline icon helper.
- Add restrained motion and reduced-motion support.
- Polish empty/error states.
- Commit after local validation.

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
