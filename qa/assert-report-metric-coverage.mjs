#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const reportPath = process.argv[2];

if (!reportPath) {
  console.error("Usage: node qa/assert-report-metric-coverage.mjs <qa-report.json>");
  process.exit(2);
}

const absolutePath = path.resolve(reportPath);
const report = JSON.parse(await readFile(absolutePath, "utf8"));
const rows = Array.isArray(report.rows) ? report.rows : [];
const failures = [];
const warnings = [];

const coverage = {
  rows: rows.length,
  svgScenarioRows: 0,
  svgMetricRows: 0,
  multiElementScenarioRows: 0,
  smallElementMetricRows: 0,
  smallElementRowsWithClearDetections: 0,
};

for (const row of rows) {
  const name = row.name || `row-${row.index || "unknown"}`;
  const scenario = row.scenario || "";
  const metrics = row.metrics || {};

  if (isSvgScenario(scenario)) {
    coverage.svgScenarioRows += 1;
    if (hasFiniteMetric(metrics, "svgFractionalCoordinateRatio")) {
      coverage.svgMetricRows += 1;
    } else {
      failures.push(`${name}: missing real-report svgFractionalCoordinateRatio coverage.`);
    }
  }

  if (isMultiElementScenario(scenario)) {
    coverage.multiElementScenarioRows += 1;
    const required = ["clearSmallElementCount", "smallElementScoreMax", "smallElementScoreAverage"];
    const missing = required.filter((field) => !hasFiniteMetric(metrics, field));
    if (missing.length) {
      failures.push(`${name}: missing real-report small-element metric coverage (${missing.join(", ")}).`);
    } else {
      coverage.smallElementMetricRows += 1;
      if (Number(metrics.clearSmallElementCount || 0) > 0) coverage.smallElementRowsWithClearDetections += 1;
    }
  }
}

if (rows.length < 15) failures.push(`Expected a full real browser QA report with at least 15 rows, got ${rows.length}.`);
if (coverage.svgScenarioRows < 6) failures.push(`Expected at least 6 SVG-relevant rows, got ${coverage.svgScenarioRows}.`);
if (coverage.multiElementScenarioRows < 4) failures.push(`Expected at least 4 multi-element rows, got ${coverage.multiElementScenarioRows}.`);
if (coverage.multiElementScenarioRows && coverage.smallElementRowsWithClearDetections === 0) {
  warnings.push("No multi-element row reported clearSmallElementCount > 0; metric exists but may not be exercising clear small detections.");
}

const result = {
  file: absolutePath,
  pass: failures.length === 0,
  coverage,
  failures,
  warnings,
};

console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);

function isSvgScenario(scenario) {
  return /插画|图标|贴纸|logo|文字|商品|靠近/.test(scenario || "");
}

function isMultiElementScenario(scenario) {
  return /贴纸合集|多元素|靠近|小物体|插画图标/.test(scenario || "");
}

function hasFiniteMetric(metrics, field) {
  if (typeof metrics[field] === "boolean") return true;
  return Number.isFinite(Number(metrics[field]));
}
