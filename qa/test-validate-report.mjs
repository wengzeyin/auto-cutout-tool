#!/usr/bin/env node

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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

const workDir = await mkdtemp(path.join(tmpdir(), "cutout-qa-validate-"));
const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const passPath = path.join(workDir, "qa-pass.json");
const failPath = path.join(workDir, "qa-fail.json");
const nodeBin = process.env.NODE_BINARY || (process.platform === "win32" ? "node" : process.execPath);

await writeFile(passPath, JSON.stringify(makeReport({ fail: false }), null, 2));
await writeFile(failPath, JSON.stringify(makeReport({ fail: true }), null, 2));

const pass = runValidator(passPath);
const fail = runValidator(failPath);
const failures = [];

if (pass.status !== 0) failures.push(`Expected complete QA report to pass, got ${pass.status}: ${pass.stderr || pass.stdout}`);
if (fail.status === 0) failures.push("Expected risky QA report to fail validation.");
if (!/largeBoxRisk|missing required metric|svgPathCount/.test(`${fail.stdout}\n${fail.stderr}`)) {
  failures.push("Expected failure output to mention missing metrics, largeBoxRisk, or svgPathCount.");
}

const result = {
  pass: failures.length === 0,
  passStatus: pass.status,
  failStatus: fail.status,
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);

function runValidator(reportPath) {
  return spawnSync(nodeBin, ["qa/validate-report.mjs", reportPath], {
    cwd: root,
    encoding: "utf8",
  });
}

function makeReport({ fail }) {
  const rows = scenarios.map((scenario, index) => {
    const componentCount = /贴纸合集/.test(scenario) ? 8 : /靠近/.test(scenario) ? 4 : /小物体/.test(scenario) ? 5 : /插画图标/.test(scenario) ? 4 : 1;
    const metrics = {
      imageType: inferImageType(scenario),
      preset: /贴纸|靠近|小物体|插画/.test(scenario) ? "multiSticker" : "balanced",
      alphaCoverage: 0.36,
      edgeJaggednessScore: 0.12,
      semiTransparentCoreRatio: 0.04,
      lightRegionLossRatio: 0.03,
      lineArtLossRatio: 0.02,
      whiteFringeRatio: 0.01,
      componentCount,
      smallComponentCount: /贴纸合集|靠近|小物体|插画图标/.test(scenario) ? 3 : 0,
      clearSmallElementCount: /贴纸合集|靠近|小物体|插画图标/.test(scenario) ? 2 : 0,
      smallElementScoreMax: /贴纸合集|靠近|小物体|插画图标/.test(scenario) ? 0.84 : 0,
      smallElementScoreAverage: /贴纸合集|靠近|小物体|插画图标/.test(scenario) ? 0.76 : 0,
      smallElementRisk: false,
      largeBoxRisk: false,
      svgPathCount: /插画|图标|贴纸|logo|文字|商品|靠近/.test(scenario) ? 18 : 4,
      svgCommandCount: 160,
      svgCommandDensity: 8.5,
      svgFractionalCoordinateRatio: 0.52,
      svgBlockyRisk: false,
    };
    if (/透明材质/.test(scenario)) metrics.semiTransparentCoreRatio = 0.82;
    if (fail && index === 11) {
      metrics.componentCount = 1;
      metrics.largeBoxRisk = true;
      metrics.svgPathCount = 0;
      delete metrics.lineArtLossRatio;
      delete metrics.lightRegionLossRatio;
      delete metrics.smallComponentCount;
      delete metrics.clearSmallElementCount;
      delete metrics.smallElementScoreMax;
      delete metrics.smallElementScoreAverage;
      delete metrics.svgCommandDensity;
      delete metrics.svgFractionalCoordinateRatio;
    }
    return {
      index: index + 1,
      name: `qa-${String(index + 1).padStart(2, "0")}.png`,
      scenario,
      priority: index < 5 ? "P0" : "P1",
      status: "done",
      elements: fail && index === 11 ? 1 : componentCount,
      resultSize: { width: 512, height: 512 },
      metrics,
      score: {
        scores: { matte: 4.6, components: 4.5, svg: 4.4, export: 5 },
        average: 4.625,
        pass: true,
        releaseBlocker: false,
        coreLow: [],
      },
    };
  });
  return {
    generatedAt: "fixture",
    rows,
    summary: {
      total: rows.length,
      pass: rows.length,
      failed: 0,
      releaseBlockers: 0,
      averageScore: 4.625,
      largeBoxRisk: fail ? 1 : 0,
      smallElementRisk: 0,
      svgBlockyRisk: 0,
    },
  };
}

function inferImageType(scenario) {
  if (/商品/.test(scenario)) return "product";
  if (/发丝|毛|复杂背景人物/.test(scenario)) return "photo";
  if (/贴纸|靠近|小物体/.test(scenario)) return "sticker";
  if (/插画|图标|logo|文字/.test(scenario)) return "illustration";
  if (/透明/.test(scenario)) return "transparentMaterial";
  return "unknown";
}
