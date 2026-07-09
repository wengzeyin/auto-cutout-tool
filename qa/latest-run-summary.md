# QA Run Summary

Run time: 2026-07-09 15:45 Asia/Shanghai

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
- ZIP: `qa/run-output/cutout-batch-20260709-1545.zip`
- Raw report: `qa/run-output/qa-report.latest.json`

## Per Image Metrics

| # | Image | Scenario | Type | Elements | Avg | Matte | Components | SVG | Edge | Semi Core | Line Loss | Light Loss | White Fringe | Fringe Area | Low Alpha Fringe | SVG Paths | SVG Commands | SVG Grid | SVG Blocky |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 01 | 01-portrait-hair-simulated.png | 人像发丝模拟 | photo | 1 | 4.75 | 5 | 5 | 4 | 0.0925 | 0.0687 | 0 | 0.0744 | 0.004 | 0.0002 | 0.5652 | 26 | 282 | 0.6611 | no |
| 02 | 02-curly-hair-simulated.png | 卷发碎发模拟 | photo | 1 | 4.575 | 4.3 | 5 | 4 | 0.1 | 0.2192 | 0 | 0.168 | 0 | 0 | 1 | 87 | 684 | 0.7442 | no |
| 03 | 03-pet-long-fur-simulated.png | 宠物长毛模拟 | photo | 1 | 4.75 | 5 | 5 | 4 | 0.1168 | 0.0765 | 0 | 0.0437 | 0.0022 | 0.0001 | 0.6628 | 24 | 398 | 0.4714 | no |
| 04 | 04-pet-short-fur-simulated.png | 宠物短毛模拟 | photo | 1 | 4.575 | 4.3 | 5 | 4 | 0.078 | 0.198 | 0 | 0.166 | 0 | 0 | 0 | 45 | 557 | 0.5448 | no |
| 05 | 05-light-product-white-bg.png | 白底浅色商品 | product | 1 | 5 | 5 | 5 | 5 | 0.1678 | 0.001 | 0 | 0 | 0.0024 | 0.0004 | 1 | 103 | 817 | 0.656 | no |
| 06 | 06-dark-product.png | 深色商品 | product | 1 | 5 | 5 | 5 | 5 | 0.1518 | 0.0032 | 0 | 0.4625 | 0.0047 | 0.0004 | 1 | 88 | 706 | 0.6386 | no |
| 07 | 07-transparent-material.png | 透明材质 | transparentMaterial | 1 | 4.75 | 5 | 5 | 4 | 0.0513 | 0.893 | 0 | 0.0868 | 0.0019 | 0.0008 | 1 | 133 | 1370 | 0.5933 | no |
| 08 | 08-person-complex-bg.png | 复杂背景人物 | photo | 1 | 4.4 | 3.6 | 5 | 4 | 0.1049 | 0.2959 | 0.1494 | 0 | 0.0005 | 0.0001 | 1 | 99 | 826 | 0.7784 | no |
| 09 | 09-product-complex-bg.png | 复杂背景商品 | product | 1 | 4.725 | 3.9 | 5 | 5 | 0.4275 | 0.0224 | 0.1487 | 0.561 | 0 | 0 | 0 | 27 | 265 | 0.5704 | no |
| 10 | 10-illustration-icons.png | 插画图标 | illustration | 6 | 5 | 5 | 5 | 5 | 0.117 | 0.0732 | 0 | 0 | 0.003 | 0.0001 | 1 | 15 | 286 | 0.1175 | no |
| 11 | 11-sticker-pack.png | 多元素贴纸合集 | sticker | 9 | 5 | 5 | 5 | 5 | 0.1022 | 0.0251 | 0 | 0 | 0.006 | 0.0001 | 1 | 32 | 646 | 0.1262 | no |
| 12 | 12-nearby-characters.png | 靠近多角色 | sticker | 3 | 5 | 5 | 5 | 5 | 0.1487 | 0.0614 | 0 | 0 | 0.0009 | 0.0001 | 1 | 129 | 1806 | 0.2058 | no |
| 13 | 13-small-details.png | 小物体细节 | sticker | 14 | 4.575 | 4.3 | 5 | 4 | 0.1821 | 0.2167 | 0 | 0 | 0.0298 | 0.0006 | 1 | 24 | 406 | 0.1216 | no |
| 14 | 14-logo-text-product.png | 文字 logo 商品 | product | 1 | 5 | 5 | 5 | 5 | 0.136 | 0.0292 | 0 | 0 | 0.009 | 0.001 | 1 | 93 | 776 | 0.5973 | no |
| 15 | 15-high-contrast-edge.png | 高对比边缘 | illustration | 1 | 4.75 | 5 | 5 | 4 | 0.2993 | 0.0093 | 0.2269 | 0 | 0 | 0 | 0 | 3 | 180 | 0.0971 | no |

## Findings

- Full 15-image QA regression passed with average score 4.79.
- Added original-context protection for enclosed pale and white illustration details, so eye whites, flame cores, light fills, and similar internal sticker details can be restored without treating one-sided white fringe as foreground.
- QA comparison against the previous baseline passed with no regressions.
- The strongest measured improvement is small-detail sticker white fringe: `whiteFringeRatio` 0.0589 -> 0.0298 and `whiteFringeAreaRatio` 0.0012 -> 0.0006.
- Current algorithmic limiting cases remain: photo-like semi-transparent core on curly/short fur and complex-background person, product edge jaggedness, and complex-background product light-region loss.

## Not Covered

- This automated run scores measurable matte, component, SVG, and export indicators. It still does not replace human side-by-side visual review against remove.bg / Canva / WPS AI on checker, white, black, and colored backgrounds.
