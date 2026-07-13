#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { createRequire } from "node:module";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDir = path.join(root, "qa", "run-output");
const explicitPort = Boolean(process.env.PORT);
const port = explicitPort ? Number(process.env.PORT) : await findFreePort();
const baseUrl = `http://localhost:${port}`;
const timeoutMs = Number(process.env.QA_TIMEOUT_MS || 8 * 60 * 1000);
const nodeModules = process.env.NODE_PATH || "/Users/wzy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const nodeBin = process.env.NODE_BINARY || (process.platform === "win32" ? "node" : process.execPath);
const qaServerToken = `qa-${process.pid}-${Date.now()}`;

const require = createRequire(import.meta.url);
const { chromium } = requireFromNodePath("playwright");

await mkdir(outputDir, { recursive: true });
const server = startServer();
const consoleMessages = [];
let browser;

try {
  await waitForServer(server);
  browser = await chromium.launch({ headless: process.env.HEADLESS !== "0" });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

  await gotoQaPage(page);
  await page.locator("#qaSampleBtn").click({ timeout: 30_000 });
  await page.waitForFunction(() => window.__cutoutDebug?.queueLength?.() >= 15 || document.querySelectorAll(".queue-item").length >= 15, null, { timeout: 60_000 }).catch(async () => {
    const queueCount = await page.locator(".queue-item").count().catch(() => 0);
    if (queueCount < 15) throw new Error(`QA samples did not load; queue count=${queueCount}`);
  });

  await page.selectOption("#formatSelect", "png").catch(() => {});
  await page.selectOption("#modelSelect", "isnet_quint8").catch(() => {});
  const downloadPromise = page.waitForEvent("download", { timeout: timeoutMs });
  await page.locator("#downloadBatchZipBtn").click({ timeout: 30_000 });
  await page.waitForFunction(() => window.__cutoutQaLastRun?.status === "done" || window.__cutoutQaLastRun?.status === "failed", null, { timeout: timeoutMs });
  const status = await page.evaluate(() => window.__cutoutQaLastRun?.status || "missing");
  if (status !== "done") {
    const report = await page.evaluate(() => window.__cutoutQaLastRun || null);
    throw new Error(`Browser QA batch failed: ${JSON.stringify(report, null, 2)}`);
  }

  const download = await downloadPromise;
  const zipPath = path.join(outputDir, download.suggestedFilename());
  await download.saveAs(zipPath);
  const reportJson = extractZipFile(zipPath, "qa-report.json");
  const reportPath = path.join(outputDir, "qa-report.latest.json");
  await writeFile(reportPath, reportJson);

  const validation = spawnSync(nodeBin, ["qa/validate-report.mjs", reportPath], {
    cwd: root,
    encoding: "utf8",
  });
  const metricCoverage = spawnSync(nodeBin, ["qa/assert-report-metric-coverage.mjs", reportPath], {
    cwd: root,
    encoding: "utf8",
  });
  const summaryPath = path.join(outputDir, "browser-qa-summary.json");
  const summary = {
    pass: validation.status === 0 && metricCoverage.status === 0,
    port,
    explicitPort,
    zipPath,
    reportPath,
    validationStatus: validation.status,
    validationStdout: safeJson(validation.stdout),
    validationStderr: validation.stderr.trim(),
    metricCoverageStatus: metricCoverage.status,
    metricCoverageStdout: safeJson(metricCoverage.stdout),
    metricCoverageStderr: metricCoverage.stderr.trim(),
    consoleMessages: consoleMessages.slice(-80),
  };
  await writeFile(summaryPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  process.exit(validation.status || metricCoverage.status || 0);
} catch (error) {
  const screenshotPath = path.join(outputDir, "browser-qa-failure.png");
  try {
    if (browser) {
      const pages = browser.contexts()[0]?.pages() || [];
      if (pages[0]) await pages[0].screenshot({ path: screenshotPath, fullPage: true });
    }
  } catch {}
  const failure = {
    pass: false,
    port,
    explicitPort,
    error: error?.message || String(error),
    screenshotPath,
    consoleMessages: consoleMessages.slice(-120),
  };
  console.error(JSON.stringify(failure, null, 2));
  process.exit(1);
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill();
}

function requireFromNodePath(name) {
  try {
    return require(name);
  } catch {
    return require(path.join(nodeModules, name));
  }
}

async function gotoQaPage(page) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.locator("#qaSampleBtn").waitFor({ state: "visible", timeout: 30_000 });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await page.waitForTimeout(1000);
    }
  }
  throw lastError;
}

function startServer() {
  const child = spawn(nodeBin, ["server.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: String(port), QA_SERVER_TOKEN: qaServerToken },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.pipe(createWriteStream(path.join(outputDir, "browser-qa-server.log"), { flags: "a" }));
  child.stderr.pipe(createWriteStream(path.join(outputDir, "browser-qa-server.log"), { flags: "a" }));
  return child;
}

async function waitForServer(child) {
  const started = Date.now();
  let exitInfo = null;
  let mismatch = null;
  child.once("exit", (code, signal) => {
    exitInfo = { code, signal };
  });
  while (Date.now() - started < 20_000) {
    if (exitInfo) throw new Error(`QA server exited before ready: code=${exitInfo.code}, signal=${exitInfo.signal}. Port ${port} may be in use.`);
    if (mismatch) throw mismatch;
    try {
      const response = await fetch(`${baseUrl}/__qa_health`, { cache: "no-store" });
      if (response.ok) {
        const health = await response.json().catch(() => null);
        if (health?.token === qaServerToken) return;
        if (health?.token) mismatch = new Error(`QA server token mismatch on ${baseUrl}; another test server is responding.`);
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(`QA server did not start with matching token at ${baseUrl}`);
}

function extractZipFile(zipPath, entryName) {
  const result = spawnSync("unzip", ["-p", zipPath, entryName], { encoding: "utf8" });
  if (result.status !== 0 || !result.stdout) {
    throw new Error(`Failed to extract ${entryName} from ${zipPath}: ${result.stderr}`);
  }
  return result.stdout;
}

function safeJson(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const foundPort = typeof address === "object" && address ? address.port : 0;
      server.close(() => {
        if (foundPort) resolve(foundPort);
        else reject(new Error("Failed to allocate a free QA port."));
      });
    });
  });
}
