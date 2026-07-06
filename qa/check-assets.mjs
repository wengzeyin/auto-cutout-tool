import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const manifestPath = path.join(root, "qa", "assets-manifest.json");
const reportPath = path.join(root, "qa", "latest-asset-check.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const assetsDir = path.join(root, manifest.assetsDir);

await mkdir(assetsDir, { recursive: true });

const results = [];
for (const asset of manifest.assets) {
  const filePath = path.join(assetsDir, asset.fileName);
  let exists = true;
  try {
    await access(filePath);
  } catch {
    exists = false;
  }
  results.push({
    ...asset,
    path: path.relative(root, filePath),
    exists,
  });
}

const present = results.filter((item) => item.exists).length;
const missing = results.filter((item) => !item.exists);
const report = {
  checkedAt: new Date().toISOString(),
  required: results.length,
  present,
  missing: missing.length,
  ready: present >= 15,
  missingAssets: missing,
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`QA assets: ${present}/${results.length} present`);
if (missing.length) {
  console.log("Missing:");
  for (const item of missing) console.log(`- ${item.fileName} (${item.scenario})`);
  console.log("\nOpen qa/generate-test-assets.html in the app browser to generate the synthetic baseline images.");
}
console.log(`Report: ${path.relative(root, reportPath)}`);
