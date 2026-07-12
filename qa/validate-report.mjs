import { readFile } from "node:fs/promises";
import path from "node:path";

const reportPath = process.argv[2];

if (!reportPath) {
  console.error("Usage: node qa/validate-report.mjs <qa-report.json>");
  process.exit(2);
}

const absolutePath = path.resolve(reportPath);
const report = JSON.parse(await readFile(absolutePath, "utf8"));
const rows = Array.isArray(report.rows) ? report.rows : [];
const failures = [];
const warnings = [];

const summary = report.summary || summarize(rows);
if (rows.length < 15) failures.push(`Expected at least 15 QA rows, got ${rows.length}.`);
if ((summary.averageScore || 0) < 4) failures.push(`Average score ${format(summary.averageScore)} is below 4.0.`);
if ((summary.releaseBlockers || 0) > 0) failures.push(`${summary.releaseBlockers} release blocker(s) remain.`);
if (typeof summary.largeBoxRisk === "number" && summary.largeBoxRisk > 0) warnings.push(`Summary reports ${summary.largeBoxRisk} large-box risk row(s).`);
if (typeof summary.smallElementRisk === "number" && summary.smallElementRisk > 0) warnings.push(`Summary reports ${summary.smallElementRisk} small-element risk row(s).`);
if (typeof summary.svgBlockyRisk === "number" && summary.svgBlockyRisk > 0) warnings.push(`Summary reports ${summary.svgBlockyRisk} SVG blocky-risk row(s).`);

for (const row of rows) {
  const name = row.name || `row-${row.index || "unknown"}`;
  const scenario = row.scenario || "";
  const priority = row.priority || "";
  const score = row.score || {};
  const scores = score.scores || {};
  const average = Number(score.average || 0);
  const coreLow = Array.isArray(score.coreLow) ? score.coreLow : [];
  const metrics = row.metrics || {};

  if (row.status !== "done") failures.push(`${name}: status is ${row.status || "missing"}, expected done.`);
  if (row.status === "done") {
    for (const field of requiredMetricFieldsForScenario(scenario)) {
      if (!hasFiniteMetric(metrics, field)) failures.push(`${name}: missing required metric ${field}.`);
    }
  }
  if (average && average < 4) failures.push(`${name}: average score ${format(average)} is below 4.0.`);
  if (coreLow.length) failures.push(`${name}: core score below 3 (${coreLow.join(", ")}).`);
  if (priority === "P0" && average && average < 4) failures.push(`${name}: P0 scenario average ${format(average)} is below 4.0.`);

  if (isCriticalScenario(scenario)) {
    if (Number(scores.matte || 0) < 3.5) failures.push(`${name}: critical matte score ${format(scores.matte)} is below 3.5.`);
    if (Number(scores.components || 0) < 3.5) failures.push(`${name}: critical component score ${format(scores.components)} is below 3.5.`);
  }

  if (isMatteCriticalScenario(scenario)) {
    if (!isTransparentMaterialScenario(scenario) && Number(metrics.semiTransparentCoreRatio || 0) > 0.36) failures.push(`${name}: semiTransparentCoreRatio ${format(metrics.semiTransparentCoreRatio)} is too high.`);
    if (Number(metrics.edgeJaggednessScore || 0) > 0.48) failures.push(`${name}: edgeJaggednessScore ${format(metrics.edgeJaggednessScore)} is too high.`);
    if (Number(metrics.whiteFringeRatio || 0) > 0.1) failures.push(`${name}: whiteFringeRatio ${format(metrics.whiteFringeRatio)} is too high.`);
  }
  if (isIllustrationScenario(scenario)) {
    if (Number(metrics.lineArtLossRatio || 0) > 0.24) failures.push(`${name}: lineArtLossRatio ${format(metrics.lineArtLossRatio)} is too high.`);
    if (Number(metrics.lightRegionLossRatio || 0) > 0.28) failures.push(`${name}: lightRegionLossRatio ${format(metrics.lightRegionLossRatio)} is too high.`);
  }
  if (isMultiElementScenario(scenario)) {
    if (metrics.largeBoxRisk) failures.push(`${name}: largeBoxRisk is true in multi-element scenario.`);
    if (metrics.smallElementRisk) failures.push(`${name}: smallElementRisk is true in multi-element scenario.`);
    if (Number(metrics.smallComponentCount || 0) > 0 && Number(metrics.smallElementScoreMax || 0) < 0.65) {
      failures.push(`${name}: smallElementScoreMax ${format(metrics.smallElementScoreMax)} is too low.`);
    }
  }
  if (isSvgScenario(scenario)) {
    if (metrics.svgBlockyRisk) failures.push(`${name}: svgBlockyRisk is true.`);
    if (Number(metrics.svgPathCount || 0) <= 0) failures.push(`${name}: svgPathCount is missing or zero.`);
    if (Number(metrics.svgCommandDensity || 0) > 24) failures.push(`${name}: svgCommandDensity ${format(metrics.svgCommandDensity)} is too high.`);
    if (Number(metrics.svgFractionalCoordinateRatio || 0) < 0.18) failures.push(`${name}: svgFractionalCoordinateRatio ${format(metrics.svgFractionalCoordinateRatio)} is too low.`);
  }

  if (/贴纸合集/.test(scenario) && (row.elements || 0) < 6) warnings.push(`${name}: sticker pack produced ${row.elements || 0} elements; target is 6+.`);
  if (/靠近多角色/.test(scenario) && (row.elements || 0) < 3) warnings.push(`${name}: nearby characters produced ${row.elements || 0} elements; target is 3+.`);
  if (/小物体细节/.test(scenario) && (row.elements || 0) < 3) warnings.push(`${name}: small-detail case produced ${row.elements || 0} elements; target is 3+.`);
}

const result = {
  file: absolutePath,
  rows: rows.length,
  averageScore: summary.averageScore || 0,
  pass: failures.length === 0,
  failures,
  warnings,
};

console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);

function summarize(reportRows) {
  const output = {
    total: reportRows.length,
    pass: 0,
    failed: 0,
    releaseBlockers: 0,
    scoreSum: 0,
    averageScore: 0,
  };
  for (const row of reportRows) {
    const score = row.score || {};
    if (score.pass) output.pass += 1;
    else output.failed += 1;
    if (score.releaseBlocker) output.releaseBlockers += 1;
    if (typeof score.average === "number") output.scoreSum += score.average;
  }
  output.averageScore = output.total ? Math.round((output.scoreSum / output.total) * 10000) / 10000 : 0;
  return output;
}

function isCriticalScenario(scenario) {
  return /发丝|毛|商品|贴纸|多元素|靠近|小物体/.test(scenario || "");
}

function isMatteCriticalScenario(scenario) {
  return /发丝|毛|商品|透明材质|复杂背景|高对比|插画|图标|贴纸|logo|文字/.test(scenario || "");
}

function isTransparentMaterialScenario(scenario) {
  return /透明材质|透明/.test(scenario || "");
}

function isIllustrationScenario(scenario) {
  return /插画|图标|贴纸|logo|文字|靠近/.test(scenario || "");
}

function isMultiElementScenario(scenario) {
  return /贴纸合集|多元素|靠近|小物体|插画图标/.test(scenario || "");
}

function isSvgScenario(scenario) {
  return /插画|图标|贴纸|logo|文字|商品|靠近/.test(scenario || "");
}

function requiredMetricFieldsForScenario(scenario) {
  const fields = [
    "alphaCoverage",
    "edgeJaggednessScore",
    "semiTransparentCoreRatio",
    "componentCount",
    "largeBoxRisk",
    "svgPathCount",
  ];
  if (isMatteCriticalScenario(scenario)) fields.push("whiteFringeRatio");
  if (isIllustrationScenario(scenario)) fields.push("lineArtLossRatio", "lightRegionLossRatio");
  if (isMultiElementScenario(scenario)) fields.push("smallComponentCount", "clearSmallElementCount", "smallElementScoreMax", "smallElementScoreAverage", "smallElementRisk");
  if (isSvgScenario(scenario)) fields.push("svgCommandCount", "svgCommandDensity", "svgFractionalCoordinateRatio", "svgBlockyRisk");
  return [...new Set(fields)];
}

function hasFiniteMetric(metrics, field) {
  if (typeof metrics[field] === "boolean") return true;
  return Number.isFinite(Number(metrics[field]));
}

function format(value) {
  return typeof value === "number" ? value.toFixed(2) : "0.00";
}
