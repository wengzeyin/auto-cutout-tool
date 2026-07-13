# QA Run Summary

Run time: 2026-07-13 18:12 Asia/Shanghai

Mode: mixed QA scenarios
Export format: PNG / WebP / SVG validation
Export scale: 1x baseline with size checks

## Result

- Batch completed without processing errors.
- Processed images: 15 / 15
- Passed rows: 15 / 15
- Average score: 4.79
- Release blockers: 0
- Large box risk: 0
- Small element risk: 0
- SVG blocky risk: 0
- Line art risk: 0
- Light region risk: 0
- Semi-transparent core risk: 0
- ZIP: `qa/run-output/cutout-batch-20260713-1812.zip`
- Raw report: `qa/run-output/qa-report.latest.json`
- Browser QA metric coverage: SVG 7 / 7 rows, multi-element small metrics 4 / 4 rows

## Per Image Metrics

| # | Image | Scenario | Type | Elements | Avg | Matte | Components | SVG | Edge | Semi Core | SVG Fractional | Small Clear | SVG Blocky |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 01 | 01-portrait-hair-simulated.png | 人像发丝模拟 | photo | 1 | 4.75 | 5 | 5 | 4 | 0.0975 | 0.0623 |  |  | no |
| 02 | 02-curly-hair-simulated.png | 卷发碎发模拟 | photo | 1 | 4.575 | 4.3 | 5 | 4 | 0.1007 | 0.2165 |  |  | no |
| 03 | 03-pet-long-fur-simulated.png | 宠物长毛模拟 | photo | 1 | 4.75 | 5 | 5 | 4 | 0.1242 | 0.0705 |  |  | no |
| 04 | 04-pet-short-fur-simulated.png | 宠物短毛模拟 | photo | 1 | 4.575 | 4.3 | 5 | 4 | 0.0782 | 0.1955 |  |  | no |
| 05 | 05-light-product-white-bg.png | 白底浅色商品 | product | 1 | 5 | 5 | 5 | 5 | 0.1678 | 0.001 | 0.8085 |  | no |
| 06 | 06-dark-product.png | 深色商品 | product | 1 | 5 | 5 | 5 | 5 | 0.1518 | 0.0032 | 0.809 |  | no |
| 07 | 07-transparent-material.png | 透明材质 | transparentMaterial | 1 | 4.75 | 5 | 5 | 4 | 0.0513 | 0.893 |  |  | no |
| 08 | 08-person-complex-bg.png | 复杂背景人物 | photo | 1 | 4.4 | 3.6 | 5 | 4 | 0.1058 | 0.2942 |  |  | no |
| 09 | 09-product-complex-bg.png | 复杂背景商品 | product | 1 | 4.725 | 3.9 | 5 | 5 | 0.4275 | 0.0224 | 0.7057 |  | no |
| 10 | 10-illustration-icons.png | 插画图标 | illustration | 6 | 5 | 5 | 5 | 5 | 0.117 | 0.0732 | 0.834 | 0 | no |
| 11 | 11-sticker-pack.png | 多元素贴纸合集 | sticker | 9 | 5 | 5 | 5 | 5 | 0.1022 | 0.0251 | 0.8092 | 0 | no |
| 12 | 12-nearby-characters.png | 靠近多角色 | sticker | 3 | 5 | 5 | 5 | 5 | 0.1487 | 0.0614 | 0.6703 | 0 | no |
| 13 | 13-small-details.png | 小物体细节 | sticker | 14 | 4.575 | 4.3 | 5 | 4 | 0.1821 | 0.2167 | 0.8133 | 6 | no |
| 14 | 14-logo-text-product.png | 文字 logo 商品 | product | 1 | 5 | 5 | 5 | 5 | 0.136 | 0.0292 | 0.8336 |  | no |
| 15 | 15-high-contrast-edge.png | 高对比边缘 | illustration | 1 | 4.75 | 5 | 5 | 4 | 0.2993 | 0.0093 |  |  | no |

## Findings

- Full 15-image QA validation passed with average score 4.79 and 0 release blockers.
- Added a conservative product interior-light restoration guard: near-white product details are restored only when directional alpha support shows they are inside the subject. The new matte regression restores an interior product light strip to alpha 255 while keeping adjacent light background at alpha 0.
- Tightened dark-background detail restoration for black-background sticker assets: source pixels matching the dark background are only restored as line art when they have real directional alpha support, preventing thick hidden black backgrounds from reappearing as outer outlines.
- Added a matte regression for thick hidden black exterior strokes; `thickDarkRestoreExteriorAfter` stays at 0 while internal black line art remains protected.
- Added connected dark-background fringe cleanup for black-background sticker assets. The cleanup removes generated near-black/gray outlines connected to transparent background while preserving internal black text/lines.
- The black-background fast-cutout regression now covers a thicker dark halo case; `black`, `black-halo`, and `white` solid-background mocks all complete locally in under 1s with `darkHaloRatio` 0 and no IMG.LY model-resource requests.
- Dark-background line-art QA now ignores source pixels that match the detected dark background, so removed black canvas/background is not counted as lost line art.
- Tightened dark-background matte cleanup gating so low-saturation black/white illustrations do not lose gray anti-aliased edges; `15-high-contrast-edge.png` returned to matte 5 and `edgeJaggednessScore` 0.2993.
- Added angle-aware SVG cubic handle clamping so precise vector paths keep smoother QuickTrace-like filled outlines without overshooting corners; SVG QA now asserts `cubicHandleOutlierRatio` stays below 0.08.
- Added readback-safe canvas context creation for pixel-scanning canvases and a browser QA gate for Canvas `willReadFrequently` warnings; this run completed with `consoleFailures: []` and `consoleMessages: []`.
- Added AI background-removal timeout protection plus a browser regression test that simulates a hanging model; the UI recovers in under 1s, re-enables processing, hides progress, and marks the queue item as failed.
- Added clear standalone tiny-element protection in multi-object split mode. Small badges/icons with strong alpha cores and a transparent gap near larger stickers are preserved instead of being absorbed into the large element.
- Added SVG micro-gap closing for flat vector regions. Same-color regions split by tiny transparent cracks now close back into one connected filled area; SVG QA asserts `crackedConnectedRegionCount: 1`.
- Added a dark-background restore guard so source pixels matching a black background and touching true transparent exterior are not restored as line art. The new matte regression keeps exterior black outline alpha at 0 while preserving internal black lines at alpha 235.
- Added photo dense-core and post-edge core normalization. Dense subject interiors are restored to solid alpha after edge smoothing, while thin hair/fur strokes remain semi-transparent; matte QA now asserts dense core alpha 255, post-edge core alpha 253, and fine hair remains below the hardening threshold.
- Full browser QA showed photo `semiTransparentCoreRatio` moved down on the tracked photo rows: `01` 0.0686 -> 0.0623, `02` 0.2192 -> 0.2165, `03` 0.0763 -> 0.0705, `04` 0.1975 -> 0.1955, `08` 0.2959 -> 0.2942.
- Added browser QA metric coverage gates for `svgFractionalCoordinateRatio`, `clearSmallElementCount`, `smallElementScoreMax`, and `smallElementScoreAverage`.
- Added local IMG.LY model-resource proxy/cache for localhost QA to avoid flaky browser-side CDN fetch failures.
- Added repeated vertical sticker-stack splitting; `11-sticker-pack.png` now exports 9 elements instead of the failed 3-column grouping.
- Added solid-background fast cutout for white/black pure-background assets; black-background sticker regression completed in ~0.31s with no dark halo, and white paper regression completed in ~0.21s with no IMG.LY model-resource requests.
- Reduced light-solid flood tolerance so beige/light subjects are no longer swallowed into the white background mask.
- Added complex-background product image-type routing for low-complexity colored-background product graphics, plus regression coverage that keeps flat illustrations from being misclassified.
- Added product-only smooth-edge matte retry: high-jaggedness product mattes can be refined with cleaner edge settings, but the result is accepted only when light regions, line art, core opacity, white fringe, and coverage stay stable.
- Added product SVG grid relaxation, cubic handle clamping, and micro-gap closing: product SVG command density stayed stable, while product `svgGridAlignedRatio` improved across all product QA rows (`05` 0.6560 -> 0.4099, `06` 0.6386 -> 0.4110, `09` 0.5704 -> 0.4239, `14` 0.5973 -> 0.3875).
- QA comparison against the previous baseline passed with no regressions in score, component count, large-box risk, small-element risk, matte, or SVG metrics.
- Current algorithmic limiting cases remain: photo-like semi-transparent core on curly/short fur and complex-background person, product edge jaggedness, and complex-background product light-region loss.

## Not Covered

- This automated run scores measurable matte, component, SVG, and export indicators. It still does not replace human side-by-side visual review against remove.bg / Canva / WPS AI on checker, white, black, and colored backgrounds.
