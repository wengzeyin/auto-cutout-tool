#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const [baselinePath, candidatePath] = process.argv.slice(2);

if (!baselinePath || !candidatePath) {
  console.error("Usage: node qa/compare-report.mjs <baseline-qa-report.json> <candidate-qa-report.json>");
  process.exit(2);
}

const CONFIG = {
  summaryAverageDrop: 0.03,
  rowAverageDrop: 0.12,
  coreScoreDrop: 0.2,
  metricRegression: {
    edgeJaggednessScore: { absolute: 0.04, relative: 0.25, direction: "lower" },
    semiTransparentCoreRatio: { absolute: 0.04, relative: 0.25, direction: "lower" },
    lightRegionLossRatio: { absolute: 0.05, relative: 0.25, direction: "lower" },
    lineArtLossRatio: { absolute: 0.04, relative: 0.25, direction: "lower" },
    whiteFringeRatio: { absolute: 0.015, relative: 0.35, direction: "lower" },
    whiteFringeAreaRatio: { absolute: 0.0005, relative: 0.35, direction: "lower" },
    svgCommandDensity: { absolute: 1.5, relative: 0.35, direction: "lower" },
    svgGridAlignedRatio: { absolute: 0.08, relative: 0.2, direction: "lower" },
  },
  improvementMetrics: [
    "edgeJaggednessScore",
    "semiTransparentCoreRatio",
    "lightRegionLossRatio",
    "lineArtLossRatio",
    "whiteFringeRatio",
    "whiteFringeAreaRatio",
    "svgCommandDensity",
    "svgGridAlignedRatio",
  ],
  riskMetrics: [
    "largeBoxRisk",
    "smallElementRisk",
    "svgBlockyRisk",
  ],
  summaryRiskFields: [
    "releaseBlockers",
    "largeBoxRisk",
    "smallElementRisk",
    "svgBlockyRisk",
    "lineArtRisk",
    "lightRegionRisk",
    "semiTransparentRisk",
  ],
};

const baseline = await readReport(baselinePath);
const candidate = await readReport(candidatePath);
const regressions = [];
const improvements = [];
const warnings = [];

compareSummary(baseline.summary, candidate.summary);
compareRows(baseline.rows, candidate.rows);

const result = {
  pass: regressions.length === 0,
  baseline: {
    file: baseline.file,
    rows: baseline.rows.length,
    averageScore: numberOrZero(baseline.summary.averageScore),
    releaseBlockers: numberOrZero(baseline.summary.releaseBlockers),
  },
  candidate: {
    file: candidate.file,
    rows: candidate.rows.length,
    averageScore: numberOrZero(candidate.summary.averageScore),
    releaseBlockers: numberOrZero(candidate.summary.releaseBlockers),
  },
  regressions,
  improvements,
  warnings,
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.pass ? 0 : 1);

async function readReport(reportPath) {
  const file = path.resolve(reportPath);
  const report = JSON.parse(await readFile(file, "utf8"));
  const rows = Array.isArray(report.rows) ? report.rows : [];
  return {
    file,
    raw: report,
    rows,
    summary: report.summary || summarize(rows),
  };
}

function compareSummary(base, next) {
  const baseAverage = numberOrZero(base.averageScore);
  const nextAverage = numberOrZero(next.averageScore);
  if (baseAverage - nextAverage > CONFIG.summaryAverageDrop) {
    regressions.push({
      scope: "summary",
      field: "averageScore",
      message: `Average score dropped from ${format(baseAverage)} to ${format(nextAverage)}.`,
      baseline: baseAverage,
      candidate: nextAverage,
    });
  } else if (nextAverage - baseAverage > CONFIG.summaryAverageDrop) {
    improvements.push({
      scope: "summary",
      field: "averageScore",
      message: `Average score improved from ${format(baseAverage)} to ${format(nextAverage)}.`,
      baseline: baseAverage,
      candidate: nextAverage,
    });
  }

  for (const field of CONFIG.summaryRiskFields) {
    const baseValue = numberOrZero(base[field]);
    const nextValue = numberOrZero(next[field]);
    if (nextValue > baseValue) {
      regressions.push({
        scope: "summary",
        field,
        message: `${field} increased from ${baseValue} to ${nextValue}.`,
        baseline: baseValue,
        candidate: nextValue,
      });
    } else if (nextValue < baseValue) {
      improvements.push({
        scope: "summary",
        field,
        message: `${field} decreased from ${baseValue} to ${nextValue}.`,
        baseline: baseValue,
        candidate: nextValue,
      });
    }
  }
}

function compareRows(baseRows, nextRows) {
  const nextByName = new Map(nextRows.map((row) => [rowKey(row), row]));

  for (const baseRow of baseRows) {
    const key = rowKey(baseRow);
    const nextRow = nextByName.get(key);
    if (!nextRow) {
      regressions.push({
        scope: key,
        field: "row",
        message: `Candidate report is missing row ${key}.`,
      });
      continue;
    }
    compareRowStatus(key, baseRow, nextRow);
    compareRowScores(key, baseRow, nextRow);
    compareRowMetrics(key, baseRow, nextRow);
  }

  const baseKeys = new Set(baseRows.map(rowKey));
  for (const nextRow of nextRows) {
    const key = rowKey(nextRow);
    if (!baseKeys.has(key)) {
      warnings.push({
        scope: key,
        field: "row",
        message: `Candidate report has a new row ${key}; no baseline comparison available.`,
      });
    }
  }
}

function compareRowStatus(key, baseRow, nextRow) {
  if (baseRow.status === "done" && nextRow.status !== "done") {
    regressions.push({
      scope: key,
      field: "status",
      message: `${key} changed from done to ${nextRow.status || "missing"}.`,
      baseline: baseRow.status,
      candidate: nextRow.status || "",
    });
  }
}

function compareRowScores(key, baseRow, nextRow) {
  const baseScore = baseRow.score || {};
  const nextScore = nextRow.score || {};
  const baseAverage = numberOrZero(baseScore.average);
  const nextAverage = numberOrZero(nextScore.average);
  if (baseAverage - nextAverage > CONFIG.rowAverageDrop) {
    regressions.push({
      scope: key,
      field: "score.average",
      message: `${key} average dropped from ${format(baseAverage)} to ${format(nextAverage)}.`,
      baseline: baseAverage,
      candidate: nextAverage,
    });
  } else if (nextAverage - baseAverage > CONFIG.rowAverageDrop) {
    improvements.push({
      scope: key,
      field: "score.average",
      message: `${key} average improved from ${format(baseAverage)} to ${format(nextAverage)}.`,
      baseline: baseAverage,
      candidate: nextAverage,
    });
  }

  const baseScores = baseScore.scores || {};
  const nextScores = nextScore.scores || {};
  for (const field of ["matte", "components", "svg", "export"]) {
    const baseValue = numberOrZero(baseScores[field]);
    const nextValue = numberOrZero(nextScores[field]);
    if (baseValue - nextValue > CONFIG.coreScoreDrop) {
      regressions.push({
        scope: key,
        field: `score.scores.${field}`,
        message: `${key} ${field} score dropped from ${format(baseValue)} to ${format(nextValue)}.`,
        baseline: baseValue,
        candidate: nextValue,
      });
    } else if (nextValue - baseValue > CONFIG.coreScoreDrop) {
      improvements.push({
        scope: key,
        field: `score.scores.${field}`,
        message: `${key} ${field} score improved from ${format(baseValue)} to ${format(nextValue)}.`,
        baseline: baseValue,
        candidate: nextValue,
      });
    }
  }
}

function compareRowMetrics(key, baseRow, nextRow) {
  const baseMetrics = baseRow.metrics || {};
  const nextMetrics = nextRow.metrics || {};

  for (const field of CONFIG.riskMetrics) {
    if (baseMetrics[field] === false && nextMetrics[field] === true) {
      regressions.push({
        scope: key,
        field: `metrics.${field}`,
        message: `${key} introduced ${field}.`,
        baseline: false,
        candidate: true,
      });
    } else if (baseMetrics[field] === true && nextMetrics[field] === false) {
      improvements.push({
        scope: key,
        field: `metrics.${field}`,
        message: `${key} resolved ${field}.`,
        baseline: true,
        candidate: false,
      });
    }
  }

  for (const [field, rule] of Object.entries(CONFIG.metricRegression)) {
    if (!isFiniteNumber(baseMetrics[field]) || !isFiniteNumber(nextMetrics[field])) continue;
    const baseValue = Number(baseMetrics[field]);
    const nextValue = Number(nextMetrics[field]);
    const delta = nextValue - baseValue;
    const relativeDelta = Math.abs(baseValue) > 0.000001 ? delta / Math.abs(baseValue) : delta > 0 ? 1 : 0;
    const regressed = rule.direction === "lower"
      ? delta > rule.absolute && relativeDelta > rule.relative
      : delta < -rule.absolute && relativeDelta < -rule.relative;
    const improved = rule.direction === "lower"
      ? delta < -rule.absolute && relativeDelta < -rule.relative
      : delta > rule.absolute && relativeDelta > rule.relative;

    if (regressed) {
      regressions.push({
        scope: key,
        field: `metrics.${field}`,
        message: `${key} ${field} regressed from ${format(baseValue)} to ${format(nextValue)}.`,
        baseline: baseValue,
        candidate: nextValue,
      });
    } else if (improved && CONFIG.improvementMetrics.includes(field)) {
      improvements.push({
        scope: key,
        field: `metrics.${field}`,
        message: `${key} ${field} improved from ${format(baseValue)} to ${format(nextValue)}.`,
        baseline: baseValue,
        candidate: nextValue,
      });
    }
  }

  compareElementCount(key, baseRow, nextRow);
}

function compareElementCount(key, baseRow, nextRow) {
  const scenario = baseRow.scenario || nextRow.scenario || "";
  if (!/贴纸合集|多元素|靠近|小物体|插画图标/.test(scenario)) return;

  const baseElements = numberOrZero(baseRow.elements || baseRow.metrics?.componentCount);
  const nextElements = numberOrZero(nextRow.elements || nextRow.metrics?.componentCount);
  if (baseElements >= 3 && nextElements <= Math.max(1, baseElements - 2)) {
    regressions.push({
      scope: key,
      field: "elements",
      message: `${key} element count dropped from ${baseElements} to ${nextElements}.`,
      baseline: baseElements,
      candidate: nextElements,
    });
  } else if (nextElements >= baseElements + 2) {
    improvements.push({
      scope: key,
      field: "elements",
      message: `${key} element count improved from ${baseElements} to ${nextElements}.`,
      baseline: baseElements,
      candidate: nextElements,
    });
  }
}

function summarize(rows) {
  const output = {
    total: rows.length,
    pass: 0,
    failed: 0,
    releaseBlockers: 0,
    scoreSum: 0,
    averageScore: 0,
  };
  for (const row of rows) {
    const score = row.score || {};
    if (score.pass) output.pass += 1;
    else output.failed += 1;
    if (score.releaseBlocker) output.releaseBlockers += 1;
    if (typeof score.average === "number") output.scoreSum += score.average;
  }
  output.averageScore = output.total ? Math.round((output.scoreSum / output.total) * 10000) / 10000 : 0;
  return output;
}

function rowKey(row) {
  return row.name || row.scenario || `row-${row.index || "unknown"}`;
}

function numberOrZero(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function format(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(4) : "0.0000";
}
