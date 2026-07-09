# QA Run Summary

Run time: 2026-07-09 10:44 Asia/Shanghai

Mode: mixed QA scenarios
Export format: PNG / WebP / SVG validation
Export scale: 1x baseline with size checks

## Result

- Batch completed without processing errors.
- Processed images: 15 / 15
- Passed rows: 15 / 15
- Average score: 4.7883
- Release blockers: 0
- Large box risk: 0
- Small element risk: 0
- SVG blocky risk: 0
- Line art risk: 0
- Light region risk: 0
- Semi-transparent core risk: 0
- ZIP: `qa/run-output/cutout-batch-20260709-1044.zip`
- Raw report: `qa/run-output/qa-report.latest.json`

## Per Image Metrics

| # | Image | Scenario | Type | Elements | Avg | Matte | Components | SVG | Edge | Semi Core | Line Loss | Light Loss | White Fringe | Fringe Area | Low Alpha Fringe | SVG Grid | SVG Blocky |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 01 | 01-portrait-hair-simulated.png | 人像发丝模拟 | photo | 1 | 4.75 | 5 | 5 | 4 | 0.2314 | 0.0687 | 0 | 0.0744 | 0.0073 | 0.0003 | 0.5055 | 0.6692 | no |
| 02 | 02-curly-hair-simulated.png | 卷发碎发模拟 | photo | 1 | 4.575 | 4.3 | 5 | 4 | 0.1003 | 0.2192 | 0 | 0.168 | 0.0001 | 0 | 0.5714 | 0.7442 | no |
| 03 | 03-pet-long-fur-simulated.png | 宠物长毛模拟 | photo | 1 | 4.75 | 5 | 5 | 4 | 0.1747 | 0.0765 | 0 | 0.0437 | 0.0036 | 0.0001 | 0.6143 | 0.5 | no |
| 04 | 04-pet-short-fur-simulated.png | 宠物短毛模拟 | photo | 1 | 4.575 | 4.3 | 5 | 4 | 0.0783 | 0.198 | 0 | 0.166 | 0 | 0 | 0 | 0.5448 | no |
| 05 | 05-light-product-white-bg.png | 白底浅色商品 | product | 1 | 5 | 5 | 5 | 5 | 0.1678 | 0.001 | 0 | 0 | 0.0024 | 0.0004 | 1 | 0.656 | no |
| 06 | 06-dark-product.png | 深色商品 | product | 1 | 5 | 5 | 5 | 5 | 0.1518 | 0.0032 | 0 | 0.4625 | 0.0047 | 0.0004 | 1 | 0.6386 | no |
| 07 | 07-transparent-material.png | 透明材质 | transparentMaterial | 1 | 4.75 | 5 | 5 | 4 | 0.0513 | 0.893 | 0 | 0.0868 | 0.0019 | 0.0008 | 1 | 0.5969 | no |
| 08 | 08-person-complex-bg.png | 复杂背景人物 | photo | 1 | 4.4 | 3.6 | 5 | 4 | 0.1049 | 0.2959 | 0.1494 | 0 | 0.0005 | 0.0001 | 1 | 0.7784 | no |
| 09 | 09-product-complex-bg.png | 复杂背景商品 | product | 1 | 4.725 | 3.9 | 5 | 5 | 0.4275 | 0.0224 | 0.1487 | 0.561 | 0 | 0 | 0 | 0.5704 | no |
| 10 | 10-illustration-icons.png | 插画图标 | illustration | 6 | 5 | 5 | 5 | 5 | 0.0988 | 0.0615 | 0 | 0 | 0.009 | 0.0002 | 1 | 0.1556 | no |
| 11 | 11-sticker-pack.png | 多元素贴纸合集 | sticker | 9 | 5 | 5 | 5 | 5 | 0.0963 | 0.0205 | 0 | 0 | 0.0213 | 0.0004 | 1 | 0.1328 | no |
| 12 | 12-nearby-characters.png | 靠近多角色 | sticker | 3 | 5 | 5 | 5 | 5 | 0.1377 | 0.0555 | 0 | 0 | 0.0024 | 0.0004 | 1 | 0.2602 | no |
| 13 | 13-small-details.png | 小物体细节 | sticker | 14 | 4.55 | 4.2 | 5 | 4 | 0.182 | 0.2001 | 0 | 0 | 0.0702 | 0.0014 | 1 | 0.2231 | no |
| 14 | 14-logo-text-product.png | 文字 logo 商品 | product | 1 | 5 | 5 | 5 | 5 | 0.136 | 0.0292 | 0 | 0 | 0.009 | 0.001 | 1 | 0.5973 | no |
| 15 | 15-high-contrast-edge.png | 高对比边缘 | illustration | 1 | 4.75 | 5 | 5 | 4 | 0.2993 | 0.0093 | 0.2269 | 0 | 0 | 0 | 0 | 0.0971 | no |

## Findings

- Full 15-image QA regression passed with average score 4.7883.
- Added a targeted illustration/sticker light-region recovery rule: colored light details with directional foreground support are restored more strongly, while near-white details still require strict four-direction enclosure.
- Matte unit coverage now includes a synthetic missing-light-region case; it restores the deleted interior light area without re-promoting edge white fringe.
- Latest browser QA reports no large-box, small-element, SVG blocky, line-art, light-region, or semi-transparent core release risks.
- `13-small-details.png` still reports white fringe 0.0702, but the current metric is dominated by ultra-low-alpha fringe pixels and is tracked with white-fringe area / low-alpha diagnostics.
- `15-high-contrast-edge.png` still reports line loss 0.2269 and remains a targeted future improvement area.

## Not Covered

- This automated run scores measurable matte, component, SVG, and export indicators. It still does not replace human side-by-side visual review against remove.bg / Canva / WPS AI on checker, white, black, and colored backgrounds.
