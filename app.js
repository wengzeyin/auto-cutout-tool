import { removeBackground } from "./vendor-imgly-background-removal.mjs";
import JSZip from "https://esm.sh/jszip@3.10.1";

const els = {
  appRoot: document.querySelector("#appRoot"),
  fileInput: document.querySelector("#fileInput"),
  dropZone: document.querySelector("#dropZone"),
  uploadFeedback: document.querySelector("#uploadFeedback"),
  sampleBtn: document.querySelector("#sampleBtn"),
  qaSampleBtn: document.querySelector("#qaSampleBtn"),
  sourceCanvas: document.querySelector("#sourceCanvas"),
  resultCanvas: document.querySelector("#resultCanvas"),
  overlayCanvas: document.querySelector("#overlayCanvas"),
  modelSelect: document.querySelector("#modelSelect"),
  detectMode: document.querySelector("#detectMode"),
  alphaThreshold: document.querySelector("#alphaThreshold"),
  colorTolerance: document.querySelector("#colorTolerance"),
  minArea: document.querySelector("#minArea"),
  splitStrength: document.querySelector("#splitStrength"),
  padding: document.querySelector("#padding"),
  includeText: document.querySelector("#includeText"),
  showBoxes: document.querySelector("#showBoxes"),
  edgeSmooth: document.querySelector("#edgeSmooth"),
  feather: document.querySelector("#feather"),
  cleanup: document.querySelector("#cleanup"),
  alphaBoost: document.querySelector("#alphaBoost"),
  edgeOffset: document.querySelector("#edgeOffset"),
  alphaOut: document.querySelector("#alphaOut"),
  colorOut: document.querySelector("#colorOut"),
  areaOut: document.querySelector("#areaOut"),
  padOut: document.querySelector("#padOut"),
  edgeSmoothOut: document.querySelector("#edgeSmoothOut"),
  featherOut: document.querySelector("#featherOut"),
  cleanupOut: document.querySelector("#cleanupOut"),
  edgeOffsetOut: document.querySelector("#edgeOffsetOut"),
  formatSelect: document.querySelector("#formatSelect"),
  exportHint: document.querySelector("#exportHint"),
  exportScale: document.querySelector("#exportScale"),
  customScale: document.querySelector("#customScale"),
  customScaleOut: document.querySelector("#customScaleOut"),
  customScaleRow: document.querySelector("#customScaleRow"),
  aspectLock: document.querySelector("#aspectLock"),
  manualReadout: document.querySelector("#manualReadout"),
  manualPreviewCanvas: document.querySelector("#manualPreviewCanvas"),
  formatSegments: [...document.querySelectorAll(".format-segment")],
  processBtn: document.querySelector("#processBtn"),
  cancelBtn: document.querySelector("#cancelBtn"),
  rescanBtn: document.querySelector("#rescanBtn"),
  copyCutoutBtn: document.querySelector("#copyCutoutBtn"),
  downloadCutoutBtn: document.querySelector("#downloadCutoutBtn"),
  downloadZipBtn: document.querySelector("#downloadZipBtn"),
  downloadSelectedZipBtn: document.querySelector("#downloadSelectedZipBtn"),
  downloadBatchZipBtn: document.querySelector("#downloadBatchZipBtn"),
  manualModeBtn: document.querySelector("#manualModeBtn"),
  exportSelectionBtn: document.querySelector("#exportSelectionBtn"),
  status: document.querySelector("#status"),
  statusTitle: document.querySelector("#statusTitle"),
  statusCard: document.querySelector("#statusCard"),
  progressWrap: document.querySelector("#progressWrap"),
  progressFill: document.querySelector("#progressFill"),
  progressText: document.querySelector("#progressText"),
  sourceBadge: document.querySelector("#sourceBadge"),
  resultBadge: document.querySelector("#resultBadge"),
  previewArea: document.querySelector("#previewArea"),
  previewToggles: [...document.querySelectorAll(".preview-toggle")],
  backgroundToggles: [...document.querySelectorAll(".background-toggle")],
  previewBgColor: document.querySelector("#previewBgColor"),
  countLabel: document.querySelector("#countLabel"),
  queueCount: document.querySelector("#queueCount"),
  queueList: document.querySelector("#queueList"),
  elementGrid: document.querySelector("#elementGrid"),
  selectAllBtn: document.querySelector("#selectAllBtn"),
  clearSelectionBtn: document.querySelector("#clearSelectionBtn"),
  splitSelectedBtn: document.querySelector("#splitSelectedBtn"),
  mergeSelectedBtn: document.querySelector("#mergeSelectedBtn"),
  mobilePrimaryBtn: document.querySelector("#mobilePrimaryBtn"),
};

const state = {
  file: null,
  imageName: "image",
  cutoutBlob: null,
  originalCutoutBlob: null,
  sourceOriginalCanvas: document.createElement("canvas"),
  cutoutOriginalCanvas: document.createElement("canvas"),
  refinedCutoutCanvas: document.createElement("canvas"),
  processingToken: 0,
  refineTimer: 0,
  refineWorker: null,
  refineJobId: 0,
  alphaNormalized: false,
  components: [],
  queue: [],
  currentItem: null,
  nextItemId: 1,
  batchRunning: false,
  lastBatchReport: null,
  objectUrls: [],
  selectedComponentIds: new Set(),
  processing: false,
  scanning: false,
  scanQueued: false,
  scanTimer: 0,
  visibleComponentLimit: 30,
  minAreaTouched: false,
  previewMode: "split",
  previewBackground: "checker",
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
syncFormatSegments();
setPreviewBackground("checker");
updateUiState();
renderQueue();

function updateUiState() {
  const hasImage = Boolean(state.currentItem);
  const hasResult = Boolean(state.cutoutBlob);
  els.appRoot.classList.toggle("app-empty", !hasImage);
  els.appRoot.classList.toggle("app-has-image", hasImage && !hasResult);
  els.appRoot.classList.toggle("app-done", hasResult);
  els.appRoot.classList.toggle("app-manual", state.manual);

  document.querySelectorAll(".step").forEach((step) => step.classList.remove("active", "done"));
  const uploadStep = document.querySelector('[data-step="upload"]');
  const processStep = document.querySelector('[data-step="process"]');
  const exportStep = document.querySelector('[data-step="export"]');
  uploadStep?.classList.toggle("active", !hasImage);
  uploadStep?.classList.toggle("done", hasImage);
  processStep?.classList.toggle("active", hasImage && !hasResult);
  processStep?.classList.toggle("done", hasResult);
  exportStep?.classList.toggle("active", hasResult);

  els.sourceBadge.textContent = hasImage ? "已载入" : "待上传";
  els.resultBadge.textContent = hasResult ? "已去背景" : "待处理";
  els.colorTolerance.disabled = els.detectMode.value !== "illustration";
  els.mobilePrimaryBtn.disabled = state.processing || (!hasImage && false);
  if (!hasImage) els.mobilePrimaryBtn.textContent = "选择图片开始";
  else if (!hasResult) els.mobilePrimaryBtn.textContent = "开始自动抠图";
  else els.mobilePrimaryBtn.textContent = `导出 ${getExportSettings().label}`;
}

function setPreviewMode(mode) {
  state.previewMode = mode === "result" ? "result" : "split";
  els.previewArea.classList.toggle("preview-result", state.previewMode === "result");
  els.previewArea.classList.toggle("preview-split", state.previewMode !== "result");
  for (const toggle of els.previewToggles) {
    toggle.classList.toggle("active", toggle.dataset.preview === state.previewMode);
  }
}

function setPreviewBackground(mode) {
  const allowed = new Set(["checker", "white", "black", "color"]);
  state.previewBackground = allowed.has(mode) ? mode : "checker";
  const resultCard = els.resultCanvas.closest(".result-card");
  resultCard?.classList.remove("bg-checker", "bg-white", "bg-black", "bg-color");
  resultCard?.classList.add(`bg-${state.previewBackground}`);
  resultCard?.style.setProperty("--preview-bg-color", els.previewBgColor.value || "#34c786");
  for (const toggle of els.backgroundToggles) {
    toggle.classList.toggle("active", toggle.dataset.bg === state.previewBackground);
  }
}

function syncFormatSegments() {
  const { ext } = getExportSettings();
  for (const segment of els.formatSegments) {
    segment.classList.toggle("active", segment.dataset.format === ext);
  }
}

function handleMobilePrimary() {
  if (!state.currentItem) {
    els.fileInput.click();
  } else if (!state.cutoutBlob) {
    processImage();
  } else {
    downloadZip();
  }
}

function bindEvents() {
  els.fileInput.addEventListener("change", () => {
    addFiles([...els.fileInput.files], "选择");
    els.fileInput.value = "";
  });

  els.sampleBtn.addEventListener("click", loadSample);
  els.qaSampleBtn.addEventListener("click", loadQaSamples);
  els.processBtn.addEventListener("click", processImage);
  els.cancelBtn.addEventListener("click", cancelProcessing);
  els.rescanBtn.addEventListener("click", scanAndRender);
  els.copyCutoutBtn.addEventListener("click", copyCutout);
  els.downloadCutoutBtn.addEventListener("click", downloadCutout);
  els.downloadZipBtn.addEventListener("click", downloadZip);
  els.downloadSelectedZipBtn.addEventListener("click", downloadSelectedZip);
  els.downloadBatchZipBtn.addEventListener("click", downloadBatchZip);
  els.manualModeBtn.addEventListener("click", toggleManualMode);
  els.exportSelectionBtn.addEventListener("click", exportSelection);
  els.selectAllBtn.addEventListener("click", selectAllComponents);
  els.clearSelectionBtn.addEventListener("click", clearComponentSelection);
  els.splitSelectedBtn.addEventListener("click", splitSelectedComponent);
  els.mergeSelectedBtn.addEventListener("click", mergeSelectedComponents);
  els.mobilePrimaryBtn.addEventListener("click", handleMobilePrimary);
  els.formatSelect.addEventListener("change", () => {
    updateDownloadLabels();
    syncFormatSegments();
    renderCards();
    updateManualPreview();
  });
  els.exportScale.addEventListener("change", () => {
    syncOutputs();
    renderCards();
    updateManualPreview();
  });
  els.customScale.addEventListener("input", () => {
    syncOutputs();
    renderCards();
    updateManualPreview();
  });
  for (const segment of els.formatSegments) {
    segment.addEventListener("click", () => {
      els.formatSelect.value = segment.dataset.format;
      els.formatSelect.dispatchEvent(new Event("change"));
    });
  }
  for (const toggle of els.previewToggles) {
    toggle.addEventListener("click", () => setPreviewMode(toggle.dataset.preview));
  }
  for (const toggle of els.backgroundToggles) {
    toggle.addEventListener("click", () => setPreviewBackground(toggle.dataset.bg));
  }
  els.previewBgColor.addEventListener("input", () => setPreviewBackground("color"));

  for (const input of [els.edgeSmooth, els.feather, els.cleanup, els.edgeOffset]) {
    input.addEventListener("input", () => {
      syncOutputs();
      scheduleRefine(200);
    });
    input.addEventListener("change", () => {
      syncOutputs();
      scheduleRefine(80);
    });
  }
  els.alphaBoost.addEventListener("change", () => {
    syncOutputs();
    scheduleRefine(80);
  });

  for (const input of [els.alphaThreshold, els.colorTolerance, els.minArea, els.padding]) {
    input.addEventListener("input", () => {
      if (input === els.minArea) state.minAreaTouched = true;
      syncOutputs();
      if (input === els.padding) {
        renderCards();
        updateManualPreview();
      }
    });
    input.addEventListener("change", () => {
      if (input === els.minArea) state.minAreaTouched = true;
      syncOutputs();
      if (input === els.padding) {
        renderCards();
        updateManualPreview();
      } else {
        setStatus("正在更新识别结果...");
        scheduleScan(400);
      }
    });
  }
  for (const input of [els.detectMode, els.includeText, els.showBoxes, els.splitStrength]) {
    input.addEventListener("change", () => {
      syncOutputs();
      updateUiState();
      if (input === els.showBoxes) drawOverlay();
      else scheduleScan(300);
    });
  }

  els.dropZone.addEventListener("click", (event) => {
    if (event.target.closest("button, a, input, label, select, textarea")) return;
    els.fileInput.click();
  });
  els.dropZone.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    els.fileInput.click();
  });
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
      addFiles(files, "粘贴", { autoSelect: true, autoProcess: true });
    } else {
      setUploadFeedback("剪贴板里没有可读取的图片。", "warn");
    }
  });

  els.overlayCanvas.addEventListener("pointerdown", startSelection);
  els.overlayCanvas.addEventListener("pointermove", moveSelection);
  els.overlayCanvas.addEventListener("pointerup", endSelection);
  els.overlayCanvas.addEventListener("pointercancel", endSelection);
  document.addEventListener("keydown", handleSelectionKeys);
}

async function addFiles(files, source, options = {}) {
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
      isQa: Boolean(options.isQa),
      status: "ready",
      message: "待处理",
      cutoutBlob: null,
      components: [],
      error: null,
    };
  });

  if (options.replaceCurrent && state.currentItem) {
    const currentIndex = state.queue.findIndex((candidate) => candidate === state.currentItem);
    if (currentIndex >= 0) state.queue.splice(currentIndex, 1);
  }
  state.queue.push(...items);
  renderQueue();
  setUploadFeedback(
    options.autoProcess
      ? `已粘贴图片，${state.processing ? "已加入队列，当前任务完成后可处理。" : "正在自动抠图..."}`
      : `${source}成功：已加入 ${items.length} 张图片${skipped ? `，跳过 ${skipped} 个非图片文件` : ""}。`,
    "ok",
  );
  updateUiState();

  if (options.autoSelect && !state.processing) {
    await loadItem(items[0]);
    if (options.autoProcess) await processImage({ message: "已粘贴图片，正在自动抠图..." });
  } else if (!state.currentItem) {
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
  els.edgeSmoothOut.value = els.edgeSmooth.value;
  els.featherOut.value = els.feather.value;
  els.cleanupOut.value = els.cleanup.value;
  els.edgeOffsetOut.value = els.edgeOffset.value;
  els.customScaleOut.textContent = String(getExportScale());
  els.customScaleRow.hidden = els.exportScale.value !== "custom";
}

function applyDynamicDefaults(width, height) {
  if (state.minAreaTouched || !width || !height) return;
  const dynamicMinArea = Math.round(Math.max(800, width * height * 0.001));
  const max = Math.max(5000, Math.ceil(dynamicMinArea * 4 / 100) * 100);
  els.minArea.max = String(max);
  els.minArea.value = String(Math.min(max, dynamicMinArea));
  els.alphaThreshold.value = "32";
  els.padding.value = "12";
  syncOutputs();
}

function scheduleScan(delay = 350) {
  if (!state.cutoutBlob) return;
  window.clearTimeout(state.scanTimer);
  state.scanTimer = window.setTimeout(() => {
    scanAndRender();
  }, delay);
}

function scheduleRefine(delay = 200) {
  if (!state.originalCutoutBlob && !state.cutoutOriginalCanvas.width) return;
  window.clearTimeout(state.refineTimer);
  state.refineTimer = window.setTimeout(async () => {
    setStatus("正在实时更新边缘效果...");
    await refineAndPreviewCutout();
  }, delay);
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
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

function getExportScale() {
  if (els.exportScale.value === "custom") {
    return clamp(Number(els.customScale.value) || 1, 0.1, 8);
  }
  return Number(els.exportScale.value) || 1;
}

function getRefineSettings() {
  return {
    edgeSmooth: Number(els.edgeSmooth.value),
    feather: Number(els.feather.value),
    cleanup: Number(els.cleanup.value),
    alphaBoost: els.alphaBoost.value,
    edgeOffset: Number(els.edgeOffset.value),
  };
}

function updateDownloadLabels() {
  const { ext, label } = getExportSettings();
  els.copyCutoutBtn.textContent = "复制 PNG";
  els.downloadCutoutBtn.textContent = `下载整张抠图 ${label}`;
  els.downloadZipBtn.textContent = "下载全部 ZIP";
  els.downloadBatchZipBtn.textContent = `批量处理并下载 ZIP`;
  els.exportHint.textContent =
    ext === "svg"
      ? "SVG 将导出为矢量路径，适合 logo、贴纸和扁平插画；照片会被近似成大量色块路径。"
      : "处理完成后可导出 PNG / WebP / SVG。";
  for (const button of els.elementGrid.querySelectorAll("[data-download-element]")) {
    button.textContent = `下载 ${label}`;
  }
  updateSelectionButtons();
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
    item.originalWidth = bitmap.width;
    item.originalHeight = bitmap.height;
    drawBitmapToCanvas(bitmap, state.sourceOriginalCanvas, state.sourceOriginalCanvas.getContext("2d"), Infinity);
    drawBitmapToCanvas(bitmap, els.sourceCanvas, sourceCtx);
    applyDynamicDefaults(els.sourceCanvas.width, els.sourceCanvas.height);
    sizeOverlay();

    if (item.cutoutBlob) {
      const originalBitmap = await createImageBitmap(item.originalCutoutBlob || item.cutoutBlob);
      drawBitmapToCanvas(originalBitmap, state.cutoutOriginalCanvas, state.cutoutOriginalCanvas.getContext("2d"), Infinity);
      const resultBitmap = await createImageBitmap(item.filteredCutoutBlob || item.cutoutBlob);
      drawBitmapToCanvas(resultBitmap, state.refinedCutoutCanvas, state.refinedCutoutCanvas.getContext("2d"), Infinity);
      drawCanvasToPreview(state.refinedCutoutCanvas, els.resultCanvas, resultCtx);
      state.cutoutBlob = item.cutoutBlob;
      state.originalCutoutBlob = item.originalCutoutBlob || item.cutoutBlob;
      state.components = item.components || [];
      els.rescanBtn.disabled = false;
      els.copyCutoutBtn.disabled = false;
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
    updateUiState();
  } catch (error) {
    console.error(error);
    state.file = null;
    item.status = "error";
    item.error = error;
    item.message = "读取失败";
    els.processBtn.disabled = true;
    setError("图片读取失败，请换成 JPG、PNG 或 WebP。");
    renderQueue();
    updateUiState();
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

async function loadQaSamples() {
  if (state.processing) {
    setUploadFeedback("当前正在处理，稍后再载入测试图。", "warn");
    return;
  }

  els.qaSampleBtn.disabled = true;
  const originalText = els.qaSampleBtn.textContent;
  els.qaSampleBtn.textContent = "载入中...";
  setUploadFeedback("正在载入 QA 测试图...", "ok");

  try {
    const manifestResponse = await fetch("./qa/assets-manifest.json", { cache: "no-store" });
    if (!manifestResponse.ok) throw new Error("测试图清单读取失败");
    const manifest = await manifestResponse.json();
    const files = [];

    for (const asset of manifest.assets || []) {
      const response = await fetch(`./${manifest.assetsDir}/${asset.fileName}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`缺少测试图：${asset.fileName}`);
      const blob = await response.blob();
      files.push(new File([blob], asset.fileName, { type: blob.type || "image/png" }));
    }

    if (!files.length) throw new Error("测试图清单为空");
    clearQueue();
    await addFiles(files, "测试图", { autoSelect: true, isQa: true });
    setUploadFeedback(`已载入 ${files.length} 张 QA 测试图，可逐张开始抠图验收。`, "ok");
  } catch (error) {
    console.error(error);
    setUploadFeedback(`测试图载入失败：${error?.message || "请检查 qa/assets 是否完整"}`, "warn");
  } finally {
    els.qaSampleBtn.disabled = false;
    els.qaSampleBtn.textContent = originalText;
  }
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
  state.originalCutoutBlob = null;
  state.alphaNormalized = false;
  state.sourceOriginalCanvas.width = 0;
  state.sourceOriginalCanvas.height = 0;
  state.cutoutOriginalCanvas.width = 0;
  state.cutoutOriginalCanvas.height = 0;
  state.refinedCutoutCanvas.width = 0;
  state.refinedCutoutCanvas.height = 0;
  state.components = [];
  state.selection = null;
  state.manual = false;
  els.manualModeBtn.textContent = "开启框选";
  els.overlayCanvas.closest(".checker")?.classList.remove("manual");
  els.resultCanvas.width = 0;
  els.resultCanvas.height = 0;
  els.overlayCanvas.width = 0;
  els.overlayCanvas.height = 0;
  els.processBtn.disabled = !state.file;
  els.rescanBtn.disabled = true;
  els.copyCutoutBtn.disabled = true;
  els.downloadCutoutBtn.disabled = true;
  els.downloadZipBtn.disabled = true;
  els.manualModeBtn.disabled = true;
  els.exportSelectionBtn.disabled = true;
  updateBatchButton();
  renderCards();
  updateManualPreview();
  hideProgress();
  updateUiState();
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
  updateUiState();
  if (state.queue.length) {
    setUploadFeedback(`已删除 ${item.originalName}，队列剩余 ${state.queue.length} 张。`, "ok");
  }
}

function clearQueue() {
  for (const item of state.queue) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  }
  state.queue = [];
  state.currentItem = null;
  state.file = null;
  state.imageName = "image";
  state.components = [];
  state.selectedComponentIds.clear();
  resetSourceCanvas();
  resetResult();
  renderQueue();
  updateBatchButton();
  updateUiState();
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

function cancelProcessing() {
  if (!state.processing) return;
  state.processingToken += 1;
  state.processing = false;
  setBusy(false);
  hideProgress();
  if (state.currentItem?.status === "processing") {
    state.currentItem.status = "ready";
    state.currentItem.message = state.currentItem.cutoutBlob ? `${state.currentItem.components.length} 个元素` : "已取消";
    renderQueue();
  }
  setStatus("已取消处理。");
  setUploadFeedback("已取消当前处理，可以重新开始或选择其他图片。", "warn");
  updateUiState();
}

async function processImage(options = {}) {
  if (!state.file || state.processing) return;
  const item = state.currentItem;
  const token = ++state.processingToken;
  state.processing = true;
  setBusy(true, options.message || "首次处理会下载约几十 MB 的模型，请稍等...");
  if (item && Math.max(item.originalWidth || 0, item.originalHeight || 0) > 3000) {
    setStatus("图片较大，正在优化处理；预览和检测会使用低清副本，导出保留高清。", "大图处理中");
  }
  setProgress(0, "0%");
  state.components = [];
  if (item) {
    item.status = "processing";
    item.message = "处理中";
    renderQueue();
  }
  renderCards();
  await nextFrame();

  try {
    const blob = await removeBackground(state.file, {
      model: els.modelSelect.value,
      device: "cpu",
      output: { format: "image/png", type: "foreground" },
      progress: (key, current, total) => {
        if (total) {
          const percent = Math.round((current / total) * 100);
          setBusy(true, `正在下载/加载 ${key}：${percent}%`);
          setProgress(percent, `${percent}%`);
        }
      },
    });
    if (token !== state.processingToken || item !== state.currentItem) return;

    state.originalCutoutBlob = blob;
    const bitmap = await createImageBitmap(blob);
    drawBitmapToCanvas(bitmap, state.cutoutOriginalCanvas, state.cutoutOriginalCanvas.getContext("2d"), Infinity);
    await refineAndPreviewCutout({ immediateScan: false });
    if (item) {
      item.resultWidth = state.refinedCutoutCanvas.width;
      item.resultHeight = state.refinedCutoutCanvas.height;
    }
    sizeOverlay();
    els.rescanBtn.disabled = false;
    els.copyCutoutBtn.disabled = false;
    els.downloadCutoutBtn.disabled = false;
    els.manualModeBtn.disabled = false;
    await scanAndRender();
    if (item) {
      item.status = "done";
      item.originalCutoutBlob = state.originalCutoutBlob;
      item.cutoutBlob = state.cutoutBlob;
      item.components = [...state.components];
      item.message = `${state.components.length} 个元素`;
      renderQueue();
    }
  } catch (error) {
    console.error(error);
    if (token !== state.processingToken || item !== state.currentItem) return;
    if (item) {
      item.status = "error";
      item.error = error;
      item.message = "处理失败";
      renderQueue();
    }
    setError(`处理失败：${error?.message || "请检查网络或换一张图片再试"}`);
  } finally {
    if (token === state.processingToken) {
      state.processing = false;
      setBusy(false);
      hideProgress();
      updateUiState();
    }
  }
}

async function scanAndRender() {
  if (!state.cutoutBlob || !els.resultCanvas.width) return;
  if (state.scanning) {
    state.scanQueued = true;
    return;
  }

  state.scanning = true;
  try {
    setStatus("正在识别完整元素...");
    await redrawCutoutCanvas();
    let fullImageData = resultCtx.getImageData(0, 0, els.resultCanvas.width, els.resultCanvas.height);
    if (!els.includeText.checked) {
      removeLikelyTextPixels(fullImageData);
      resultCtx.putImageData(fullImageData, 0, 0);
      fullImageData = resultCtx.getImageData(0, 0, els.resultCanvas.width, els.resultCanvas.height);
    }

    const alphaThreshold = Math.max(12, Number(els.alphaThreshold.value));
    const minArea = Number(els.minArea.value);
    const padding = Number(els.padding.value);
    const mode = els.detectMode.value;
    if (mode === "complete") {
      state.components = [];
      state.selectedComponentIds.clear();
      state.visibleComponentLimit = 30;
      drawOverlay();
      renderCards();
      els.downloadZipBtn.disabled = true;
      updateSelectionButtons();
      if (state.currentItem) {
        state.currentItem.components = [];
        state.currentItem.filteredCutoutBlob = state.cutoutBlob;
        state.currentItem.message = "完整前景";
        renderQueue();
      }
      setSuccess("已完成去背景。完整前景模式不会拆分元素或显示识别框。");
      updateUiState();
      return;
    }

    const detection = createDetectionImageData(els.resultCanvas, 1024);
    const minAreaLow = Math.max(8, Math.round(minArea * detection.scale * detection.scale));
    const paddingLow = Math.max(1, Math.round(padding * detection.scale));
    const useIllustrationMode = mode === "illustration";
    const useMultiObjectMode = mode === "split";
    const rawComponents = useIllustrationMode
      ? findIllustrationComponents(
          detection.imageData,
          alphaThreshold,
          minAreaLow,
          paddingLow,
          els.includeText.checked,
          Number(els.colorTolerance.value),
        )
      : useMultiObjectMode
        ? findMultiObjectComponents(detection.imageData, alphaThreshold, minAreaLow, paddingLow, {
            strength: els.splitStrength.value,
          })
        : findSmartComponents(detection.imageData, alphaThreshold, minAreaLow, paddingLow);
    const mergedLow = useMultiObjectMode
      ? rawComponents
      : postProcessComponents(rawComponents, detection.width, detection.height, minAreaLow, {
          mergeDistance: mode === "subject" ? 10 : useIllustrationMode ? 22 : 16,
          absorbDistance: mode === "subject" ? 14 : useIllustrationMode ? 26 : 20,
        });
    const beforeMergeCount = rawComponents.length;
    const qualityLow = addComponentQuality(mergedLow, detection.imageData, Math.max(16, alphaThreshold));
    const validLow = filterBadComponents(qualityLow, detection.width, detection.height);
    const chosenLow = mode === "subject" ? pickSubjectComponents(validLow, detection.width, detection.height) : validLow;
    state.components = mapComponentsToCanvas(chosenLow, detection, els.resultCanvas.width, els.resultCanvas.height, padding);

    state.selectedComponentIds = new Set(state.components.map((component) => component.id));
    state.visibleComponentLimit = 30;
    drawOverlay();
    renderCards();
    els.downloadZipBtn.disabled = state.components.length === 0 || state.components.length > 50;
    updateSelectionButtons();
    if (state.currentItem) {
      state.currentItem.previewWidth = els.resultCanvas.width;
      state.currentItem.previewHeight = els.resultCanvas.height;
      state.currentItem.components = [...state.components];
      state.currentItem.filteredCutoutBlob = state.cutoutBlob;
      state.currentItem.message = state.cutoutBlob ? `${state.components.length} 个元素` : state.currentItem.message;
      renderQueue();
    }
    if (state.components.length > 50) {
      setStatus("识别到过多碎片，建议提高最小元素面积，或切换回智能元素切图。", "结果过碎");
    } else if (state.components.length) {
      const reduced = beforeMergeCount - state.components.length;
      if (mode === "subject") {
        setSuccess(`已按主体切图识别到 ${state.components.length} 个主要主体。`);
      } else if (mode === "split" && state.components.length === 1 && hasLikelyMultipleObjects(validLow, detection.width, detection.height)) {
        setStatus("这个元素可能包含多个靠近对象，建议点击“拆分此元素”或把拆分强度调为“强”。", "可能漏识别");
      } else if (reduced >= Math.max(3, Math.round(beforeMergeCount * 0.25))) {
        setSuccess(`已自动合并相邻碎片，识别到 ${state.components.length} 个完整元素。`);
      } else {
        setSuccess(`已完成抠图，识别到 ${state.components.length} 个完整元素。`);
      }
    } else {
      setStatus("没有识别到独立元素，可尝试调低最小元素面积，或切换为插画色块模式。", "未识别到元素");
    }
    updateUiState();
  } finally {
    state.scanning = false;
    if (state.scanQueued) {
      state.scanQueued = false;
      scheduleScan(80);
    }
  }
}

async function redrawCutoutCanvas() {
  drawCanvasToPreview(state.refinedCutoutCanvas, els.resultCanvas, resultCtx);
  sizeOverlay();
}

async function refineAndPreviewCutout({ immediateScan = true } = {}) {
  if (!state.cutoutOriginalCanvas.width) return;
  const refineResult = await refineCutoutAlphaAsync(state.cutoutOriginalCanvas, getRefineSettings());
  const detailResult = restoreIllustrationDetails(refineResult.canvas, state.sourceOriginalCanvas, getRefineSettings());
  state.refinedCutoutCanvas = detailResult.canvas;
  state.alphaNormalized = refineResult.alphaNormalized;
  state.cutoutBlob = await canvasToBlob(state.refinedCutoutCanvas);
  if (state.currentItem) {
    state.currentItem.cutoutBlob = state.cutoutBlob;
    state.currentItem.filteredCutoutBlob = state.cutoutBlob;
    state.currentItem.originalCutoutBlob = state.originalCutoutBlob;
  }
  drawCanvasToPreview(state.refinedCutoutCanvas, els.resultCanvas, resultCtx);
  sizeOverlay();
  drawOverlay();
  updateManualPreview();
  if (state.alphaNormalized) setStatus("已自动增强主体透明度。", "透明度已修复");
  if (detailResult.restoredPixels > 120) setStatus("已保护插画描边和细节。", "线稿已修复");
  if (immediateScan) scheduleScan(250);
}

async function refineCutoutAlphaAsync(sourceCanvas, settings) {
  if (!window.Worker) return refineCutoutAlpha(sourceCanvas, settings);
  try {
    if (!state.refineWorker) {
      state.refineWorker = new Worker(new URL("./matte-worker.js", import.meta.url), { type: "module" });
    }
    const ctx = sourceCanvas.getContext("2d", { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const id = ++state.refineJobId;
    const response = await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("matte worker timeout"));
      }, 12000);
      const cleanup = () => {
        window.clearTimeout(timeout);
        state.refineWorker.removeEventListener("message", handleMessage);
        state.refineWorker.removeEventListener("error", handleError);
      };
      const handleMessage = (event) => {
        if (event.data?.id !== id) return;
        cleanup();
        if (event.data.ok) resolve(event.data);
        else reject(new Error(event.data.message || "matte worker failed"));
      };
      const handleError = (error) => {
        cleanup();
        reject(error);
      };
      state.refineWorker.addEventListener("message", handleMessage);
      state.refineWorker.addEventListener("error", handleError);
      state.refineWorker.postMessage({ id, imageData, settings }, [imageData.data.buffer]);
    });
    const canvas = document.createElement("canvas");
    canvas.width = response.imageData.width;
    canvas.height = response.imageData.height;
    canvas.getContext("2d").putImageData(response.imageData, 0, 0);
    return { canvas, alphaNormalized: response.alphaNormalized };
  } catch (error) {
    console.warn("Matte worker fallback:", error);
    return refineCutoutAlpha(sourceCanvas, settings);
  }
}

function refineCutoutAlpha(sourceCanvas, settings) {
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(sourceCanvas, 0, 0);
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const alphaStats = analyzeAlpha(imageData);
  const alphaNormalized = alphaStats.midRatio > 0.28 && alphaStats.average > 80 && alphaStats.average < 225;
  imageData = applyAlphaOffset(imageData, settings.edgeOffset);
  imageData = smoothAlpha(imageData, settings.edgeSmooth + settings.feather);
  despeckleAlpha(imageData, settings.cleanup);
  defringe(imageData);
  const { data } = imageData;
  const cleanup = settings.cleanup;
  const solidThreshold = settings.alphaBoost === "clean" ? 168 : settings.alphaBoost === "soft" ? 230 : 205;
  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha < cleanup) {
      data[index + 3] = 0;
      continue;
    }
    if (alpha > solidThreshold || (alphaNormalized && alpha > 120)) {
      data[index + 3] = 255;
      continue;
    }
    const low = cleanup;
    const high = solidThreshold;
    const t = clamp((alpha - low) / Math.max(1, high - low), 0, 1);
    const curve = t * t * (3 - 2 * t);
    const boost = settings.alphaBoost === "clean" ? 1.18 : settings.alphaBoost === "soft" ? 0.92 : 1.05;
    data[index + 3] = Math.round(clamp(curve * 255 * boost, 0, 255));
  }
  ctx.putImageData(imageData, 0, 0);
  return { canvas, alphaNormalized };
}

function restoreIllustrationDetails(cutoutCanvas, originalCanvas, settings) {
  if (!originalCanvas?.width || !cutoutCanvas?.width) return { canvas: cutoutCanvas, restoredPixels: 0 };

  const width = cutoutCanvas.width;
  const height = cutoutCanvas.height;
  const resultCtx = cutoutCanvas.getContext("2d", { willReadFrequently: true });
  const result = resultCtx.getImageData(0, 0, width, height);
  const originalMatch = document.createElement("canvas");
  originalMatch.width = width;
  originalMatch.height = height;
  const originalCtx = originalMatch.getContext("2d", { willReadFrequently: true });
  originalCtx.imageSmoothingEnabled = true;
  originalCtx.imageSmoothingQuality = "high";
  originalCtx.drawImage(originalCanvas, 0, 0, width, height);
  const original = originalCtx.getImageData(0, 0, width, height);

  const supportThreshold = Math.max(12, Math.round((settings.cleanup || 24) * 0.65));
  const foreground = new Uint8Array(width * height);
  for (let index = 0; index < foreground.length; index += 1) {
    foreground[index] = result.data[index * 4 + 3] > supportThreshold ? 1 : 0;
  }
  const nearForeground = dilateMask(foreground, width, height, Math.max(2, Math.min(5, Number(settings.edgeSmooth || 2) + 2)));

  let restoredPixels = 0;
  for (let index = 0; index < foreground.length; index += 1) {
    if (!nearForeground[index]) continue;
    const offset = index * 4;
    const alpha = result.data[offset + 3];
    const red = original.data[offset];
    const green = original.data[offset + 1];
    const blue = original.data[offset + 2];
    const metrics = colorMetrics(red, green, blue);
    const nearWhite = metrics.lightness > 242 && metrics.saturation < 0.16;
    if (nearWhite) continue;

    const darkStroke = metrics.lightness < 110 && metrics.saturation < 0.72;
    const coloredFill = metrics.saturation > 0.28 && metrics.lightness < 238;

    if (alpha > 40 && (darkStroke || coloredFill)) {
      result.data[offset] = red;
      result.data[offset + 1] = green;
      result.data[offset + 2] = blue;
    }

    if (darkStroke && alpha < 220) {
      result.data[offset] = red;
      result.data[offset + 1] = green;
      result.data[offset + 2] = blue;
      result.data[offset + 3] = Math.max(alpha, alpha < settings.cleanup ? 235 : 255);
      restoredPixels += 1;
    } else if (coloredFill && alpha > 0 && alpha < 160) {
      result.data[offset] = red;
      result.data[offset + 1] = green;
      result.data[offset + 2] = blue;
      result.data[offset + 3] = Math.max(alpha, 180);
      restoredPixels += 1;
    }
  }

  resultCtx.putImageData(result, 0, 0);
  return { canvas: cutoutCanvas, restoredPixels };
}

function colorMetrics(red, green, blue) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = red * 0.299 + green * 0.587 + blue * 0.114;
  return {
    lightness,
    saturation: max ? (max - min) / max : 0,
  };
}

function analyzeAlpha(imageData) {
  const { data } = imageData;
  let count = 0;
  let sum = 0;
  let mid = 0;
  for (let index = 3; index < data.length; index += 4) {
    const alpha = data[index];
    if (alpha <= 16) continue;
    count += 1;
    sum += alpha;
    if (alpha >= 80 && alpha <= 220) mid += 1;
  }
  return {
    average: count ? sum / count : 0,
    midRatio: count ? mid / count : 0,
  };
}

function smoothAlpha(imageData, radius) {
  radius = Math.round(radius);
  if (radius <= 0) return imageData;
  const { width, height, data } = imageData;
  const source = new Uint8ClampedArray(data);
  const passes = Math.min(3, radius);
  for (let pass = 0; pass < passes; pass += 1) {
    const current = new Uint8ClampedArray(data);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let sum = 0;
        let weight = 0;
        for (let oy = -1; oy <= 1; oy += 1) {
          const py = y + oy;
          if (py < 0 || py >= height) continue;
          for (let ox = -1; ox <= 1; ox += 1) {
            const px = x + ox;
            if (px < 0 || px >= width) continue;
            const w = ox === 0 && oy === 0 ? 4 : 1;
            sum += current[(py * width + px) * 4 + 3] * w;
            weight += w;
          }
        }
        const offset = (y * width + x) * 4 + 3;
        const original = source[offset];
        const blurred = sum / weight;
        data[offset] = Math.round(original > 248 ? original : blurred);
      }
    }
  }
  return imageData;
}

function applyAlphaOffset(imageData, offset) {
  offset = Math.round(offset);
  if (!offset) return imageData;
  const { width, height, data } = imageData;
  const mask = new Uint8Array(width * height);
  for (let index = 0; index < mask.length; index += 1) mask[index] = data[index * 4 + 3] > 16 ? 1 : 0;
  const next = offset > 0 ? dilateMask(mask, width, height, Math.abs(offset)) : erodeMask(mask, width, height, Math.abs(offset));
  for (let index = 0; index < mask.length; index += 1) {
    if (!next[index]) data[index * 4 + 3] = 0;
    else if (offset > 0 && !mask[index]) data[index * 4 + 3] = Math.max(data[index * 4 + 3], 32);
  }
  return imageData;
}

function erodeMask(mask, width, height, radius) {
  const inverse = new Uint8Array(mask.length);
  for (let index = 0; index < mask.length; index += 1) inverse[index] = mask[index] ? 0 : 1;
  const grownBackground = dilateMask(inverse, width, height, radius);
  const output = new Uint8Array(mask.length);
  for (let index = 0; index < mask.length; index += 1) output[index] = grownBackground[index] ? 0 : mask[index];
  return output;
}

function despeckleAlpha(imageData, threshold) {
  const { width, height, data } = imageData;
  const source = new Uint8ClampedArray(data);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = (y * width + x) * 4 + 3;
      if (source[offset] === 0 || source[offset] > threshold + 18) continue;
      let neighbors = 0;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          if (ox || oy) neighbors += source[((y + oy) * width + x + ox) * 4 + 3] > threshold ? 1 : 0;
        }
      }
      if (neighbors <= 1) data[offset] = 0;
    }
  }
}

function defringe(imageData) {
  const { width, height, data } = imageData;
  const source = new Uint8ClampedArray(data);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = source[offset + 3];
      if (alpha === 0 || alpha > 235) continue;
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const next = ((y + oy) * width + x + ox) * 4;
          if (source[next + 3] <= 220) continue;
          r += source[next];
          g += source[next + 1];
          b += source[next + 2];
          count += 1;
        }
      }
      if (count) {
        data[offset] = Math.round(r / count);
        data[offset + 1] = Math.round(g / count);
        data[offset + 2] = Math.round(b / count);
      }
    }
  }
}

function createDetectionImageData(sourceCanvas, maxEdge = 1024) {
  const scale = Math.min(1, maxEdge / Math.max(sourceCanvas.width, sourceCanvas.height));
  const width = Math.max(1, Math.round(sourceCanvas.width * scale));
  const height = Math.max(1, Math.round(sourceCanvas.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(sourceCanvas, 0, 0, width, height);
  return {
    imageData: ctx.getImageData(0, 0, width, height),
    width,
    height,
    scale,
  };
}

function findSmartComponents(imageData, alphaThreshold, minArea, pad) {
  const radius = Math.max(3, Math.min(12, Math.round(Math.max(imageData.width, imageData.height) / 120)));
  const alphaMask = cleanAlphaMask(imageData, alphaThreshold);
  const mergedMask = dilateMask(alphaMask, imageData.width, imageData.height, radius);
  return findComponentsFromMask(mergedMask, imageData.width, imageData.height, minArea, Math.max(pad, radius));
}

function getSplitSettings(strength = "standard") {
  const presets = {
    conservative: {
      coreBase: 64,
      supportBase: 22,
      minCoreFactor: 0.18,
      absorbScale: 0.014,
      mergeDistance: 8,
      gapDensityRatio: 0.08,
      valleyDensityRatio: 0.42,
      gapMinRatio: 0.018,
      splitPaddingFactor: 1,
    },
    standard: {
      coreBase: 72,
      supportBase: 22,
      minCoreFactor: 0.12,
      absorbScale: 0.01,
      mergeDistance: 6,
      gapDensityRatio: 0.12,
      valleyDensityRatio: 0.5,
      gapMinRatio: 0.014,
      splitPaddingFactor: 0.8,
    },
    strong: {
      coreBase: 80,
      supportBase: 24,
      minCoreFactor: 0.08,
      absorbScale: 0.007,
      mergeDistance: 4,
      gapDensityRatio: 0.18,
      valleyDensityRatio: 0.62,
      gapMinRatio: 0.01,
      splitPaddingFactor: 0.55,
    },
  };
  return presets[strength] || presets.standard;
}

function findMultiObjectComponents(imageData, alphaThreshold, minArea, pad, options = {}) {
  const { width, height } = imageData;
  const imageArea = width * height;
  const settings = getSplitSettings(options.strength);
  const coreThreshold = Math.max(settings.coreBase, alphaThreshold + 16);
  const supportThreshold = Math.max(settings.supportBase, Math.round(alphaThreshold * 0.65));
  const coreMask = createAlphaMask(imageData, coreThreshold);
  const supportMask = createAlphaMask(imageData, supportThreshold);
  const minCoreArea = Math.max(6, Math.round(minArea * settings.minCoreFactor));
  const seeds = findCoreSeeds(coreMask, width, height, minCoreArea);

  if (!seeds.length) {
    return findComponentsFromMask(cleanAlphaMask(imageData, alphaThreshold), width, height, minArea, pad);
  }

  const labels = growSeedsIntoSupport(seeds, supportMask, width, height);
  let components = componentsFromLabels(labels, seeds.length, width, height, imageData, Math.max(24, alphaThreshold), pad)
    .filter((component) => keepMultiObjectComponent(component, imageArea, minArea));

  components = splitLargeComponents(components, imageData, coreMask, width, height, minCoreArea, pad, settings);
  components = absorbTinyMultiObjectFragments(components, imageArea, minArea, settings);
  components = mergeAssetFragments(components, imageData, Math.max(24, alphaThreshold), settings);

  return sortComponentsReadingOrder(components)
    .map((component, index) => ({ ...component, id: index + 1, mask: undefined }));
}

function findCoreSeeds(mask, width, height, minArea) {
  const visited = new Uint8Array(mask.length);
  const seeds = [];
  const stack = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (visited[start] || !mask[start]) continue;

      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      const pixels = [];
      visited[start] = 1;
      stack.push(start);

      while (stack.length) {
        const index = stack.pop();
        const px = index % width;
        const py = Math.floor(index / width);
        pixels.push(index);
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;

        const neighbors = [index - 1, index + 1, index - width, index + width];
        for (const next of neighbors) {
          if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue;
          if ((next === index - 1 && px === 0) || (next === index + 1 && px === width - 1)) continue;
          visited[next] = 1;
          stack.push(next);
        }
      }

      if (pixels.length >= minArea) {
        seeds.push({ id: seeds.length, pixels, area: pixels.length, x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 });
      }
    }
  }

  return seeds;
}

function growSeedsIntoSupport(seeds, supportMask, width, height) {
  const labels = new Int32Array(supportMask.length);
  labels.fill(-1);
  const queue = [];
  let cursor = 0;

  for (const seed of seeds) {
    for (const index of seed.pixels) {
      if (!supportMask[index] || labels[index] !== -1) continue;
      labels[index] = seed.id;
      queue.push(index);
    }
  }

  while (cursor < queue.length) {
    const index = queue[cursor++];
    const label = labels[index];
    const px = index % width;
    const neighbors = [index - 1, index + 1, index - width, index + width];
    for (const next of neighbors) {
      if (next < 0 || next >= supportMask.length || !supportMask[next] || labels[next] !== -1) continue;
      if ((next === index - 1 && px === 0) || (next === index + 1 && px === width - 1)) continue;
      labels[next] = label;
      queue.push(next);
    }
  }

  return labels;
}

function componentsFromLabels(labels, count, width, height, imageData, alphaThreshold, pad) {
  const boxes = Array.from({ length: count }, () => ({
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
    area: 0,
    strongAlphaArea: 0,
  }));

  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    if (label < 0) continue;
    const px = index % width;
    const py = Math.floor(index / width);
    const box = boxes[label];
    box.area += 1;
    if (imageData.data[index * 4 + 3] >= alphaThreshold) box.strongAlphaArea += 1;
    if (px < box.minX) box.minX = px;
    if (px > box.maxX) box.maxX = px;
    if (py < box.minY) box.minY = py;
    if (py > box.maxY) box.maxY = py;
  }

  return boxes
    .filter((box) => box.area > 0)
    .map((box, index) => {
      const padded = padBox(box, pad, width, height);
      const component = {
        id: index + 1,
        area: box.area,
        strongAlphaArea: box.strongAlphaArea,
        x: padded.minX,
        y: padded.minY,
        width: padded.maxX - padded.minX + 1,
        height: padded.maxY - padded.minY + 1,
      };
      const boxArea = component.width * component.height;
      component.alphaDensity = component.area / Math.max(1, boxArea);
      return component;
    });
}

function keepMultiObjectComponent(component, imageArea, minArea) {
  const boxArea = component.width * component.height;
  const aspect = component.width / Math.max(1, component.height);
  const denseSmall = component.alphaDensity > 0.22 && boxArea > minArea * 1.4;
  const meaningfulArea = component.area >= Math.max(minArea * 0.55, imageArea * 0.00025);
  const residualLine = (aspect > 10 || aspect < 0.1) && component.alphaDensity < 0.24;
  const weakResidual = component.strongAlphaArea < Math.max(4, minArea * 0.12) && component.alphaDensity < 0.18;
  return (meaningfulArea || denseSmall) && !residualLine && !weakResidual;
}

function splitLargeComponents(components, imageData, coreMask, width, height, minCoreArea, pad, settings) {
  const imageArea = width * height;
  const output = [];

  for (const component of components) {
    const children = splitLargeComponent(component, imageData, coreMask, width, height, minCoreArea, pad, settings);
    if (children.length >= 2) output.push(...children);
    else output.push(component);
  }

  return output;
}

function splitLargeComponent(component, imageData, coreMask, width, height, minCoreArea, pad, settings = getSplitSettings()) {
  const imageArea = width * height;
  const boxArea = component.width * component.height;
  const largeBySize = component.width / width > 0.28 || component.height / height > 0.28;
  const sparseLarge = boxArea / imageArea > 0.22 && component.alphaDensity < 0.42;
  const coreChildren = findCoreSeedsInBox(coreMask, width, height, component, minCoreArea);
  const hasMultipleCore = coreChildren.length >= 2;
  if (!largeBySize && !sparseLarge && !hasMultipleCore) return [];

  const projectionChildren = projectionSplit(component, imageData, coreMask, minCoreArea, pad, settings);
  if (projectionChildren.length >= 2) return projectionChildren;

  if (!hasMultipleCore) return [];

  return coreChildren
    .filter((child) => child.area >= minCoreArea)
    .map((child) => {
      const splitPad = Math.max(1, Math.round(pad * settings.splitPaddingFactor));
      const padded = padBox(
        { minX: child.x, minY: child.y, maxX: child.x + child.width - 1, maxY: child.y + child.height - 1 },
        splitPad,
        width,
        height,
      );
      return measureBoxAsComponent({
        id: child.id,
        x: padded.minX,
        y: padded.minY,
        width: padded.maxX - padded.minX + 1,
        height: padded.maxY - padded.minY + 1,
      }, imageData, Math.max(24, settings.supportBase));
    })
    .filter((child) => keepMultiObjectComponent(child, imageArea, minCoreArea));
}

function projectionSplit(component, imageData, coreMask, minCoreArea, pad, settings) {
  const vertical = splitByProjection(component, imageData, coreMask, "x", minCoreArea, pad, settings);
  if (vertical.length >= 2) return vertical;
  const horizontal = splitByProjection(component, imageData, coreMask, "y", minCoreArea, pad, settings);
  if (horizontal.length >= 2) return horizontal;
  const verticalPeaks = splitByProjectionPeaks(component, imageData, coreMask, "x", minCoreArea, pad, settings);
  if (verticalPeaks.length >= 2) return verticalPeaks;
  return splitByProjectionPeaks(component, imageData, coreMask, "y", minCoreArea, pad, settings);
}

function splitByProjection(component, imageData, coreMask, axis, minCoreArea, pad, settings) {
  const { width, height } = imageData;
  const startX = Math.max(0, Math.floor(component.x));
  const startY = Math.max(0, Math.floor(component.y));
  const endX = Math.min(width, Math.ceil(component.x + component.width));
  const endY = Math.min(height, Math.ceil(component.y + component.height));
  const length = axis === "x" ? endX - startX : endY - startY;
  const crossLength = axis === "x" ? endY - startY : endX - startX;
  if (length < 24 || crossLength < 8) return [];

  const projection = new Array(length).fill(0);
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      if (!coreMask[y * width + x]) continue;
      projection[axis === "x" ? x - startX : y - startY] += 1;
    }
  }

  const nonZero = projection.filter(Boolean);
  if (!nonZero.length) return [];
  const average = nonZero.reduce((sum, value) => sum + value, 0) / nonZero.length;
  const threshold = Math.max(1, average * settings.gapDensityRatio);
  const minGap = Math.max(3, Math.round(length * settings.gapMinRatio));
  const gaps = [];
  let gapStart = -1;
  for (let i = 0; i < projection.length; i += 1) {
    const isGap = projection[i] <= threshold;
    if (isGap && gapStart === -1) gapStart = i;
    if ((!isGap || i === projection.length - 1) && gapStart !== -1) {
      const gapEnd = isGap && i === projection.length - 1 ? i + 1 : i;
      if (gapEnd - gapStart >= minGap) gaps.push({ start: gapStart, end: gapEnd });
      gapStart = -1;
    }
  }

  const cuts = gaps
    .map((gap) => Math.round((gap.start + gap.end) / 2))
    .filter((cut) => cut > length * 0.08 && cut < length * 0.92);
  if (!cuts.length) return [];

  const ranges = [];
  let last = 0;
  for (const cut of cuts) {
    ranges.push([last, cut]);
    last = cut;
  }
  ranges.push([last, length]);

  const children = [];
  const splitPad = Math.max(1, Math.round(pad * settings.splitPaddingFactor));
  for (const [rangeStart, rangeEnd] of ranges) {
    if (rangeEnd - rangeStart < 4) continue;
    const bounds = contentBoundsInRange(imageData, coreMask, {
      startX: axis === "x" ? startX + rangeStart : startX,
      startY: axis === "y" ? startY + rangeStart : startY,
      endX: axis === "x" ? startX + rangeEnd : endX,
      endY: axis === "y" ? startY + rangeEnd : endY,
    });
    if (!bounds || bounds.area < minCoreArea) continue;
    const padded = padBox(bounds, splitPad, width, height);
    const child = measureBoxAsComponent({
      id: children.length + 1,
      x: padded.minX,
      y: padded.minY,
      width: padded.maxX - padded.minX + 1,
      height: padded.maxY - padded.minY + 1,
    }, imageData, Math.max(24, settings.supportBase));
    if (keepMultiObjectComponent(child, width * height, minCoreArea)) children.push(child);
  }

  return children.length >= 2 ? children : [];
}

function splitByProjectionPeaks(component, imageData, coreMask, axis, minCoreArea, pad, settings) {
  const { width, height } = imageData;
  const startX = Math.max(0, Math.floor(component.x));
  const startY = Math.max(0, Math.floor(component.y));
  const endX = Math.min(width, Math.ceil(component.x + component.width));
  const endY = Math.min(height, Math.ceil(component.y + component.height));
  const length = axis === "x" ? endX - startX : endY - startY;
  const crossLength = axis === "x" ? endY - startY : endX - startX;
  if (length < 48 || crossLength < 20) return [];

  const projection = new Array(length).fill(0);
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      if (!coreMask[y * width + x]) continue;
      projection[axis === "x" ? x - startX : y - startY] += 1;
    }
  }

  const smoothed = smoothProjection(projection, Math.max(2, Math.round(length * 0.012)));
  const nonZero = smoothed.filter(Boolean);
  if (!nonZero.length) return [];
  const max = Math.max(...smoothed);
  const average = nonZero.reduce((sum, value) => sum + value, 0) / nonZero.length;
  const peakThreshold = Math.max(2, Math.min(max * 0.38, average * 0.82));
  const valleyThreshold = Math.max(1, Math.min(max * 0.24, average * settings.valleyDensityRatio));
  const minRun = Math.max(4, Math.round(length * 0.028));
  const segments = [];
  let runStart = -1;

  for (let i = 0; i < smoothed.length; i += 1) {
    const isPeak = smoothed[i] >= peakThreshold;
    if (isPeak && runStart === -1) runStart = i;
    if ((!isPeak || i === smoothed.length - 1) && runStart !== -1) {
      const runEnd = isPeak && i === smoothed.length - 1 ? i + 1 : i;
      if (runEnd - runStart >= minRun) segments.push({ start: runStart, end: runEnd });
      runStart = -1;
    }
  }

  if (segments.length < 2) return [];

  const cuts = [];
  for (let i = 0; i < segments.length - 1; i += 1) {
    const left = segments[i];
    const right = segments[i + 1];
    if (right.start - left.end < Math.max(2, Math.round(length * 0.006))) continue;
    let valleyIndex = left.end;
    let valleyValue = Infinity;
    for (let cursor = left.end; cursor <= right.start; cursor += 1) {
      const value = smoothed[cursor] ?? 0;
      if (value < valleyValue) {
        valleyValue = value;
        valleyIndex = cursor;
      }
    }
    const leftPeak = Math.max(...smoothed.slice(left.start, left.end));
    const rightPeak = Math.max(...smoothed.slice(right.start, right.end));
    const localPeak = Math.min(leftPeak, rightPeak);
    if (valleyValue <= valleyThreshold || valleyValue <= localPeak * 0.55) cuts.push(valleyIndex);
  }

  const uniqueCuts = [...new Set(cuts)]
    .filter((cut) => cut > length * 0.06 && cut < length * 0.94)
    .sort((a, b) => a - b);
  if (!uniqueCuts.length) return [];

  const ranges = [];
  let last = 0;
  for (const cut of uniqueCuts) {
    ranges.push([last, cut]);
    last = cut;
  }
  ranges.push([last, length]);

  const children = componentsFromProjectionRanges(ranges, axis, { startX, startY, endX, endY }, imageData, coreMask, minCoreArea, pad, settings);
  if (children.length < 2) return [];

  const parentDensity = measureComponent(component, imageData, Math.max(24, settings.supportBase)).alphaDensity;
  const childDensity = children.reduce((sum, child) => sum + child.alphaDensity, 0) / children.length;
  return childDensity >= parentDensity * 0.72 ? children : [];
}

function smoothProjection(values, radius) {
  const output = new Array(values.length).fill(0);
  let sum = 0;
  for (let i = -radius; i < values.length + radius; i += 1) {
    const add = i + radius;
    if (add >= 0 && add < values.length) sum += values[add];
    const remove = i - radius - 1;
    if (remove >= 0 && remove < values.length) sum -= values[remove];
    if (i >= 0 && i < values.length) {
      const from = Math.max(0, i - radius);
      const to = Math.min(values.length - 1, i + radius);
      output[i] = sum / Math.max(1, to - from + 1);
    }
  }
  return output;
}

function componentsFromProjectionRanges(ranges, axis, rect, imageData, coreMask, minCoreArea, pad, settings) {
  const { width, height } = imageData;
  const children = [];
  const splitPad = Math.max(1, Math.round(pad * settings.splitPaddingFactor));
  for (const [rangeStart, rangeEnd] of ranges) {
    if (rangeEnd - rangeStart < 4) continue;
    const bounds = contentBoundsInRange(imageData, coreMask, {
      startX: axis === "x" ? rect.startX + rangeStart : rect.startX,
      startY: axis === "y" ? rect.startY + rangeStart : rect.startY,
      endX: axis === "x" ? rect.startX + rangeEnd : rect.endX,
      endY: axis === "y" ? rect.startY + rangeEnd : rect.endY,
    });
    if (!bounds || bounds.area < minCoreArea) continue;
    const padded = padBox(bounds, splitPad, width, height);
    const child = measureBoxAsComponent({
      id: children.length + 1,
      x: padded.minX,
      y: padded.minY,
      width: padded.maxX - padded.minX + 1,
      height: padded.maxY - padded.minY + 1,
    }, imageData, Math.max(24, settings.supportBase));
    if (keepMultiObjectComponent(child, width * height, minCoreArea)) children.push(child);
  }
  return children;
}

function contentBoundsInRange(imageData, coreMask, rect) {
  const { width, height } = imageData;
  const startX = Math.max(0, Math.floor(rect.startX));
  const startY = Math.max(0, Math.floor(rect.startY));
  const endX = Math.min(width, Math.ceil(rect.endX));
  const endY = Math.min(height, Math.ceil(rect.endY));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let area = 0;
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      if (!coreMask[y * width + x]) continue;
      area += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!area) return null;
  return { minX, minY, maxX, maxY, area };
}

function measureBoxAsComponent(box, imageData, alphaThreshold) {
  const metrics = measureComponent(box, imageData, alphaThreshold);
  return {
    ...box,
    area: metrics.alphaArea,
    strongAlphaArea: metrics.strongAlphaArea,
    alphaDensity: metrics.alphaDensity,
    boxArea: metrics.boxArea,
    boxRatio: metrics.boxRatio,
  };
}

function splitComponentBox(component, imageData, pad, strength = "strong") {
  const settings = getSplitSettings(strength);
  const coreThreshold = Math.max(settings.coreBase, Number(els.alphaThreshold.value) + 16);
  const coreMask = createAlphaMask(imageData, coreThreshold);
  const minArea = Math.max(6, Math.round(Number(els.minArea.value) * settings.minCoreFactor));
  return splitLargeComponent(component, imageData, coreMask, imageData.width, imageData.height, minArea, pad, settings);
}

function findCoreSeedsInBox(mask, width, height, box, minArea) {
  const visited = new Uint8Array(mask.length);
  const seeds = [];
  const stack = [];
  const startX = Math.max(0, Math.floor(box.x));
  const startY = Math.max(0, Math.floor(box.y));
  const endX = Math.min(width, Math.ceil(box.x + box.width));
  const endY = Math.min(height, Math.ceil(box.y + box.height));

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const start = y * width + x;
      if (visited[start] || !mask[start]) continue;
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
          if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue;
          const nx = next % width;
          const ny = Math.floor(next / width);
          if (nx < startX || nx >= endX || ny < startY || ny >= endY) continue;
          if ((next === index - 1 && px === 0) || (next === index + 1 && px === width - 1)) continue;
          visited[next] = 1;
          stack.push(next);
        }
      }

      if (area >= minArea) seeds.push({ id: seeds.length + 1, area, x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 });
    }
  }

  return seeds;
}

function absorbTinyMultiObjectFragments(components, imageArea, minArea) {
  const sorted = [...components].sort((a, b) => b.area - a.area);
  const large = sorted.filter((component) => component.area >= Math.max(minArea, imageArea * 0.0012));
  const output = large.map((component) => ({ ...component }));
  const absorbDistance = Math.max(6, Math.round(Math.sqrt(imageArea) / 90));

  for (const component of sorted) {
    if (large.includes(component)) continue;
    const target = output
      .map((candidate) => ({ candidate, distance: boxDistance(component, candidate) }))
      .filter((entry) => entry.distance <= absorbDistance)
      .sort((a, b) => a.distance - b.distance)[0]?.candidate;
    if (target) mergeBoxInto(target, component);
    else output.push({ ...component });
  }

  return output;
}

function mergeAssetFragments(components, imageData, alphaThreshold, settings = getSplitSettings()) {
  let boxes = components.map((component) => ({ ...component }));
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        if (shouldMergeAssetBoxes(boxes[i], boxes[j], imageData, alphaThreshold, settings)) {
          mergeBoxInto(boxes[i], boxes[j]);
          boxes.splice(j, 1);
          changed = true;
          break outer;
        }
      }
    }
  }
  return boxes;
}

function shouldMergeAssetBoxes(a, b, imageData, alphaThreshold, settings = getSplitSettings()) {
  const distance = boxDistance(a, b);
  const smallerArea = Math.min(a.area, b.area);
  const imageArea = imageData.width * imageData.height;
  const bothMeaningful = a.area > imageArea * 0.003 && b.area > imageArea * 0.003;
  const overlapRatio = boxOverlapRatio(a, b);
  if (bothMeaningful && settings.mergeDistance <= 4 && overlapRatio < 0.22) return false;
  if (bothMeaningful && settings.mergeDistance <= 6 && distance > 0 && overlapRatio < 0.14) return false;
  if (bothMeaningful && hasTransparentSeparator(a, b, imageData, alphaThreshold)) return false;
  if (bothMeaningful && distance > Math.max(4, Math.min(imageData.width, imageData.height) * 0.012)) return false;
  if (distance > Math.max(10, Math.min(imageData.width, imageData.height) * 0.02)) return false;
  const merged = mergedBox(a, b);
  const mergedMetrics = measureComponent(merged, imageData, alphaThreshold);
  const densityA = measureComponent(a, imageData, alphaThreshold).alphaDensity;
  const densityB = measureComponent(b, imageData, alphaThreshold).alphaDensity;
  const weightedDensity = (densityA * a.width * a.height + densityB * b.width * b.height) / Math.max(1, a.width * a.height + b.width * b.height);
  if (bothMeaningful && mergedMetrics.alphaDensity < weightedDensity * 0.65) return false;
  return smallerArea < imageArea * 0.0015 || distance <= settings.mergeDistance || overlapRatio > 0.45;
}

function hasTransparentSeparator(a, b, imageData, alphaThreshold) {
  const gap = gapRectBetweenBoxes(a, b);
  if (!gap) return false;
  const { width, height, data } = imageData;
  const startX = Math.max(0, Math.floor(gap.x));
  const startY = Math.max(0, Math.floor(gap.y));
  const endX = Math.min(width, Math.ceil(gap.x + gap.width));
  const endY = Math.min(height, Math.ceil(gap.y + gap.height));
  if (endX <= startX || endY <= startY) return false;
  let opaque = 0;
  let total = 0;
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      total += 1;
      if (data[(y * width + x) * 4 + 3] >= alphaThreshold) opaque += 1;
    }
  }
  return total > 0 && opaque / total < 0.025;
}

function gapRectBetweenBoxes(a, b) {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  const verticalOverlap = Math.min(ay2, by2) - Math.max(a.y, b.y);
  const horizontalOverlap = Math.min(ax2, bx2) - Math.max(a.x, b.x);
  if (a.x <= bx2 && b.x <= ax2 && verticalOverlap > 0) return null;
  if (a.y <= by2 && b.y <= ay2 && horizontalOverlap > 0) return null;
  if (ax2 <= b.x || bx2 <= a.x) {
    const left = ax2 <= b.x ? ax2 : bx2;
    const right = ax2 <= b.x ? b.x : a.x;
    return { x: left, y: Math.max(a.y, b.y), width: right - left, height: Math.max(1, verticalOverlap) };
  }
  if (ay2 <= b.y || by2 <= a.y) {
    const top = ay2 <= b.y ? ay2 : by2;
    const bottom = ay2 <= b.y ? b.y : a.y;
    return { x: Math.max(a.x, b.x), y: top, width: Math.max(1, horizontalOverlap), height: bottom - top };
  }
  return null;
}

function mergedBox(a, b) {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, area: a.area + b.area };
}

function sortComponentsReadingOrder(components) {
  if (!components.length) return components;
  const averageHeight = components.reduce((sum, component) => sum + component.height, 0) / components.length;
  return [...components].sort((a, b) => {
    const rowA = Math.round((a.y + a.height / 2) / Math.max(1, averageHeight * 0.8));
    const rowB = Math.round((b.y + b.height / 2) / Math.max(1, averageHeight * 0.8));
    return rowA === rowB ? a.x - b.x : rowA - rowB;
  });
}

function hasLikelyMultipleObjects(components, width, height) {
  const meaningful = components.filter((component) => component.area > width * height * 0.002);
  if (meaningful.length >= 2) return true;
  const huge = components.find((component) => component.width * component.height > width * height * 0.35 && component.alphaDensity < 0.4);
  return Boolean(huge);
}

function cleanAlphaMask(imageData, alphaThreshold) {
  const supportThreshold = Math.max(16, alphaThreshold);
  const coreThreshold = Math.max(48, alphaThreshold + 16);
  const supportMask = createAlphaMask(imageData, supportThreshold);
  const coreMask = createAlphaMask(imageData, coreThreshold);
  return growCoreIntoSupport(coreMask, supportMask, imageData.width, imageData.height);
}

function createAlphaMask(imageData, alphaThreshold) {
  const { data, width, height } = imageData;
  const mask = new Uint8Array(width * height);
  for (let index = 0; index < mask.length; index += 1) {
    mask[index] = data[index * 4 + 3] > alphaThreshold ? 1 : 0;
  }
  return mask;
}

function growCoreIntoSupport(coreMask, supportMask, width, height) {
  const output = new Uint8Array(coreMask.length);
  const stack = [];
  for (let index = 0; index < coreMask.length; index += 1) {
    if (coreMask[index] && supportMask[index]) {
      output[index] = 1;
      stack.push(index);
    }
  }

  while (stack.length) {
    const index = stack.pop();
    const px = index % width;
    const neighbors = [index - 1, index + 1, index - width, index + width];
    for (const next of neighbors) {
      if (next < 0 || next >= supportMask.length || output[next] || !supportMask[next]) continue;
      if ((next === index - 1 && px === 0) || (next === index + 1 && px === width - 1)) continue;
      output[next] = 1;
      stack.push(next);
    }
  }

  return output;
}

function dilateMask(mask, width, height, radius) {
  const horizontal = new Uint8Array(mask.length);
  const output = new Uint8Array(mask.length);

  for (let y = 0; y < height; y += 1) {
    let sum = 0;
    const row = y * width;
    for (let x = -radius; x < width + radius; x += 1) {
      const addX = x + radius;
      if (addX >= 0 && addX < width) sum += mask[row + addX];
      const removeX = x - radius - 1;
      if (removeX >= 0 && removeX < width) sum -= mask[row + removeX];
      if (x >= 0 && x < width) horizontal[row + x] = sum > 0 ? 1 : 0;
    }
  }

  for (let x = 0; x < width; x += 1) {
    let sum = 0;
    for (let y = -radius; y < height + radius; y += 1) {
      const addY = y + radius;
      if (addY >= 0 && addY < height) sum += horizontal[addY * width + x];
      const removeY = y - radius - 1;
      if (removeY >= 0 && removeY < height) sum -= horizontal[removeY * width + x];
      if (y >= 0 && y < height) output[y * width + x] = sum > 0 ? 1 : 0;
    }
  }

  return output;
}

function findComponentsFromMask(mask, width, height, minArea, pad) {
  const visited = new Uint8Array(mask.length);
  const components = [];
  const stack = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (visited[start] || !mask[start]) continue;

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
          if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue;
          if ((next === index - 1 && px === 0) || (next === index + 1 && px === width - 1)) continue;
          visited[next] = 1;
          stack.push(next);
        }
      }

      if (area >= minArea) {
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

  return components;
}

function postProcessComponents(components, imageWidth, imageHeight, minArea, options = {}) {
  const imageArea = imageWidth * imageHeight;
  const tinyArea = Math.max(minArea, imageArea * 0.0005);
  const mergeDistance = options.mergeDistance ?? 18;
  const absorbDistance = options.absorbDistance ?? 22;
  let working = components
    .filter((component) => component.width > 1 && component.height > 1)
    .filter((component) => component.area >= tinyArea || component.width * component.height >= tinyArea * 2)
    .map((component) => ({ ...component, mask: undefined }));

  working = absorbTinyNearLarge(working, tinyArea * 2.6, absorbDistance);
  working = mergeBoxesUntilStable(working, mergeDistance);
  working = mergeContainedOrOverlapping(working);

  return working
    .sort((a, b) => b.area - a.area)
    .map((component, index) => ({ ...component, id: index + 1 }));
}

function addComponentQuality(components, imageData, alphaThreshold) {
  return components.map((component) => {
    const metrics = measureComponent(component, imageData, alphaThreshold);
    return {
      ...component,
      ...metrics,
      score: scoreComponent({ ...component, ...metrics }, imageData.width, imageData.height),
    };
  });
}

function measureComponent(component, imageData, alphaThreshold) {
  const { width, height, data } = imageData;
  const startX = Math.max(0, Math.floor(component.x));
  const startY = Math.max(0, Math.floor(component.y));
  const endX = Math.min(width, Math.ceil(component.x + component.width));
  const endY = Math.min(height, Math.ceil(component.y + component.height));
  let alphaArea = 0;
  let strongAlphaArea = 0;
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha >= alphaThreshold) alphaArea += 1;
      if (alpha >= 96) strongAlphaArea += 1;
    }
  }
  const boxArea = Math.max(1, (endX - startX) * (endY - startY));
  return {
    boxArea,
    alphaArea,
    strongAlphaArea,
    alphaDensity: alphaArea / boxArea,
    boxRatio: boxArea / Math.max(1, width * height),
  };
}

function filterBadComponents(components, imageWidth, imageHeight) {
  const imageArea = imageWidth * imageHeight;
  return components.filter((component) => {
    const aspect = component.width / Math.max(1, component.height);
    const tooSparseHuge = component.boxRatio > 0.7 && component.alphaDensity < 0.18;
    const mostlyEmpty = component.boxRatio > 0.25 && component.alphaDensity < 0.08;
    const residualLine = (aspect > 8 || aspect < 0.125) && component.alphaDensity < 0.22;
    const tinyNoise = component.alphaArea < imageArea * 0.0005;
    return !tooSparseHuge && !mostlyEmpty && !residualLine && !tinyNoise;
  });
}

function scoreComponent(component, imageWidth, imageHeight) {
  const imageArea = imageWidth * imageHeight;
  const areaRatio = component.alphaArea / Math.max(1, imageArea);
  const boxRatio = component.boxRatio;
  const density = component.alphaDensity;
  const centerX = component.x + component.width / 2;
  const centerY = component.y + component.height / 2;
  const centerDistance = Math.hypot(centerX / imageWidth - 0.5, centerY / imageHeight - 0.5);
  const aspect = component.width / Math.max(1, component.height);
  const linePenalty = aspect > 5 || aspect < 0.2 ? 0.45 : 1;
  const hugePenalty = boxRatio > 0.65 ? 0.38 : boxRatio > 0.45 ? 0.72 : 1;
  const tinyPenalty = areaRatio < 0.006 ? 0.4 : areaRatio < 0.012 ? 0.68 : 1;
  const centerBoost = 1 + Math.max(0, 0.5 - centerDistance) * 0.7;
  const densityScore = Math.min(1.4, 0.25 + density * 2.8);
  const sizeScore = Math.log1p(areaRatio * 120) / Math.log1p(120);
  return sizeScore * densityScore * centerBoost * linePenalty * hugePenalty * tinyPenalty;
}

function pickSubjectComponents(components, imageWidth, imageHeight) {
  const ranked = components
    .map((component) => ({
      ...component,
      score: component.score ?? scoreComponent(component, imageWidth, imageHeight),
    }))
    .filter((component) => component.alphaDensity >= 0.06 && component.boxRatio < 0.82)
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) return components.slice(0, 1);

  const best = ranked[0];
  const subjects = [best];
  for (const candidate of ranked.slice(1)) {
    if (subjects.length >= 3) break;
    if (candidate.score < best.score * 0.62) continue;
    if (candidate.alphaArea < best.alphaArea * 0.18) continue;
    if (subjects.some((subject) => boxOverlapRatio(candidate, subject) > 0.35 || boxDistance(candidate, subject) < 8)) continue;
    subjects.push(candidate);
  }
  return subjects;
}

function absorbTinyNearLarge(components, tinyLimit, distance) {
  const sorted = components.sort((a, b) => b.area - a.area);
  const large = sorted.filter((component) => component.area >= tinyLimit);
  const output = large.map((component) => ({ ...component }));

  for (const component of sorted) {
    if (component.area >= tinyLimit) continue;
    const target = output
      .map((candidate) => ({ candidate, distance: boxDistance(component, candidate) }))
      .filter((entry) => entry.distance <= distance)
      .sort((a, b) => a.distance - b.distance)[0]?.candidate;
    if (target) mergeBoxInto(target, component);
    else output.push({ ...component });
  }

  return output;
}

function mergeBoxesUntilStable(components, distance) {
  let boxes = components.map((component) => ({ ...component }));
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        if (shouldMergeBoxes(boxes[i], boxes[j], distance)) {
          mergeBoxInto(boxes[i], boxes[j]);
          boxes.splice(j, 1);
          changed = true;
          break outer;
        }
      }
    }
  }
  return boxes;
}

function mergeContainedOrOverlapping(components) {
  const boxes = components.map((component) => ({ ...component }));
  let index = 0;
  while (index < boxes.length) {
    const current = boxes[index];
    const containerIndex = boxes.findIndex((candidate, candidateIndex) => {
      if (candidateIndex === index) return false;
      return boxOverlapRatio(current, candidate) > 0.68 || containsBox(candidate, current, 10);
    });
    if (containerIndex >= 0) {
      mergeBoxInto(boxes[containerIndex], current);
      boxes.splice(index, 1);
    } else {
      index += 1;
    }
  }
  return boxes;
}

function shouldMergeBoxes(a, b, distance) {
  if (boxDistance(a, b) <= distance) return true;
  if (boxOverlapRatio(a, b) > 0.28) return true;
  return containsBox(a, b, distance) || containsBox(b, a, distance);
}

function mergeBoxInto(target, source) {
  const minX = Math.min(target.x, source.x);
  const minY = Math.min(target.y, source.y);
  const maxX = Math.max(target.x + target.width, source.x + source.width);
  const maxY = Math.max(target.y + target.height, source.y + source.height);
  target.x = minX;
  target.y = minY;
  target.width = maxX - minX;
  target.height = maxY - minY;
  target.area += source.area;
}

function boxDistance(a, b) {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width));
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height));
  return Math.hypot(dx, dy);
}

function containsBox(outer, inner, tolerance = 0) {
  return (
    inner.x >= outer.x - tolerance &&
    inner.y >= outer.y - tolerance &&
    inner.x + inner.width <= outer.x + outer.width + tolerance &&
    inner.y + inner.height <= outer.y + outer.height + tolerance
  );
}

function mapComponentsToCanvas(components, detection, targetWidth, targetHeight, pad) {
  const scaleX = targetWidth / detection.width;
  const scaleY = targetHeight / detection.height;
  return components.map((component, index) => {
    const x = Math.max(0, Math.floor(component.x * scaleX) - pad);
    const y = Math.max(0, Math.floor(component.y * scaleY) - pad);
    const maxX = Math.min(targetWidth, Math.ceil((component.x + component.width) * scaleX) + pad);
    const maxY = Math.min(targetHeight, Math.ceil((component.y + component.height) * scaleY) + pad);
    return {
      id: index + 1,
      area: Math.round(component.area / Math.max(0.0001, detection.scale * detection.scale)),
      x,
      y,
      width: Math.max(1, maxX - x),
      height: Math.max(1, maxY - y),
    };
  });
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
      mergeBoxInto(container, component);
    } else if (!isTiny || boxArea > 900) {
      kept.push({ ...component, mask: undefined });
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
    const empty = document.createElement("div");
    empty.className = "empty-elements";
    empty.innerHTML = state.cutoutBlob && els.detectMode.value === "complete"
      ? "<strong>完整前景模式</strong><span>当前只去背景，不拆分元素；可直接下载整张抠图。</span>"
      : state.cutoutBlob
      ? "<strong>没有识别到独立元素</strong><span>可尝试调低最小元素面积，或切换为插画色块模式。</span>"
      : "<strong>等待处理结果</strong><span>处理完成后，拆分出的元素会显示在这里。</span>";
    els.elementGrid.append(empty);
    updateSelectionButtons();
    return;
  }

  const tooMany = state.components.length > 50;
  if (tooMany) {
    const warning = document.createElement("div");
    warning.className = "empty-elements fragment-warning";
    warning.innerHTML = "<strong>识别到过多碎片</strong><span>建议提高最小元素面积，或切换回智能元素切图后重新识别。当前只预览前 30 个元素。</span>";
    els.elementGrid.append(warning);
  }

  const visibleComponents = state.components.slice(0, tooMany ? 30 : state.visibleComponentLimit);
  for (const component of visibleComponents) {
    const card = document.createElement("article");
    const selected = state.selectedComponentIds.has(component.id);
    card.className = `element-card${selected ? " selected" : ""}`;

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    const img = document.createElement("img");
    img.alt = `元素 ${component.id}`;
    img.loading = "lazy";
    queueThumbnail(img, component);
    thumb.append(img);

    const meta = document.createElement("div");
    meta.className = "meta";
    const size = getExportSize(component);
    meta.innerHTML = `<strong>元素 ${String(component.id).padStart(2, "0")}</strong><span>${component.width} x ${component.height} @${size.scale}x -> ${size.width} x ${size.height}</span>`;

    const checkbox = document.createElement("label");
    checkbox.className = "asset-check";
    checkbox.innerHTML = `<input type="checkbox" ${selected ? "checked" : ""} /> <span>选择导出</span>`;
    checkbox.querySelector("input").addEventListener("change", (event) => {
      if (event.target.checked) state.selectedComponentIds.add(component.id);
      else state.selectedComponentIds.delete(component.id);
      renderCards();
      drawOverlay();
    });

    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost";
    button.dataset.downloadElement = "true";
    button.textContent = `下载 ${getExportSettings().label}`;
    button.addEventListener("click", () => downloadComponent(component));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ghost danger-lite";
    remove.textContent = "删除";
    remove.addEventListener("click", () => removeComponent(component.id));

    const split = document.createElement("button");
    split.type = "button";
    split.className = "ghost";
    split.textContent = "拆分";
    split.addEventListener("click", () => splitComponentById(component.id));

    const actions = document.createElement("div");
    actions.className = "asset-actions";
    actions.append(button, split, remove);

    card.addEventListener("mouseenter", () => {
      drawOverlay(component.id);
    });
    card.addEventListener("mouseleave", () => {
      drawOverlay();
    });

    card.append(thumb, meta, checkbox, actions);
    els.elementGrid.append(card);
  }

  if (!tooMany && state.visibleComponentLimit < state.components.length) {
    const more = document.createElement("button");
    more.type = "button";
    more.className = "ghost show-more";
    more.textContent = `显示更多（剩余 ${state.components.length - state.visibleComponentLimit} 个）`;
    more.addEventListener("click", () => {
      state.visibleComponentLimit += 30;
      renderCards();
    });
    els.elementGrid.append(more);
  }
  updateSelectionButtons();
}

function queueThumbnail(img, component) {
  const render = () => {
    if (!img.isConnected) return;
    img.src = cropToDataUrl(component);
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(render, { timeout: 800 });
  } else {
    window.setTimeout(render, 0);
  }
}

function cropToCanvas(box, scale = 1) {
  const source = state.refinedCutoutCanvas.width ? state.refinedCutoutCanvas : els.resultCanvas;
  const ratioX = source.width / Math.max(1, els.resultCanvas.width);
  const ratioY = source.height / Math.max(1, els.resultCanvas.height);
  const sx = Math.round(box.x * ratioX);
  const sy = Math.round(box.y * ratioY);
  const sw = Math.max(1, Math.round(box.width * ratioX));
  const sh = Math.max(1, Math.round(box.height * ratioY));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    source,
    sx,
    sy,
    sw,
    sh,
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
  const ratioX = (state.refinedCutoutCanvas.width || els.resultCanvas.width) / Math.max(1, els.resultCanvas.width);
  const ratioY = (state.refinedCutoutCanvas.height || els.resultCanvas.height) / Math.max(1, els.resultCanvas.height);
  const maxExportEdge = Math.max(box.width * ratioX, box.height * ratioY);
  const scale = Math.min(1, 260 / Math.max(1, maxExportEdge));
  return cropToCanvas(box, scale).toDataURL("image/png");
}

function getExportSize(box) {
  const source = state.refinedCutoutCanvas.width ? state.refinedCutoutCanvas : els.resultCanvas;
  const ratioX = source.width / Math.max(1, els.resultCanvas.width);
  const ratioY = source.height / Math.max(1, els.resultCanvas.height);
  const scale = getExportScale();
  return {
    scale,
    width: Math.round(box.width * ratioX * scale),
    height: Math.round(box.height * ratioY * scale),
  };
}

async function downloadComponent(component) {
  const { ext } = getExportSettings();
  const fileName = `${state.imageName}-element-${String(component.id).padStart(2, "0")}.${ext}`;
  const blob = await canvasToExportBlob(cropToCanvas(component, getExportScale()));
  downloadBlob(blob, fileName);
}

async function downloadCutout() {
  if (!state.cutoutBlob) return;
  const { ext } = getExportSettings();
  const blob = await canvasToExportBlob(scaleCanvasForExport(state.refinedCutoutCanvas, getExportScale()));
  downloadBlob(blob, `${state.imageName}-cutout.${ext}`);
}

async function copyCutout() {
  if (!state.cutoutBlob || !state.refinedCutoutCanvas.width) return;
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    setStatus("当前浏览器不支持直接复制图片，可先下载 PNG。", "复制不可用");
    return;
  }

  try {
    els.copyCutoutBtn.disabled = true;
    els.copyCutoutBtn.textContent = "复制中...";
    const blob = await canvasToPngBlob(state.refinedCutoutCanvas);
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": blob,
      }),
    ]);
    els.copyCutoutBtn.textContent = "已复制";
    setSuccess("已复制透明 PNG 到剪贴板，可直接粘贴到设计工具或文档。");
    window.setTimeout(() => {
      updateDownloadLabels();
      els.copyCutoutBtn.disabled = !state.cutoutBlob;
    }, 1200);
  } catch (error) {
    console.error(error);
    els.copyCutoutBtn.disabled = false;
    updateDownloadLabels();
    setStatus("复制失败：浏览器可能需要在安全上下文或用户授权后才能写入图片剪贴板。", "复制失败");
  }
}

async function downloadZip() {
  if (!state.components.length) return;
  setBusy(true, "正在打包 ZIP...");
  const zip = new JSZip();
  const { ext } = getExportSettings();

  for (const component of state.components) {
    const blob = await canvasToExportBlob(cropToCanvas(component, getExportScale()));
    const fileName = `${state.imageName}-element-${String(component.id).padStart(2, "0")}.${ext}`;
    zip.file(fileName, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, `${state.imageName}-elements.zip`);
  setBusy(false);
  setStatus(`已打包 ${state.components.length} 个元素。`);
}

async function downloadSelectedZip() {
  const selected = state.components.filter((component) => state.selectedComponentIds.has(component.id));
  if (!selected.length) return;
  setBusy(true, "正在打包选中元素 ZIP...");
  const zip = new JSZip();
  const { ext } = getExportSettings();

  for (const component of selected) {
    const blob = await canvasToExportBlob(cropToCanvas(component, getExportScale()));
    const fileName = `${state.imageName}-element-${String(component.id).padStart(2, "0")}.${ext}`;
    zip.file(fileName, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, `${state.imageName}-selected-elements.zip`);
  setBusy(false);
  setStatus(`已打包 ${selected.length} 个选中元素。`);
}

function selectAllComponents() {
  state.selectedComponentIds = new Set(state.components.map((component) => component.id));
  renderCards();
  drawOverlay();
}

function clearComponentSelection() {
  state.selectedComponentIds.clear();
  renderCards();
  drawOverlay();
}

function renumberComponents(components) {
  return sortComponentsReadingOrder(components)
    .map((component, index) => ({ ...component, id: index + 1 }));
}

function persistComponents(message = `${state.components.length} 个元素`) {
  state.components = renumberComponents(state.components);
  state.selectedComponentIds = new Set([...state.selectedComponentIds].filter((id) => state.components.some((component) => component.id === id)));
  if (state.currentItem) {
    state.currentItem.components = [...state.components];
    state.currentItem.message = message;
  }
  els.downloadZipBtn.disabled = state.components.length === 0 || state.components.length > 50;
  renderQueue();
}

function splitSelectedComponent() {
  const selected = [...state.selectedComponentIds];
  if (selected.length !== 1) return;
  splitComponentById(selected[0]);
}

function splitComponentById(componentId) {
  const component = state.components.find((candidate) => candidate.id === componentId);
  if (!component || !state.refinedCutoutCanvas.width) return;
  const detection = createDetectionImageData(state.refinedCutoutCanvas, 1024);
  const scaleX = detection.width / Math.max(1, els.resultCanvas.width);
  const scaleY = detection.height / Math.max(1, els.resultCanvas.height);
  const lowComponent = {
    ...component,
    x: component.x * scaleX,
    y: component.y * scaleY,
    width: component.width * scaleX,
    height: component.height * scaleY,
  };
  const paddingLow = Math.max(1, Math.round(Number(els.padding.value) * detection.scale));
  const childrenLow = splitComponentBox(lowComponent, detection.imageData, paddingLow, "strong");
  const children = mapComponentsToCanvas(childrenLow, detection, els.resultCanvas.width, els.resultCanvas.height, Number(els.padding.value));
  if (children.length < 2) {
    setStatus("未找到明确分割缝隙，可尝试手动框选。", "拆分失败");
    return;
  }

  const rest = state.components.filter((candidate) => candidate.id !== componentId);
  state.components = renumberComponents([...rest, ...children]);
  state.selectedComponentIds = new Set(
    state.components
      .filter((component) => children.some((child) => sameBox(component, child)))
      .map((component) => component.id),
  );
  persistComponents(`已拆分为 ${state.components.length} 个元素`);
  renderCards();
  drawOverlay();
  setSuccess(`已将元素 ${String(componentId).padStart(2, "0")} 拆成 ${children.length} 个子元素。`);
}

function mergeSelectedComponents() {
  const selected = state.components.filter((component) => state.selectedComponentIds.has(component.id));
  if (selected.length < 2) return;
  const merged = selected.reduce((target, component) => {
    mergeBoxInto(target, component);
    return target;
  }, { ...selected[0] });
  const rest = state.components.filter((component) => !state.selectedComponentIds.has(component.id));
  state.components = renumberComponents([...rest, merged]);
  const mergedId = state.components.find((component) => component.x === merged.x && component.y === merged.y && component.width === merged.width && component.height === merged.height)?.id;
  state.selectedComponentIds = mergedId ? new Set([mergedId]) : new Set();
  persistComponents(`已合并为 ${state.components.length} 个元素`);
  renderCards();
  drawOverlay();
  setSuccess(`已合并 ${selected.length} 个元素。`);
}

function sameBox(a, b) {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

function removeComponent(componentId) {
  state.components = state.components.filter((component) => component.id !== componentId);
  state.selectedComponentIds.delete(componentId);
  persistComponents(`${state.components.length} 个元素`);
  renderCards();
  drawOverlay();
  updateSelectionButtons();
  els.downloadZipBtn.disabled = state.components.length === 0 || state.components.length > 50;
  setStatus(state.components.length ? `已删除误识别元素，剩余 ${state.components.length} 个。` : "元素已清空，可重新识别或调整参数。");
}

function updateSelectionButtons() {
  const hasComponents = state.components.length > 0;
  const tooMany = state.components.length > 50;
  const selectedCount = state.selectedComponentIds.size;
  els.selectAllBtn.disabled = !hasComponents;
  els.clearSelectionBtn.disabled = !hasComponents || selectedCount === 0;
  els.splitSelectedBtn.disabled = state.processing || tooMany || selectedCount !== 1;
  els.mergeSelectedBtn.disabled = state.processing || tooMany || selectedCount < 2;
  els.downloadSelectedZipBtn.disabled = state.processing || tooMany || selectedCount === 0;
  els.downloadSelectedZipBtn.textContent = tooMany
    ? "碎片过多，暂不打包"
    : selectedCount
      ? `下载选中 ${selectedCount} 个 ZIP`
      : "下载选中元素 ZIP";
}

async function downloadBatchZip() {
  if (!state.queue.length || state.batchRunning) return;
  state.batchRunning = true;
  const report = {
    startedAt: new Date().toISOString(),
    mode: els.detectMode.value,
    splitStrength: els.splitStrength.value,
    format: getExportSettings().ext,
    scale: getExportScale(),
    total: state.queue.length,
    rows: [],
    exportedImages: 0,
    exportedElements: 0,
    status: "running",
  };
  state.lastBatchReport = report;
  window.__cutoutQaLastRun = report;
  updateBatchButton();

  try {
    const total = state.queue.length;
    for (let index = 0; index < state.queue.length; index += 1) {
      const item = state.queue[index];
      const row = {
        index: index + 1,
        name: item.originalName,
        isQa: Boolean(item.isQa),
        startedAt: new Date().toISOString(),
        reused: item.status === "done" && Boolean(item.cutoutBlob),
        status: "processing",
        elements: 0,
        sourceSize: item.originalWidth && item.originalHeight ? `${item.originalWidth}x${item.originalHeight}` : "",
        resultSize: item.resultWidth && item.resultHeight ? `${item.resultWidth}x${item.resultHeight}` : "",
        error: "",
      };
      report.rows.push(row);
      if (item.status === "done" && item.cutoutBlob) {
        row.status = "done";
        row.elements = item.components?.length || 0;
        row.resultSize = item.resultWidth && item.resultHeight ? `${item.resultWidth}x${item.resultHeight}` : "";
        continue;
      }
      setProgress(Math.round((index / total) * 100), `${index + 1} / ${total}`);
      await loadItem(item);
      await processImage({ message: `批量处理中：${index + 1}/${total} ${item.originalName}` });
      row.status = item.status || "unknown";
      row.elements = item.components?.length || 0;
      row.sourceSize = item.originalWidth && item.originalHeight ? `${item.originalWidth}x${item.originalHeight}` : "";
      row.resultSize = item.resultWidth && item.resultHeight ? `${item.resultWidth}x${item.resultHeight}` : "";
      row.error = item.error?.message || "";
    }
    setProgress(100, `${total} / ${total}`);

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
      report.status = "failed";
      report.finishedAt = new Date().toISOString();
      setError("没有可打包的处理结果。");
      return;
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, `cutout-batch-${formatDateStamp()}.zip`);
    report.exportedImages = exportedImages;
    report.exportedElements = exportedElements;
    report.status = "done";
    report.finishedAt = new Date().toISOString();
    setStatus(`批量 ZIP 已生成：${exportedImages} 张图片，${exportedElements} 个元素。`);
  } catch (error) {
    report.status = "failed";
    report.finishedAt = new Date().toISOString();
    report.error = error?.message || String(error);
    console.error(error);
    setError(`批量处理失败：${report.error}`);
  } finally {
    state.batchRunning = false;
    setBusy(false);
    updateBatchButton();
    renderQueue();
  }
}

async function cropItemComponentToExportBlob(item, box) {
  if (item === state.currentItem) return canvasToExportBlob(cropToCanvas(box, getExportScale()));
  const bitmap = await createImageBitmap(item.filteredCutoutBlob || item.cutoutBlob);
  const source = document.createElement("canvas");
  source.width = bitmap.width;
  source.height = bitmap.height;
  const sourceCtx = source.getContext("2d");
  sourceCtx.drawImage(bitmap, 0, 0, source.width, source.height);
  const ratioX = source.width / Math.max(1, item.previewWidth || source.width);
  const ratioY = source.height / Math.max(1, item.previewHeight || source.height);
  const sx = Math.round(box.x * ratioX);
  const sy = Math.round(box.y * ratioY);
  const sw = Math.max(1, Math.round(box.width * ratioX));
  const sh = Math.max(1, Math.round(box.height * ratioY));
  const scale = getExportScale();

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
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
  updateManualPreview();
  drawOverlay();
  updateUiState();
}

function startSelection(event) {
  if (!state.manual || !els.resultCanvas.width) return;
  els.overlayCanvas.setPointerCapture(event.pointerId);
  const point = eventToCanvasPoint(event);
  state.dragStart = point;
  state.selection = { x: point.x, y: point.y, width: 0, height: 0 };
  updateManualPreview();
  drawOverlay();
}

function moveSelection(event) {
  if (!state.dragStart || !state.manual) return;
  const point = eventToCanvasPoint(event);
  state.selection = applyAspectLock(normalizeBox(state.dragStart, point));
  els.exportSelectionBtn.disabled = state.selection.width < 4 || state.selection.height < 4;
  updateManualPreview();
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
  const blob = await canvasToExportBlob(cropToCanvas(box, getExportScale()));
  downloadBlob(blob, `${state.imageName}-manual-slice.${ext}`);
}

function updateManualPreview() {
  const scale = getExportScale();
  if (!state.selection || state.selection.width < 4 || state.selection.height < 4) {
    els.manualReadout.textContent = "当前框选：未选择";
    els.manualPreviewCanvas.width = 0;
    els.manualPreviewCanvas.height = 0;
    return;
  }
  const box = {
    ...state.selection,
    x: Math.round(state.selection.x),
    y: Math.round(state.selection.y),
    width: Math.round(state.selection.width),
    height: Math.round(state.selection.height),
  };
  const preview = cropToCanvas(box, 1);
  const maxEdge = 180;
  const previewScale = Math.min(1, maxEdge / Math.max(preview.width, preview.height));
  els.manualPreviewCanvas.width = Math.max(1, Math.round(preview.width * previewScale));
  els.manualPreviewCanvas.height = Math.max(1, Math.round(preview.height * previewScale));
  const ctx = els.manualPreviewCanvas.getContext("2d");
  ctx.clearRect(0, 0, els.manualPreviewCanvas.width, els.manualPreviewCanvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(preview, 0, 0, els.manualPreviewCanvas.width, els.manualPreviewCanvas.height);
  const size = getExportSize(box);
  els.manualReadout.textContent = `当前框选：${box.width} x ${box.height}；${scale}x 导出：${size.width} x ${size.height}`;
}

function applyAspectLock(box) {
  const value = els.aspectLock.value;
  if (value === "free") return box;
  const [w, h] = value.split(":").map(Number);
  if (!w || !h) return box;
  const ratio = w / h;
  const width = box.width;
  const height = Math.round(width / ratio);
  return {
    ...box,
    height,
  };
}

function handleSelectionKeys(event) {
  if (!state.manual || !state.selection) return;
  const step = event.shiftKey ? 10 : 1;
  const keys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape"]);
  if (!keys.has(event.key)) return;
  event.preventDefault();
  if (event.key === "Escape") {
    state.selection = null;
    els.exportSelectionBtn.disabled = true;
  } else if (event.key === "ArrowUp") state.selection.y = Math.max(0, state.selection.y - step);
  else if (event.key === "ArrowDown") state.selection.y = Math.min(els.overlayCanvas.height - state.selection.height, state.selection.y + step);
  else if (event.key === "ArrowLeft") state.selection.x = Math.max(0, state.selection.x - step);
  else if (event.key === "ArrowRight") state.selection.x = Math.min(els.overlayCanvas.width - state.selection.width, state.selection.x + step);
  updateManualPreview();
  drawOverlay();
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

function drawOverlay(highlightId = null) {
  sizeOverlay();
  overlayCtx.clearRect(0, 0, els.overlayCanvas.width, els.overlayCanvas.height);

  overlayCtx.lineWidth = Math.max(2, Math.round(els.overlayCanvas.width / 600));
  overlayCtx.font = `${Math.max(14, Math.round(els.overlayCanvas.width / 60))}px sans-serif`;
  overlayCtx.textBaseline = "top";

  const shouldShowBoxes = els.showBoxes.checked || highlightId;
  if (shouldShowBoxes) for (const component of state.components) {
    const isDimmed = highlightId && component.id !== highlightId;
    overlayCtx.strokeStyle = isDimmed ? "rgba(52, 199, 134, 0.18)" : "#34C786";
    overlayCtx.fillStyle = isDimmed ? "rgba(52, 199, 134, 0)" : "rgba(52, 199, 134, 0.035)";
    if (!isDimmed) overlayCtx.fillRect(component.x, component.y, component.width, component.height);
    overlayCtx.strokeRect(component.x, component.y, component.width, component.height);
    if (!isDimmed) {
      overlayCtx.fillStyle = "#12945a";
      overlayCtx.fillText(`#${component.id}`, component.x + 6, component.y + 6);
    }
  }

  if (state.selection) {
    overlayCtx.strokeStyle = "#111827";
    overlayCtx.fillStyle = "rgba(17, 24, 39, 0.12)";
    overlayCtx.fillRect(state.selection.x, state.selection.y, state.selection.width, state.selection.height);
    overlayCtx.strokeRect(state.selection.x, state.selection.y, state.selection.width, state.selection.height);
  }
}

function sizeOverlay() {
  els.overlayCanvas.width = els.resultCanvas.width || els.sourceCanvas.width || 1;
  els.overlayCanvas.height = els.resultCanvas.height || els.sourceCanvas.height || 1;
}

function drawBitmapToCanvas(bitmap, canvas, ctx, maxEdge = 1800) {
  const scale = Number.isFinite(maxEdge) ? Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height)) : 1;
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
}

function drawCanvasToPreview(sourceCanvas, canvas, ctx) {
  const maxEdge = 1800;
  const scale = Math.min(1, maxEdge / Math.max(sourceCanvas.width, sourceCanvas.height));
  canvas.width = Math.max(1, Math.round(sourceCanvas.width * scale));
  canvas.height = Math.max(1, Math.round(sourceCanvas.height * scale));
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
}

function setStatus(message, title = "状态") {
  els.statusTitle.textContent = title;
  els.statusCard.className = "status-card";
  els.status.className = "status";
  els.status.textContent = message;
}

function setBusy(isBusy, message) {
  document.body.style.cursor = isBusy ? "progress" : "";
  state.processing = isBusy;
  els.cancelBtn.hidden = !isBusy;
  if (message) {
    els.statusTitle.textContent = isBusy ? "正在处理" : "状态";
    els.statusCard.className = `status-card${isBusy ? " busy" : ""}`;
    els.status.className = "status busy";
    els.status.textContent = message;
  }
  els.processBtn.textContent = isBusy ? "处理中..." : "开始自动抠图";
  els.processBtn.disabled = isBusy || !state.file;
  els.rescanBtn.disabled = isBusy || !state.cutoutBlob;
  els.copyCutoutBtn.disabled = isBusy || !state.cutoutBlob;
  els.downloadCutoutBtn.disabled = isBusy || !state.cutoutBlob;
  els.downloadZipBtn.disabled = isBusy || !state.components.length;
  updateBatchButton();
  updateSelectionButtons();
  updateUiState();
}

function setError(message) {
  els.statusTitle.textContent = "出现问题";
  els.statusCard.className = "status-card error";
  els.status.className = "status error";
  els.status.textContent = message;
}

function setSuccess(message) {
  els.statusTitle.textContent = "处理完成";
  els.statusCard.className = "status-card success";
  els.status.className = "status success";
  els.status.textContent = message;
}

function setProgress(percent, label = `${percent}%`) {
  els.progressWrap.hidden = false;
  els.progressFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  els.progressText.value = label;
}

function hideProgress() {
  els.progressWrap.hidden = true;
  els.progressFill.style.width = "0%";
  els.progressText.value = "0%";
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
  return canvasToPngBlob(canvas);
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG 导出失败"));
    }, "image/png");
  });
}

async function blobToExportBlob(blob, scale = getExportScale()) {
  const { ext } = getExportSettings();
  if (ext === "png" && scale === 1) return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvasToExportBlob(canvas);
}

function scaleCanvasForExport(sourceCanvas, scale = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceCanvas.width * scale));
  canvas.height = Math.max(1, Math.round(sourceCanvas.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToExportBlob(canvas) {
  const { ext, mime, label } = getExportSettings();
  if (ext === "svg") {
    return Promise.resolve(canvasToVectorSvgBlob(canvas));
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`${label} 导出失败`));
      },
      mime,
      ext === "webp" ? 0.98 : 0.95,
    );
  });
}

function canvasToVectorSvgBlob(canvas) {
  const source = prepareVectorCanvas(canvas);
  const ctx = source.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, source.width, source.height);
  const alphaThreshold = Math.max(8, Number(els.cleanup.value) || 24);
  const groups = imageDataToVectorRegions(imageData, alphaThreshold);
  const paths = [...groups.entries()]
    .sort((a, b) => b[1].area - a[1].area)
    .map(([key, group]) => {
      const [fill, opacity] = key.split("|");
      const opacityAttr = opacity === "1" ? "" : ` fill-opacity="${opacity}"`;
      return `<path fill="${fill}"${opacityAttr} fill-rule="evenodd" d="${group.path}"/>`;
    })
    .join("");
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${source.width} ${source.height}" shape-rendering="geometricPrecision">`,
    `<title>Vectorized cutout</title>`,
    `<desc>Generated as editable SVG color paths. Best for flat illustrations, logos, icons, and stickers.</desc>`,
    paths || "<path/>",
    "</svg>",
  ].join("");
  return new Blob([svg], { type: "image/svg+xml" });
}

function prepareVectorCanvas(canvas) {
  const maxVectorEdge = 900;
  const scale = Math.min(1, maxVectorEdge / Math.max(canvas.width, canvas.height));
  if (scale >= 1) return canvas;
  const vectorCanvas = document.createElement("canvas");
  vectorCanvas.width = Math.max(1, Math.round(canvas.width * scale));
  vectorCanvas.height = Math.max(1, Math.round(canvas.height * scale));
  const ctx = vectorCanvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, vectorCanvas.width, vectorCanvas.height);
  return vectorCanvas;
}

function imageDataToVectorRegions(imageData, alphaThreshold) {
  const { width, height, data } = imageData;
  const groups = new Map();
  const colorStep = 32;
  const keys = new Array(width * height);
  const visited = new Uint8Array(width * height);
  const stack = [];
  const minRegionArea = Math.max(5, Math.round((width * height) * 0.000008));

  for (let index = 0; index < keys.length; index += 1) {
    const offset = index * 4;
    if (data[offset + 3] <= alphaThreshold) continue;
    keys[index] = vectorColorKey(data[offset], data[offset + 1], data[offset + 2], data[offset + 3], colorStep);
  }

  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (!key || visited[index]) continue;

    const pixels = [];
    visited[index] = 1;
    stack.push(index);

    while (stack.length) {
      const current = stack.pop();
      pixels.push(current);
      const x = current % width;
      const y = Math.floor(current / width);
      const neighbors = [
        x > 0 ? current - 1 : -1,
        x < width - 1 ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y < height - 1 ? current + width : -1,
      ];
      for (const next of neighbors) {
        if (next < 0 || visited[next] || keys[next] !== key) continue;
        visited[next] = 1;
        stack.push(next);
      }
    }

    if (pixels.length < minRegionArea) continue;
    appendVectorRegion(groups, key, pixels, keys, width, height);
  }

  return groups;
}

function vectorColorKey(red, green, blue, alpha, step) {
  const r = quantizeChannel(red, step);
  const g = quantizeChannel(green, step);
  const b = quantizeChannel(blue, step);
  const opacity = alpha >= 248 ? "1" : (Math.round((alpha / 255) * 10) / 10).toFixed(1);
  return `${rgbToHex(r, g, b)}|${opacity}`;
}

function appendVectorRegion(groups, key, pixels, keys, width, height) {
  let group = groups.get(key);
  if (!group) {
    group = { path: "", area: 0 };
    groups.set(key, group);
  }
  const loops = traceRegionLoops(pixels, keys, key, width, height);
  const path = loops.map((loop) => loopToPath(loop)).join("");
  if (!path) return;
  group.path += path;
  group.area += pixels.length;
}

function traceRegionLoops(pixels, keys, key, width, height) {
  const edges = [];
  for (const index of pixels) {
    const x = index % width;
    const y = Math.floor(index / width);
    if (y === 0 || keys[index - width] !== key) edges.push(createVectorEdge(x, y, x + 1, y));
    if (x === width - 1 || keys[index + 1] !== key) edges.push(createVectorEdge(x + 1, y, x + 1, y + 1));
    if (y === height - 1 || keys[index + width] !== key) edges.push(createVectorEdge(x + 1, y + 1, x, y + 1));
    if (x === 0 || keys[index - 1] !== key) edges.push(createVectorEdge(x, y + 1, x, y));
  }

  const edgesByStart = new Map();
  for (const edge of edges) {
    const list = edgesByStart.get(edge.start) || [];
    list.push(edge);
    edgesByStart.set(edge.start, list);
  }

  const loops = [];
  for (const edge of edges) {
    if (edge.used) continue;
    const loop = [[edge.x1, edge.y1]];
    let current = edge;
    current.used = true;

    for (let guard = 0; guard < edges.length + 4; guard += 1) {
      loop.push([current.x2, current.y2]);
      if (current.end === edge.start) break;
      const candidates = edgesByStart.get(current.end) || [];
      const next = candidates.find((candidate) => !candidate.used);
      if (!next) break;
      next.used = true;
      current = next;
    }

    if (loop.length >= 4 && sameVectorPoint(loop[0], loop[loop.length - 1])) {
      loops.push(simplifyOrthogonalLoop(loop));
    }
  }

  return loops;
}

function createVectorEdge(x1, y1, x2, y2) {
  return {
    x1,
    y1,
    x2,
    y2,
    start: `${x1},${y1}`,
    end: `${x2},${y2}`,
    used: false,
  };
}

function simplifyOrthogonalLoop(points) {
  const closed = sameVectorPoint(points[0], points[points.length - 1]);
  const source = closed ? points.slice(0, -1) : points;
  if (source.length <= 3) return points;
  const simplified = [];
  for (let index = 0; index < source.length; index += 1) {
    const prev = source[(index - 1 + source.length) % source.length];
    const point = source[index];
    const next = source[(index + 1) % source.length];
    const collinear = (prev[0] === point[0] && point[0] === next[0]) || (prev[1] === point[1] && point[1] === next[1]);
    if (!collinear) simplified.push(point);
  }
  simplified.push(simplified[0]);
  return simplified;
}

function loopToPath(loop) {
  if (loop.length < 4) return "";
  const start = loop[0];
  let d = `M${start[0]} ${start[1]}`;
  for (let index = 1; index < loop.length - 1; index += 1) {
    const point = loop[index];
    d += `L${point[0]} ${point[1]}`;
  }
  return `${d}Z`;
}

function sameVectorPoint(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function quantizeChannel(value, step) {
  return clamp(Math.round(value / step) * step, 0, 255);
}

function rgbToHex(red, green, blue) {
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
