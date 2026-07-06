# QA Run Summary

Run time: 2026-07-03 16:38 Asia/Shanghai

Mode: multi-object split
Split strength: strong
Export format: PNG
Export scale: 1x

## Result

- Batch completed without processing errors.
- Processed images: 15 / 15
- Exported cutouts: 15
- Exported elements: 41
- ZIP: `qa/run-output/cutout-batch-20260703-1638.zip`
- Raw report: `qa/run-output/latest-run-summary.json`
- Screenshot: `qa/run-output/latest-run-screen.png`

## Element Counts

| # | Image | Status | Elements |
|---|---|---:|---:|
| 01 | 01-portrait-hair-simulated.png | done | 1 |
| 02 | 02-curly-hair-simulated.png | done | 1 |
| 03 | 03-pet-long-fur-simulated.png | done | 1 |
| 04 | 04-pet-short-fur-simulated.png | done | 1 |
| 05 | 05-light-product-white-bg.png | done | 1 |
| 06 | 06-dark-product.png | done | 1 |
| 07 | 07-transparent-material.png | done | 1 |
| 08 | 08-person-complex-bg.png | done | 1 |
| 09 | 09-product-complex-bg.png | done | 3 |
| 10 | 10-illustration-icons.png | done | 6 |
| 11 | 11-sticker-pack.png | done | 3 |
| 12 | 12-nearby-characters.png | done | 2 |
| 13 | 13-small-details.png | done | 17 |
| 14 | 14-logo-text-product.png | done | 1 |
| 15 | 15-high-contrast-edge.png | done | 1 |

## Findings

- Multi-object split still under-splits close characters. `12-nearby-characters.png` produced 2 elements; target is at least 3 and ideally 4.
- Sticker/icon groups are partly improved: `10-illustration-icons.png` produced 6 elements and `11-sticker-pack.png` produced 3 elements.
- Small-detail stress case produced 17 elements, so strong split did not collapse everything into one frame.
- Before the CSS fix, the batch button was present but hidden after upload. This is now fixed so QA and users can start batch processing from the uploaded state.

## Follow-up Patch

Applied after this run:

- Added projection peak/valley splitting for large multi-object boxes.
- Made strong multi-object mode avoid re-merging two meaningful objects just because padded boxes lightly overlap.
- Targeted check on the previous `12-nearby-characters` cutout now detects 4 boxes:
  - `(125, 220, 178, 229)`
  - `(304, 220, 178, 229)`
  - `(460, 225, 179, 220)`
  - `(627, 225, 170, 220)`

Full browser re-run was attempted after the patch, but model download stalled during `fetch:/models/isnet_fp16` and did not complete in a reasonable time. This should be treated as a separate model-loading reliability issue, not as a split-algorithm failure.

## Not Covered

- This run verified completion, element counts, ZIP export presence, and app stability.
- It did not perform human visual scoring against remove.bg / Canva / WPS AI. Edge quality still needs manual side-by-side review on checker, white, black, and colored backgrounds.
