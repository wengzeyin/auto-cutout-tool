import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const tests = [
  "qa/test-matte-worker-parity.mjs",
  "qa/test-matte-refine.mjs",
  "qa/test-image-type.mjs",
  "qa/test-multi-split.mjs",
  "qa/test-svg-vector.mjs",
  "qa/test-local-zip.mjs",
  "qa/test-manual-repair-controls.mjs",
  "qa/test-ai-timeout-guard.mjs",
  "qa/test-solid-background-fast-cutout.mjs",
  "qa/test-validate-report.mjs",
  "qa/test-compare-report.mjs",
  "qa/test-report-metric-coverage.mjs",
  "qa/test-runner-health.mjs",
  "qa/test-summary-risk.mjs",
];

const startedAt = Date.now();
const results = [];

for (const test of tests) {
  const result = await runTest(test);
  results.push(result);
  const label = result.status === 0 ? "PASS" : "FAIL";
  console.log(`${label} ${test} (${result.durationMs}ms)`);
  if (result.status !== 0) {
    if (result.stdout.trim()) console.log(result.stdout.trim());
    if (result.stderr.trim()) console.error(result.stderr.trim());
  }
}

const failed = results.filter((result) => result.status !== 0);
const summary = {
  pass: failed.length === 0,
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  durationMs: Date.now() - startedAt,
  failures: failed.map((result) => ({ test: result.test, status: result.status })),
};

console.log(JSON.stringify(summary, null, 2));
if (failed.length) process.exit(1);

function runTest(test) {
  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [test], {
      cwd: root,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (status) => {
      resolve({
        test,
        status,
        durationMs: Date.now() - started,
        stdout,
        stderr,
      });
    });
  });
}
