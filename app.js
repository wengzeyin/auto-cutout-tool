import { removeBackground } from "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/dist/index.mjs";
import JSZip from "https://esm.sh/jszip@3.10.1";

const els = {
  fileInput: document.querySelector("#fileInput"),
  dropZone: document.querySelector("#dropZone"),
  uploadFeedback: document.querySelector("#uploadFeedback"),
  sampleBtn: document.querySelector("#sampleBtn"),
  sourceCanvas: document.querySelector("#sourceCanvas"),
  resultCanvas: document.querySelector("#resultCanvas"),
  overlayCanvas: document.querySelector("#overlayCanvas"),
  modelSelect: document.querySelector("#modelSelect"),
  detectMode: document.querySelector("#detectMode"),
  alphaThreshold: document.querySelector("#alphaThreshold"),
  colorTolerance: document.querySelector("#colorTolerance"),
  minArea: document.querySelector("#minArea"),
  padding: document.querySelector("#padding"),
  includeText: document.querySelector("#includeText"),
  alphaOut: document.querySelector("#alphaOut"),
  colorOut: document.querySelector("#colorOut"),
  areaOut: document.querySelector("#areaOut"),
  padOut: document.querySelector("#padOut"),
  formatSelect: document.querySelector("#formatSelect"),
  processBtn: document.querySelector("#processBtn"),
  rescanBtn: document.querySelector("#rescanBtn"),
  downloadCutoutBtn: document.querySelector("#downloadCutoutBtn"),
  downloadZipBtn: document.querySelector("#downloadZipBtn"),
  downloadBatchZipBtn: document.querySelector("#downloadBatchZipBtn"),
  manualModeBtn: document.querySelector("#manualModeBtn"),
  exportSelectionBtn: document.querySelector("#exportSelectionBtn"),
  status: document.querySelector("#status"),
  countLabel: document.querySelector("#countLabel"),
  queueCount: document.querySelector("#queueCount"),
  queueList: document.querySelector("#queueList"),
  elementGrid: document.querySelector("#elementGrid"),
};

const state = {
  file: null,
  imageName: "image",
  cutoutBlob: null,
  components: [],
  queue: [],
  currentItem: null,
  nextItemId: 1,
  batchRunning: false,
  objectUrls: [],
  manual: false,
  dragStart: null,
  selection: null,
};

const sourceCtx = els.sourceCanvas.getContext("2d", { willReadFrequently: true });
const resultCtx = els.resultCanvas.getContext("2d", { willReadFrequently: true });
const overlayCtx = els.overlayCanvas.getContext("2d");

syncOutputs();
bindEvents();
updateDownloadLabels();
renderQueue();

function bindEvents() {
  els.fileInput.addEventListener("change", () => {
    addFiles([...els.fileInput.files], "选择");
    els.fileInput.value = "";
  });

  els.sampleBtn.addEventListener("click", loadSample);
  els.processBtn.addEventListener("click", processImage);
  els.rescanBtn.addEventListener("click", scanAndRender);
  els.downloadCutoutBtn.addEventListener("click", downloadCutout);
  els.downloadZipBtn.addEventListener("click", downloadZip);
  els.downloadBatchZipBtn.addEventListener("click", downloadBatchZip);
  els.manualModeBtn.addEventListener("click", toggleManualMode);
  els.exportSelectionBtn.addEventListener("click", exportSelection);
  els.formatSelect.addEventListener("change", () => {
    updateDownloadLabels();
    renderCards();
  });

  for (const input of [els.detectMode, els.alphaThreshold, els.colorTolerance, els.minArea, els.padding, els.includeText]) {
    input.addEventListener("input", () => {
      syncOutputs();
      if (state.cutoutBlob) scanAndRender();
    });
  }

  els.dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    els.dropZone.classList.add("is-over");
  });
  els.dropZone.addEventListener("dragleave", () => els.dropZone.classList.remove("is-over"));
  els.dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    els.dropZone.classList.remove("is-over");
    addFiles([...event.dataTransfer.files], "拖入");
  });

  document.addEventListener("paste", (event) => {
    const files = [];
    for (const item of event.clipboardData?.items || []) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length) {
      event.preventDefault();
      addFiles(files, "粘贴");
    } else {
      setUploadFeedback("剪贴板里没有可读取的图片。", "warn");
    }
  });

  els.overlayCanvas.addEventListener("pointerdown", startSelection);
  els.overlayCanvas.addEventListener("pointermove", moveSelection);
  els.overlayCanvas.addEventListener("pointerup", endSelection);
  els.overlayCanvas.addEventListener("pointercancel", endSelection);
}

async function addFiles(files, source) {
  const imageFiles = files.filter((file) => file?.type?.startsWith("image/"));
  const skipped = files.length - imageFiles.length;

  if (!imageFiles.length) {
    setUploadFeedback(skipped ? "没有找到可用图片文件。" : "没有选择图片。", "warn");
    return;
  }

  const items = imageFiles.map((file) => {
    const previewUrl = URL.createObjectURL(file);
    state.objectUrls.push(previewUrl);
    return {
      id: state.nextItemId++,
      file,
      name: cleanName(file.name || `${source}-image-${state.nextItemId}`),
      originalName: file.name || `${source}图片`,
      previewUrl,
      status: "ready",
      message: "待处理",
      cutoutBlob: null,
      components: [],
      error: null,
    };
  });

  state.queue.push(...items);
  renderQueue();
  setUploadFeedback(`${source}成功：已加入 ${items.length} 张图片${skipped ? `，跳过 ${skipped} 个非图片文件` : ""}。`, "ok");

  if (!state.currentItem) {
    await loadItem(items[0]);
  } else {
    updateBatchButton();
  }
}

function syncOutputs() {
  els.alphaOut.value = els.alphaThreshold.value;
  els.colorOut.value = els.colorTolerance.value;
  els.areaOut.value = els.minArea.value;
  els.padOut.value = els.padding.value;
}

function getExportSettings() {
  const allowed = new Set(["png", "webp", "svg"]);
  const ext = allowed.has(els.formatSelect.value) ? els.formatSelect.value : "png";
  return {
    ext,
    mime: ext === "webp" ? "image/webp" : ext === "svg" ? "image/svg+xml" : "image/png",
    label: ext.toUpperCase(),
  };
}

function updateDownloadLabels() {
  const { label } = getExportSettings();
  els.downloadCutoutBtn.textContent = `下载整张抠图 ${label}`;
  for (const button of els.elementGrid.querySelectorAll("[data-download-element]")) {
    button.textContent = `下载 ${label}`;
  }
}

async function loadItem(item) {
  state.currentItem = item;
  state.file = item.file;
  state.imageName = item.name;
  resetResult();
  renderQueue();
  setStatus(`正在读取 ${item.originalName}...`);

  try {
    const bitmap = await createImageBitmap(item.file);
    drawBitmapToCanvas(bitmap, els.sourceCanvas, sourceCtx);
    sizeOverlay();

    if (item.cutoutBlob) {
      const resultBitmap = await createImageBitmap(item.filteredCutoutBlob || item.cutoutBlob);
      drawBitmapToCanvas(resultBitmap, els.resultCanvas, resultCtx);
      state.cutoutBlob = item.cutoutBlob;
      state.components = item.components || [];
      els.rescanBtn.disabled = false;
      els.downloadCutoutBtn.disabled = false;
      els.manualModeBtn.disabled = false;
      drawOverlay();
      renderCards();
    }

    item.status = item.cutoutBlob ? "done" : "ready";
    item.message = item.cutoutBlob ? `${item.components.length} 个元素` : "待处理";
    els.processBtn.disabled = false;
    setStatus(`已载入 ${item.originalName}，可以开始处理。`);
    updateBatchButton();
    renderQueue();
  } catch (error) {
    console.error(error);
    state.file = null;
    item.status = "error";
    item.error = error;
    item.message = "读取失败";
    els.processBtn.disabled = true;
    setError("图片读取失败，请换成 JPG、PNG 或 WebP。");
    renderQueue();
  }
}

async function loadSample() {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 820;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#eef2f4";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(270, 250, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0f766e";
  roundRect(ctx, 520, 150, 220, 220, 34);
  ctx.fill();
  ctx.fillStyle = "#2563eb";
  ctx.beginPath();
  ctx.moveTo(875, 380);
  ctx.lineTo(1005, 160);
  ctx.lineTo(1135, 380);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.ellipse(350, 585, 170, 86, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7c3aed";
  ctx.beginPath();
  ctx.moveTo(690, 520);
  ctx.bezierCurveTo(810, 400, 940, 500, 850, 620);
  ctx.bezierCurveTo(788, 703, 637, 713, 690, 520);
  ctx.fill();

  const blob = await canvasToBlob(canvas);
  const file = new File([blob], "sample-elements.png", { type: "image/png" });
  await addFiles([file], "示例");
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function resetResult() {
  state.cutoutBlob = null;
  state.components = [];
  state.selection = null;
  els.resultCanvas.width = 0;
  els.resultCanvas.height = 0;
  els.overlayCanvas.width = 0;
  els.overlayCanvas.height = 0;
  els.processBtn.disabled = !state.file;
  els.rescanBtn.disabled = true;
  els.downloadCutoutBtn.disabled = true;
  els.downloadZipBtn.disabled = true;
  els.manualModeBtn.disabled = true;
  els.exportSelectionBtn.disabled = true;
  updateBatchButton();
  renderCards();
}

function resetSourceCanvas() {
  els.sourceCanvas.width = 0;
  els.sourceCanvas.height = 0;
}

function renderQueue() {
  els.queueCount.textContent = `${state.queue.length} 张`;
  els.queueList.innerHTML = "";

  if (!state.queue.length) {
    const empty = document.createElement("div");
    empty.className = "queue-empty";
    empty.textContent = "还没有图片。";
    els.queueList.append(empty);
    return;
  }

  for (const item of state.queue) {
    const row = document.createElement("div");
    row.className = `queue-item ${item.status || "ready"}${item === state.currentItem ? " active" : ""}`;
    row.innerHTML = `
      <button type="button" class="queue-select">
        <img class="queue-preview" src="${item.previewUrl}" alt="" />
        <span class="queue-copy">
          <strong>${escapeHtml(item.originalName)}</strong>
          <span>${escapeHtml(item.message || "待处理")}</span>
        </span>
      </button>
      <button type="button" class="queue-delete" title="删除" aria-label="删除 ${escapeHtml(item.originalName)}">×</button>
    `;
    row.querySelector(".queue-select").addEventListener("click", () => loadItem(item));
    row.querySelector(".queue-delete").addEventListener("click", () => removeQueueItem(item));
    els.queueList.append(row);
  }
}

async function removeQueueItem(item) {
  const index = state.queue.findIndex((candidate) => candidate.id === item.id);
  if (index === -1) return;

  state.queue.splice(index, 1);
  if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);

  if (state.currentItem === item) {
    state.currentItem = null;
    state.file = null;
    state.imageName = "image";
    resetSourceCanvas();
    resetResult();
    const next = state.queue[index] || state.queue[index - 1] || state.queue[0];
    if (next) {
      await loadItem(next);
    } else {
      setStatus("请选择一张图片。");
      setUploadFeedback("等待图片输入");
    }
  }

  renderQueue();
  updateBatchButton();
  if (state.queue.length) {
    setUploadFeedback(`已删除 ${item.originalName}，队列剩余 ${state.queue.length} 张。`, "ok");
  }
}

function updateBatchButton() {
  const hasQueue = state.queue.length > 0;
  els.downloadBatchZipBtn.disabled = state.batchRunning || !hasQueue;
}

function setUploadFeedback(message, tone = "") {
  els.uploadFeedback.className = `upload-feedback ${tone}`.trim();
  els.uploadFeedback.textContent = message;
  els.dropZone.classList.toggle("has-file", state.queue.length > 0);
}

async function processImage(options = {}) {
  if (!state.file) return;
  const item = state.currentItem;
  setBusy(true, options.message || "首次处理会下载约几十 MB 的模型，请稍等...");
  state.components = [];
  if (item) {
    item.status = "processing";
    item.message = "处理中";
    renderQueue();
  }
  renderCards();

  try {
    const blob = await removeBackground(state.file, {
      model: els.modelSelect.value,
      device: "cpu",
      output: { format: "image/png", type: "foreground" },
      progress: (key, current, total) => {
        if (total) {
          const percent = Math.round((current / total) * 100);
          setBusy(true, `正在下载/加载 ${key}：${percent}%`);
        }
      },
    });

    state.cutoutBlob = blob;
    const bitmap = await createImageBitmap(blob);
    drawBitmapToCanvas(bitmap, els.resultCanvas, resultCtx);
    if (item) {
      item.resultWidth = els.resultCanvas.width;
      item.resultHeight = els.resultCanvas.height;
    }
    sizeOverlay();
    els.rescanBtn.disabled = false;
    els.downloadCutoutBtn.disabled = false;
    els.manualModeBtn.disabled = false;
    await scanAndRender();
    if (item) {
      item.status = "done";
      item.cutoutBlob = state.cutoutBlob;
      item.components = [...state.components];
      item.message = `${state.components.length} 个元素`;
      renderQueue();
    }
  } catch (error) {
    console.error(error);
    if (item) {
      item.status = "error";
      item.error = error;
      item.message = "处理失败";
      renderQueue();
    }
    setError(`处理失败：${error?.message || "请检查网络或换一张图片再试"}`);
  } finally {
    setBusy(false);
  }
}

async function scanAndRender() {
  if (!state.cutoutBlob || !els.resultCanvas.width) return;
  setStatus("正在识别独立元素...");
  await redrawCutoutCanvas();
  let imageData = resultCtx.getImageData(0, 0, els.resultCanvas.width, els.resultCanvas.height);
  if (!els.includeText.checked) {
    removeLikelyTextPixels(imageData);
    resultCtx.putImageData(imageData, 0, 0);
    imageData = resultCtx.getImageData(0, 0, els.resultCanvas.width, els.resultCanvas.height);
  }

  const alphaThreshold = Number(els.alphaThreshold.value);
  const minArea = Number(els.minArea.value);
  const padding = Number(els.padding.value);
  const useIllustrationMode =
    els.detectMode.value === "illustration" ||
    (els.detectMode.value === "auto" && looksLikeIllustration(imageData, alphaThreshold));

  state.components = useIllustrationMode
    ? findIllustrationComponents(
        imageData,
        alphaThreshold,
        minArea,
        padding,
        els.includeText.checked,
        Number(els.colorTolerance.value),
      )
    : findComponents(imageData, alphaThreshold, minArea, padding, els.includeText.checked);

  drawOverlay();
  renderCards();
  els.downloadZipBtn.disabled = state.components.length === 0;
  if (state.currentItem) {
    state.currentItem.components = [...state.components];
    state.currentItem.filteredCutoutBlob = els.includeText.checked ? state.cutoutBlob : await canvasToBlob(els.resultCanvas);
    state.currentItem.message = state.cutoutBlob ? `${state.components.length} 个元素` : state.currentItem.message;
    renderQueue();
  }
  setStatus(`识别到 ${state.components.length} 个可导出的元素（${useIllustrationMode ? "插画色块" : "普通物体"}）。`);
}

async function redrawCutoutCanvas() {
  const bitmap = await createImageBitmap(state.cutoutBlob);
  drawBitmapToCanvas(bitmap, els.resultCanvas, resultCtx);
  sizeOverlay();
}

function removeLikelyTextPixels(imageData) {
  const { width, height, data } = imageData;
  const visited = new Uint8Array(width * height);
  const stack = [];
  const pixels = [];
  const alphaThreshold = Number(els.alphaThreshold.value);
  const minArea = Math.max(4, Math.round(Number(els.minArea.value) * 0.18));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (visited[start] || data[start * 4 + 3] <= alphaThreshold) continue;

      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      let area = 0;
      pixels.length = 0;
      visited[start] = 1;
      stack.push(start);

      while (stack.length) {
        const index = stack.pop();
        const px = index % width;
        const py = Math.floor(index / width);
        pixels.push(index);
        area += 1;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;

        const neighbors = [index - 1, index + 1, index - width, index + width];
        for (const next of neighbors) {
          if (next < 0 || next >= visited.length || visited[next]) continue;
          if ((next === index - 1 && px === 0) || (next === index + 1 && px === width - 1)) continue;
          if (data[next * 4 + 3] <= alphaThreshold) continue;
          visited[next] = 1;
          stack.push(next);
        }
      }

      if (area >= minArea && isLikelyTextComponent(area, maxX - minX + 1, maxY - minY + 1, width, height)) {
        for (const index of pixels) {
          data[index * 4 + 3] = 0;
        }
      }
    }
  }
}

function findComponents(imageData, alphaThreshold, minArea, pad, includeText) {
  const { width, height, data } = imageData;
  const visited = new Uint8Array(width * height);
  const components = [];
  const stack = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (visited[start] || data[start * 4 + 3] <= alphaThreshold) continue;

      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      let area = 0;
      visited[start] = 1;
      stack.push(start);

      while (stack.length) {
        const index = stack.pop();
        const px = index % width;
        const py = Math.floor(index / width);
        area += 1;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;

        const neighbors = [index - 1, index + 1, index - width, index + width];
        for (const next of neighbors) {
          if (next < 0 || next >= visited.length || visited[next]) continue;
          if ((next === index - 1 && px === 0) || (next === index + 1 && px === width - 1)) {
            continue;
          }
          if (data[next * 4 + 3] <= alphaThreshold) continue;
          visited[next] = 1;
          stack.push(next);
        }
      }

      if (area >= minArea) {
        const rawWidth = maxX - minX + 1;
        const rawHeight = maxY - minY + 1;
        if (!includeText && isLikelyTextComponent(area, rawWidth, rawHeight, width, height)) {
          continue;
        }

        const box = padBox({ minX, minY, maxX, maxY }, pad, width, height);
        components.push({
          id: components.length + 1,
          area,
          x: box.minX,
          y: box.minY,
          width: box.maxX - box.minX + 1,
          height: box.maxY - box.minY + 1,
        });
      }
    }
  }

  return components.sort((a, b) => b.area - a.area).map((component, index) => ({
    ...component,
    id: index + 1,
  }));
}

function findIllustrationComponents(imageData, alphaThreshold, minArea, pad, includeText, tolerance) {
  const { width, height, data } = imageData;
  const visited = new Uint8Array(width * height);
  const components = [];
  const stack = [];
  const pixels = [];
  const toleranceSq = tolerance * tolerance;
  const minColorArea = Math.max(12, Math.round(minArea * 0.35));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (visited[start] || data[start * 4 + 3] <= alphaThreshold) continue;

      const seed = start * 4;
      const seedR = data[seed];
      const seedG = data[seed + 1];
      const seedB = data[seed + 2];
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      let area = 0;
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      pixels.length = 0;

      visited[start] = 1;
      stack.push(start);

      while (stack.length) {
        const index = stack.pop();
        const offset = index * 4;
        const px = index % width;
        const py = Math.floor(index / width);
        pixels.push(index);
        area += 1;
        sumR += data[offset];
        sumG += data[offset + 1];
        sumB += data[offset + 2];
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;

        const meanR = sumR / area;
        const meanG = sumG / area;
        const meanB = sumB / area;
        const neighbors = [index - 1, index + 1, index - width, index + width];

        for (const next of neighbors) {
          if (next < 0 || next >= visited.length || visited[next]) continue;
          if ((next === index - 1 && px === 0) || (next === index + 1 && px === width - 1)) continue;
          const nextOffset = next * 4;
          if (data[nextOffset + 3] <= alphaThreshold) continue;

          const seedDistance = colorDistanceSq(data, nextOffset, seedR, seedG, seedB);
          const meanDistance = colorDistanceSq(data, nextOffset, meanR, meanG, meanB);
          const currentDistance = colorDistanceSq(data, nextOffset, data[offset], data[offset + 1], data[offset + 2]);
          if (seedDistance > toleranceSq && meanDistance > toleranceSq * 0.82 && currentDistance > toleranceSq * 0.55) {
            continue;
          }

          visited[next] = 1;
          stack.push(next);
        }
      }

      if (area >= minColorArea) {
        const rawWidth = maxX - minX + 1;
        const rawHeight = maxY - minY + 1;
        const tooSmallToMatter = area < minArea && (rawWidth < 22 || rawHeight < 22);
        if (tooSmallToMatter) continue;
        if (!includeText && isLikelyTextComponent(area, rawWidth, rawHeight, width, height)) continue;

        const box = padBox({ minX, minY, maxX, maxY }, pad, width, height);
        components.push({
          id: components.length + 1,
          area,
          x: box.minX,
          y: box.minY,
          width: box.maxX - box.minX + 1,
          height: box.maxY - box.minY + 1,
          mask: createLocalMask(pixels, box, width),
        });
      }
    }
  }

  return mergeSimilarBoxes(components, width, height, minArea)
    .sort((a, b) => b.area - a.area)
    .map((component, index) => ({ ...component, id: index + 1 }));
}

function createLocalMask(pixels, box, imageWidth) {
  const maskWidth = box.maxX - box.minX + 1;
  const maskHeight = box.maxY - box.minY + 1;
  const mask = new Uint8Array(maskWidth * maskHeight);

  for (const index of pixels) {
    const px = index % imageWidth;
    const py = Math.floor(index / imageWidth);
    const localX = px - box.minX;
    const localY = py - box.minY;
    if (localX >= 0 && localX < maskWidth && localY >= 0 && localY < maskHeight) {
      mask[localY * maskWidth + localX] = 1;
    }
  }

  return mask;
}

function colorDistanceSq(data, offset, r, g, b) {
  const dr = data[offset] - r;
  const dg = data[offset + 1] - g;
  const db = data[offset + 2] - b;
  return dr * dr + dg * dg + db * db;
}

function looksLikeIllustration(imageData, alphaThreshold) {
  const { width, height, data } = imageData;
  const step = Math.max(3, Math.floor(Math.sqrt((width * height) / 18000)));
  const colors = new Set();
  let samples = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const offset = (y * width + x) * 4;
      if (data[offset + 3] <= alphaThreshold) continue;
      samples += 1;
      const key = `${data[offset] >> 5},${data[offset + 1] >> 5},${data[offset + 2] >> 5}`;
      colors.add(key);
      if (colors.size > 96 && colors.size / samples > 0.28) return false;
    }
  }

  if (samples < 80) return false;
  return colors.size / samples < 0.22 || colors.size < 72;
}

function mergeSimilarBoxes(components, imageWidth, imageHeight, minArea) {
  if (components.some((component) => component.mask)) {
    return components;
  }

  const sorted = components
    .filter((component) => component.width * component.height > 0)
    .sort((a, b) => b.area - a.area);
  const kept = [];
  const imageArea = imageWidth * imageHeight;

  for (const component of sorted) {
    const boxArea = component.width * component.height;
    const isTiny = component.area < Math.max(minArea, imageArea * 0.0007);
    const container = kept.find((candidate) => boxOverlapRatio(component, candidate) > (isTiny ? 0.62 : 0.82));
    if (container) {
      container.x = Math.min(container.x, component.x);
      container.y = Math.min(container.y, component.y);
      const maxX = Math.max(container.x + container.width, component.x + component.width);
      const maxY = Math.max(container.y + container.height, component.y + component.height);
      container.width = maxX - container.x;
      container.height = maxY - container.y;
      container.area += component.area;
    } else if (!isTiny || boxArea > 900) {
      kept.push({ ...component });
    }
  }

  return kept;
}

function boxOverlapRatio(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  const overlap = (x2 - x1) * (y2 - y1);
  const smaller = Math.min(a.width * a.height, b.width * b.height);
  return overlap / Math.max(1, smaller);
}

function isLikelyTextComponent(area, componentWidth, componentHeight, imageWidth, imageHeight) {
  const imageArea = imageWidth * imageHeight;
  const boxArea = Math.max(1, componentWidth * componentHeight);
  const density = area / boxArea;
  const smallRelativeArea = area < imageArea * 0.012;
  const lineSized = componentHeight < imageHeight * 0.12 && componentWidth < imageWidth * 0.45;
  const strokeLike = density < 0.72;
  const glyphSized = componentHeight <= 120 || componentWidth <= 360;
  return smallRelativeArea && lineSized && strokeLike && glyphSized;
}

function padBox(box, pad, width, height) {
  return {
    minX: Math.max(0, box.minX - pad),
    minY: Math.max(0, box.minY - pad),
    maxX: Math.min(width - 1, box.maxX + pad),
    maxY: Math.min(height - 1, box.maxY + pad),
  };
}

function renderCards() {
  els.countLabel.textContent = `${state.components.length} 个`;
  els.elementGrid.innerHTML = "";

  if (!state.components.length) {
    const empty = document.createElement("p");
    empty.className = "small";
    empty.textContent = state.cutoutBlob ? "没有识别到元素，可调低阈值或最小面积。" : "处理后会在这里显示元素。";
    els.elementGrid.append(empty);
    return;
  }

  for (const component of state.components) {
    const card = document.createElement("article");
    card.className = "element-card";

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    const img = document.createElement("img");
    img.alt = `元素 ${component.id}`;
    img.src = cropToDataUrl(component);
    thumb.append(img);

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `<span>#${component.id}</span><span>${component.width} x ${component.height}</span>`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost";
    button.dataset.downloadElement = "true";
    button.textContent = `下载 ${getExportSettings().label}`;
    button.addEventListener("click", () => downloadComponent(component));

    card.append(thumb, meta, button);
    els.elementGrid.append(card);
  }
}

function cropToCanvas(box) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(box.width));
  canvas.height = Math.max(1, Math.round(box.height));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    els.resultCanvas,
    Math.round(box.x),
    Math.round(box.y),
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  if (box.mask) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < box.mask.length; index += 1) {
      if (!box.mask[index]) {
        imageData.data[index * 4 + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }
  return canvas;
}

function cropToDataUrl(box) {
  return cropToCanvas(box).toDataURL("image/png");
}

async function downloadComponent(component) {
  const { ext } = getExportSettings();
  const fileName = `${state.imageName}-element-${String(component.id).padStart(2, "0")}.${ext}`;
  const blob = await canvasToExportBlob(cropToCanvas(component));
  downloadBlob(blob, fileName);
}

async function downloadCutout() {
  if (!state.cutoutBlob) return;
  const { ext } = getExportSettings();
  const sourceBlob = state.currentItem?.filteredCutoutBlob || state.cutoutBlob;
  const blob = await blobToExportBlob(sourceBlob);
  downloadBlob(blob, `${state.imageName}-cutout.${ext}`);
}

async function downloadZip() {
  if (!state.components.length) return;
  setBusy(true, "正在打包 ZIP...");
  const zip = new JSZip();
  const { ext } = getExportSettings();

  for (const component of state.components) {
    const blob = await canvasToExportBlob(cropToCanvas(component));
    const fileName = `${state.imageName}-element-${String(component.id).padStart(2, "0")}.${ext}`;
    zip.file(fileName, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, `${state.imageName}-elements.zip`);
  setBusy(false);
  setStatus(`已打包 ${state.components.length} 个元素。`);
}

async function downloadBatchZip() {
  if (!state.queue.length || state.batchRunning) return;
  state.batchRunning = true;
  updateBatchButton();

  try {
    const total = state.queue.length;
    for (let index = 0; index < state.queue.length; index += 1) {
      const item = state.queue[index];
      if (item.status === "done" && item.cutoutBlob) continue;
      await loadItem(item);
      await processImage({ message: `批量处理中：${index + 1}/${total} ${item.originalName}` });
    }

    setBusy(true, "正在打包批量 ZIP...");
    const zip = new JSZip();
    const { ext } = getExportSettings();
    let exportedImages = 0;
    let exportedElements = 0;

    for (const item of state.queue) {
      if (!item.cutoutBlob) continue;
      exportedImages += 1;
      const folder = zip.folder(item.name || `image-${item.id}`);
      folder.file(`${item.name}-cutout.${ext}`, await blobToExportBlob(item.filteredCutoutBlob || item.cutoutBlob));

      for (const component of item.components || []) {
        const blob = await cropItemComponentToExportBlob(item, component);
        const fileName = `${item.name}-element-${String(component.id).padStart(2, "0")}.${ext}`;
        folder.file(fileName, blob);
        exportedElements += 1;
      }
    }

    if (!exportedImages) {
      setError("没有可打包的处理结果。");
      return;
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, `cutout-batch-${formatDateStamp()}.zip`);
    setStatus(`批量 ZIP 已生成：${exportedImages} 张图片，${exportedElements} 个元素。`);
  } finally {
    state.batchRunning = false;
    setBusy(false);
    updateBatchButton();
    renderQueue();
  }
}

async function cropItemComponentToExportBlob(item, box) {
  const bitmap = await createImageBitmap(item.cutoutBlob);
  const source = document.createElement("canvas");
  source.width = item.resultWidth || bitmap.width;
  source.height = item.resultHeight || bitmap.height;
  const sourceCtx = source.getContext("2d");
  sourceCtx.drawImage(bitmap, 0, 0, source.width, source.height);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(box.width));
  canvas.height = Math.max(1, Math.round(box.height));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, Math.round(box.x), Math.round(box.y), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  if (box.mask) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < box.mask.length; index += 1) {
      if (!box.mask[index]) {
        imageData.data[index * 4 + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }
  return canvasToExportBlob(canvas);
}

function toggleManualMode() {
  state.manual = !state.manual;
  els.manualModeBtn.textContent = state.manual ? "关闭框选" : "开启框选";
  els.overlayCanvas.closest(".checker").classList.toggle("manual", state.manual);
  state.selection = null;
  els.exportSelectionBtn.disabled = true;
  drawOverlay();
}

function startSelection(event) {
  if (!state.manual || !els.resultCanvas.width) return;
  els.overlayCanvas.setPointerCapture(event.pointerId);
  const point = eventToCanvasPoint(event);
  state.dragStart = point;
  state.selection = { x: point.x, y: point.y, width: 0, height: 0 };
  drawOverlay();
}

function moveSelection(event) {
  if (!state.dragStart || !state.manual) return;
  const point = eventToCanvasPoint(event);
  state.selection = normalizeBox(state.dragStart, point);
  els.exportSelectionBtn.disabled = state.selection.width < 4 || state.selection.height < 4;
  drawOverlay();
}

function endSelection(event) {
  if (!state.manual) return;
  try {
    els.overlayCanvas.releasePointerCapture(event.pointerId);
  } catch {}
  state.dragStart = null;
}

async function exportSelection() {
  if (!state.selection || state.selection.width < 4 || state.selection.height < 4) return;
  const box = {
    ...state.selection,
    x: Math.round(state.selection.x),
    y: Math.round(state.selection.y),
    width: Math.round(state.selection.width),
    height: Math.round(state.selection.height),
  };
  const { ext } = getExportSettings();
  const blob = await canvasToExportBlob(cropToCanvas(box));
  downloadBlob(blob, `${state.imageName}-manual-slice.${ext}`);
}

function eventToCanvasPoint(event) {
  const rect = els.overlayCanvas.getBoundingClientRect();
  const scaleX = els.overlayCanvas.width / rect.width;
  const scaleY = els.overlayCanvas.height / rect.height;
  return {
    x: clamp((event.clientX - rect.left) * scaleX, 0, els.overlayCanvas.width),
    y: clamp((event.clientY - rect.top) * scaleY, 0, els.overlayCanvas.height),
  };
}

function normalizeBox(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

function drawOverlay() {
  sizeOverlay();
  overlayCtx.clearRect(0, 0, els.overlayCanvas.width, els.overlayCanvas.height);

  overlayCtx.lineWidth = Math.max(2, Math.round(els.overlayCanvas.width / 600));
  overlayCtx.font = `${Math.max(14, Math.round(els.overlayCanvas.width / 60))}px sans-serif`;
  overlayCtx.textBaseline = "top";

  for (const component of state.components) {
    overlayCtx.strokeStyle = "#0f766e";
    overlayCtx.fillStyle = "rgba(15, 118, 110, 0.12)";
    overlayCtx.fillRect(component.x, component.y, component.width, component.height);
    overlayCtx.strokeRect(component.x, component.y, component.width, component.height);
    overlayCtx.fillStyle = "#0b5f59";
    overlayCtx.fillText(`#${component.id}`, component.x + 6, component.y + 6);
  }

  if (state.selection) {
    overlayCtx.strokeStyle = "#b45309";
    overlayCtx.fillStyle = "rgba(180, 83, 9, 0.14)";
    overlayCtx.fillRect(state.selection.x, state.selection.y, state.selection.width, state.selection.height);
    overlayCtx.strokeRect(state.selection.x, state.selection.y, state.selection.width, state.selection.height);
  }
}

function sizeOverlay() {
  els.overlayCanvas.width = els.resultCanvas.width || els.sourceCanvas.width || 1;
  els.overlayCanvas.height = els.resultCanvas.height || els.sourceCanvas.height || 1;
}

function drawBitmapToCanvas(bitmap, canvas, ctx) {
  const maxEdge = 1800;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
}

function setStatus(message) {
  els.status.className = "status";
  els.status.textContent = message;
}

function setBusy(isBusy, message) {
  document.body.style.cursor = isBusy ? "progress" : "";
  if (message) {
    els.status.className = "status busy";
    els.status.textContent = message;
  }
  els.processBtn.disabled = isBusy || !state.file;
  els.rescanBtn.disabled = isBusy || !state.cutoutBlob;
  els.downloadCutoutBtn.disabled = isBusy || !state.cutoutBlob;
  els.downloadZipBtn.disabled = isBusy || !state.components.length;
  updateBatchButton();
}

function setError(message) {
  els.status.className = "status error";
  els.status.textContent = message;
}

function cleanName(fileName) {
  return (fileName || "image")
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w\u4e00-\u9fa5-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "image";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateStamp() {
  const date = new Date();
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ];
  return `${parts[0]}${parts[1]}${parts[2]}-${parts[3]}${parts[4]}`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG 导出失败"));
    }, "image/png");
  });
}

async function blobToExportBlob(blob) {
  const { ext } = getExportSettings();
  if (ext === "png") return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);
  return canvasToExportBlob(canvas);
}

function canvasToExportBlob(canvas) {
  const { ext, mime, label } = getExportSettings();
  if (ext === "svg") {
    return Promise.resolve(canvasToSvgBlob(canvas));
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`${label} 导出失败`));
      },
      mime,
      0.95,
    );
  });
}

function canvasToSvgBlob(canvas) {
  const dataUrl = canvas.toDataURL("image/png");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><image href="${dataUrl}" width="${canvas.width}" height="${canvas.height}" preserveAspectRatio="none"/></svg>`;
  return new Blob([svg], { type: "image/svg+xml" });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
