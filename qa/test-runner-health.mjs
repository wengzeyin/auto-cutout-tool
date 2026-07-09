#!/usr/bin/env node

import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const port = Number(process.env.TEST_QA_HEALTH_PORT || 4291);
const token = `health-${process.pid}-${Date.now()}`;
const failures = [];

const server = startServer({ port, token });

try {
  await waitForHealth({ port, token, child: server });
  const health = await fetchJson(`http://localhost:${port}/__qa_health`);
  if (health?.token !== token) failures.push("Health endpoint did not echo the expected token.");
  if (health?.port !== port) failures.push(`Health endpoint returned port ${health?.port}, expected ${port}.`);

  const blocked = startServer({ port, token: `${token}-blocked` });
  const exit = await waitForExit(blocked, 5000);
  if (!exit) {
    failures.push("Expected second server on the same port to exit.");
    blocked.kill();
  } else if (exit.code === 0) {
    failures.push("Expected second server on the same port to fail with non-zero exit.");
  }
} finally {
  server.kill();
  await waitForExit(server, 3000).catch(() => {});
}

const result = {
  pass: failures.length === 0,
  port,
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);

function startServer({ port, token }) {
  return spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: String(port), QA_SERVER_TOKEN: token },
    stdio: ["ignore", "ignore", "ignore"],
  });
}

async function waitForHealth({ port, token, child }) {
  const started = Date.now();
  let exitInfo = null;
  child.once("exit", (code, signal) => {
    exitInfo = { code, signal };
  });
  while (Date.now() - started < 10000) {
    if (exitInfo) throw new Error(`Server exited before health check: code=${exitInfo.code}, signal=${exitInfo.signal}`);
    try {
      const health = await fetchJson(`http://localhost:${port}/__qa_health`);
      if (health?.token === token) return;
    } catch {}
    await delay(150);
  }
  throw new Error(`Timed out waiting for health token on port ${port}`);
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return { code: child.exitCode, signal: child.signalCode };
  const timeout = delay(timeoutMs).then(() => null);
  const exited = once(child, "exit").then(([code, signal]) => ({ code, signal }));
  return Promise.race([exited, timeout]);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
