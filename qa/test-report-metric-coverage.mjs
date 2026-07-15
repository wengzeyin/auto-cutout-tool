#!/usr/bin/env node

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const workDir = await mkdtemp(path.join(tmpdir(), "cutout-qa-metric-coverage-"));
const passPath = path.join(workDir, "coverage-pass.json");
const failPath = path.join(workDir, "coverage-fail.json");
const nodeBin = process.env.NODE_BINARY || (process.platform === "win32" ? "node" : process.execPath);

await writeFile(passPath, JSON.stringify(makeReport({ complete: true }), null, 2));
await writeFile(failPath, JSON.stringify(makeReport({ complete: false }), null, 2));

const pass = runCoverage(passPath);
const fail = runCoverage(failPath);
const failures = [];

if (pass.status !== 0) failures.push(`Expected complete coverage report to pass, got ${pass.status}: ${pass.stderr || pass.stdout}`);
if (fail.status === 0) failures.push("Expected missing coverage report to fail.");
if (!/svgFractionalCoordinateRatio|svgCubicHandleOutlierRatio|small-element metric/.test(`${fail.stdout}\n${fail.stderr}`)) {
  failures.push("Expected missing coverage output to mention SVG or small-element metrics.");
}

const result = {
  pass: failures.length === 0,
  passStatus: pass.status,
  failStatus: fail.status,
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);

function runCoverage(reportPath) {
  return spawnSync(nodeBin, ["qa/assert-report-metric-coverage.mjs", reportPath], {
    cwd: root,
    encoding: "utf8",
  });
}

function makeReport({ complete }) {
  const scenarios = [
    "人像发丝模拟",
    "卷发碎发模拟",
    "宠物长毛模拟",
    "宠物短毛模拟",
    "白底浅色商品",
    "深色商品",
    "透明材质",
    "复杂背景人物",
    "复杂背景商品",
    "插画图标",
    "多元素贴纸合集",
    "靠近多角色",
    "小物体细节",
    "文字 logo 商品",
    "高对比边缘",
  ];
  return {
    generatedAt: "fixture",
    rows: scenarios.map((scenario, index) => ({
      index: index + 1,
      name: `qa-${String(index + 1).padStart(2, "0")}.png`,
      scenario,
      status: "done",
      metrics: makeMetrics(scenario, complete),
    })),
  };
}

function makeMetrics(scenario, complete) {
  const metrics = {
    alphaCoverage: 0.4,
    edgeJaggednessScore: 0.12,
    semiTransparentCoreRatio: 0.05,
    componentCount: /贴纸合集/.test(scenario) ? 9 : /靠近/.test(scenario) ? 3 : /小物体/.test(scenario) ? 8 : 1,
    largeBoxRisk: false,
    svgPathCount: 20,
  };
  if (/插画|图标|贴纸|logo|文字|商品|靠近/.test(scenario)) {
    metrics.svgFractionalCoordinateRatio = complete ? 0.52 : undefined;
    metrics.svgCubicHandleOutlierRatio = complete ? 0.01 : undefined;
  }
  if (/贴纸合集|多元素|靠近|小物体|插画图标/.test(scenario)) {
    metrics.clearSmallElementCount = complete ? 2 : undefined;
    metrics.smallElementScoreMax = complete ? 0.82 : undefined;
    metrics.smallElementScoreAverage = complete ? 0.72 : undefined;
  }
  return Object.fromEntries(Object.entries(metrics).filter(([, value]) => value !== undefined));
}
