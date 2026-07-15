#!/usr/bin/env node

import { createWriteStream, existsSync, readdirSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDir = path.join(root, "qa", "run-output");
const port = Number(process.env.TEST_AI_TIMEOUT_PORT || await findFreePort());
const baseUrl = `http://localhost:${port}`;
const token = `ai-timeout-${process.pid}-${Date.now()}`;
const nodeBin = process.env.NODE_BINARY || (process.platform === "win32" ? "node" : process.execPath);
const homeDir = process.env.USERPROFILE || process.env.HOME || "";
const nodeModules = process.env.NODE_PATH
  || path.join(homeDir, ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules");
const require = createRequire(import.meta.url);
const { chromium } = requireFromNodePath("playwright");

await mkdir(outputDir, { recursive: true });
const server = startServer();
const consoleMessages = [];
let browser;

try {
  await waitForServer(server);
  browser = await chromium.launch(getChromiumLaunchOptions());
  const page = await browser.newPage({ viewport: { width: 1360, height: 980 } });
  page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator("#fileInput").waitFor({ state: "attached", timeout: 30_000 });
  await page.evaluate(() => {
    window.__cutoutDebug = { simulateAiHang: true, aiTimeoutMs: 350 };
  });
  await uploadNonSolidImage(page);
  await page.waitForFunction(() => document.querySelectorAll(".queue-item").length === 1, null, { timeout: 10_000 });

  const started = Date.now();
  await page.locator("#processBtn").click({ timeout: 10_000 });
  await page.waitForFunction(() => document.querySelector("#statusTitle")?.textContent?.includes("出现问题"), null, { timeout: 5_000 });
  const elapsedMs = Date.now() - started;
  const state = await page.evaluate(() => ({
    title: document.querySelector("#statusTitle")?.textContent || "",
    status: document.querySelector("#status")?.textContent || "",
    processDisabled: document.querySelector("#processBtn")?.disabled || false,
    cancelHidden: document.querySelector("#cancelBtn")?.hidden || false,
    progressHidden: document.querySelector("#progressWrap")?.hidden || false,
    queueMessage: document.querySelector(".queue-item .queue-copy span")?.textContent || "",
  }));
  const failures = [];
  if (elapsedMs > 4500) failures.push(`Expected timeout guard to recover quickly, got ${elapsedMs}ms.`);
  if (!/超过|超时/.test(state.status)) failures.push(`Expected timeout message, got "${state.status}".`);
  if (state.processDisabled) failures.push("Process button should be re-enabled after timeout.");
  if (!state.cancelHidden) failures.push("Cancel button should hide after timeout cleanup.");
  if (!state.progressHidden) failures.push("Progress should hide when no cutout was produced.");
  if (!/处理失败/.test(state.queueMessage)) failures.push(`Queue should show failure, got "${state.queueMessage}".`);
  const blockingConsole = consoleMessages.filter((message) => /pageerror:|willReadFrequently/.test(message));
  if (blockingConsole.length) failures.push(`Unexpected console failure: ${blockingConsole.join(" | ")}`);

  const result = {
    pass: failures.length === 0,
    elapsedMs,
    state,
    failures,
    consoleMessages: consoleMessages.slice(-40),
  };
  console.log(JSON.stringify(result, null, 2));
  if (failures.length) process.exit(1);
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill();
  await waitForExit(server, 3000).catch(() => {});
}

async function uploadNonSolidImage(page) {
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 520;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#7dd3fc");
    gradient.addColorStop(0.45, "#fef3c7");
    gradient.addColorStop(1, "#fb7185");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < 220; index += 1) {
      const x = (index * 53) % canvas.width;
      const y = (index * 97) % canvas.height;
      ctx.fillStyle = index % 2 ? "rgba(15, 23, 42, 0.38)" : "rgba(255, 255, 255, 0.42)";
      ctx.beginPath();
      ctx.arc(x, y, 6 + (index % 11), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#111827";
    ctx.font = "bold 86px sans-serif";
    ctx.fillText("TIMEOUT", 120, 270);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await page.locator("#fileInput").setInputFiles({
    name: "non-solid-timeout.png",
    mimeType: "image/png",
    buffer: Buffer.from(bytes),
  });
}

function startServer() {
  const child = spawn(nodeBin, ["server.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: String(port), QA_SERVER_TOKEN: token },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.pipe(createWriteStream(path.join(outputDir, "ai-timeout-server.log"), { flags: "a" }));
  child.stderr.pipe(createWriteStream(path.join(outputDir, "ai-timeout-server.log"), { flags: "a" }));
  return child;
}

async function waitForServer(child) {
  const started = Date.now();
  let exitInfo = null;
  child.once("exit", (code, signal) => {
    exitInfo = { code, signal };
  });
  while (Date.now() - started < 20_000) {
    if (exitInfo) throw new Error(`AI timeout QA server exited before ready: code=${exitInfo.code}, signal=${exitInfo.signal}.`);
    try {
      const response = await fetch(`${baseUrl}/__qa_health`, { cache: "no-store" });
      if (response.ok) {
        const health = await response.json().catch(() => null);
        if (health?.token === token) return;
      }
    } catch {}
    await delay(150);
  }
  throw new Error(`AI timeout QA server did not start at ${baseUrl}`);
}

function requireFromNodePath(name) {
  const candidates = [
    name,
    path.join(nodeModules, name),
    path.join(nodeModules, ".pnpm", "node_modules", name),
    findPnpmPackagePath(name),
  ].filter(Boolean);
  let lastError;
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function getChromiumLaunchOptions() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || findSystemChromium();
  return {
    headless: process.env.HEADLESS !== "0",
    ...(executablePath ? { executablePath } : {}),
  };
}

function findSystemChromium() {
  if (process.platform !== "win32") return null;
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

function findPnpmPackagePath(name) {
  try {
    const pnpmRoot = path.join(nodeModules, ".pnpm");
    const packagePrefix = name.startsWith("@") ? name.replace("/", "+") : name;
    const entry = readdirSync(pnpmRoot).find((item) => item === packagePrefix || item.startsWith(`${packagePrefix}@`));
    return entry ? path.join(pnpmRoot, entry, "node_modules", name) : null;
  } catch {
    return null;
  }
}

function waitForExit(child, timeoutMs) {
  const exited = once(child, "exit");
  const timeout = delay(timeoutMs).then(() => null);
  return Promise.race([exited, timeout]);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
