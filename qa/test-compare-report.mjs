#!/usr/bin/env node

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const workDir = await mkdtemp(path.join(tmpdir(), "cutout-qa-compare-"));
const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const baselinePath = path.join(workDir, "baseline.json");
const improvedPath = path.join(workDir, "improved.json");
const regressedPath = path.join(workDir, "regressed.json");
const nodeBin = process.env.NODE_BINARY || (process.platform === "win32" ? "node" : process.execPath);

await writeFile(baselinePath, JSON.stringify(makeReport("baseline"), null, 2));
await writeFile(improvedPath, JSON.stringify(makeReport("improved"), null, 2));
await writeFile(regressedPath, JSON.stringify(makeReport("regressed"), null, 2));

const improved = runCompare(baselinePath, improvedPath);
const regressed = runCompare(baselinePath, regressedPath);
const failures = [];

if (improved.status !== 0) failures.push(`Expected improved report to pass, got ${improved.status}: ${improved.stderr || improved.stdout}`);
if (!/improvements/.test(improved.stdout) || !/whiteFringeRatio|averageScore/.test(improved.stdout)) {
  failures.push("Expected improved comparison output to include improvements.");
}
if (regressed.status === 0) failures.push("Expected regressed report to fail comparison.");
if (!/largeBoxRisk|averageScore|lineArtLossRatio|svgFractionalCoordinateRatio|svgCubicHandleOutlierRatio|smallElementScoreMax|elements/.test(regressed.stdout)) {
  failures.push("Expected regressed comparison output to mention risk, score, metric, or element regression.");
}
if (!/svgFractionalCoordinateRatio/.test(regressed.stdout)) {
  failures.push("Expected regressed comparison output to mention svgFractionalCoordinateRatio.");
}
if (!/svgCubicHandleOutlierRatio/.test(regressed.stdout)) {
  failures.push("Expected regressed comparison output to mention svgCubicHandleOutlierRatio.");
}
if (!/smallElementScoreMax/.test(regressed.stdout)) {
  failures.push("Expected regressed comparison output to mention smallElementScoreMax.");
}

const result = {
  pass: failures.length === 0,
  improvedStatus: improved.status,
  regressedStatus: regressed.status,
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);

function runCompare(base, candidate) {
  return spawnSync(nodeBin, ["qa/compare-report.mjs", base, candidate], {
    cwd: root,
    encoding: "utf8",
  });
}

function makeReport(kind) {
  const rows = [
    makeRow({
      name: "11-sticker-pack.png",
      scenario: "多元素贴纸合集",
      elements: kind === "regressed" ? 2 : kind === "improved" ? 9 : 7,
      average: kind === "regressed" ? 4.28 : kind === "improved" ? 4.78 : 4.62,
      matte: 4.6,
      components: kind === "regressed" ? 3.9 : 4.5,
      svg: 4.4,
      metrics: {
        edgeJaggednessScore: 0.16,
        semiTransparentCoreRatio: 0.08,
        lightRegionLossRatio: 0.07,
        lineArtLossRatio: kind === "regressed" ? 0.17 : 0.05,
        whiteFringeRatio: kind === "improved" ? 0.012 : 0.04,
        whiteFringeAreaRatio: 0.0005,
        componentCount: kind === "regressed" ? 2 : kind === "improved" ? 9 : 7,
        clearSmallElementCount: kind === "regressed" ? 0 : kind === "improved" ? 4 : 3,
        smallElementScoreMax: kind === "regressed" ? 0.56 : kind === "improved" ? 0.88 : 0.76,
        smallElementScoreAverage: kind === "regressed" ? 0.44 : kind === "improved" ? 0.78 : 0.66,
        largeBoxRisk: kind === "regressed",
        smallElementRisk: false,
        svgPathCount: 42,
        svgCommandDensity: 8,
        svgGridAlignedRatio: 0.3,
        svgFractionalCoordinateRatio: kind === "regressed" ? 0.36 : kind === "improved" ? 0.64 : 0.52,
        svgCubicHandleOutlierRatio: kind === "regressed" ? 0.09 : kind === "improved" ? 0 : 0.01,
        svgBlockyRisk: false,
      },
    }),
    makeRow({
      name: "13-small-details.png",
      scenario: "小物体细节",
      elements: kind === "regressed" ? 1 : 4,
      average: kind === "regressed" ? 4.2 : 4.55,
      matte: 4.4,
      components: kind === "regressed" ? 3.8 : 4.3,
      svg: 4.2,
      metrics: {
        edgeJaggednessScore: kind === "regressed" ? 0.27 : 0.18,
        semiTransparentCoreRatio: 0.1,
        lightRegionLossRatio: 0.08,
        lineArtLossRatio: 0.06,
        whiteFringeRatio: 0.035,
        whiteFringeAreaRatio: 0.0004,
        componentCount: kind === "regressed" ? 1 : 4,
        clearSmallElementCount: kind === "regressed" ? 0 : 2,
        smallElementScoreMax: kind === "regressed" ? 0.5 : 0.74,
        smallElementScoreAverage: kind === "regressed" ? 0.42 : 0.64,
        largeBoxRisk: false,
        smallElementRisk: kind === "regressed",
        svgPathCount: 25,
        svgCommandDensity: 9,
        svgGridAlignedRatio: 0.32,
        svgFractionalCoordinateRatio: kind === "regressed" ? 0.34 : 0.5,
        svgCubicHandleOutlierRatio: kind === "regressed" ? 0.08 : 0.01,
        svgBlockyRisk: false,
      },
    }),
  ];
  const averageScore = kind === "regressed" ? 4.24 : kind === "improved" ? 4.665 : 4.585;
  return {
    generatedAt: `fixture-${kind}`,
    rows,
    summary: {
      total: rows.length,
      pass: rows.length,
      failed: 0,
      releaseBlockers: 0,
      averageScore,
      largeBoxRisk: kind === "regressed" ? 1 : 0,
      smallElementRisk: kind === "regressed" ? 1 : 0,
      svgBlockyRisk: 0,
      lineArtRisk: 0,
      lightRegionRisk: 0,
      semiTransparentRisk: 0,
    },
  };
}

function makeRow({ name, scenario, elements, average, matte, components, svg, metrics }) {
  return {
    name,
    scenario,
    priority: "P0",
    status: "done",
    elements,
    metrics,
    score: {
      scores: { matte, components, svg, export: 5 },
      average,
      pass: true,
      releaseBlocker: false,
      coreLow: [],
    },
  };
}
