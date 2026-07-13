#!/usr/bin/env node

import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDir = path.join(root, "qa", "run-output");
const port = Number(process.env.TEST_SOLID_BG_PORT || await findFreePort());
const baseUrl = `http://localhost:${port}`;
const token = `solid-bg-${process.pid}-${Date.now()}`;
const nodeBin = process.env.NODE_BINARY || (process.platform === "win32" ? "node" : process.execPath);
const nodeModules = process.env.NODE_PATH || "/Users/wzy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const require = createRequire(import.meta.url);
const { chromium } = requireFromNodePath("playwright");

await mkdir(outputDir, { recursive: true });
const server = startServer();
const consoleMessages = [];
let browser;

try {
  await waitForServer(server);
  browser = await chromium.launch({ headless: process.env.HEADLESS !== "0" });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

  const black = await runSolidBackgroundCase(page, "black");
  const blackHalo = await runSolidBackgroundCase(page, "black-halo");
  const white = await runSolidBackgroundCase(page, "white");
  const failures = [];

  for (const result of [black, blackHalo, white]) {
    if (result.durationMs > 7000) failures.push(`${result.kind}: expected fast local cutout under 7000ms, got ${result.durationMs}ms.`);
    if (result.metrics.corners.some((alpha) => alpha > 8)) failures.push(`${result.kind}: corners are not transparent (${result.metrics.corners.join(",")}).`);
    if (result.metrics.progress !== "完成") failures.push(`${result.kind}: progress label is ${result.metrics.progress || "missing"}, expected 完成.`);
    if (result.modelResourceRequests.length) failures.push(`${result.kind}: fast path unexpectedly requested model resources: ${result.modelResourceRequests.join(", ")}`);
  }
  if (black.metrics.darkHaloRatio > 0.006) failures.push(`black: dark halo ratio ${format(black.metrics.darkHaloRatio)} is too high.`);
  if (black.metrics.darkHalo > 0) failures.push(`black: expected no near-black pixels touching transparent background, got ${black.metrics.darkHalo}.`);
  if (blackHalo.metrics.darkHaloRatio > 0.006) failures.push(`black-halo: dark halo ratio ${format(blackHalo.metrics.darkHaloRatio)} is too high.`);
  if (blackHalo.metrics.darkHalo > 0) failures.push(`black-halo: expected no generated near-black outline, got ${blackHalo.metrics.darkHalo}.`);
  if (white.metrics.visible < 1000) failures.push(`white: visible foreground area ${white.metrics.visible} is too small.`);

  const result = {
    pass: failures.length === 0,
    black,
    blackHalo,
    white,
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

async function runSolidBackgroundCase(page, kind) {
  const resourceRequests = [];
  const onRequest = (request) => {
    const url = request.url();
    if (/\/__imgly\/|staticimgly\.com|background-removal-data/.test(url)) resourceRequests.push(url);
  };
  page.on("request", onRequest);
  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.locator("#fileInput").waitFor({ state: "attached", timeout: 30_000 });
    await injectSolidBackgroundFile(page, kind);
    await page.waitForFunction(() => document.querySelectorAll(".queue-item").length === 1, null, { timeout: 10_000 });

    const started = Date.now();
    await page.locator("#processBtn").click({ timeout: 10_000 });
    await page.waitForFunction(() => document.querySelector("#statusTitle")?.textContent?.includes("处理完成"), null, { timeout: 15_000 });
    const durationMs = Date.now() - started;
    const metrics = await readResultMetrics(page);

    return {
      kind,
      durationMs,
      metrics,
      modelResourceRequests: resourceRequests,
    };
  } finally {
    page.off("request", onRequest);
  }
}

async function injectSolidBackgroundFile(page, kind) {
  await page.evaluate(async (imageKind) => {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 620;
    const ctx = canvas.getContext("2d");

    if (imageKind === "black" || imageKind === "black-halo") {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawSticker(ctx, 240, 180, "#3f60b8", imageKind === "black-halo");
      drawSticker(ctx, 610, 250, "#ffca12", imageKind === "black-halo");
      drawSticker(ctx, 430, 450, "#ef4e52", imageKind === "black-halo");
    } else {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(460, 310);
      ctx.rotate(0.08);
      ctx.fillStyle = "#f3e6c8";
      ctx.fillRect(-185, -250, 370, 500);
      ctx.strokeStyle = "#e2d5bb";
      ctx.lineWidth = 3;
      ctx.strokeRect(-185, -250, 370, 500);
      ctx.fillStyle = "#fff";
      for (let y = -215; y < 220; y += 38) ctx.fillRect(-165, y, 18, 18);
      ctx.restore();
    }

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const file = new File([blob], `${imageKind}-solid-background.png`, { type: "image/png" });
    const data = new DataTransfer();
    data.items.add(file);
    const input = document.querySelector("#fileInput");
    input.files = data.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));

    function drawSticker(context, x, y, color, halo = false) {
      context.save();
      context.translate(x, y);
      if (halo) {
        context.fillStyle = "#5c5c5c";
        context.beginPath();
        context.roundRect(-114, -67, 228, 134, 31);
        context.fill();
      }
      context.fillStyle = "#fff";
      context.beginPath();
      context.roundRect(-105, -58, 210, 116, 26);
      context.fill();
      context.fillStyle = color;
      context.beginPath();
      context.roundRect(-86, -40, 172, 80, 18);
      context.fill();
      context.fillStyle = "#111827";
      context.font = "bold 24px sans-serif";
      context.fillText("OK", -18, 8);
      context.restore();
    }
  }, kind);
}

async function readResultMetrics(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("#resultCanvas");
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    const offsetAt = (x, y) => (y * width + x) * 4;
    const corners = [
      offsetAt(2, 2),
      offsetAt(width - 3, 2),
      offsetAt(2, height - 3),
      offsetAt(width - 3, height - 3),
    ].map((offset) => data[offset + 3]);
    let visible = 0;
    let transparent = 0;
    let darkHalo = 0;
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const offset = offsetAt(x, y);
        const alpha = data[offset + 3];
        if (alpha <= 32) {
          transparent += 1;
          continue;
        }
        visible += 1;
        const red = data[offset];
        const green = data[offset + 1];
        const blue = data[offset + 2];
        const lightness = red * 0.299 + green * 0.587 + blue * 0.114;
        const saturation = Math.max(red, green, blue) ? (Math.max(red, green, blue) - Math.min(red, green, blue)) / Math.max(red, green, blue) : 0;
        if (lightness >= 116 || saturation > 0.24) continue;
        let touchesTransparent = false;
        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            if (!ox && !oy) continue;
            if (data[offsetAt(x + ox, y + oy) + 3] <= 8) touchesTransparent = true;
          }
        }
        if (touchesTransparent) darkHalo += 1;
      }
    }
    return {
      width,
      height,
      corners,
      visible,
      transparent,
      darkHalo,
      darkHaloRatio: visible ? darkHalo / visible : 0,
      progress: document.querySelector("#progressText")?.value || "",
      status: document.querySelector("#status")?.textContent || "",
    };
  });
}

function startServer() {
  const child = spawn(nodeBin, ["server.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: String(port), QA_SERVER_TOKEN: token },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.pipe(createWriteStream(path.join(outputDir, "solid-bg-server.log"), { flags: "a" }));
  child.stderr.pipe(createWriteStream(path.join(outputDir, "solid-bg-server.log"), { flags: "a" }));
  return child;
}

async function waitForServer(child) {
  const started = Date.now();
  let exitInfo = null;
  child.once("exit", (code, signal) => {
    exitInfo = { code, signal };
  });
  while (Date.now() - started < 20_000) {
    if (exitInfo) throw new Error(`Solid background QA server exited before ready: code=${exitInfo.code}, signal=${exitInfo.signal}.`);
    try {
      const response = await fetch(`${baseUrl}/__qa_health`, { cache: "no-store" });
      if (response.ok) {
        const health = await response.json().catch(() => null);
        if (health?.token === token) return;
      }
    } catch {}
    await delay(150);
  }
  throw new Error(`Solid background QA server did not start at ${baseUrl}`);
}

async function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return { code: child.exitCode, signal: child.signalCode };
  const timeout = delay(timeoutMs).then(() => null);
  const exited = once(child, "exit").then(([code, signal]) => ({ code, signal }));
  return Promise.race([exited, timeout]);
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
        else reject(new Error("Failed to allocate a free solid-background QA port."));
      });
    });
  });
}

function requireFromNodePath(name) {
  try {
    return require(name);
  } catch {
    return require(path.join(nodeModules, name));
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function format(value) {
  return typeof value === "number" ? value.toFixed(4) : String(value);
}
