#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const appSource = await readFile(path.join(root, "app.js"), "utf8");
const workerSource = await readFile(path.join(root, "matte-worker.js"), "utf8");
const failures = [];

assertPipelineOrder(appSource, "app.js");
assertPipelineOrder(workerSource, "matte-worker.js");

for (const needle of [
  "function polishProductDiagonalEdges",
  'settings.imageType !== "product"',
  "transparent < 2 || strong < 2",
  "mixed * factor * 0.52",
  "clamp(alpha * (1 - factor) + mixed * factor, 142, 224)",
]) {
  if (!workerSource.includes(needle)) failures.push(`matte-worker.js missing product edge polish detail: ${needle}`);
}

const result = {
  pass: failures.length === 0,
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);

function assertPipelineOrder(source, label) {
  const antiAlias = source.indexOf("antiAliasHardEdges(imageData, settings)");
  const polish = source.indexOf("polishProductDiagonalEdges(imageData, settings)");
  const postCore = source.indexOf("normalizePostEdgeCoreAlpha(imageData, settings)");
  if (antiAlias < 0) failures.push(`${label} missing antiAliasHardEdges pipeline call.`);
  if (polish < 0) failures.push(`${label} missing polishProductDiagonalEdges pipeline call.`);
  if (postCore < 0) failures.push(`${label} missing normalizePostEdgeCoreAlpha pipeline call.`);
  if (antiAlias >= 0 && polish >= 0 && postCore >= 0 && !(antiAlias < polish && polish < postCore)) {
    failures.push(`${label} product edge polish must run after anti-aliasing and before post-edge core normalization.`);
  }
}
