#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const html = await readFile(path.join(root, "index.html"), "utf8");
const app = await readFile(path.join(root, "app.js"), "utf8");
const failures = [];

for (const id of [
  "splitSelectedBtn",
  "mergeSelectedBtn",
  "manualModeBtn",
  "addSelectionBtn",
  "applySelectionBtn",
  "exportSelectionBtn",
]) {
  if (!html.includes(`id="${id}"`)) failures.push(`index.html missing repair control #${id}.`);
  if (!app.includes(`${id}: document.querySelector("#${id}")`)) failures.push(`app.js missing element binding for #${id}.`);
}

for (const binding of [
  "splitSelectedBtn.addEventListener(\"click\", splitSelectedComponent)",
  "mergeSelectedBtn.addEventListener(\"click\", mergeSelectedComponents)",
  "addSelectionBtn.addEventListener(\"click\", addSelectionAsComponent)",
  "applySelectionBtn.addEventListener(\"click\", applySelectionToSelectedComponent)",
  "exportSelectionBtn.addEventListener(\"click\", exportSelection)",
]) {
  if (!app.includes(binding)) failures.push(`app.js missing event binding: ${binding}.`);
}

for (const fn of [
  "function splitSelectedComponent()",
  "function mergeSelectedComponents()",
  "function addSelectionAsComponent()",
  "function applySelectionToSelectedComponent()",
  "function loadComponentIntoManualSelection(componentId)",
  "function updateManualSelectionActions()",
  "function persistComponents(",
  "function renumberComponents(",
]) {
  if (!app.includes(fn)) failures.push(`app.js missing repair workflow function: ${fn}.`);
}

for (const invariant of [
  "selectedCount < 2",
  "selectedCount !== 1",
  "state.components = renumberComponents([...rest, merged])",
  "state.components = renumberComponents([...state.components, component])",
  "state.components = state.components.map((component) => component.id === componentId",
  "state.currentItem.components = [...state.components]",
]) {
  if (!app.includes(invariant)) failures.push(`app.js missing repair workflow invariant: ${invariant}.`);
}

const result = {
  pass: failures.length === 0,
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
