#!/usr/bin/env node

const rows = [
  {
    scenario: "深色商品",
    status: "done",
    score: { pass: true, average: 4.9, releaseBlocker: false },
    metrics: {
      lightRegionLossRatio: 0.56,
      lineArtLossRatio: 0,
      semiTransparentCoreRatio: 0.04,
      largeBoxRisk: false,
      smallElementRisk: false,
      svgBlockyRisk: false,
    },
  },
  {
    scenario: "复杂背景人物",
    status: "done",
    score: { pass: true, average: 4.4, releaseBlocker: false },
    metrics: {
      semiTransparentCoreRatio: 0.29,
      lightRegionLossRatio: 0,
      lineArtLossRatio: 0,
      largeBoxRisk: false,
      smallElementRisk: false,
      svgBlockyRisk: false,
    },
  },
  {
    scenario: "插画图标",
    status: "done",
    score: { pass: true, average: 4.2, releaseBlocker: false },
    metrics: {
      lineArtLossRatio: 0.31,
      lightRegionLossRatio: 0.34,
      semiTransparentCoreRatio: 0.08,
      largeBoxRisk: false,
      smallElementRisk: false,
      svgBlockyRisk: false,
    },
  },
  {
    scenario: "透明材质",
    status: "done",
    score: { pass: true, average: 4.5, releaseBlocker: false },
    metrics: {
      semiTransparentCoreRatio: 0.88,
      lightRegionLossRatio: 0.02,
      lineArtLossRatio: 0,
      largeBoxRisk: false,
      smallElementRisk: false,
      svgBlockyRisk: false,
    },
  },
];

const summary = summarizeQaReport({ rows });
const failures = [];

if (summary.lineArtRisk !== 1) failures.push(`Expected exactly 1 line-art risk, got ${summary.lineArtRisk}.`);
if (summary.lightRegionRisk !== 1) failures.push(`Expected exactly 1 light-region risk, got ${summary.lightRegionRisk}.`);
if (summary.semiTransparentRisk !== 0) failures.push(`Expected no semi-transparent risk, got ${summary.semiTransparentRisk}.`);
if (summary.pass !== 4 || summary.failed !== 0) failures.push(`Expected all fixture rows to pass, got pass=${summary.pass}, failed=${summary.failed}.`);

const result = {
  pass: failures.length === 0,
  summary,
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);

function summarizeQaReport(report) {
  const rows = report.rows || [];
  const summary = rows.reduce((acc, row) => {
    const metrics = row.metrics || {};
    const score = row.score || {};
    acc.total += 1;
    if (row.status !== "done" || score.pass === false) acc.failed += 1;
    if (score.pass) acc.pass += 1;
    if (score.releaseBlocker) acc.releaseBlockers += 1;
    if (typeof score.average === "number") acc.scoreSum += score.average;
    if (metrics.largeBoxRisk) acc.largeBoxRisk += 1;
    if (metrics.smallElementRisk) acc.smallElementRisk += 1;
    if (metrics.svgBlockyRisk) acc.svgBlockyRisk += 1;
    if (isIllustrationQualityScenario(row.scenario || "") && (metrics.lineArtLossRatio || 0) > 0.24) acc.lineArtRisk += 1;
    if (isIllustrationQualityScenario(row.scenario || "") && (metrics.lightRegionLossRatio || 0) > 0.28) acc.lightRegionRisk += 1;
    if (!isTransparentMaterialScenario(row.scenario || "") && (metrics.semiTransparentCoreRatio || 0) > 0.36) acc.semiTransparentRisk += 1;
    return acc;
  }, {
    total: 0,
    pass: 0,
    failed: 0,
    releaseBlockers: 0,
    scoreSum: 0,
    averageScore: 0,
    largeBoxRisk: 0,
    smallElementRisk: 0,
    svgBlockyRisk: 0,
    lineArtRisk: 0,
    lightRegionRisk: 0,
    semiTransparentRisk: 0,
  });
  summary.averageScore = summary.total ? Math.round((summary.scoreSum / summary.total) * 10000) / 10000 : 0;
  return summary;
}

function isTransparentMaterialScenario(scenario = "") {
  return /透明材质|透明/.test(scenario || "");
}

function isIllustrationQualityScenario(scenario = "") {
  return /插画|图标|贴纸|logo|文字|靠近|高对比/.test(scenario || "");
}
