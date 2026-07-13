import { removeBackground } from "./vendor-imgly-background-removal.mjs";
import JSZip from "https://esm.sh/jszip@3.10.1";

const els = {
  appRoot: document.querySelector("#appRoot"),
  fileInput: document.querySelector("#fileInput"),
  heroFileInput: document.querySelector("#heroFileInput"),
  dropZone: document.querySelector("#dropZone"),
  uploadFeedback: document.querySelector("#uploadFeedback"),
  sampleBtn: document.querySelector("#sampleBtn"),
  heroSampleBtn: document.querySelector("#heroSampleBtn"),
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
  svgOptions: document.querySelector("#svgOptions"),
  svgMode: document.querySelector("#svgMode"),
  svgColors: document.querySelector("#svgColors"),
  svgSmooth: document.querySelector("#svgSmooth"),
  svgDetail: document.querySelector("#svgDetail"),
  svgSpeckle: document.querySelector("#svgSpeckle"),
  svgLineArt: document.querySelector("#svgLineArt"),
  svgColorsOut: document.querySelector("#svgColorsOut"),
  svgSmoothOut: document.querySelector("#svgSmoothOut"),
  svgDetailOut: document.querySelector("#svgDetailOut"),
  svgSpeckleOut: document.querySelector("#svgSpeckleOut"),
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
  addSelectionBtn: document.querySelector("#addSelectionBtn"),
  applySelectionBtn: document.querySelector("#applySelectionBtn"),
  status: document.querySelector("#status"),
  statusTitle: document.querySelector("#statusTitle"),
  statusCard: document.querySelector("#statusCard"),
  statusSteps: [...document.querySelectorAll("[data-status-step]")],
  statusActions: document.querySelector("#statusActions"),
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
  imageType: "unknown",
  matteWarnings: [],
  components: [],
  queue: [],
  currentItem: null,
  nextItemId: 1,
  batchRunning: false,
  lastBatchReport: null,
  lastTinyFragmentDebug: null,
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

function getReadbackContext(canvas) {
  return canvas.getContext("2d", { willReadFrequently: true });
}

const sourceCtx = getReadbackContext(els.sourceCanvas);
const resultCtx = getReadbackContext(els.resultCanvas);
const overlayCtx = els.overlayCanvas.getContext("2d");
const DEFAULT_AI_TIMEOUT_MS = 180000;

const ICON_PATHS = {
  add: ["M12 5v14", "M5 12h14"],
  adjust: ["M4 8h10", "M18 8h2", "M8 16h12", "M4 16h2", "M14 6v4", "M6 14v4"],
  box: ["M4 4h16v16H4z", "M8 8h8v8H8z"],
  check: ["M5 12l4 4L19 6"],
  copy: ["M8 8h10v10H8z", "M6 14H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1"],
  download: ["M12 3v12", "M7 10l5 5 5-5", "M5 21h14"],
  merge: ["M8 7h8", "M8 17h8", "M4 12h16", "M8 7l-4 5 4 5", "M16 7l4 5-4 5"],
  play: ["M8 5v14l11-7z"],
  sample: ["M5 5h14v14H5z", "M8 15l3-4 2 3 2-2 3 3"],
  scissors: ["M4 7l16 10", "M4 17L20 7", "M5 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4", "M5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4"],
  trash: ["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 13h10l1-13", "M9 7V4h6v3"],
  upload: ["M12 21V9", "M7 14l5-5 5 5", "M5 4h14"],
  zip: ["M6 4h9l3 3v13H6z", "M14 4v4h4", "M9 8h2", "M9 12h2", "M9 16h2"],
};

const BUTTON_ICONS = {
  sampleBtn: "sample",
  qaSampleBtn: "sample",
  heroSampleBtn: "sample",
  processBtn: "play",
  rescanBtn: "sample",
  copyCutoutBtn: "copy",
  downloadCutoutBtn: "download",
  downloadZipBtn: "zip",
  downloadSelectedZipBtn: "zip",
  downloadBatchZipBtn: "zip",
  selectAllBtn: "check",
  clearSelectionBtn: "check",
  splitSelectedBtn: "scissors",
  mergeSelectedBtn: "merge",
  manualModeBtn: "box",
  exportSelectionBtn: "download",
  addSelectionBtn: "add",
  applySelectionBtn: "adjust",
  mobilePrimaryBtn: "play",
};

syncOutputs();
bindEvents();
updateDownloadLabels();
syncFormatSegments();
setPreviewBackground("checker");
setPreviewMode(state.previewMode);
decorateStaticIcons();
updateUiState();
renderQueue();

function updateUiState() {
  const hasImage = Boolean(state.currentItem);
  const hasResult = Boolean(state.cutoutBlob);
  if (!state.processing && hasResult) updateStatusStage("done");
  else if (!state.processing) updateStatusStage(hasImage ? "load" : "empty");
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
  updateDisabledHints();
}

function updateStatusStage(stage) {
  const order = ["load", "matte", "assets"];
  const activeStage = stage === "empty" ? "load" : stage === "done" ? "assets" : stage;
  const activeIndex = Math.max(0, order.indexOf(activeStage));

  for (const step of els.statusSteps) {
    const stepIndex = order.indexOf(step.dataset.statusStep);
    const isDone = stage === "done" || stepIndex < activeIndex;
    step.classList.toggle("done", isDone);
    step.classList.toggle("active", stepIndex === activeIndex && !isDone);
  }

  if (els.statusActions) {
    els.statusActions.hidden = stage !== "done";
  }
}

function scrollWorkbenchTarget(target) {
  const selector = target === "assets" ? ".elements" : ".export-panel";
  document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setPreviewMode(mode) {
  state.previewMode = mode === "result" ? "result" : "split";
  els.previewArea.classList.toggle("preview-result", state.previewMode === "result");
  els.previewArea.classList.toggle("preview-split", state.previewMode !== "result");
  els.previewArea.setAttribute("aria-labelledby", state.previewMode === "result" ? "previewTabResult" : "previewTabSplit");
  for (const toggle of els.previewToggles) {
    const isActive = toggle.dataset.preview === state.previewMode;
    toggle.classList.toggle("active", isActive);
    toggle.setAttribute("aria-selected", String(isActive));
    toggle.tabIndex = isActive ? 0 : -1;
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
    const isActive = toggle.dataset.bg === state.previewBackground;
    toggle.classList.toggle("active", isActive);
    toggle.setAttribute("aria-pressed", String(isActive));
  }
}

function syncFormatSegments() {
  const { ext } = getExportSettings();
  for (const segment of els.formatSegments) {
    const isActive = segment.dataset.format === ext;
    segment.classList.toggle("active", isActive);
    segment.setAttribute("aria-pressed", String(isActive));
  }
}

function moveChoiceByKey(event, buttons, activate, valueAttr) {
  const keys = ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "Home", "End"];
  if (!keys.includes(event.key)) return;
  const enabledButtons = buttons.filter((button) => !button.disabled);
  if (!enabledButtons.length) return;

  event.preventDefault();
  const currentIndex = Math.max(0, enabledButtons.indexOf(event.currentTarget));
  let nextIndex = currentIndex;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % enabledButtons.length;
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + enabledButtons.length) % enabledButtons.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = enabledButtons.length - 1;

  const nextButton = enabledButtons[nextIndex];
  activate(nextButton.dataset[valueAttr]);
  nextButton.focus();
}

function updateDisabledHints() {
  for (const button of document.querySelectorAll("button[data-disabled-reason]")) {
    const reason = button.dataset.disabledReason || "";
    if (button.disabled && reason) {
      button.title = reason;
      button.setAttribute("aria-label", `${button.textContent.trim()}，${reason}`);
    } else {
      button.removeAttribute("title");
      button.removeAttribute("aria-label");
    }
  }
}

function createIcon(name) {
  const paths = ICON_PATHS[name];
  if (!paths) return null;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  for (const pathData of paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    svg.append(path);
  }
  return svg;
}

function decorateIconButton(button, iconName) {
  if (!button || button.querySelector(":scope > .icon")) return;
  const icon = createIcon(iconName);
  if (icon) button.prepend(icon);
}

function decorateStaticIcons() {
  for (const [id, iconName] of Object.entries(BUTTON_ICONS)) {
    decorateIconButton(document.getElementById(id), iconName);
  }
  for (const label of document.querySelectorAll(".primary")) {
    if (label.querySelector("input[type='file']")) decorateIconButton(label, "upload");
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

  els.heroFileInput?.addEventListener("change", () => {
    addFiles([...els.heroFileInput.files], "选择");
    els.heroFileInput.value = "";
  });

  els.sampleBtn.addEventListener("click", loadSample);
  els.heroSampleBtn?.addEventListener("click", loadSample);
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
  els.addSelectionBtn.addEventListener("click", addSelectionAsComponent);
  els.applySelectionBtn.addEventListener("click", applySelectionToSelectedComponent);
  els.selectAllBtn.addEventListener("click", selectAllComponents);
  els.clearSelectionBtn.addEventListener("click", clearComponentSelection);
  els.splitSelectedBtn.addEventListener("click", splitSelectedComponent);
  els.mergeSelectedBtn.addEventListener("click", mergeSelectedComponents);
  els.mobilePrimaryBtn.addEventListener("click", handleMobilePrimary);
  els.statusActions?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-status-action]")?.dataset.statusAction;
    if (action) scrollWorkbenchTarget(action);
  });
  els.formatSelect.addEventListener("change", () => {
    syncOutputs();
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
  for (const input of [els.svgMode, els.svgColors, els.svgSmooth, els.svgDetail, els.svgSpeckle, els.svgLineArt]) {
    input.addEventListener("input", () => {
      syncOutputs();
      if (getExportSettings().ext === "svg") renderCards();
    });
    input.addEventListener("change", () => {
      syncOutputs();
      if (getExportSettings().ext === "svg") renderCards();
    });
  }
  for (const segment of els.formatSegments) {
    segment.addEventListener("click", () => {
      els.formatSelect.value = segment.dataset.format;
      els.formatSelect.dispatchEvent(new Event("change"));
    });
    segment.addEventListener("keydown", (event) => {
      moveChoiceByKey(event, els.formatSegments, (format) => {
        els.formatSelect.value = format;
        els.formatSelect.dispatchEvent(new Event("change"));
      }, "format");
    });
  }
  for (const toggle of els.previewToggles) {
    toggle.addEventListener("click", () => setPreviewMode(toggle.dataset.preview));
    toggle.addEventListener("keydown", (event) => {
      moveChoiceByKey(event, els.previewToggles, setPreviewMode, "preview");
    });
  }
  for (const toggle of els.backgroundToggles) {
    toggle.addEventListener("click", () => setPreviewBackground(toggle.dataset.bg));
    toggle.addEventListener("keydown", (event) => {
      moveChoiceByKey(event, els.backgroundToggles, setPreviewBackground, "bg");
    });
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
    const qaMeta = options.qaMetaByName?.get?.(file.name) || null;
    state.objectUrls.push(previewUrl);
    return {
      id: state.nextItemId++,
      file,
      name: cleanName(file.name || `${source}-image-${state.nextItemId}`),
      originalName: file.name || `${source}图片`,
      previewUrl,
      isQa: Boolean(options.isQa),
      qaId: qaMeta?.id || "",
      qaScenario: qaMeta?.scenario || "",
      qaPriority: qaMeta?.priority || "",
      qaNeedsRealPhoto: Boolean(qaMeta?.needsRealPhoto),
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
  els.svgColorsOut.value = els.svgMode.value === "auto" ? "自动" : els.svgColors.value;
  els.svgSmoothOut.value = els.svgMode.value === "auto" ? "自动" : els.svgSmooth.value;
  els.svgDetailOut.value = els.svgMode.value === "auto" ? "自动" : els.svgDetail.value;
  els.svgSpeckleOut.value = els.svgMode.value === "auto" ? "自动" : els.svgSpeckle.value;
  els.svgOptions.hidden = getExportSettings().ext !== "svg";
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
  const imageType = state.currentItem?.imageType || state.imageType || "unknown";
  const preset = getAlgorithmPreset(imageType);
  const sourceBackground = state.currentItem?.fastCutoutBackground
    ? { kind: state.currentItem.fastCutoutBackground, color: [0, 0, 0], foreground: null }
    : estimateSourceBackgroundKind(state.sourceOriginalCanvas);
  const darkCleanup = shouldEnableDarkBackgroundMatteCleanup(imageType, sourceBackground);
  const base = {
    edgeSmooth: Number(els.edgeSmooth.value),
    feather: Number(els.feather.value),
    cleanup: Number(els.cleanup.value),
    alphaBoost: els.alphaBoost.value,
    edgeOffset: Number(els.edgeOffset.value),
    fidelity: els.alphaBoost.value === "soft" ? "preserve" : els.alphaBoost.value === "clean" ? "clean" : "balanced",
    preset,
    sourceBackgroundKind: darkCleanup ? sourceBackground?.kind || "unknown" : "unknown",
    sourceBackgroundColor: sourceBackground?.color || [0, 0, 0],
  };
  return buildMatteProfile(base, imageType);
}

function estimateSourceBackgroundKind(sourceCanvas) {
  if (!sourceCanvas?.width || !sourceCanvas?.height) return null;
  try {
    const ctx = sourceCanvas.getContext("2d", { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const background = estimateSolidEdgeBackground(imageData);
    if (!background || background.coverage < 0.42 || background.variance > 48) return null;
    let foreground = null;
    if (background.metrics.lightness < 58 && background.metrics.saturation < 0.24) {
      const mask = floodBackgroundMask(imageData, background.color, 82);
      foreground = measureSolidBackgroundForeground(imageData, mask);
    }
    if (background.metrics.lightness < 58 && background.metrics.saturation < 0.24) {
      return { kind: "dark", color: background.color, foreground };
    }
    if (background.metrics.lightness > 214 && background.metrics.saturation < 0.24) {
      return { kind: "light", color: background.color };
    }
  } catch {}
  return null;
}

function shouldEnableDarkBackgroundMatteCleanup(imageType, sourceBackground) {
  if (sourceBackground?.kind !== "dark") return false;
  const type = normalizeImageType(imageType);
  return type === "sticker"
    || type === "line-art"
    || (sourceBackground.foreground?.saturatedRatio || 0) > 0.12;
}

function getAlgorithmPreset(imageType = "unknown") {
  const mode = els.detectMode?.value || "subject";
  const type = normalizeImageType(imageType);
  if (mode === "split" && (type === "sticker" || type === "illustration" || type === "line-art")) return "multiSticker";
  if (type === "transparentMaterial") return "transparentMaterial";
  if (type === "product") return "product";
  if (type === "photo") return "portraitHair";
  if (type === "line-art") return "logoIcon";
  if (type === "sticker") return "sticker";
  if (type === "illustration") return "illustration";
  return "balanced";
}

function getPresetConfig(preset = "balanced") {
  const presets = {
    product: {
      matte: { cleanupBoost: 1.15, smoothLimit: 3, preserveLight: false, preserveLine: false },
      detection: { minAreaFactor: 1.05, splitStrength: "conservative", largeBoxRiskRatio: 0.42 },
      svg: { colorStep: 72, maxEdge: 420, minRegionRatio: 0.00022, simplify: 3.35, smoothPasses: 1, mergeTinyRatio: 0.00046, alphaThreshold: 72, relaxGrid: true },
    },
    portraitHair: {
      matte: { cleanupBoost: 0.9, smoothLimit: 2, preserveLight: true, preserveLine: false },
      detection: { minAreaFactor: 0.9, splitStrength: "standard", largeBoxRiskRatio: 0.5 },
      svg: { colorStep: 96, maxEdge: 280, minRegionRatio: 0.00062, simplify: 4.2, smoothPasses: 1, mergeTinyRatio: 0.0011, alphaThreshold: 96 },
    },
    illustration: {
      matte: { cleanupBoost: 0.72, smoothLimit: 2, preserveLight: true, preserveLine: true },
      detection: { minAreaFactor: 0.72, splitStrength: "standard", largeBoxRiskRatio: 0.34 },
      svg: { mode: "precise", colorStep: 36, maxEdge: 820, minRegionRatio: 0.000035, simplify: 1.65, smoothPasses: 2, mergeTinyRatio: 0.00008, alphaThreshold: 28, protectLineArt: true },
    },
    sticker: {
      matte: { cleanupBoost: 0.68, smoothLimit: 2, preserveLight: true, preserveLine: true },
      detection: { minAreaFactor: 0.62, splitStrength: "standard", largeBoxRiskRatio: 0.32 },
      svg: { mode: "precise", colorStep: 36, maxEdge: 820, minRegionRatio: 0.000035, simplify: 1.65, smoothPasses: 2, mergeTinyRatio: 0.00008, alphaThreshold: 28, protectLineArt: true },
    },
    multiSticker: {
      matte: { cleanupBoost: 0.66, smoothLimit: 2, preserveLight: true, preserveLine: true },
      detection: { minAreaFactor: 0.5, splitStrength: "strong", largeBoxRiskRatio: 0.28 },
      svg: { mode: "precise", colorStep: 60, maxEdge: 560, minRegionRatio: 0.00014, simplify: 2.85, smoothPasses: 2, mergeTinyRatio: 0.00032, alphaThreshold: 38, protectLineArt: true },
    },
    logoIcon: {
      matte: { cleanupBoost: 0.62, smoothLimit: 1, preserveLight: true, preserveLine: true },
      detection: { minAreaFactor: 0.75, splitStrength: "standard", largeBoxRiskRatio: 0.38 },
      svg: { mode: "precise", colorStep: 28, maxEdge: 900, minRegionRatio: 0.000028, simplify: 1.25, smoothPasses: 2, mergeTinyRatio: 0.00006, alphaThreshold: 24, protectLineArt: true },
    },
    transparentMaterial: {
      matte: { cleanupBoost: 0.55, smoothLimit: 3, preserveLight: true, preserveLine: false },
      detection: { minAreaFactor: 0.85, splitStrength: "conservative", largeBoxRiskRatio: 0.45 },
      svg: { colorStep: 80, maxEdge: 360, minRegionRatio: 0.00042, simplify: 3.6, smoothPasses: 1, mergeTinyRatio: 0.00075, alphaThreshold: 64 },
    },
    balanced: {
      matte: { cleanupBoost: 1, smoothLimit: 3, preserveLight: true, preserveLine: false },
      detection: { minAreaFactor: 1, splitStrength: "standard", largeBoxRiskRatio: 0.36 },
      svg: { colorStep: 50, maxEdge: 640, minRegionRatio: 0.00006, simplify: 2.35, smoothPasses: 1, mergeTinyRatio: 0.00013, alphaThreshold: 48 },
    },
  };
  return presets[preset] || presets.balanced;
}

function buildMatteProfile(base, imageType = "unknown") {
  const type = normalizeImageType(imageType);
  const presetConfig = getPresetConfig(base.preset);
  const profile = {
    ...base,
    imageType: type,
    cleanup: Number(base.cleanup) || 24,
    edgeSmooth: Number(base.edgeSmooth) || 0,
    feather: Number(base.feather) || 0,
    edgeOffset: Number(base.edgeOffset) || 0,
    fidelity: base.fidelity || "balanced",
    residueThreshold: Math.max(6, Number(base.cleanup) || 24),
    edgeLow: Math.max(10, Math.round((Number(base.cleanup) || 24) * 0.72)),
    coreThreshold: base.alphaBoost === "clean" ? 176 : base.alphaBoost === "soft" ? 226 : 204,
    solidThreshold: base.alphaBoost === "clean" ? 178 : base.alphaBoost === "soft" ? 232 : 208,
    midBoost: base.alphaBoost === "clean" ? 1.16 : base.alphaBoost === "soft" ? 0.96 : 1.06,
    preserveLightRegions: false,
    preserveLineArt: false,
    preserveColoredDetails: false,
    darkBackgroundCleanup: base.sourceBackgroundKind === "dark",
    darkBackgroundColor: base.sourceBackgroundColor || [0, 0, 0],
    despeckleStrength: 1,
    alphaNormalizedThreshold: 120,
    coreNormalizeThreshold: 0,
    coreNeighborThreshold: 0,
  };

  profile.cleanup = Math.max(0, Math.round(profile.cleanup * presetConfig.matte.cleanupBoost));
  profile.edgeSmooth = Math.min(profile.edgeSmooth, presetConfig.matte.smoothLimit);
  profile.preserveLightRegions = presetConfig.matte.preserveLight;
  profile.preserveLineArt = presetConfig.matte.preserveLine;
  profile.preserveColoredDetails = presetConfig.matte.preserveLight;

  if (type === "illustration" || type === "line-art" || type === "sticker") {
    profile.preserveLineArt = true;
    profile.preserveLightRegions = true;
    profile.preserveColoredDetails = true;
    profile.cleanup = Math.min(profile.cleanup, profile.fidelity === "clean" ? 30 : 22);
    profile.residueThreshold = Math.max(10, Math.round(profile.cleanup * 0.78));
    profile.edgeLow = Math.max(8, Math.round(profile.cleanup * 0.55));
    profile.coreThreshold = profile.fidelity === "clean" ? 190 : profile.fidelity === "preserve" ? 238 : 220;
    profile.solidThreshold = profile.coreThreshold;
    profile.midBoost = profile.fidelity === "clean" ? 1.04 : profile.fidelity === "preserve" ? 0.9 : 0.98;
    profile.edgeSmooth = Math.min(profile.edgeSmooth, type === "line-art" ? 1 : 2);
    profile.feather = Math.min(profile.feather, 1);
    profile.despeckleStrength = 0.45;
  } else if (type === "transparentMaterial") {
    profile.cleanup = Math.max(8, Math.round(profile.cleanup * 0.62));
    profile.residueThreshold = Math.max(6, Math.round(profile.cleanup * 0.58));
    profile.edgeLow = Math.max(5, Math.round(profile.cleanup * 0.45));
    profile.coreThreshold = profile.fidelity === "clean" ? 218 : profile.fidelity === "preserve" ? 252 : 242;
    profile.solidThreshold = profile.fidelity === "clean" ? 244 : 252;
    profile.midBoost = profile.fidelity === "clean" ? 0.98 : 0.86;
    profile.preserveLightRegions = true;
    profile.despeckleStrength = 0.35;
    profile.alphaNormalizedThreshold = 256;
    profile.coreNormalizeThreshold = 0;
    profile.coreNeighborThreshold = 255;
  } else if (type === "product") {
    profile.cleanup = Math.max(profile.cleanup, profile.fidelity === "preserve" ? 20 : 28);
    profile.residueThreshold = profile.cleanup;
    profile.coreThreshold = profile.fidelity === "clean" ? 166 : 198;
    profile.midBoost = profile.fidelity === "clean" ? 1.2 : 1.08;
    profile.despeckleStrength = 1.15;
    profile.alphaNormalizedThreshold = profile.fidelity === "preserve" ? 108 : 96;
    profile.coreNormalizeThreshold = profile.fidelity === "preserve" ? 122 : 108;
    profile.coreNeighborThreshold = 142;
  } else if (type === "photo") {
    profile.cleanup = Math.max(profile.cleanup, profile.fidelity === "preserve" ? 18 : 24);
    profile.coreThreshold = profile.fidelity === "clean" ? 184 : profile.fidelity === "preserve" ? 226 : 208;
    profile.midBoost = profile.fidelity === "clean" ? 1.1 : profile.fidelity === "preserve" ? 0.94 : 1.02;
    profile.alphaNormalizedThreshold = profile.fidelity === "preserve" ? 96 : 86;
    profile.coreNormalizeThreshold = profile.fidelity === "preserve" ? 104 : 86;
    profile.coreNeighborThreshold = profile.fidelity === "preserve" ? 132 : 118;
    profile.postCoreNormalizeThreshold = profile.fidelity === "preserve" ? 116 : 88;
    profile.postCoreNeighborThreshold = profile.fidelity === "preserve" ? 176 : 144;
    profile.postCoreNeighborCount = profile.fidelity === "preserve" ? 5 : 4;
    profile.postCoreNormalizePasses = 3;
  }

  if (profile.fidelity === "preserve") {
    profile.cleanup = Math.max(8, Math.round(profile.cleanup * 0.72));
    profile.residueThreshold = Math.max(6, Math.round(profile.residueThreshold * 0.72));
    profile.coreThreshold = Math.min(242, profile.coreThreshold + 12);
    profile.solidThreshold = profile.coreThreshold;
    profile.midBoost = Math.min(profile.midBoost, 0.96);
  } else if (profile.fidelity === "clean") {
    profile.cleanup = Math.min(96, Math.round(profile.cleanup * 1.18));
    profile.residueThreshold = Math.min(104, Math.round(profile.residueThreshold * 1.15));
    profile.coreThreshold = Math.max(160, profile.coreThreshold - 8);
    profile.solidThreshold = profile.coreThreshold;
  }

  return profile;
}

function normalizeImageType(type) {
  return new Set(["photo", "illustration", "line-art", "sticker", "product", "transparentMaterial"]).has(type) ? type : "unknown";
}

function inferQaImageTypeFromScenario(scenario = "") {
  if (/透明材质/.test(scenario)) return "transparentMaterial";
  if (/商品/.test(scenario)) return "product";
  if (/发丝|卷发|宠物|复杂背景人物/.test(scenario)) return "photo";
  if (/logo|文字/.test(scenario)) return "line-art";
  if (/贴纸合集|靠近多角色|小物体细节/.test(scenario)) return "sticker";
  if (/插画|图标/.test(scenario)) return "illustration";
  return "";
}

function analyzeSourceImageType(sourceCanvas) {
  if (!sourceCanvas?.width || !sourceCanvas?.height) return "unknown";
  const maxEdge = 420;
  const scale = Math.min(1, maxEdge / Math.max(sourceCanvas.width, sourceCanvas.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceCanvas.width * scale));
  canvas.height = Math.max(1, Math.round(sourceCanvas.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;
  const colors = new Set();
  let samples = 0;
  let nearWhite = 0;
  let nearBlack = 0;
  let foreground = 0;
  let darkForeground = 0;
  let saturatedForeground = 0;
  let lightColoredForeground = 0;
  let coolTranslucentForeground = 0;
  let softSpecularForeground = 0;
  let softShadowForeground = 0;
  let saturated = 0;
  let lowSaturation = 0;
  let edgeHits = 0;
  let totalGradient = 0;
  const step = Math.max(1, Math.round(Math.sqrt((width * height) / 36000)));

  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      const offset = (y * width + x) * 4;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const metrics = colorMetrics(red, green, blue);
      samples += 1;
      colors.add(`${red >> 4},${green >> 4},${blue >> 4}`);
      const isNearWhite = metrics.lightness > 238 && metrics.saturation < 0.18;
      const isForeground = !isNearWhite;
      if (isNearWhite) nearWhite += 1;
      if (metrics.lightness < 46) nearBlack += 1;
      if (isForeground) {
        foreground += 1;
        if (metrics.lightness < 96) darkForeground += 1;
        if (metrics.saturation > 0.32) saturatedForeground += 1;
        if (metrics.lightness > 168 && metrics.lightness < 246 && metrics.saturation > 0.045) lightColoredForeground += 1;
        if (
          metrics.lightness > 145 &&
          metrics.lightness < 238 &&
          metrics.saturation < 0.28 &&
          (blue - red > 12 || green - red > 12)
        ) coolTranslucentForeground += 1;
        if (metrics.lightness > 218 && metrics.lightness < 248 && metrics.saturation < 0.22) softSpecularForeground += 1;
        if (metrics.lightness > 108 && metrics.lightness < 192 && metrics.saturation < 0.18) softShadowForeground += 1;
      }
      if (metrics.saturation > 0.38) saturated += 1;
      if (metrics.saturation < 0.12) lowSaturation += 1;
      const right = (y * width + x + 1) * 4;
      const down = ((y + 1) * width + x) * 4;
      const gradient =
        Math.abs(red - data[right]) + Math.abs(green - data[right + 1]) + Math.abs(blue - data[right + 2]) +
        Math.abs(red - data[down]) + Math.abs(green - data[down + 1]) + Math.abs(blue - data[down + 2]);
      totalGradient += gradient;
      if (gradient > 130) edgeHits += 1;
    }
  }

  if (!samples) return "unknown";
  const uniqueRatio = colors.size / samples;
  const whiteRatio = nearWhite / samples;
  const blackRatio = nearBlack / samples;
  const foregroundRatio = foreground / samples;
  const darkForegroundRatio = darkForeground / Math.max(1, foreground);
  const saturatedForegroundRatio = saturatedForeground / Math.max(1, foreground);
  const lightColoredForegroundRatio = lightColoredForeground / Math.max(1, foreground);
  const coolTranslucentForegroundRatio = coolTranslucentForeground / Math.max(1, foreground);
  const softSpecularForegroundRatio = softSpecularForeground / Math.max(1, foreground);
  const softShadowForegroundRatio = softShadowForeground / Math.max(1, foreground);
  const saturatedRatio = saturated / samples;
  const lowSatRatio = lowSaturation / samples;
  const edgeRatio = edgeHits / samples;
  const averageGradient = totalGradient / samples;

  if (averageGradient > 38 && edgeRatio > 0.05 && foregroundRatio > 0.72) return "photo";
  if (
    edgeRatio > 0.012 &&
    foregroundRatio > 0.015 &&
    foregroundRatio < 0.42 &&
    darkForegroundRatio > 0.34 &&
    saturatedForegroundRatio < 0.38 &&
    uniqueRatio < 0.34
  ) return "line-art";
  if (
    whiteRatio > 0.38 &&
    foregroundRatio > 0.035 &&
    foregroundRatio < 0.5 &&
    uniqueRatio < 0.3 &&
    (saturatedForegroundRatio > 0.35 || (saturatedForegroundRatio > 0.18 && lightColoredForegroundRatio > 0.18))
  ) return "sticker";
  if (
    whiteRatio > 0.34 &&
    foregroundRatio > 0.055 &&
    foregroundRatio < 0.5 &&
    lowSatRatio > 0.54 &&
    saturatedForegroundRatio < 0.2 &&
    coolTranslucentForegroundRatio > 0.24 &&
    softSpecularForegroundRatio > 0.08 &&
    softShadowForegroundRatio > 0.06
  ) return "transparentMaterial";
  if (
    whiteRatio > 0.38 &&
    foregroundRatio > 0.035 &&
    foregroundRatio < 0.55 &&
    lowSatRatio > 0.62 &&
    saturatedForegroundRatio < 0.22
  ) return "product";
  if (
    whiteRatio < 0.26 &&
    foregroundRatio > 0.62 &&
    foregroundRatio < 0.99 &&
    uniqueRatio < 0.08 &&
    edgeRatio < 0.028 &&
    averageGradient < 18 &&
    darkForegroundRatio > 0.18 &&
    lightColoredForegroundRatio > 0.12 &&
    saturatedForegroundRatio > 0.28
  ) return "product";
  if (uniqueRatio < 0.24 && (saturatedRatio > 0.16 || edgeRatio > 0.08)) return "illustration";
  if (averageGradient > 32 && edgeRatio > 0.04) return "photo";
  if (uniqueRatio < 0.3) return "illustration";
  return "photo";
}

function updateDownloadLabelsLegacy() {
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

function updateDownloadLabels() {
  const { ext, label } = getExportSettings();
  els.copyCutoutBtn.textContent = "复制 PNG";
  els.downloadCutoutBtn.textContent = `下载 ${label}`;
  els.downloadZipBtn.textContent = "下载全部 ZIP";
  els.downloadBatchZipBtn.textContent = "批量处理并下载 ZIP";
  els.exportHint.textContent = ext === "svg"
    ? "SVG 会导出为可编辑矢量路径，适合 logo、贴纸和扁平插画；照片会近似成色块路径。"
    : "处理完成后可导出 PNG / WebP / SVG。";
  for (const button of els.elementGrid.querySelectorAll("[data-download-element]")) {
    button.textContent = `下载 ${label}`;
  }
  updateSelectionButtons();
  decorateStaticIcons();
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
    drawBitmapToCanvas(bitmap, state.sourceOriginalCanvas, getReadbackContext(state.sourceOriginalCanvas), Infinity);
    drawBitmapToCanvas(bitmap, els.sourceCanvas, sourceCtx);
    item.imageType = inferQaImageTypeFromScenario(item.qaScenario) || analyzeSourceImageType(state.sourceOriginalCanvas);
    state.imageType = item.imageType;
    applyDynamicDefaults(els.sourceCanvas.width, els.sourceCanvas.height);
    sizeOverlay();

    if (item.cutoutBlob) {
      const originalBitmap = await createImageBitmap(item.originalCutoutBlob || item.cutoutBlob);
      drawBitmapToCanvas(originalBitmap, state.cutoutOriginalCanvas, getReadbackContext(state.cutoutOriginalCanvas), Infinity);
      const resultBitmap = await createImageBitmap(item.filteredCutoutBlob || item.cutoutBlob);
      drawBitmapToCanvas(resultBitmap, state.refinedCutoutCanvas, getReadbackContext(state.refinedCutoutCanvas), Infinity);
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
    const qaMetaByName = new Map();

    for (const asset of manifest.assets || []) {
      const response = await fetch(`./${manifest.assetsDir}/${asset.fileName}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`缺少测试图：${asset.fileName}`);
      const blob = await response.blob();
      files.push(new File([blob], asset.fileName, { type: blob.type || "image/png" }));
      qaMetaByName.set(asset.fileName, asset);
    }

    if (!files.length) throw new Error("测试图清单为空");
    clearQueue();
    await addFiles(files, "测试图", { autoSelect: true, isQa: true, qaMetaByName });
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
  els.addSelectionBtn.disabled = true;
  els.applySelectionBtn.disabled = true;
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

function renderQueueLegacy() {
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
        <img class="queue-preview" src="${item.previewUrl}" alt="" loading="lazy" />
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
    let blob = await tryFastSolidBackgroundCutout(item);
    if (!blob) {
      blob = await runAiBackgroundRemoval(state.file, item);
    }
    if (token !== state.processingToken || item !== state.currentItem) return;

    state.originalCutoutBlob = blob;
    const bitmap = await createImageBitmap(blob);
    drawBitmapToCanvas(bitmap, state.cutoutOriginalCanvas, getReadbackContext(state.cutoutOriginalCanvas), Infinity);
    if (item?.fastCutout) {
      drawBitmapToCanvas(bitmap, state.refinedCutoutCanvas, getReadbackContext(state.refinedCutoutCanvas), Infinity);
      drawCanvasToPreview(state.refinedCutoutCanvas, els.resultCanvas, resultCtx);
      state.cutoutBlob = blob;
      state.matteWarnings = [];
      state.alphaNormalized = false;
    } else {
      await refineAndPreviewCutout({ immediateScan: false });
    }
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
    setProgress(100, "完成");
    if (item) {
      item.status = "done";
      item.originalCutoutBlob = state.originalCutoutBlob;
      item.cutoutBlob = state.cutoutBlob;
      item.components = [...state.components];
      item.processMode = els.detectMode.value;
      item.qaMetrics = computeCurrentQaMetrics();
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
      if (state.cutoutBlob) setProgress(100, "完成");
      else hideProgress();
      updateUiState();
    }
  }
}

function getBackgroundRemovalResourceConfig() {
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!localHosts.has(window.location.hostname)) return {};
  return {
    publicPath: new URL("./__imgly/", window.location.href).toString(),
  };
}

async function runAiBackgroundRemoval(file, item) {
  const timeoutMs = getAiTimeoutMs(item);
  const options = {
    ...getBackgroundRemovalResourceConfig(),
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
  };
  const aiTask = window.__cutoutDebug?.simulateAiHang
    ? new Promise(() => {})
    : removeBackground(file, options);
  return promiseWithTimeout(
    aiTask,
    timeoutMs,
    `AI 抠图超过 ${Math.max(1, Math.ceil(timeoutMs / 1000))} 秒仍未完成。请取消后重试、换用快速模型，或先压缩超大图片。`,
  );
}

function getAiTimeoutMs(item) {
  const debugTimeout = Number(window.__cutoutDebug?.aiTimeoutMs || 0);
  if (debugTimeout > 0) return debugTimeout;
  const maxEdge = Math.max(item?.originalWidth || 0, item?.originalHeight || 0);
  if (maxEdge > 4500) return DEFAULT_AI_TIMEOUT_MS * 2;
  if (maxEdge > 3000) return Math.round(DEFAULT_AI_TIMEOUT_MS * 1.5);
  return DEFAULT_AI_TIMEOUT_MS;
}

function promiseWithTimeout(promise, timeoutMs, message) {
  let timer = 0;
  return new Promise((resolve, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    Promise.resolve(promise).then(resolve, reject).finally(() => window.clearTimeout(timer));
  });
}

async function tryFastSolidBackgroundCutout(item) {
  if (!item || item.isQa || item.qaNeedsRealPhoto || !state.sourceOriginalCanvas.width) return null;
  const imageType = normalizeImageType(item.imageType || state.imageType || "unknown");
  const result = createSolidBackgroundCutoutCanvas(state.sourceOriginalCanvas, { imageType });
  if (!result) return null;
  if (imageType === "transparentMaterial" && !result.foreground?.simpleLightSubject) return null;
  if (imageType === "photo" && result.backgroundKind !== "dark" && !result.foreground?.simpleLightSubject) return null;
  if (
    result.backgroundKind === "dark" &&
    imageType === "illustration" &&
    (result.foreground?.saturatedRatio || 0) <= 0.12
  ) return null;
  if (
    result.backgroundKind !== "dark" &&
    (imageType === "sticker" || imageType === "illustration") &&
    !result.foreground?.simpleLightSubject
  ) return null;

  setBusy(true, result.backgroundKind === "dark"
    ? "检测到黑色纯底，正在本地快速抠图..."
    : "检测到浅色纯底，正在本地快速抠图...");
  setProgress(72, "本地快速抠图");
  item.fastCutout = true;
  item.fastCutoutBackground = result.backgroundKind;
  return canvasToBlob(result.canvas);
}

function createSolidBackgroundCutoutCanvas(sourceCanvas, options = {}) {
  const { width, height } = sourceCanvas;
  if (width < 24 || height < 24) return null;
  const ctx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, width, height);
  const background = estimateSolidEdgeBackground(imageData);
  if (!background) return null;

  const imageType = normalizeImageType(options.imageType || "unknown");
  const isDark = background.metrics.lightness < 58 && background.metrics.saturation < 0.24;
  const isLight = background.metrics.lightness > 214 && background.metrics.saturation < 0.24;
  const isPlain = background.coverage > 0.62 && background.variance < 28;
  if (!isPlain && !((isDark || isLight) && background.coverage > 0.48 && background.variance < 42)) return null;
  if (imageType === "unknown" && !isDark && !isLight && background.coverage < 0.72) return null;

  const tolerance = isDark
    ? 82
    : isLight
      ? 30
      : 42;
  const mask = floodBackgroundMask(imageData, background.color, tolerance);
  const backgroundCount = mask.reduce((sum, value) => sum + value, 0);
  const backgroundRatio = backgroundCount / Math.max(1, width * height);
  if (backgroundRatio < 0.08 || backgroundRatio > 0.96) return null;
  const foreground = measureSolidBackgroundForeground(imageData, mask);

  const output = new ImageData(new Uint8ClampedArray(imageData.data), width, height);
  applySolidBackgroundAlpha(output, mask, background.color, tolerance, isDark ? "dark" : isLight ? "light" : "solid", {
    imageType,
    darkFringeAggressive: shouldUseAggressiveDarkFringeCleanup(imageType, foreground),
  });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  getReadbackContext(canvas).putImageData(output, 0, 0);
  return {
    canvas,
    backgroundKind: isDark ? "dark" : isLight ? "light" : "solid",
    backgroundRatio,
    foreground,
  };
}

function shouldUseAggressiveDarkFringeCleanup(imageType, foreground) {
  return imageType === "sticker"
    || imageType === "line-art"
    || foreground?.saturatedRatio > 0.12;
}

function measureSolidBackgroundForeground(imageData, backgroundMask) {
  const { width, height, data } = imageData;
  const colors = new Set();
  let count = 0;
  let saturated = 0;
  let lowSaturation = 0;
  let lightColored = 0;
  let dark = 0;
  let totalSaturation = 0;
  let totalLightness = 0;
  let totalGradient = 0;
  let gradientSamples = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (backgroundMask[index]) continue;
      const offset = index * 4;
      if (data[offset + 3] < 32) continue;
      const metrics = colorMetrics(data[offset], data[offset + 1], data[offset + 2]);
      count += 1;
      colors.add(`${data[offset] >> 4},${data[offset + 1] >> 4},${data[offset + 2] >> 4}`);
      totalSaturation += metrics.saturation;
      totalLightness += metrics.lightness;
      if (metrics.saturation > 0.32) saturated += 1;
      if (metrics.saturation < 0.18) lowSaturation += 1;
      if (metrics.lightness > 140 && metrics.lightness < 248 && metrics.saturation < 0.24) lightColored += 1;
      if (metrics.lightness < 82) dark += 1;
      if (x < width - 1 && y < height - 1) {
        const right = offset + 4;
        const down = ((y + 1) * width + x) * 4;
        totalGradient +=
          Math.abs(data[offset] - data[right]) + Math.abs(data[offset + 1] - data[right + 1]) + Math.abs(data[offset + 2] - data[right + 2]) +
          Math.abs(data[offset] - data[down]) + Math.abs(data[offset + 1] - data[down + 1]) + Math.abs(data[offset + 2] - data[down + 2]);
        gradientSamples += 1;
      }
    }
  }

  const areaRatio = count / Math.max(1, width * height);
  const saturatedRatio = saturated / Math.max(1, count);
  const lowSaturationRatio = lowSaturation / Math.max(1, count);
  const lightColoredRatio = lightColored / Math.max(1, count);
  const darkRatio = dark / Math.max(1, count);
  const averageSaturation = totalSaturation / Math.max(1, count);
  const averageLightness = totalLightness / Math.max(1, count);
  const uniqueRatio = colors.size / Math.max(1, count);
  const averageGradient = totalGradient / Math.max(1, gradientSamples);
  return {
    areaRatio,
    saturatedRatio,
    lowSaturationRatio,
    lightColoredRatio,
    darkRatio,
    averageSaturation,
    averageLightness,
    uniqueRatio,
    averageGradient,
    simpleLightSubject:
      areaRatio > 0.035 &&
      areaRatio < 0.68 &&
      averageLightness > 135 &&
      darkRatio < 0.28 &&
      uniqueRatio < 0.08 &&
      averageGradient < 80,
  };
}

function estimateSolidEdgeBackground(imageData) {
  const { width, height, data } = imageData;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 180));
  const samples = [];
  const add = (x, y) => {
    const offset = (y * width + x) * 4;
    if (data[offset + 3] < 240) return;
    samples.push([data[offset], data[offset + 1], data[offset + 2]]);
  };
  for (let x = 0; x < width; x += step) {
    add(x, 0);
    add(x, height - 1);
  }
  for (let y = 0; y < height; y += step) {
    add(0, y);
    add(width - 1, y);
  }
  if (samples.length < 24) return null;

  const buckets = new Map();
  for (const sample of samples) {
    const key = `${sample[0] >> 4},${sample[1] >> 4},${sample[2] >> 4}`;
    const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0, samples: [] };
    bucket.count += 1;
    bucket.r += sample[0];
    bucket.g += sample[1];
    bucket.b += sample[2];
    bucket.samples.push(sample);
    buckets.set(key, bucket);
  }

  const dominant = [...buckets.values()].sort((a, b) => b.count - a.count)[0];
  if (!dominant || dominant.count < samples.length * 0.36) return null;
  const color = [
    Math.round(dominant.r / dominant.count),
    Math.round(dominant.g / dominant.count),
    Math.round(dominant.b / dominant.count),
  ];
  const variance = Math.sqrt(
    dominant.samples.reduce((sum, sample) => {
      const dr = sample[0] - color[0];
      const dg = sample[1] - color[1];
      const db = sample[2] - color[2];
      return sum + (dr * dr + dg * dg + db * db) / 3;
    }, 0) / Math.max(1, dominant.samples.length),
  );
  return {
    color,
    coverage: dominant.count / samples.length,
    variance,
    metrics: colorMetrics(color[0], color[1], color[2]),
  };
}

function floodBackgroundMask(imageData, backgroundColor, tolerance) {
  const { width, height, data } = imageData;
  const mask = new Uint8Array(width * height);
  const queue = [];
  const toleranceSq = tolerance * tolerance;
  const enqueue = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const index = y * width + x;
    if (mask[index]) return;
    const offset = index * 4;
    if (data[offset + 3] < 8 || colorDistanceToRgbSq(data, offset, backgroundColor) <= toleranceSq) {
      mask[index] = 1;
      queue.push(index);
    }
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (queue.length) {
    const index = queue.pop();
    const x = index % width;
    const y = Math.floor(index / width);
    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }
  return mask;
}

function applySolidBackgroundAlpha(imageData, backgroundMask, backgroundColor, tolerance, backgroundKind = "solid", options = {}) {
  const { width, height, data } = imageData;
  const softTolerance = tolerance * 1.55;
  for (let index = 0; index < backgroundMask.length; index += 1) {
    const offset = index * 4;
    if (backgroundMask[index]) {
      data[offset + 3] = 0;
      continue;
    }
    if (!hasBackgroundNeighbor(backgroundMask, width, height, index)) continue;
    const distance = Math.sqrt(colorDistanceToRgbSq(data, offset, backgroundColor));
    if (distance >= softTolerance) continue;
    const alpha = clamp((distance - tolerance * 0.48) / Math.max(1, softTolerance - tolerance * 0.48), 0, 1);
    data[offset + 3] = Math.round(Math.min(data[offset + 3], alpha * 255));
  }
  if (backgroundKind === "dark") removeDarkBackgroundHalo(imageData, backgroundColor, options);
}

function removeDarkBackgroundHalo(imageData, backgroundColor, options = {}) {
  if (!options.darkFringeAggressive && options.imageType === "illustration") return;
  const { width, height, data } = imageData;
  const nextAlpha = new Uint8ClampedArray(width * height);
  for (let index = 0; index < nextAlpha.length; index += 1) nextAlpha[index] = data[index * 4 + 3];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const offset = index * 4;
      const alpha = data[offset + 3];
      if (alpha <= 8) continue;
      const lightness = data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114;
      if (lightness > 72) continue;
      if (!hasTransparentAlphaNeighbor(data, width, height, index, 12)) continue;
      const distance = Math.sqrt(colorDistanceToRgbSq(data, offset, backgroundColor));
      if (distance > 172) continue;
      const solidNeighbors = countSolidAlphaNeighbors(data, width, height, index, 96);
      const keepFactor = solidNeighbors >= 6 ? 0.55 : 0.18;
      nextAlpha[index] = Math.round(Math.min(alpha, clamp((distance - 64) / 108, 0, 1) * 255 * keepFactor));
    }
  }

  for (let index = 0; index < nextAlpha.length; index += 1) {
    data[index * 4 + 3] = nextAlpha[index];
  }
  if (options.darkFringeAggressive) {
    suppressDarkBackgroundFringeAlpha(imageData, {
      darkBackgroundCleanup: true,
      darkBackgroundColor: backgroundColor,
      darkFringeAggressive: true,
    });
  }
}

function hasBackgroundNeighbor(mask, width, height, index) {
  const x = index % width;
  const y = Math.floor(index / width);
  for (let oy = -1; oy <= 1; oy += 1) {
    for (let ox = -1; ox <= 1; ox += 1) {
      if (!ox && !oy) continue;
      const px = x + ox;
      const py = y + oy;
      if (px < 0 || px >= width || py < 0 || py >= height) continue;
      if (mask[py * width + px]) return true;
    }
  }
  return false;
}

function hasTransparentAlphaNeighbor(data, width, height, index, threshold) {
  const x = index % width;
  const y = Math.floor(index / width);
  for (let oy = -1; oy <= 1; oy += 1) {
    for (let ox = -1; ox <= 1; ox += 1) {
      if (!ox && !oy) continue;
      const px = x + ox;
      const py = y + oy;
      if (px < 0 || px >= width || py < 0 || py >= height) continue;
      if (data[(py * width + px) * 4 + 3] <= threshold) return true;
    }
  }
  return false;
}

function countSolidAlphaNeighbors(data, width, height, index, threshold) {
  const x = index % width;
  const y = Math.floor(index / width);
  let count = 0;
  for (let oy = -1; oy <= 1; oy += 1) {
    for (let ox = -1; ox <= 1; ox += 1) {
      if (!ox && !oy) continue;
      const px = x + ox;
      const py = y + oy;
      if (px < 0 || px >= width || py < 0 || py >= height) continue;
      if (data[(py * width + px) * 4 + 3] >= threshold) count += 1;
    }
  }
  return count;
}

function colorDistanceToRgbSq(data, offset, color) {
  const dr = data[offset] - color[0];
  const dg = data[offset + 1] - color[1];
  const db = data[offset + 2] - color[2];
  return (dr * dr + dg * dg + db * db) / 3;
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
    updateStatusStage("assets");
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
    const preset = getAlgorithmPreset(state.currentItem?.imageType || state.imageType || "unknown");
    const presetConfig = getPresetConfig(preset);
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
    const minAreaLow = Math.max(8, Math.round(minArea * presetConfig.detection.minAreaFactor * detection.scale * detection.scale));
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
            strength: presetConfig.detection.splitStrength === "strong" && els.splitStrength.value === "standard"
              ? "strong"
              : els.splitStrength.value,
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
  const baseSettings = getRefineSettings();
  let refineResult = await refineCutoutAlphaAsync(state.cutoutOriginalCanvas, baseSettings);
  let detailResult = restoreIllustrationDetails(refineResult.canvas, state.sourceOriginalCanvas, baseSettings);
  let quality = analyzeMatteQuality(detailResult.canvas, state.sourceOriginalCanvas, baseSettings);
  const primaryResult = { refineResult, detailResult, quality };

  if (shouldRetryWithPreserveMatte(quality, baseSettings)) {
    const fallbackSettings = buildMatteProfile({ ...baseSettings, fidelity: "preserve", alphaBoost: "soft" }, baseSettings.imageType);
    const fallbackRefine = await refineCutoutAlphaAsync(state.cutoutOriginalCanvas, fallbackSettings);
    const fallbackDetails = restoreIllustrationDetails(fallbackRefine.canvas, state.sourceOriginalCanvas, fallbackSettings);
    const fallbackQuality = analyzeMatteQuality(fallbackDetails.canvas, state.sourceOriginalCanvas, fallbackSettings);
    if (shouldUseFallbackMatte(primaryResult.quality, fallbackQuality, baseSettings)) {
      refineResult = fallbackRefine;
      detailResult = fallbackDetails;
      quality = fallbackQuality;
      state.matteWarnings = ["已自动回退到保真优先参数，保护线稿和浅色区域。", ...quality.warnings];
    } else {
      refineResult = primaryResult.refineResult;
      detailResult = primaryResult.detailResult;
      quality = primaryResult.quality;
      state.matteWarnings = ["已检测到保真回退没有带来更好结果，保留当前边缘参数。", ...quality.warnings];
    }
  } else {
    state.matteWarnings = quality.warnings;
  }

  if (shouldRetryWithSmoothEdgeMatte(quality, baseSettings)) {
    const smoothSettings = buildSmoothEdgeMatteProfile(baseSettings);
    const smoothRefine = await refineCutoutAlphaAsync(state.cutoutOriginalCanvas, smoothSettings);
    const smoothDetails = restoreIllustrationDetails(smoothRefine.canvas, state.sourceOriginalCanvas, smoothSettings);
    const smoothQuality = analyzeMatteQuality(smoothDetails.canvas, state.sourceOriginalCanvas, smoothSettings);
    if (shouldUseSmoothEdgeMatte(quality, smoothQuality, baseSettings)) {
      refineResult = smoothRefine;
      detailResult = smoothDetails;
      quality = smoothQuality;
      state.matteWarnings = ["已自动优化商品边缘平滑度。", ...quality.warnings];
    }
  }

  state.refinedCutoutCanvas = detailResult.canvas;
  state.alphaNormalized = refineResult.alphaNormalized;
  state.cutoutBlob = await canvasToBlob(state.refinedCutoutCanvas);
  if (state.currentItem) {
    state.currentItem.imageType = baseSettings.imageType;
    state.currentItem.matteQuality = quality;
  }
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
  if (state.matteWarnings.length) setStatus(state.matteWarnings.slice(0, 2).join(" "), "质量保护");
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
    getReadbackContext(canvas).putImageData(response.imageData, 0, 0);
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
  despeckleAlpha(imageData, settings.cleanup, settings.despeckleStrength);
  defringe(imageData, settings);
  const { data } = imageData;
  const alphaSource = new Uint8ClampedArray(data.length / 4);
  for (let index = 0; index < alphaSource.length; index += 1) alphaSource[index] = data[index * 4 + 3];
  const residueThreshold = settings.residueThreshold ?? settings.cleanup;
  const edgeLow = settings.edgeLow ?? Math.max(10, Math.round(settings.cleanup * 0.7));
  const coreThreshold = settings.coreThreshold ?? (settings.alphaBoost === "clean" ? 168 : settings.alphaBoost === "soft" ? 230 : 205);
  const solidThreshold = settings.solidThreshold ?? coreThreshold;
  const midBoost = settings.midBoost ?? (settings.alphaBoost === "clean" ? 1.18 : settings.alphaBoost === "soft" ? 0.92 : 1.05);
  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha < residueThreshold) {
      data[index + 3] = 0;
      continue;
    }
    if (
      alpha > solidThreshold
      || (settings.imageType !== "transparentMaterial" && alphaNormalized && alpha > (settings.alphaNormalizedThreshold ?? 120))
      || shouldNormalizeCoreAlpha(alphaSource, imageData.width, imageData.height, index / 4, alpha, settings)
    ) {
      data[index + 3] = 255;
      continue;
    }
    const low = edgeLow;
    const high = coreThreshold;
    const t = clamp((alpha - low) / Math.max(1, high - low), 0, 1);
    const curve = t * t * (3 - 2 * t);
    const edgeFloor = settings.preserveLineArt ? Math.min(alpha, 42) : 0;
    data[index + 3] = Math.round(clamp(Math.max(edgeFloor, curve * 255 * midBoost), 0, 255));
  }
  normalizeSemiOpaqueCore(imageData, settings);
  guidedSmoothEdgeAlpha(imageData, settings);
  suppressWhiteFringeAlpha(imageData, settings);
  antiAliasHardEdges(imageData, settings);
  suppressWhiteFringeAlpha(imageData, settings);
  suppressDarkBackgroundFringeAlpha(imageData, settings);
  ctx.putImageData(imageData, 0, 0);
  return { canvas, alphaNormalized };
}

function guidedSmoothEdgeAlpha(imageData, settings = {}) {
  if (settings.imageType !== "product") return imageData;
  const { width, height, data } = imageData;
  const source = new Uint8ClampedArray(data);
  const lowThreshold = Math.max(8, Math.round((settings.edgeLow || settings.cleanup || 18) * 0.85));
  const highThreshold = settings.fidelity === "preserve" ? 246 : 238;
  const colorSigma = settings.imageType === "product" ? 72 : 54;
  const strength = settings.imageType === "product"
    ? 0.34
    : settings.fidelity === "clean" ? 0.3 : 0.22;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = source[offset + 3];
      if (alpha <= lowThreshold || alpha >= highThreshold) continue;
      const pixelMetrics = colorMetrics(source[offset], source[offset + 1], source[offset + 2]);
      if (pixelMetrics.lightness > 238 && pixelMetrics.saturation < 0.14) continue;

      let hasTransparent = false;
      let hasSolid = false;
      let weightedAlpha = 0;
      let weightSum = 0;
      const red = source[offset];
      const green = source[offset + 1];
      const blue = source[offset + 2];

      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const next = ((y + oy) * width + x + ox) * 4;
          const nextAlpha = source[next + 3];
          if (nextAlpha <= lowThreshold) hasTransparent = true;
          if (nextAlpha >= highThreshold) hasSolid = true;
          const colorDistance =
            Math.abs(red - source[next]) +
            Math.abs(green - source[next + 1]) +
            Math.abs(blue - source[next + 2]);
          const colorWeight = Math.exp(-colorDistance / colorSigma);
          const spatialWeight = ox === 0 && oy === 0 ? 2.5 : 1;
          const weight = colorWeight * spatialWeight;
          weightedAlpha += nextAlpha * weight;
          weightSum += weight;
        }
      }
      if (!hasTransparent || !hasSolid || !weightSum) continue;
      const target = weightedAlpha / weightSum;
      data[offset + 3] = Math.round(clamp(alpha * (1 - strength) + target * strength, 0, 255));
    }
  }
  return imageData;
}

function suppressWhiteFringeAlpha(imageData, settings = {}) {
  const illustrationLike = settings.imageType === "illustration" || settings.imageType === "sticker" || settings.imageType === "line-art";
  if (settings.imageType !== "product" && !illustrationLike) return imageData;
  const { width, height, data } = imageData;
  const source = new Uint8ClampedArray(data);
  const preserveMultiplier = settings.fidelity === "preserve" ? 0.78 : 1;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = source[offset + 3];
      if (alpha <= 0 || alpha >= 150) continue;
      const pixelMetrics = colorMetrics(source[offset], source[offset + 1], source[offset + 2]);
      if (pixelMetrics.lightness <= 238 || pixelMetrics.saturation >= 0.14) continue;
      let coloredCount = 0;
      let transparentCount = 0;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const next = ((y + oy) * width + x + ox) * 4;
          const nextAlpha = source[next + 3];
          if (nextAlpha <= 16) transparentCount += 1;
          if (nextAlpha <= 180) continue;
          const metrics = colorMetrics(source[next], source[next + 1], source[next + 2]);
          if (metrics.lightness < 228 || metrics.saturation > 0.18) coloredCount += 1;
        }
      }
      const lowAlphaIllustrationFringe = illustrationLike
        && alpha < 28
        && hasTransparentNeighbor(source, width, height, x, y, 2, settings.edgeLow || 16)
        && hasColoredOpaqueNeighbor(source, width, height, x, y, 3, 128)
        && !hasLightOpaqueNeighbor(source, width, height, x, y, 2, 176);
      const fringeStrength = whiteFringeAlphaStrength(settings, alpha, transparentCount, coloredCount);
      if (lowAlphaIllustrationFringe || fringeStrength > 0) {
        data[offset + 3] = lowAlphaIllustrationFringe ? 0 : Math.round(alpha * fringeStrength * preserveMultiplier);
      }
    }
  }
  return imageData;
}

function suppressDarkBackgroundFringeAlpha(imageData, settings = {}) {
  if (!settings.darkBackgroundCleanup) return imageData;
  const { width, height, data } = imageData;
  const source = new Uint8ClampedArray(data);
  const backgroundColor = Array.isArray(settings.darkBackgroundColor) ? settings.darkBackgroundColor : [0, 0, 0];
  const aggressive = Boolean(settings.darkFringeAggressive);
  const distanceLimit = aggressive ? 150 : 132;
  const lightnessLimit = aggressive ? 126 : 112;
  const candidate = new Uint8Array(width * height);
  const removeMask = new Uint8Array(width * height);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = source[offset + 3];
      if (alpha <= 0) continue;
      const metrics = colorMetrics(source[offset], source[offset + 1], source[offset + 2]);
      const distance = Math.sqrt(colorDistanceToRgbSq(source, offset, backgroundColor));
      if (metrics.lightness > lightnessLimit && distance > distanceLimit) continue;
      const nearBackground = distance <= distanceLimit || (metrics.lightness < lightnessLimit && metrics.saturation < 0.28);
      if (!nearBackground) continue;
      const index = y * width + x;
      candidate[index] = 1;
      if (hasTransparentNeighbor(source, width, height, x, y, aggressive ? 2 : 1, 12)) removeMask[index] = 1;
    }
  }

  for (let pass = 0; pass < (aggressive ? 12 : 5); pass += 1) {
    let changed = 0;
    const current = new Uint8Array(removeMask);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        if (!candidate[index] || current[index]) continue;
        if (hasMaskNeighbor(current, width, height, x, y, 1)) {
          removeMask[index] = 1;
          changed += 1;
        }
      }
    }
    if (!changed) break;
  }

  for (let index = 0; index < removeMask.length; index += 1) {
    if (!removeMask[index]) continue;
    const offset = index * 4;
    const distance = Math.sqrt(colorDistanceToRgbSq(source, offset, backgroundColor));
    data[offset + 3] = distance < 74 || aggressive ? 0 : Math.min(source[offset + 3], 24);
  }
  return imageData;
}

function hasMaskNeighbor(mask, width, height, x, y, radius) {
  for (let oy = -radius; oy <= radius; oy += 1) {
    const py = y + oy;
    if (py < 0 || py >= height) continue;
    for (let ox = -radius; ox <= radius; ox += 1) {
      const px = x + ox;
      if (px < 0 || px >= width || (px === x && py === y)) continue;
      if (mask[py * width + px]) return true;
    }
  }
  return false;
}

function antiAliasHardEdges(imageData, settings = {}) {
  if (settings.imageType === "transparentMaterial") return imageData;
  const { width, height, data } = imageData;
  const source = new Uint8ClampedArray(data);
  const lowThreshold = Math.max(8, Math.round((settings.edgeLow || settings.cleanup || 18) * 0.85));
  const strongThreshold = 232;
  const factor = settings.imageType === "product"
    ? (settings.fidelity === "clean" ? 0.62 : settings.fidelity === "preserve" ? 0.38 : 0.56)
    : settings.fidelity === "clean" ? 0.52 : settings.fidelity === "preserve" ? 0.32 : 0.42;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = source[offset + 3];
      let transparent = 0;
      let strong = 0;
      let alphaSum = 0;
      let weightSum = 0;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const weight = ox === 0 && oy === 0 ? 2 : 1;
          const neighborAlpha = source[((y + oy) * width + x + ox) * 4 + 3];
          if (neighborAlpha <= lowThreshold) transparent += 1;
          if (neighborAlpha >= strongThreshold) strong += 1;
          alphaSum += neighborAlpha * weight;
          weightSum += weight;
        }
      }
      if (!transparent || !strong) continue;
      const mixed = alphaSum / Math.max(1, weightSum);
      if (settings.imageType === "product" && alpha >= 248 && transparent >= 1 && strong <= 8) {
        data[offset + 3] = Math.round(clamp(alpha * (1 - factor) + mixed * factor, 128, 242));
      } else if (settings.imageType === "product" && alpha <= lowThreshold && strong >= 1 && transparent <= 7) {
        data[offset + 3] = Math.round(clamp(mixed * factor * 0.62, 0, 112));
      } else if (alpha >= 248 && transparent >= 2 && strong <= 6) {
        data[offset + 3] = Math.round(clamp(alpha * (1 - factor) + mixed * factor, 96, 246));
      } else if (alpha <= lowThreshold && strong >= 2 && transparent <= 6) {
        data[offset + 3] = Math.round(clamp(mixed * factor * 0.55, 0, 96));
      }
    }
  }
  return imageData;
}

function normalizeSemiOpaqueCore(imageData, settings) {
  const threshold = Number(settings.postCoreNormalizeThreshold || 0);
  if (!threshold) return;
  const { width, height, data } = imageData;
  const neighborThreshold = Number(settings.postCoreNeighborThreshold || 180);
  const neighborCount = Number(settings.postCoreNeighborCount || 5);
  const passes = Math.max(1, Math.min(3, Number(settings.postCoreNormalizePasses || 1)));
  for (let pass = 0; pass < passes; pass += 1) {
    const alphaSource = new Uint8ClampedArray(data.length / 4);
    for (let index = 0; index < alphaSource.length; index += 1) alphaSource[index] = data[index * 4 + 3];
    let changed = 0;
    for (let index = 0; index < alphaSource.length; index += 1) {
      const alpha = alphaSource[index];
      if (alpha < threshold || alpha >= 245) continue;
      const x = index % width;
      const y = Math.floor(index / width);
      if (hasStrongAlphaNeighbor(alphaSource, width, height, x, y, 2, neighborThreshold, neighborCount)) {
        data[index * 4 + 3] = 255;
        changed += 1;
      }
    }
    if (!changed) break;
  }
}

function shouldNormalizeCoreAlpha(alphaSource, width, height, pixelIndex, alpha, settings) {
  if (settings.imageType === "transparentMaterial") return false;
  const threshold = Number(settings.coreNormalizeThreshold || 0);
  if (!threshold || alpha < threshold) return false;
  const x = pixelIndex % width;
  const y = Math.floor(pixelIndex / width);
  return hasStrongAlphaNeighbor(alphaSource, width, height, x, y, 2, Number(settings.coreNeighborThreshold || 176), 3);
}

function hasStrongAlphaNeighbor(alphaSource, width, height, x, y, radius, threshold, minCount) {
  let count = 0;
  for (let oy = -radius; oy <= radius; oy += 1) {
    const py = y + oy;
    if (py < 0 || py >= height) continue;
    for (let ox = -radius; ox <= radius; ox += 1) {
      const px = x + ox;
      if (px < 0 || px >= width) continue;
      if (alphaSource[py * width + px] >= threshold) {
        count += 1;
        if (count >= minCount) return true;
      }
    }
  }
  return false;
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

  const supportThreshold = Math.max(8, Math.round((settings.cleanup || 24) * (settings.preserveLineArt ? 0.45 : 0.65)));
  const foreground = new Uint8Array(width * height);
  for (let index = 0; index < foreground.length; index += 1) {
    foreground[index] = result.data[index * 4 + 3] > supportThreshold ? 1 : 0;
  }
  const restoreRadius = Math.max(2, Math.min(settings.preserveLineArt ? 8 : 5, Number(settings.edgeSmooth || 2) + 3));
  const nearForeground = dilateMask(foreground, width, height, restoreRadius);

  let restoredPixels = 0;
  for (let index = 0; index < foreground.length; index += 1) {
    if (!nearForeground[index]) continue;
    const offset = index * 4;
    const alpha = result.data[offset + 3];
    const red = original.data[offset];
    const green = original.data[offset + 1];
    const blue = original.data[offset + 2];
    const metrics = colorMetrics(red, green, blue);
    const nearWhite = metrics.lightness > 246 && metrics.saturation < 0.12;
    const x = index % width;
    const y = Math.floor(index / width);
    const protectedInteriorWhite = nearWhite
      && shouldProtectInteriorWhite(settings)
      && (
        isInteriorLightDetail(result.data, width, height, x, y, 4, 128)
        || isOriginalEnclosedLightDetail(original.data, width, height, x, y, 7)
      );
    if (nearWhite && !protectedInteriorWhite) continue;

    const darkStroke = protectLineArt(metrics, settings);
    const coloredFill = metrics.saturation > 0.24 && metrics.lightness < 242;
    const protectedLightFill = protectLightRegion(red, green, blue, metrics, settings);
    const protectedWarmOrCool = protectWarmCoolDetail(red, green, blue, metrics, settings);
    const protectedPaleInterior = settings.preserveLightRegions
      && metrics.lightness >= 224
      && metrics.lightness < 248
      && isOriginalEnclosedLightDetail(original.data, width, height, x, y, 7);

    if (alpha > 18 && (darkStroke || coloredFill || protectedLightFill || protectedWarmOrCool || protectedInteriorWhite || protectedPaleInterior)) {
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
    } else if (settings.preserveLineArt && alpha === 0 && darkStroke) {
      result.data[offset] = red;
      result.data[offset + 1] = green;
      result.data[offset + 2] = blue;
      result.data[offset + 3] = 210;
      restoredPixels += 1;
    } else if ((coloredFill || protectedWarmOrCool) && alpha > 0 && alpha < 170) {
      result.data[offset] = red;
      result.data[offset + 1] = green;
      result.data[offset + 2] = blue;
      result.data[offset + 3] = Math.max(alpha, 180);
      restoredPixels += 1;
    } else if (settings.preserveColoredDetails && alpha === 0 && (protectedWarmOrCool || (coloredFill && hasOpaqueNeighbor(result.data, width, height, index % width, Math.floor(index / width), 3, 96)))) {
      result.data[offset] = red;
      result.data[offset + 1] = green;
      result.data[offset + 2] = blue;
      result.data[offset + 3] = protectedWarmOrCool ? 150 : 128;
      restoredPixels += 1;
    } else if (protectedLightFill && alpha > 0 && alpha < 138) {
      result.data[offset] = red;
      result.data[offset + 1] = green;
      result.data[offset + 2] = blue;
      result.data[offset + 3] = Math.max(alpha, hasDirectionalAlphaSupport(result.data, width, height, x, y, 4, 96) ? 170 : 118);
      restoredPixels += 1;
    } else if (settings.preserveLightRegions && protectedLightFill && alpha === 0 && hasDirectionalAlphaSupport(result.data, width, height, x, y, 5, 88)) {
      result.data[offset] = red;
      result.data[offset + 1] = green;
      result.data[offset + 2] = blue;
      result.data[offset + 3] = 168;
      restoredPixels += 1;
    } else if (settings.preserveLightRegions && protectedLightFill && alpha === 0 && hasOpaqueNeighbor(result.data, width, height, x, y, 4, 96)) {
      result.data[offset] = red;
      result.data[offset + 1] = green;
      result.data[offset + 2] = blue;
      result.data[offset + 3] = 92;
      restoredPixels += 1;
    } else if (protectedPaleInterior && alpha < 132 && hasOpaqueNeighbor(result.data, width, height, x, y, 5, 72)) {
      result.data[offset] = red;
      result.data[offset + 1] = green;
      result.data[offset + 2] = blue;
      result.data[offset + 3] = Math.max(alpha, protectedInteriorWhite ? 210 : 150);
      restoredPixels += 1;
    } else if (protectedInteriorWhite && alpha < 190) {
      result.data[offset] = red;
      result.data[offset + 1] = green;
      result.data[offset + 2] = blue;
      result.data[offset + 3] = Math.max(alpha, 210);
      restoredPixels += 1;
    }
  }

  resultCtx.putImageData(result, 0, 0);
  return { canvas: cutoutCanvas, restoredPixels };
}

function protectLineArt(metrics, settings) {
  return Boolean(settings.preserveLineArt && metrics.lightness < 132 && metrics.saturation < 0.82)
    || metrics.lightness < 88;
}

function protectLightRegion(red, green, blue, metrics, settings) {
  if (!settings.preserveLightRegions) return false;
  const notWhiteBackground = !(metrics.lightness > 246 && metrics.saturation < 0.12);
  const hasColorBias = Math.max(red, green, blue) - Math.min(red, green, blue) > 10;
  return notWhiteBackground && hasColorBias && metrics.lightness >= 168 && metrics.lightness < 246 && metrics.saturation > 0.045;
}

function protectWarmCoolDetail(red, green, blue, metrics, settings) {
  if (!settings.preserveLightRegions) return false;
  return (
    (red > green + 8 && green > blue + 4 && metrics.lightness > 130) ||
    (blue > red + 8 && green > red + 4 && metrics.lightness > 142)
  );
}

function shouldProtectInteriorWhite(settings = {}) {
  return Boolean(settings.preserveLightRegions) && (
    settings.imageType === "line-art" ||
    settings.imageType === "sticker" ||
    settings.preset === "multiSticker" ||
    settings.preset === "logoIcon"
  );
}

function isInteriorLightDetail(data, width, height, x, y, radius, threshold) {
  const buckets = { left: 0, right: 0, up: 0, down: 0 };
  let total = 0;
  for (let oy = -radius; oy <= radius; oy += 1) {
    const py = y + oy;
    if (py < 0 || py >= height) continue;
    for (let ox = -radius; ox <= radius; ox += 1) {
      const px = x + ox;
      if (px < 0 || px >= width || (px === x && py === y)) continue;
      const alpha = data[(py * width + px) * 4 + 3];
      if (alpha < threshold) continue;
      total += 1;
      if (ox < 0) buckets.left += 1;
      if (ox > 0) buckets.right += 1;
      if (oy < 0) buckets.up += 1;
      if (oy > 0) buckets.down += 1;
    }
  }
  return total >= 16 && buckets.left >= 3 && buckets.right >= 3 && buckets.up >= 3 && buckets.down >= 3;
}

function isOriginalEnclosedLightDetail(originalData, width, height, x, y, radius) {
  const buckets = { left: 0, right: 0, up: 0, down: 0 };
  let anchors = 0;
  let directions = 0;
  for (let oy = -radius; oy <= radius; oy += 1) {
    const py = y + oy;
    if (py < 0 || py >= height) continue;
    for (let ox = -radius; ox <= radius; ox += 1) {
      const px = x + ox;
      if (px < 0 || px >= width || (px === x && py === y)) continue;
      const distance = Math.max(Math.abs(ox), Math.abs(oy));
      if (distance < 2 || distance > radius) continue;
      const offset = (py * width + px) * 4;
      const metrics = colorMetrics(originalData[offset], originalData[offset + 1], originalData[offset + 2]);
      const lineOrColoredShape = metrics.lightness < 190 || metrics.saturation > 0.14;
      if (!lineOrColoredShape) continue;
      anchors += 1;
      if (ox <= -2) buckets.left += 1;
      if (ox >= 2) buckets.right += 1;
      if (oy <= -2) buckets.up += 1;
      if (oy >= 2) buckets.down += 1;
    }
  }
  if (buckets.left >= 2) directions += 1;
  if (buckets.right >= 2) directions += 1;
  if (buckets.up >= 2) directions += 1;
  if (buckets.down >= 2) directions += 1;
  const enclosedHorizontally = buckets.left >= 2 && buckets.right >= 2;
  const enclosedVertically = buckets.up >= 2 && buckets.down >= 2;
  return anchors >= 8 && directions >= 3 && enclosedHorizontally && enclosedVertically;
}

function hasDirectionalAlphaSupport(data, width, height, x, y, radius, threshold) {
  const buckets = { left: 0, right: 0, up: 0, down: 0 };
  let total = 0;
  for (let oy = -radius; oy <= radius; oy += 1) {
    const py = y + oy;
    if (py < 0 || py >= height) continue;
    for (let ox = -radius; ox <= radius; ox += 1) {
      const px = x + ox;
      if (px < 0 || px >= width || (px === x && py === y)) continue;
      const alpha = data[(py * width + px) * 4 + 3];
      if (alpha < threshold) continue;
      total += 1;
      if (ox < 0) buckets.left += 1;
      if (ox > 0) buckets.right += 1;
      if (oy < 0) buckets.up += 1;
      if (oy > 0) buckets.down += 1;
    }
  }
  const horizontal = buckets.left >= 3 && buckets.right >= 3;
  const vertical = buckets.up >= 3 && buckets.down >= 3;
  return total >= 16 && (horizontal || vertical) && (buckets.left + buckets.right >= 7) && (buckets.up + buckets.down >= 7);
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

function analyzeMatteQuality(cutoutCanvas, originalCanvas, settings) {
  if (!cutoutCanvas?.width) {
    return { warnings: [], alphaCoverage: 0, edgeJaggednessScore: 0, semiTransparentCoreRatio: 0, lightRegionLossRatio: 0, lineArtLossRatio: 0, whiteFringeRatio: 0 };
  }
  const width = cutoutCanvas.width;
  const height = cutoutCanvas.height;
  const cutoutData = cutoutCanvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, width, height);
  const originalData = getCanvasImageDataAtSize(originalCanvas, width, height);
  const metrics = computeMatteMetrics(cutoutData, originalData, settings);
  const warnings = [];
  if (metrics.semiTransparentCoreRatio > 0.24) warnings.push("主体核心存在过多半透明，已尝试增强。");
  if (metrics.lineArtLossRatio > 0.16) warnings.push("检测到线稿可能断裂。");
  if (metrics.lightRegionLossRatio > 0.2) warnings.push("检测到浅色区域可能缺失。");
  if (metrics.whiteFringeRatio > 0.08) warnings.push("边缘仍有白边残留。");
  if (metrics.edgeJaggednessScore > 0.42) warnings.push("边缘锯齿风险偏高。");
  return { ...metrics, warnings };
}

function shouldRetryWithPreserveMatte(quality, settings) {
  if (!quality || settings.fidelity === "preserve") return false;
  const illustrationLike = settings.imageType === "illustration" || settings.imageType === "line-art" || settings.imageType === "sticker";
  if (illustrationLike && quality.lineArtLossRatio > 0.12) return true;
  if (illustrationLike && quality.lightRegionLossRatio > 0.18) return true;
  if (quality.semiTransparentCoreRatio > 0.36) return true;
  return false;
}

function shouldRetryWithSmoothEdgeMatte(quality, settings) {
  if (!quality || settings.imageType !== "product" || settings.edgeOptimized) return false;
  if (settings.fidelity === "preserve") return false;
  return quality.edgeJaggednessScore > 0.38 || quality.whiteFringeRatio > 0.075;
}

function buildSmoothEdgeMatteProfile(settings) {
  return {
    ...settings,
    edgeOptimized: true,
    fidelity: "clean",
    alphaBoost: "clean",
    edgeSmooth: Math.min(4, Number(settings.edgeSmooth || 0) + 1),
    feather: Math.min(3, Number(settings.feather || 0) + 1),
    cleanup: Math.max(Number(settings.cleanup || 0), 32),
    residueThreshold: Math.max(Number(settings.residueThreshold || 0), 30),
    edgeLow: Math.max(10, Math.round(Number(settings.edgeLow || settings.cleanup || 24) * 0.82)),
    coreThreshold: Math.min(Number(settings.coreThreshold || 198), 176),
    solidThreshold: Math.min(Number(settings.solidThreshold || 198), 176),
    midBoost: Math.max(Number(settings.midBoost || 1.08), 1.16),
    despeckleStrength: Math.max(Number(settings.despeckleStrength || 1), 1.18),
  };
}

function shouldUseSmoothEdgeMatte(primaryQuality, smoothQuality, settings = {}) {
  if (!primaryQuality || !smoothQuality || settings.imageType !== "product") return false;
  const edgeImproved = (
    smoothQuality.edgeJaggednessScore < primaryQuality.edgeJaggednessScore - 0.035 ||
    smoothQuality.edgeJaggednessScore < primaryQuality.edgeJaggednessScore * 0.88
  );
  if (!edgeImproved && smoothQuality.whiteFringeRatio >= primaryQuality.whiteFringeRatio * 0.92) return false;
  const keepsCoverage = smoothQuality.alphaCoverage >= primaryQuality.alphaCoverage * 0.965;
  const keepsCore = smoothQuality.semiTransparentCoreRatio <= primaryQuality.semiTransparentCoreRatio + 0.08;
  const keepsLight = smoothQuality.lightRegionLossRatio <= primaryQuality.lightRegionLossRatio + 0.055;
  const keepsLine = smoothQuality.lineArtLossRatio <= primaryQuality.lineArtLossRatio + 0.045;
  const keepsFringe = smoothQuality.whiteFringeRatio <= primaryQuality.whiteFringeRatio + 0.04;
  return keepsCoverage && keepsCore && keepsLight && keepsLine && keepsFringe;
}

function shouldUseFallbackMatte(primaryQuality, fallbackQuality, settings = {}) {
  if (!primaryQuality || !fallbackQuality) return Boolean(fallbackQuality);
  const primaryPenalty = matteQualityPenalty(primaryQuality, settings);
  const fallbackPenalty = matteQualityPenalty(fallbackQuality, settings);
  const improvesCritical = (
    fallbackQuality.lineArtLossRatio < primaryQuality.lineArtLossRatio * 0.82 ||
    fallbackQuality.lightRegionLossRatio < primaryQuality.lightRegionLossRatio * 0.82 ||
    fallbackQuality.semiTransparentCoreRatio < primaryQuality.semiTransparentCoreRatio * 0.82
  );
  const worsensCleanup = (
    fallbackQuality.whiteFringeRatio > primaryQuality.whiteFringeRatio + 0.035 ||
    fallbackQuality.edgeJaggednessScore > primaryQuality.edgeJaggednessScore + 0.08
  );
  if (worsensCleanup && fallbackPenalty >= primaryPenalty * 0.92) return false;
  return fallbackPenalty < primaryPenalty * 0.98 || improvesCritical;
}

function matteQualityPenalty(quality, settings = {}) {
  const illustrationLike = settings.imageType === "illustration" || settings.imageType === "line-art" || settings.imageType === "sticker";
  const lineWeight = illustrationLike ? 3.2 : 1.2;
  const lightWeight = illustrationLike ? 2.8 : 1.1;
  return (
    (quality.lineArtLossRatio || 0) * lineWeight +
    (quality.lightRegionLossRatio || 0) * lightWeight +
    (quality.semiTransparentCoreRatio || 0) * 2.2 +
    (quality.whiteFringeRatio || 0) * 1.8 +
    (quality.edgeJaggednessScore || 0) * 0.85
  );
}

function getCanvasImageDataAtSize(canvas, width, height) {
  if (!canvas?.width) return null;
  const scaled = document.createElement("canvas");
  scaled.width = width;
  scaled.height = height;
  const ctx = scaled.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

function computeMatteMetrics(cutoutData, originalData, settings = {}) {
  const { width, height, data } = cutoutData;
  const original = originalData?.data;
  let alphaArea = 0;
  let coreArea = 0;
  let semiCore = 0;
  let edgeAlpha = 0;
  let edgeTransitions = 0;
  let jaggedTransitions = 0;
  let possibleLight = 0;
  let lostLight = 0;
  let possibleLine = 0;
  let lostLine = 0;
  let fringe = 0;
  let lowAlphaFringe = 0;
  let fringeAlphaSum = 0;
  const supportThreshold = Math.max(12, settings.edgeLow || 16);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const offset = index * 4;
      const alpha = data[offset + 3];
      if (alpha > supportThreshold) alphaArea += 1;
      const stableCore = alpha > 150 && hasStrongAlphaNeighborFromData(data, width, height, x, y, 2, 176, 5);
      if (stableCore) {
        coreArea += 1;
        if (alpha < 232) semiCore += 1;
      }
      if (alpha > 0 && alpha < 245) edgeAlpha += 1;

      const rightAlpha = data[offset + 7];
      const downAlpha = data[((y + 1) * width + x) * 4 + 3];
      const transition = Math.abs(alpha - rightAlpha) + Math.abs(alpha - downAlpha);
      if (transition > 80) {
        edgeTransitions += 1;
        const diagA = data[((y - 1) * width + x - 1) * 4 + 3];
        const diagB = data[((y + 1) * width + x + 1) * 4 + 3];
        if (Math.abs(diagA - diagB) > 120 && transition > 220) jaggedTransitions += 1;
      }

      if (!original) continue;
      const red = original[offset];
      const green = original[offset + 1];
      const blue = original[offset + 2];
      const metrics = colorMetrics(red, green, blue);
      const nearForeground = alpha > 0 || hasOpaqueNeighbor(data, width, height, x, y, 2, supportThreshold);
      if (!nearForeground) continue;

      const lineCandidate = metrics.lightness < 118 && metrics.saturation < 0.82;
      const protectedInteriorLightCandidate = shouldProtectInteriorWhite(settings)
        && metrics.lightness > 230
        && metrics.lightness < 252
        && metrics.saturation < 0.18
        && isOriginalEnclosedLightDetail(original, width, height, x, y, 7);
      const lightCandidate = (metrics.lightness > 168 && metrics.lightness < 246 && metrics.saturation > 0.055)
        || protectedInteriorLightCandidate;
      const sourceDarkBackgroundPixel = isSourceDarkBackgroundPixel(original, offset, metrics, settings)
        && (alpha < 80 || hasTransparentNeighbor(data, width, height, x, y, 2, supportThreshold));
      if (lineCandidate && !sourceDarkBackgroundPixel) {
        possibleLine += 1;
        if (alpha < 80) lostLine += 1;
      }
      if (lightCandidate) {
        possibleLight += 1;
        if (alpha < 54) lostLight += 1;
      }
      const resultMetrics = colorMetrics(data[offset], data[offset + 1], data[offset + 2]);
      const whiteEdgePixel = resultMetrics.lightness > 238 && resultMetrics.saturation < 0.14;
      if (
        alpha > 0
        && alpha < (settings.preserveLineArt ? 24 : 128)
        && whiteEdgePixel
        && hasTransparentNeighbor(data, width, height, x, y, 2, supportThreshold)
        && hasColoredOpaqueNeighbor(data, width, height, x, y, 3, 128)
        && !hasLightOpaqueNeighbor(data, width, height, x, y, 2, 176)
      ) {
        fringe += 1;
        fringeAlphaSum += alpha;
        if (alpha < 24) lowAlphaFringe += 1;
      }
    }
  }

  return {
    alphaCoverage: alphaArea / Math.max(1, width * height),
    edgeJaggednessScore: jaggedTransitions / Math.max(1, edgeTransitions),
    semiTransparentCoreRatio: semiCore / Math.max(1, coreArea),
    lightRegionLossRatio: lostLight / Math.max(1, possibleLight),
    lineArtLossRatio: lostLine / Math.max(1, possibleLine),
    whiteFringeRatio: fringe / Math.max(1, edgeAlpha),
    whiteFringePixels: fringe,
    whiteFringeEdgePixels: edgeAlpha,
    whiteFringeAreaRatio: fringe / Math.max(1, width * height),
    lowAlphaWhiteFringeRatio: lowAlphaFringe / Math.max(1, fringe),
    whiteFringeAverageAlpha: fringeAlphaSum / Math.max(1, fringe),
  };
}

function isSourceDarkBackgroundPixel(originalData, offset, metrics, settings = {}) {
  if (!settings.darkBackgroundCleanup) return false;
  const backgroundColor = Array.isArray(settings.darkBackgroundColor) ? settings.darkBackgroundColor : [0, 0, 0];
  const distance = Math.sqrt(colorDistanceToRgbSq(originalData, offset, backgroundColor));
  return distance <= 132 || (metrics.lightness < 112 && metrics.saturation < 0.28);
}

function hasOpaqueNeighbor(data, width, height, x, y, radius, threshold) {
  for (let oy = -radius; oy <= radius; oy += 1) {
    const py = y + oy;
    if (py < 0 || py >= height) continue;
    for (let ox = -radius; ox <= radius; ox += 1) {
      const px = x + ox;
      if (px < 0 || px >= width) continue;
      if (data[(py * width + px) * 4 + 3] > threshold) return true;
    }
  }
  return false;
}

function hasColoredOpaqueNeighbor(data, width, height, x, y, radius, threshold) {
  for (let oy = -radius; oy <= radius; oy += 1) {
    const py = y + oy;
    if (py < 0 || py >= height) continue;
    for (let ox = -radius; ox <= radius; ox += 1) {
      const px = x + ox;
      if (px < 0 || px >= width || (px === x && py === y)) continue;
      const offset = (py * width + px) * 4;
      if (data[offset + 3] <= threshold) continue;
      const metrics = colorMetrics(data[offset], data[offset + 1], data[offset + 2]);
      if (metrics.lightness < 226 || metrics.saturation > 0.18) return true;
    }
  }
  return false;
}

function hasLightOpaqueNeighbor(data, width, height, x, y, radius, threshold) {
  for (let oy = -radius; oy <= radius; oy += 1) {
    const py = y + oy;
    if (py < 0 || py >= height) continue;
    for (let ox = -radius; ox <= radius; ox += 1) {
      const px = x + ox;
      if (px < 0 || px >= width || (px === x && py === y)) continue;
      const offset = (py * width + px) * 4;
      if (data[offset + 3] <= threshold) continue;
      const metrics = colorMetrics(data[offset], data[offset + 1], data[offset + 2]);
      if (metrics.lightness > 228 && metrics.saturation < 0.16) return true;
    }
  }
  return false;
}

function hasStrongAlphaNeighborFromData(data, width, height, x, y, radius, threshold, minCount) {
  let count = 0;
  for (let oy = -radius; oy <= radius; oy += 1) {
    const py = y + oy;
    if (py < 0 || py >= height) continue;
    for (let ox = -radius; ox <= radius; ox += 1) {
      const px = x + ox;
      if (px < 0 || px >= width) continue;
      if (data[(py * width + px) * 4 + 3] >= threshold) {
        count += 1;
        if (count >= minCount) return true;
      }
    }
  }
  return false;
}

function hasTransparentNeighbor(data, width, height, x, y, radius, threshold) {
  for (let oy = -radius; oy <= radius; oy += 1) {
    const py = y + oy;
    if (py < 0 || py >= height) continue;
    for (let ox = -radius; ox <= radius; ox += 1) {
      const px = x + ox;
      if (px < 0 || px >= width || (px === x && py === y)) continue;
      if (data[(py * width + px) * 4 + 3] <= threshold) return true;
    }
  }
  return false;
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

function despeckleAlpha(imageData, threshold, strength = 1) {
  const { width, height, data } = imageData;
  const source = new Uint8ClampedArray(data);
  const neighborLimit = strength < 0.7 ? 0 : 1;
  const activeThreshold = threshold + Math.round(18 * strength);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = (y * width + x) * 4 + 3;
      if (source[offset] === 0 || source[offset] > activeThreshold) continue;
      let neighbors = 0;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          if (ox || oy) neighbors += source[((y + oy) * width + x + ox) * 4 + 3] > threshold ? 1 : 0;
        }
      }
      if (neighbors <= neighborLimit) data[offset] = 0;
    }
  }
}

function defringe(imageData, settings = {}) {
  const { width, height, data } = imageData;
  const source = new Uint8ClampedArray(data);
  const protectTransparent = settings.imageType === "transparentMaterial";
  const preserveMultiplier = settings.fidelity === "preserve" ? 0.78 : 1;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = source[offset + 3];
      if (alpha === 0 || alpha > 235) continue;
      const pixelMetrics = colorMetrics(source[offset], source[offset + 1], source[offset + 2]);
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      let coloredCount = 0;
      let transparentCount = 0;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const next = ((y + oy) * width + x + ox) * 4;
          const nextAlpha = source[next + 3];
          if (nextAlpha <= 16) transparentCount += 1;
          if (nextAlpha <= 220) continue;
          const metrics = colorMetrics(source[next], source[next + 1], source[next + 2]);
          r += source[next];
          g += source[next + 1];
          b += source[next + 2];
          count += 1;
          if (metrics.lightness < 228 || metrics.saturation > 0.18) coloredCount += 1;
        }
      }
      if (count) {
        data[offset] = Math.round(r / count);
        data[offset + 1] = Math.round(g / count);
        data[offset + 2] = Math.round(b / count);
      }
      const whiteFringe = pixelMetrics.lightness > 238 && pixelMetrics.saturation < 0.14;
      const fringeStrength = whiteFringeAlphaStrength(settings, alpha, transparentCount, coloredCount);
      if (whiteFringe && !protectTransparent && fringeStrength > 0) {
        data[offset + 3] = Math.round(alpha * fringeStrength * preserveMultiplier);
      }
    }
  }
}

function whiteFringeAlphaStrength(settings = {}, alpha = 255, transparentCount = 0, coloredCount = 0) {
  if (transparentCount < 1 || coloredCount < 1) return 0;
  if (settings.imageType === "product" && alpha < 150) return 0.18;
  const illustrationLike = settings.imageType === "illustration" || settings.imageType === "sticker" || settings.imageType === "line-art";
  if (illustrationLike && alpha < 150 && transparentCount >= 2) {
    return settings.fidelity === "preserve" ? 0.46 : 0.34;
  }
  return 0;
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
      coreBase: 68,
      supportBase: 22,
      minCoreFactor: 0.18,
      absorbScale: 0.01,
      mergeDistance: 6,
      gapDensityRatio: 0.055,
      valleyDensityRatio: 0.34,
      gapMinRatio: 0.022,
      splitPaddingFactor: 1,
    },
    standard: {
      coreBase: 72,
      supportBase: 22,
      minCoreFactor: 0.12,
      absorbScale: 0.007,
      mergeDistance: 4,
      gapDensityRatio: 0.075,
      valleyDensityRatio: 0.4,
      gapMinRatio: 0.018,
      splitPaddingFactor: 0.8,
    },
    strong: {
      coreBase: 80,
      supportBase: 24,
      minCoreFactor: 0.08,
      absorbScale: 0.0045,
      mergeDistance: 2,
      gapDensityRatio: 0.1,
      valleyDensityRatio: 0.48,
      gapMinRatio: 0.012,
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
  components = splitLargeComponents(components, imageData, coreMask, width, height, minCoreArea, pad, settings);
  components = stabilizeOverSplitComponents(components, imageData, coreMask, supportThreshold, minCoreArea, minArea, pad, settings);
  components = stabilizeTinyFragmentBurst(components, imageData, minArea, settings);

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
  const smallScore = scoreSmallComponent(component, imageArea, minArea);
  return (meaningfulArea || denseSmall || smallScore >= 0.72) && !residualLine && !weakResidual;
}

function scoreSmallComponent(component, imageArea, minArea) {
  const boxArea = Math.max(1, component.width * component.height);
  const alphaArea = component.alphaArea ?? component.area ?? 0;
  const strongAlphaArea = component.strongAlphaArea ?? alphaArea;
  const density = component.alphaDensity ?? alphaArea / boxArea;
  const aspect = component.width / Math.max(1, component.height);
  const minDimension = Math.min(component.width, component.height);
  const maxDimension = Math.max(component.width, component.height);
  const relativeArea = alphaArea / Math.max(1, imageArea);
  const sizeFloor = Math.max(10, Math.sqrt(imageArea) * 0.008);
  if (minDimension < 3 || maxDimension < sizeFloor) return 0;
  if (aspect > 7 || aspect < 1 / 7) return density > 0.62 ? 0.32 : 0;
  const sizeScore = clamp(alphaArea / Math.max(8, minArea * 0.32), 0, 1);
  const densityScore = clamp((density - 0.16) / 0.42, 0, 1);
  const strengthScore = clamp(strongAlphaArea / Math.max(5, alphaArea * 0.42), 0, 1);
  const shapeScore = aspect > 3.5 || aspect < 1 / 3.5 ? 0.72 : 1;
  const relativeBoost = relativeArea > 0.00012 ? 1 : 0.82;
  return (sizeScore * 0.34 + densityScore * 0.28 + strengthScore * 0.26 + shapeScore * 0.12) * relativeBoost;
}

function splitLargeComponents(components, imageData, coreMask, width, height, minCoreArea, pad, settings) {
  const imageArea = width * height;
  const output = [];

  for (const component of components) {
    output.push(...splitComponentRecursively(component, imageData, coreMask, width, height, minCoreArea, pad, settings, imageArea, 0));
  }

  return output;
}

function splitComponentRecursively(component, imageData, coreMask, width, height, minCoreArea, pad, settings, imageArea, depth) {
  if (depth >= 3) return [component];
  const children = splitLargeComponent(component, imageData, coreMask, width, height, minCoreArea, pad, settings);
  if (children.length < 2) return [component];
  return children.flatMap((child) => {
    if (!keepMultiObjectComponent(child, imageArea, minCoreArea)) return [];
    return splitComponentRecursively(child, imageData, coreMask, width, height, minCoreArea, pad, settings, imageArea, depth + 1);
  });
}

function splitLargeComponent(component, imageData, coreMask, width, height, minCoreArea, pad, settings = getSplitSettings()) {
  const imageArea = width * height;
  const boxArea = component.width * component.height;
  const largeBySize = component.width / width > 0.28 || component.height / height > 0.28;
  const sparseLarge = boxArea / imageArea > 0.22 && component.alphaDensity < 0.42;
  const coreChildren = findCoreSeedsInBox(coreMask, width, height, component, minCoreArea);
  const hasMultipleCore = coreChildren.length >= 2;
  if (!largeBySize && !sparseLarge && !hasMultipleCore) return [];

  const ownershipChildren = splitBySeedOwnership(component, imageData, coreChildren, minCoreArea, pad, settings);
  if (ownershipChildren.length >= 2) return ownershipChildren;

  const projectionChildren = projectionSplit(component, imageData, coreMask, minCoreArea, pad, settings);
  if (projectionChildren.length >= 2) return projectionChildren;

  const detachedSmallChildren = splitDetachedSmallSeedComponent(component, imageData, coreChildren, minCoreArea, pad, settings);
  if (detachedSmallChildren.length >= 2) return detachedSmallChildren;

  if (!hasMultipleCore || (!sparseLarge && component.alphaDensity > 0.28)) return [];

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

function splitDetachedSmallSeedComponent(component, imageData, coreChildren, minCoreArea, pad, settings) {
  if ((settings.mergeDistance ?? 4) > 2 || !coreChildren || coreChildren.length < 2 || coreChildren.length > 8) return [];
  const { width, height } = imageData;
  const imageArea = width * height;
  const splitPad = Math.max(1, Math.round(pad * settings.splitPaddingFactor));
  const alphaThreshold = Math.max(24, settings.supportBase);
  const children = coreChildren
    .filter((child) => child.area >= minCoreArea)
    .map((child, index) => {
      const padded = padBox(
        { minX: child.x, minY: child.y, maxX: child.x + child.width - 1, maxY: child.y + child.height - 1 },
        splitPad,
        width,
        height,
      );
      return measureBoxAsComponent({
        id: index + 1,
        x: padded.minX,
        y: padded.minY,
        width: padded.maxX - padded.minX + 1,
        height: padded.maxY - padded.minY + 1,
      }, imageData, alphaThreshold);
    })
    .filter((child) => keepMultiObjectComponent(child, imageArea, minCoreArea));
  if (children.length < 2) return [];

  const largest = children.reduce((best, child) => (child.area > best.area ? child : best), children[0]);
  const hasDetachedSmall = children.some((child) => child !== largest && isClearStandaloneSmallPart(child, largest, imageData, alphaThreshold));
  if (!hasDetachedSmall) return [];
  const parentArea = Math.max(1, component.area || measureComponent(component, imageData, alphaThreshold).alphaArea);
  const childArea = children.reduce((sum, child) => sum + (child.area || 0), 0);
  if (childArea < parentArea * 0.38) return [];
  return sortComponentsReadingOrder(children);
}

function splitBySeedOwnership(component, imageData, coreChildren, minCoreArea, pad, settings) {
  if (!coreChildren || coreChildren.length < 2 || settings.mergeDistance > 4) return [];
  const { width, height } = imageData;
  const imageArea = width * height;
  const parentMetrics = measureComponent(component, imageData, Math.max(24, settings.supportBase));
  const sparseOrLarge = parentMetrics.boxRatio > 0.12 || parentMetrics.alphaDensity < 0.34 || component.width / width > 0.26 || component.height / height > 0.26;
  if (!sparseOrLarge) return [];

  const seeds = coreChildren
    .filter((seed) => seed.area >= minCoreArea)
    .map((seed, index) => ({
      ...seed,
      id: index,
      cx: seed.x + seed.width / 2,
      cy: seed.y + seed.height / 2,
    }));
  if (seeds.length < 2) return [];

  const minCenterX = Math.min(...seeds.map((seed) => seed.cx));
  const maxCenterX = Math.max(...seeds.map((seed) => seed.cx));
  const minCenterY = Math.min(...seeds.map((seed) => seed.cy));
  const maxCenterY = Math.max(...seeds.map((seed) => seed.cy));
  const spanX = (maxCenterX - minCenterX) / Math.max(1, component.width);
  const spanY = (maxCenterY - minCenterY) / Math.max(1, component.height);
  const dominantAxis = spanX >= spanY ? "x" : "y";
  if (Math.max(spanX, spanY) < 0.26) return [];

  const supportMask = createAlphaMask(imageData, Math.max(16, settings.supportBase));
  const clusters = seeds.map((seed) => ({
    seed,
    area: 0,
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  }));
  const startX = Math.max(0, Math.floor(component.x));
  const startY = Math.max(0, Math.floor(component.y));
  const endX = Math.min(width, Math.ceil(component.x + component.width));
  const endY = Math.min(height, Math.ceil(component.y + component.height));

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const index = y * width + x;
      if (!supportMask[index]) continue;
      let best = null;
      let bestDistance = Infinity;
      for (const cluster of clusters) {
        const dx = (x - cluster.seed.cx) / Math.max(1, component.width);
        const dy = (y - cluster.seed.cy) / Math.max(1, component.height);
        const distance = dx * dx + dy * dy;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = cluster;
        }
      }
      if (!best) continue;
      best.area += 1;
      if (x < best.minX) best.minX = x;
      if (x > best.maxX) best.maxX = x;
      if (y < best.minY) best.minY = y;
      if (y > best.maxY) best.maxY = y;
    }
  }

  const splitPad = Math.max(1, Math.round(pad * settings.splitPaddingFactor));
  const children = clusters
    .filter((cluster) => cluster.area >= Math.max(6, minCoreArea * 0.7) && Number.isFinite(cluster.minX))
    .map((cluster, index) => {
      const padded = padBox(cluster, splitPad, width, height);
      return measureBoxAsComponent({
        id: index + 1,
        x: padded.minX,
        y: padded.minY,
        width: padded.maxX - padded.minX + 1,
        height: padded.maxY - padded.minY + 1,
      }, imageData, Math.max(24, settings.supportBase));
    })
    .filter((child) => keepMultiObjectComponent(child, imageArea, minCoreArea));
  if (children.length < 2) return [];

  const sorted = [...children].sort((a, b) => dominantAxis === "x" ? a.x - b.x : a.y - b.y);
  if (!hasProjectionValleyBetweenChildren(sorted, component, imageData, dominantAxis, settings)) return [];
  const childDensity = sorted.reduce((sum, child) => sum + child.alphaDensity, 0) / sorted.length;
  const childArea = sorted.reduce((sum, child) => sum + child.area, 0);
  if (childDensity < parentMetrics.alphaDensity * 0.78) return [];
  const minChildCoverage = (settings.mergeDistance ?? 4) <= 2 ? 0.54 : 0.72;
  if (childArea < parentMetrics.alphaArea * minChildCoverage) return [];
  return sorted;
}

function hasProjectionValleyBetweenChildren(children, component, imageData, axis, settings) {
  if (children.length < 2) return false;
  const { width, data } = imageData;
  const alphaThreshold = Math.max(24, settings.supportBase);
  const strongThreshold = Math.max(96, alphaThreshold * 3.2);
  const valleys = [];
  const strongValleys = [];
  for (let index = 0; index < children.length - 1; index += 1) {
    const left = children[index];
    const right = children[index + 1];
    const cut = axis === "x"
      ? Math.round((left.x + left.width + right.x) / 2)
      : Math.round((left.y + left.height + right.y) / 2);
    const strip = projectionStripDensity(component, data, width, imageData.height, axis, cut, alphaThreshold);
    const strongStrip = projectionStripDensity(component, data, width, imageData.height, axis, cut, strongThreshold);
    valleys.push(strip);
    strongValleys.push(strongStrip);
  }
  return valleys.some((value) => value <= 0.18)
    || strongValleys.some((value) => value <= 0.08)
    || (
    valleys.length >= 2 && valleys.reduce((sum, value) => sum + value, 0) / valleys.length <= 0.26
  );
}

function projectionStripDensity(component, data, width, height, axis, cut, alphaThreshold) {
  const radius = 2;
  const startX = Math.max(0, Math.floor(component.x));
  const startY = Math.max(0, Math.floor(component.y));
  const endX = Math.min(width, Math.ceil(component.x + component.width));
  const endY = Math.min(height, Math.ceil(component.y + component.height));
  let opaque = 0;
  let total = 0;
  if (axis === "x") {
    for (let x = Math.max(startX, cut - radius); x <= Math.min(endX - 1, cut + radius); x += 1) {
      for (let y = startY; y < endY; y += 1) {
        total += 1;
        if (data[(y * width + x) * 4 + 3] >= alphaThreshold) opaque += 1;
      }
    }
  } else {
    for (let y = Math.max(startY, cut - radius); y <= Math.min(endY - 1, cut + radius); y += 1) {
      for (let x = startX; x < endX; x += 1) {
        total += 1;
        if (data[(y * width + x) * 4 + 3] >= alphaThreshold) opaque += 1;
      }
    }
  }
  return total ? opaque / total : 1;
}

function projectionSplit(component, imageData, coreMask, minCoreArea, pad, settings) {
  const vertical = splitByProjection(component, imageData, coreMask, "x", minCoreArea, pad, settings);
  if (vertical.length >= 2) return vertical;
  const horizontal = splitByProjection(component, imageData, coreMask, "y", minCoreArea, pad, settings);
  if (horizontal.length >= 2) return horizontal;
  const verticalPeaks = splitByProjectionPeaks(component, imageData, coreMask, "x", minCoreArea, pad, settings);
  if (verticalPeaks.length >= 2) return verticalPeaks;
  const horizontalPeaks = splitByProjectionPeaks(component, imageData, coreMask, "y", minCoreArea, pad, settings);
  if (horizontalPeaks.length >= 2) return horizontalPeaks;
  const verticalValleys = splitByProjectionValleys(component, imageData, coreMask, "x", minCoreArea, pad, settings);
  if (verticalValleys.length >= 2) return verticalValleys;
  const horizontalValleys = splitByProjectionValleys(component, imageData, coreMask, "y", minCoreArea, pad, settings);
  if (horizontalValleys.length >= 2) return horizontalValleys;
  const repeatedStack = splitRepeatedStackComponent(component, imageData, coreMask, minCoreArea, pad, settings);
  if (repeatedStack.length >= 2) return repeatedStack;
  return splitStackedComponent(component, imageData, coreMask, minCoreArea, pad, settings);
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

  if (children.length < 2) return [];
  return hasProjectionValleyBetweenChildren(children, component, imageData, axis, settings) ? children : [];
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
  if (!hasProjectionValleyBetweenChildren(children, component, imageData, axis, settings)) return [];

  const parentDensity = measureComponent(component, imageData, Math.max(24, settings.supportBase)).alphaDensity;
  const childDensity = children.reduce((sum, child) => sum + child.alphaDensity, 0) / children.length;
  return childDensity >= parentDensity * 0.72 ? children : [];
}

function splitByProjectionValleys(component, imageData, coreMask, axis, minCoreArea, pad, settings) {
  if ((settings.mergeDistance ?? 4) > 4) return [];
  const { width, height } = imageData;
  const startX = Math.max(0, Math.floor(component.x));
  const startY = Math.max(0, Math.floor(component.y));
  const endX = Math.min(width, Math.ceil(component.x + component.width));
  const endY = Math.min(height, Math.ceil(component.y + component.height));
  const length = axis === "x" ? endX - startX : endY - startY;
  const crossLength = axis === "x" ? endY - startY : endX - startX;
  if (length < 72 || crossLength < 24) return [];

  const projection = new Array(length).fill(0);
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      if (!coreMask[y * width + x]) continue;
      projection[axis === "x" ? x - startX : y - startY] += 1;
    }
  }

  const smoothed = smoothProjection(projection, Math.max(3, Math.round(length * 0.018)));
  const nonZero = smoothed.filter(Boolean);
  if (nonZero.length < length * 0.38) return [];
  const max = Math.max(...smoothed);
  const average = nonZero.reduce((sum, value) => sum + value, 0) / nonZero.length;
  const window = Math.max(8, Math.round(length * 0.08));
  const minSeparation = Math.max(18, Math.round(length * 0.18));
  const candidates = [];

  for (let i = Math.round(length * 0.12); i < length * 0.88; i += 1) {
    const value = smoothed[i];
    if (value <= 0 || value > Math.min(max * 0.82, average * 0.92)) continue;
    const leftPeak = Math.max(...smoothed.slice(Math.max(0, i - window), i));
    const rightPeak = Math.max(...smoothed.slice(i + 1, Math.min(length, i + window + 1)));
    const localPeak = Math.min(leftPeak, rightPeak);
    if (localPeak < Math.max(average * 0.82, max * 0.42)) continue;
    if (value > localPeak * 0.72 && value > average * 0.7) continue;
    const neighborhood = smoothed.slice(Math.max(0, i - 3), Math.min(length, i + 4));
    if (value > Math.min(...neighborhood)) continue;
    const previous = candidates[candidates.length - 1];
    if (previous && i - previous.index < minSeparation) {
      if (value < previous.value) candidates[candidates.length - 1] = { index: i, value };
    } else {
      candidates.push({ index: i, value });
    }
  }

  const cuts = candidates.map((candidate) => candidate.index);
  if (!cuts.length) return [];
  const ranges = [];
  let last = 0;
  for (const cut of cuts) {
    ranges.push([last, cut]);
    last = cut;
  }
  ranges.push([last, length]);

  const children = componentsFromProjectionRanges(ranges, axis, { startX, startY, endX, endY }, imageData, coreMask, minCoreArea, pad, settings);
  if (children.length < 2) return [];
  if (!hasProjectionValleyBetweenChildren(children, component, imageData, axis, settings)) return [];
  const parentDensity = measureComponent(component, imageData, Math.max(24, settings.supportBase)).alphaDensity;
  const childDensity = children.reduce((sum, child) => sum + child.alphaDensity, 0) / children.length;
  return childDensity >= parentDensity * 0.62 ? children : [];
}

function splitStackedComponent(component, imageData, coreMask, minCoreArea, pad, settings) {
  if ((settings.mergeDistance ?? 4) > 2) return [];
  const aspect = component.height / Math.max(1, component.width);
  if (aspect < 1.85 || component.height < 120) return [];
  const estimatedParts = clamp(Math.round(aspect), 2, 4);
  const { width, height } = imageData;
  const startX = Math.max(0, Math.floor(component.x));
  const startY = Math.max(0, Math.floor(component.y));
  const endX = Math.min(width, Math.ceil(component.x + component.width));
  const endY = Math.min(height, Math.ceil(component.y + component.height));
  const length = endY - startY;
  if (length < 80) return [];

  const projection = new Array(length).fill(0);
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      if (coreMask[y * width + x]) projection[y - startY] += 1;
    }
  }
  const smoothed = smoothProjection(projection, Math.max(4, Math.round(length * 0.025)));
  const cuts = [];
  const searchRadius = Math.max(14, Math.round(length / estimatedParts * 0.22));
  for (let part = 1; part < estimatedParts; part += 1) {
    const target = Math.round((length * part) / estimatedParts);
    let bestIndex = target;
    let bestValue = Infinity;
    for (let cursor = Math.max(8, target - searchRadius); cursor <= Math.min(length - 8, target + searchRadius); cursor += 1) {
      const value = smoothed[cursor] ?? 0;
      if (value < bestValue) {
        bestValue = value;
        bestIndex = cursor;
      }
    }
    if (!cuts.length || bestIndex - cuts[cuts.length - 1] > length * 0.18) cuts.push(bestIndex);
  }
  if (!cuts.length) return [];

  const ranges = [];
  let last = 0;
  for (const cut of cuts) {
    ranges.push([last, cut]);
    last = cut;
  }
  ranges.push([last, length]);
  const children = componentsFromProjectionRanges(ranges, "y", { startX, startY, endX, endY }, imageData, coreMask, minCoreArea, pad, settings);
  if (children.length < 2) return [];
  if (!hasProjectionValleyBetweenChildren(children, component, imageData, "y", settings)) return [];
  const parentArea = measureComponent(component, imageData, Math.max(24, settings.supportBase)).alphaArea;
  const childArea = children.reduce((sum, child) => sum + child.area, 0);
  return childArea >= parentArea * 0.68 ? children : [];
}

function splitRepeatedStackComponent(component, imageData, coreMask, minCoreArea, pad, settings) {
  if ((settings.mergeDistance ?? 4) > 2) return [];
  const aspect = component.height / Math.max(1, component.width);
  if (aspect < 2.05 || component.height < 120 || component.width < 24) return [];

  const estimatedParts = clamp(Math.round(aspect), 2, 5);
  if (estimatedParts < 2) return [];

  const { width, height } = imageData;
  const startX = Math.max(0, Math.floor(component.x));
  const startY = Math.max(0, Math.floor(component.y));
  const endX = Math.min(width, Math.ceil(component.x + component.width));
  const endY = Math.min(height, Math.ceil(component.y + component.height));
  const length = endY - startY;
  if (length < 90) return [];

  const projection = new Array(length).fill(0);
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      if (coreMask[y * width + x]) projection[y - startY] += 1;
    }
  }

  const smoothed = smoothProjection(projection, Math.max(3, Math.round(length * 0.018)));
  const nonZero = smoothed.filter(Boolean);
  if (nonZero.length < length * 0.56) return [];
  const average = nonZero.reduce((sum, value) => sum + value, 0) / nonZero.length;
  const max = Math.max(...smoothed);
  if (!max || average < component.width * 0.18) return [];

  const cuts = [];
  const partHeight = length / estimatedParts;
  const searchRadius = Math.max(12, Math.round(partHeight * 0.32));
  for (let part = 1; part < estimatedParts; part += 1) {
    const target = Math.round(partHeight * part);
    let bestIndex = -1;
    let bestValue = Infinity;
    for (let cursor = Math.max(6, target - searchRadius); cursor <= Math.min(length - 6, target + searchRadius); cursor += 1) {
      const value = smoothed[cursor] ?? 0;
      if (value < bestValue) {
        bestValue = value;
        bestIndex = cursor;
      }
    }
    if (bestIndex < 0) continue;
    const isRealValley = bestValue <= max * 0.94 || bestValue <= average * 1.08;
    const farFromPrevious = !cuts.length || bestIndex - cuts[cuts.length - 1] >= partHeight * 0.45;
    if (isRealValley && farFromPrevious) cuts.push(bestIndex);
  }
  if (cuts.length < estimatedParts - 1) return [];

  const ranges = [];
  let last = 0;
  for (const cut of cuts) {
    ranges.push([last, cut]);
    last = cut;
  }
  ranges.push([last, length]);

  const children = componentsFromProjectionRanges(ranges, "y", { startX, startY, endX, endY }, imageData, coreMask, minCoreArea, pad, settings);
  if (children.length !== estimatedParts) return [];
  const parentArea = measureComponent(component, imageData, Math.max(24, settings.supportBase)).alphaArea;
  const childArea = children.reduce((sum, child) => sum + child.area, 0);
  const denseChildren = children.filter((child) => child.alphaDensity >= 0.18 && child.area >= minCoreArea).length;
  if (denseChildren !== children.length || childArea < parentArea * 0.7) return [];
  return children;
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

function absorbTinyMultiObjectFragments(components, imageArea, minArea, settings = getSplitSettings()) {
  const sorted = [...components].sort((a, b) => b.area - a.area);
  const large = sorted.filter((component) => component.area >= Math.max(minArea, imageArea * 0.0012));
  const output = large.map((component) => ({ ...component }));
  const absorbDistance = Math.max(2, Math.round(Math.sqrt(imageArea) * (settings.absorbScale || 0.006)));

  for (const component of sorted) {
    if (large.includes(component)) continue;
    if (component.area >= imageArea * 0.00065 && settings.mergeDistance <= 4) {
      output.push({ ...component });
      continue;
    }
    const target = output
      .map((candidate) => ({ candidate, distance: boxDistance(component, candidate) }))
      .filter((entry) => entry.distance <= absorbDistance)
      .sort((a, b) => a.distance - b.distance)[0]?.candidate;
    if (target) mergeBoxInto(target, component);
    else output.push({ ...component });
  }

  return output;
}

function stabilizeTinyFragmentBurst(components, imageData, minArea, settings = getSplitSettings()) {
  state.lastTinyFragmentDebug = { before: components.length, stage: "skip", after: components.length };
  if (components.length <= 14) return components;
  const { width, height } = imageData;
  const imageArea = width * height;
  const sorted = [...components].sort((a, b) => (b.area || 0) - (a.area || 0));
  const output = [];
  const absorbDistance = Math.max(4, Math.round(Math.sqrt(imageArea) * Math.max(0.012, (settings.absorbScale || 0.006) * 2.4)));
  const tinyArea = Math.max(minArea * 0.34, imageArea * 0.00022);
  const weakArea = Math.max(minArea * 0.62, imageArea * 0.00042);

  for (const component of sorted) {
    const measured = measureBoxAsComponent(component, imageData, Math.max(24, settings.supportBase || 22));
    const quality = scoreSmallComponent(measured, imageArea, minArea);
    const minDimension = Math.min(measured.width, measured.height);
    const aspect = measured.width / Math.max(1, measured.height);
    const lineLike = (aspect > 6.5 || aspect < 1 / 6.5) && measured.alphaDensity < 0.48;
    const tiny = measured.area < tinyArea || minDimension <= 4;
    const weak = quality < 0.66 || (measured.area < weakArea && measured.alphaDensity < 0.28) || lineLike;
    const clearSmallElement = quality >= 0.82 && measured.area >= tinyArea && measured.alphaDensity >= 0.3 && minDimension >= 7;

    if (!weak || clearSmallElement) {
      output.push({ ...measured });
      continue;
    }

    const target = output
      .map((candidate) => ({
        candidate,
        distance: boxDistance(measured, candidate),
        overlapX: axisOverlapRatio(measured.x, measured.width, candidate.x, candidate.width),
        overlapY: axisOverlapRatio(measured.y, measured.height, candidate.y, candidate.height),
      }))
      .filter((entry) => entry.distance <= absorbDistance && (entry.overlapX > 0.08 || entry.overlapY > 0.08 || entry.distance <= 2))
      .sort((a, b) => a.distance - b.distance)[0]?.candidate;

    if (target) {
      mergeBoxInto(target, measured);
      Object.assign(target, measureBoxAsComponent(target, imageData, Math.max(24, settings.supportBase || 22)));
    } else if (!tiny && quality >= 0.74) {
      output.push({ ...measured });
    }
  }

  if (output.length < Math.max(2, components.length * 0.38)) return components;
  const compacted = compactNearbySmallComponents(output, imageData, minArea, settings);
  state.lastTinyFragmentDebug = {
    before: components.length,
    stage: compacted.length < output.length ? "compact" : "filter",
    after: compacted.length,
  };
  return compacted.map((component, index) => ({ ...component, id: index + 1 }));
}

function compactNearbySmallComponents(components, imageData, minArea, settings = getSplitSettings()) {
  if (components.length <= 14) return components;
  const { width, height } = imageData;
  const imageArea = width * height;
  const alphaThreshold = Math.max(24, settings.supportBase || 22);
  const targetCount = 14;
  const clusterDistance = Math.max(8, Math.round(Math.sqrt(imageArea) * 0.035));
  const smallBoxRatio = 0.018;
  const boxes = components.map((component) => measureBoxAsComponent(component, imageData, alphaThreshold));

  while (boxes.length > targetCount) {
    let best = null;
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const distance = boxDistance(a, b);
        if (distance > clusterDistance) continue;
        const aBoxRatio = (a.width * a.height) / imageArea;
        const bBoxRatio = (b.width * b.height) / imageArea;
        const smallerBoxRatio = Math.min(aBoxRatio, bBoxRatio);
        if (aBoxRatio > smallBoxRatio && bBoxRatio > smallBoxRatio) continue;
        const overlapX = axisOverlapRatio(a.x, a.width, b.x, b.width);
        const overlapY = axisOverlapRatio(a.y, a.height, b.y, b.height);
        if (overlapX < 0.04 && overlapY < 0.04 && distance > clusterDistance * 0.55) continue;
        const merged = measureBoxAsComponent(mergedBox(a, b), imageData, alphaThreshold);
        const weightedDensity = (
          a.alphaDensity * a.width * a.height +
          b.alphaDensity * b.width * b.height
        ) / Math.max(1, a.width * a.height + b.width * b.height);
        if (merged.alphaDensity < weightedDensity * 0.58) continue;
        const score = distance + smallerBoxRatio * 1800 + (1 - Math.max(overlapX, overlapY)) * 12;
        if (!best || score < best.score) best = { i, j, merged, score };
      }
    }
    if (!best) break;
    boxes[best.i] = best.merged;
    boxes.splice(best.j, 1);
  }

  return boxes;
}

function stabilizeOverSplitComponents(components, imageData, coreMask, supportThreshold, minCoreArea, minArea, pad, settings = getSplitSettings()) {
  state.lastOverSplitDebug = { before: components.length, stage: "skip", grouped: 0, clustered: 0, accepted: components.length };
  if (components.length <= 18) return components;
  const { width, height } = imageData;
  const imageArea = width * height;
  const supportMask = createAlphaMask(imageData, Math.max(14, supportThreshold));
  const radius = Math.max(3, Math.min(9, Math.round(Math.sqrt(imageArea) * 0.012)));
  const groupedMask = dilateMask(supportMask, width, height, radius);
  let grouped = findComponentsFromMask(groupedMask, width, height, Math.max(minArea, minCoreArea * 2), Math.max(pad, radius))
    .map((component) => measureBoxAsComponent(component, imageData, Math.max(24, supportThreshold)))
    .filter((component) => keepMultiObjectComponent(component, imageArea, minArea));

  state.lastOverSplitDebug = { before: components.length, stage: "mask", grouped: grouped.length, clustered: 0, accepted: components.length };
  if (!grouped.length) return components;
  if (grouped.length === 1) {
    const forced = forceProjectionSplitOverSplitComponent(grouped[0], imageData, coreMask, minCoreArea, pad, settings);
    if (forced.length >= 3 && forced.length <= 24) {
      state.lastOverSplitDebug = { before: components.length, stage: "forced-projection", grouped: 1, clustered: forced.length, accepted: forced.length };
      return forced;
    }
  }

  grouped = splitLargeComponents(grouped, imageData, coreMask, width, height, minCoreArea, pad, {
    ...settings,
    mergeDistance: Math.min(settings.mergeDistance ?? 4, 4),
    splitPaddingFactor: Math.min(settings.splitPaddingFactor ?? 0.8, 0.8),
  });
  grouped = mergeAssetFragments(grouped, imageData, Math.max(24, supportThreshold), {
    ...settings,
    mergeDistance: Math.max(settings.mergeDistance ?? 4, 5),
  });
  grouped = grouped.filter((component) => keepMultiObjectComponent(component, imageArea, minArea));

  if (grouped.length < 2 || grouped.length > Math.max(32, components.length * 0.65)) {
    const maskCount = grouped.length;
    grouped = clusterOverSplitFragments(components, imageData, coreMask, supportThreshold, minCoreArea, minArea, pad, settings);
    state.lastOverSplitDebug = { before: components.length, stage: "cluster", grouped: maskCount, clustered: grouped.length, accepted: components.length };
  }
  if (grouped.length < 2 || grouped.length > Math.max(32, components.length * 0.85)) return components;
  const groupedArea = grouped.reduce((sum, component) => sum + (component.area || 0), 0);
  const originalArea = components.reduce((sum, component) => sum + (component.area || 0), 0);
  if (groupedArea < originalArea * 0.48) return components;
  state.lastOverSplitDebug = { before: components.length, stage: "accepted", grouped: grouped.length, clustered: grouped.length, accepted: grouped.length };
  return grouped;
}

function forceProjectionSplitOverSplitComponent(component, imageData, coreMask, minCoreArea, pad, settings = getSplitSettings()) {
  const vertical = forceProjectionSplitAxis(component, imageData, coreMask, "x", minCoreArea, pad, settings);
  if (vertical.length >= 2) return vertical;
  return forceProjectionSplitAxis(component, imageData, coreMask, "y", minCoreArea, pad, settings);
}

function forceProjectionSplitAxis(component, imageData, coreMask, axis, minCoreArea, pad, settings = getSplitSettings()) {
  const { width, height, data } = imageData;
  const startX = Math.max(0, Math.floor(component.x));
  const startY = Math.max(0, Math.floor(component.y));
  const endX = Math.min(width, Math.ceil(component.x + component.width));
  const endY = Math.min(height, Math.ceil(component.y + component.height));
  const length = axis === "x" ? endX - startX : endY - startY;
  const crossLength = axis === "x" ? endY - startY : endX - startX;
  if (length < 80 || crossLength < 24) return [];

  const projection = new Array(length).fill(0);
  const alphaThreshold = Math.max(24, settings.supportBase);
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      if (data[(y * width + x) * 4 + 3] < alphaThreshold) continue;
      projection[axis === "x" ? x - startX : y - startY] += 1;
    }
  }

  const smoothed = smoothProjection(projection, Math.max(4, Math.round(length * 0.022)));
  const nonZero = smoothed.filter(Boolean);
  if (nonZero.length < length * 0.28) return [];
  const max = Math.max(...smoothed);
  const average = nonZero.reduce((sum, value) => sum + value, 0) / nonZero.length;
  const window = Math.max(10, Math.round(length * 0.1));
  const minSeparation = Math.max(16, Math.round(length * 0.12));
  const candidates = [];

  for (let i = Math.round(length * 0.1); i < length * 0.9; i += 1) {
    const value = smoothed[i] || 0;
    const leftPeak = Math.max(...smoothed.slice(Math.max(0, i - window), i));
    const rightPeak = Math.max(...smoothed.slice(i + 1, Math.min(length, i + window + 1)));
    const localPeak = Math.min(leftPeak, rightPeak);
    if (localPeak < Math.max(average * 0.72, max * 0.28)) continue;
    if (value > Math.max(average * 0.72, localPeak * 0.68)) continue;
    const local = smoothed.slice(Math.max(0, i - 4), Math.min(length, i + 5));
    if (value > Math.min(...local)) continue;
    const previous = candidates[candidates.length - 1];
    if (previous && i - previous.index < minSeparation) {
      if (value < previous.value) candidates[candidates.length - 1] = { index: i, value };
    } else {
      candidates.push({ index: i, value });
    }
  }

  const cuts = candidates
    .map((candidate) => candidate.index)
    .filter((cut) => cut > length * 0.08 && cut < length * 0.92)
    .slice(0, 8);
  if (cuts.length === 1 && length >= 140) {
    const cut = cuts[0];
    const leftSize = cut;
    const rightSize = length - cut;
    const extra = leftSize >= rightSize
      ? bestSupplementalProjectionCut(smoothed, 0, cut, average, max)
      : bestSupplementalProjectionCut(smoothed, cut, length, average, max);
    if (extra > 0 && Math.abs(extra - cut) >= Math.max(14, length * 0.1)) cuts.push(extra);
    cuts.sort((a, b) => a - b);
  }
  if (!cuts.length) return [];
  const ranges = [];
  let last = 0;
  for (const cut of cuts) {
    ranges.push([last, cut]);
    last = cut;
  }
  ranges.push([last, length]);
  const relaxedSettings = { ...settings, splitPaddingFactor: Math.min(settings.splitPaddingFactor ?? 0.8, 0.65) };
  const children = componentsFromProjectionRanges(ranges, axis, { startX, startY, endX, endY }, imageData, coreMask, minCoreArea, pad, relaxedSettings);
  if (children.length < 2) return [];
  if (!hasProjectionValleyBetweenChildren(children, component, imageData, axis, settings)) return [];
  const parentArea = Math.max(1, component.area || measureComponent(component, imageData, alphaThreshold).alphaArea);
  const childArea = children.reduce((sum, child) => sum + (child.area || 0), 0);
  if (childArea < parentArea * 0.42) return [];
  return children;
}

function bestSupplementalProjectionCut(smoothed, start, end, average, max) {
  const length = smoothed.length;
  const rangeLength = end - start;
  if (rangeLength < Math.max(50, length * 0.22)) return -1;
  const innerStart = Math.round(start + rangeLength * 0.26);
  const innerEnd = Math.round(start + rangeLength * 0.74);
  let bestIndex = -1;
  let bestValue = Infinity;
  for (let index = innerStart; index <= innerEnd; index += 1) {
    const value = smoothed[index] || 0;
    const local = smoothed.slice(Math.max(start, index - 5), Math.min(end, index + 6));
    if (value > Math.min(...local)) continue;
    if (value > Math.max(average * 0.86, max * 0.72)) continue;
    if (value < bestValue) {
      bestValue = value;
      bestIndex = index;
    }
  }
  return bestIndex;
}

function clusterOverSplitFragments(components, imageData, coreMask, supportThreshold, minCoreArea, minArea, pad, settings = getSplitSettings()) {
  const { width, height } = imageData;
  const imageArea = width * height;
  const clusterDistance = Math.max(10, Math.min(width, height) * 0.045);
  const parent = components.map((_, index) => index);
  const find = (index) => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };
  const unite = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  };

  for (let i = 0; i < components.length; i += 1) {
    for (let j = i + 1; j < components.length; j += 1) {
      const a = components[i];
      const b = components[j];
      const distance = boxDistance(a, b);
      const overlapX = axisOverlapRatio(a.x, a.width, b.x, b.width);
      const overlapY = axisOverlapRatio(a.y, a.height, b.y, b.height);
      const centerDistance = Math.hypot((a.x + a.width / 2) - (b.x + b.width / 2), (a.y + a.height / 2) - (b.y + b.height / 2));
      const connectedParts = distance <= clusterDistance && (overlapX > 0.04 || overlapY > 0.04);
      const nearbyTinyParts = Math.min(a.area, b.area) < imageArea * 0.0015 && centerDistance <= clusterDistance * 1.8;
      if (connectedParts || nearbyTinyParts) unite(i, j);
    }
  }

  const clusters = new Map();
  for (let index = 0; index < components.length; index += 1) {
    const root = find(index);
    const cluster = clusters.get(root) || [];
    cluster.push(components[index]);
    clusters.set(root, cluster);
  }

  let grouped = [...clusters.values()].map((cluster, index) => {
    const merged = cluster.reduce((box, component) => {
      if (!box) return { ...component, id: index + 1 };
      mergeBoxInto(box, component);
      return box;
    }, null);
    return measureBoxAsComponent(merged, imageData, Math.max(24, supportThreshold));
  }).filter((component) => keepMultiObjectComponent(component, imageArea, minArea));

  grouped = splitLargeComponents(grouped, imageData, coreMask, width, height, minCoreArea, pad, {
    ...settings,
    mergeDistance: Math.min(settings.mergeDistance ?? 4, 4),
  });
  grouped = grouped.filter((component) => keepMultiObjectComponent(component, imageArea, minArea));
  return grouped;
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
  if (bothMeaningful && hasWeakAlphaBridge(a, b, imageData, alphaThreshold, settings)) return false;
  if (
    (settings.mergeDistance ?? 4) <= 4
    && hasStandaloneSmallPartSeparation(a, b, imageData, alphaThreshold)
  ) {
    return false;
  }
  if (shouldAttachSmallPart(a, b, imageData, distance, alphaThreshold, settings)) return true;
  if (bothMeaningful && settings.mergeDistance <= 4 && distance > settings.mergeDistance && overlapRatio < 0.36) return false;
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

function shouldAttachSmallPart(a, b, imageData, distance, alphaThreshold = 32, settings = getSplitSettings()) {
  const imageArea = imageData.width * imageData.height;
  const smaller = a.area <= b.area ? a : b;
  const larger = smaller === a ? b : a;
  const areaRatio = smaller.area / Math.max(1, larger.area);
  if (areaRatio > 0.34 || smaller.area > imageArea * 0.018) return false;
  if ((settings.mergeDistance ?? 4) <= 4 && isClearStandaloneSmallPart(smaller, larger, imageData, alphaThreshold)) return false;
  const attachDistance = Math.max(16, Math.min(imageData.width, imageData.height) * 0.038);
  if (distance > attachDistance) return false;
  const horizontalOverlap = axisOverlapRatio(smaller.x, smaller.width, larger.x, larger.width);
  const verticalOverlap = axisOverlapRatio(smaller.y, smaller.height, larger.y, larger.height);
  const nearSideAttachment = verticalOverlap > 0.18 && distance <= attachDistance;
  const nearTopBottomAttachment = horizontalOverlap > 0.2 && distance <= attachDistance;
  return nearSideAttachment || nearTopBottomAttachment;
}

function hasStandaloneSmallPartSeparation(a, b, imageData, alphaThreshold) {
  const smaller = a.area <= b.area ? a : b;
  const larger = smaller === a ? b : a;
  return isClearStandaloneSmallPart(smaller, larger, imageData, alphaThreshold);
}

function isClearStandaloneSmallPart(smaller, larger, imageData, alphaThreshold) {
  const imageArea = imageData.width * imageData.height;
  const threshold = Math.max(80, alphaThreshold * 2.4);
  const measured = measureBoxAsComponent(smaller, imageData, Math.max(24, alphaThreshold));
  const quality = scoreSmallComponent(measured, imageArea, Math.max(8, imageArea * 0.001));
  const minDimension = Math.min(measured.width, measured.height);
  if (quality < 0.78 || measured.alphaDensity < 0.24 || minDimension < 8) return false;

  const smallContent = strongContentBounds(smaller, imageData, threshold);
  const largeContent = strongContentBounds(larger, imageData, threshold);
  if (!smallContent || !largeContent) return false;
  const contentDistance = boxDistance(smallContent, largeContent);
  const overlapX = axisOverlapRatio(smallContent.x, smallContent.width, largeContent.x, largeContent.width);
  const overlapY = axisOverlapRatio(smallContent.y, smallContent.height, largeContent.y, largeContent.height);
  const touchingTolerance = Math.max(2, Math.min(smallContent.width, smallContent.height) * 0.08);
  if (contentDistance <= touchingTolerance || (overlapX > 0.18 && overlapY > 0.18)) return false;

  const gap = gapRectBetweenBoxes(smallContent, largeContent);
  if (!gap) return false;
  return alphaDensityInRect(imageData, gap, threshold) < 0.08;
}

function strongContentBounds(component, imageData, alphaThreshold) {
  const { width, height, data } = imageData;
  const startX = Math.max(0, Math.floor(component.x));
  const startY = Math.max(0, Math.floor(component.y));
  const endX = Math.min(width, Math.ceil(component.x + component.width));
  const endY = Math.min(height, Math.ceil(component.y + component.height));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let area = 0;
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      if (data[(y * width + x) * 4 + 3] < alphaThreshold) continue;
      area += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!area) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, area };
}

function alphaDensityInRect(imageData, rect, alphaThreshold) {
  const { width, height, data } = imageData;
  const startX = Math.max(0, Math.floor(rect.x));
  const startY = Math.max(0, Math.floor(rect.y));
  const endX = Math.min(width, Math.ceil(rect.x + rect.width));
  const endY = Math.min(height, Math.ceil(rect.y + rect.height));
  let total = 0;
  let opaque = 0;
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      total += 1;
      if (data[(y * width + x) * 4 + 3] >= alphaThreshold) opaque += 1;
    }
  }
  return total ? opaque / total : 1;
}

function axisOverlapRatio(aStart, aSize, bStart, bSize) {
  const overlap = Math.max(0, Math.min(aStart + aSize, bStart + bSize) - Math.max(aStart, bStart));
  return overlap / Math.max(1, Math.min(aSize, bSize));
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

function hasWeakAlphaBridge(a, b, imageData, alphaThreshold, settings = getSplitSettings()) {
  if ((settings.mergeDistance ?? 4) > 6) return false;
  const centerA = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const centerB = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  const axis = Math.abs(centerA.x - centerB.x) >= Math.abs(centerA.y - centerB.y) ? "x" : "y";
  const cut = axis === "x" ? Math.round((centerA.x + centerB.x) / 2) : Math.round((centerA.y + centerB.y) / 2);
  const merged = mergedBox(a, b);
  const supportDensity = projectionStripDensity(merged, imageData.data, imageData.width, imageData.height, axis, cut, Math.max(18, alphaThreshold));
  const strongDensity = projectionStripDensity(merged, imageData.data, imageData.width, imageData.height, axis, cut, Math.max(80, alphaThreshold * 2.4));
  const overlap = axis === "x"
    ? axisOverlapRatio(a.y, a.height, b.y, b.height)
    : axisOverlapRatio(a.x, a.width, b.x, b.width);
  if (overlap < 0.12) return false;
  return strongDensity <= 0.04 && supportDensity <= 0.28;
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
    const smallElementScore = scoreSmallComponent(component, imageArea, Math.max(8, imageArea * 0.001));
    const tinyNoise = component.alphaArea < imageArea * 0.0005 && smallElementScore < 0.68;
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
    card.setAttribute("aria-label", `Asset ${String(component.id).padStart(2, "0")}, ${component.width} x ${component.height}`);

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    const img = document.createElement("img");
    img.alt = `元素 ${component.id}`;
    img.loading = "lazy";
    queueThumbnail(img, component);
    thumb.append(img);

    const size = getExportSize(component);
    const header = document.createElement("div");
    header.className = "asset-header";
    header.innerHTML = `
      <div>
        <strong>元素 ${String(component.id).padStart(2, "0")}</strong>
        <span>${component.width} x ${component.height}px</span>
      </div>
      <span class="asset-badge">${selected ? "已选择" : getExportSettings().label}</span>
    `;

    const meta = document.createElement("div");
    meta.className = "asset-meta";
    meta.innerHTML = `<strong>元素 ${String(component.id).padStart(2, "0")}</strong><span>${component.width} x ${component.height} @${size.scale}x -> ${size.width} x ${size.height}</span>`;

    const coverage = Math.round((component.area / Math.max(1, component.width * component.height)) * 100);
    meta.innerHTML = `
      <span><strong>${size.width} x ${size.height}</strong><small>导出尺寸</small></span>
      <span><strong>${size.scale}x</strong><small>倍数</small></span>
      <span><strong>${coverage}%</strong><small>内容占比</small></span>
    `;

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
    decorateIconButton(button, "download");
    button.addEventListener("click", () => downloadComponent(component));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ghost danger-lite";
    remove.textContent = "删除";
    decorateIconButton(remove, "trash");
    remove.addEventListener("click", () => removeComponent(component.id));

    const split = document.createElement("button");
    split.type = "button";
    split.className = "ghost";
    split.textContent = "拆分";
    decorateIconButton(split, "scissors");
    split.addEventListener("click", () => splitComponentById(component.id));

    const adjust = document.createElement("button");
    adjust.type = "button";
    adjust.className = "ghost";
    adjust.textContent = "调整";
    decorateIconButton(adjust, "adjust");
    adjust.addEventListener("click", () => loadComponentIntoManualSelection(component.id));

    const actions = document.createElement("div");
    actions.className = "asset-actions";
    actions.append(button, split, adjust, remove);

    thumb.addEventListener("click", () => {
      if (state.selectedComponentIds.has(component.id)) state.selectedComponentIds.delete(component.id);
      else state.selectedComponentIds.add(component.id);
      renderCards();
      drawOverlay(component.id);
    });

    card.addEventListener("mouseenter", () => {
      drawOverlay(component.id);
    });
    card.addEventListener("mouseleave", () => {
      drawOverlay();
    });

    card.append(header, thumb, meta, checkbox, actions);
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
  const ctx = getReadbackContext(canvas);
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

function loadComponentIntoManualSelection(componentId) {
  const component = state.components.find((candidate) => candidate.id === componentId);
  if (!component || !els.resultCanvas.width) return;
  if (!state.manual) {
    state.manual = true;
    els.manualModeBtn.textContent = "关闭框选";
    els.overlayCanvas.closest(".checker")?.classList.add("manual");
    updateUiState();
  }
  state.selectedComponentIds = new Set([component.id]);
  state.selection = {
    x: Math.round(component.x),
    y: Math.round(component.y),
    width: Math.round(component.width),
    height: Math.round(component.height),
  };
  updateManualPreview();
  renderCards();
  drawOverlay(component.id);
  setStatus("已载入元素框，可拖拽重新框选或用方向键微调后点击“更新选中元素”。", "调整元素框");
}

function addSelectionAsComponent() {
  const box = getValidManualSelection();
  if (!box) return;
  const component = measurePreviewBoxAsComponent(box);
  state.components = renumberComponents([...state.components, component]);
  const added = state.components.find((candidate) => sameBox(candidate, component));
  state.selectedComponentIds = added ? new Set([added.id]) : new Set();
  persistComponents(`${state.components.length} 个元素`);
  renderCards();
  drawOverlay(added?.id || null);
  setSuccess(`已添加元素框：${box.width} x ${box.height}。`);
}

function applySelectionToSelectedComponent() {
  const box = getValidManualSelection();
  const selected = [...state.selectedComponentIds];
  if (!box || selected.length !== 1) return;
  const componentId = selected[0];
  const next = measurePreviewBoxAsComponent({ ...box, id: componentId });
  state.components = state.components.map((component) => component.id === componentId ? { ...next, id: component.id } : component);
  persistComponents(`${state.components.length} 个元素`);
  const updated = state.components.find((component) => sameBox(component, next));
  state.selectedComponentIds = updated ? new Set([updated.id]) : new Set();
  renderCards();
  drawOverlay(updated?.id || null);
  setSuccess(`已更新元素 ${String((updated?.id || componentId)).padStart(2, "0")} 的裁切框。`);
}

function getValidManualSelection() {
  if (!state.selection || state.selection.width < 4 || state.selection.height < 4) return null;
  return {
    x: Math.round(clamp(state.selection.x, 0, els.resultCanvas.width - 1)),
    y: Math.round(clamp(state.selection.y, 0, els.resultCanvas.height - 1)),
    width: Math.max(1, Math.round(Math.min(state.selection.width, els.resultCanvas.width - state.selection.x))),
    height: Math.max(1, Math.round(Math.min(state.selection.height, els.resultCanvas.height - state.selection.y))),
  };
}

function measurePreviewBoxAsComponent(box) {
  const source = state.refinedCutoutCanvas.width ? state.refinedCutoutCanvas : els.resultCanvas;
  const ratioX = source.width / Math.max(1, els.resultCanvas.width);
  const ratioY = source.height / Math.max(1, els.resultCanvas.height);
  const sx = Math.round(box.x * ratioX);
  const sy = Math.round(box.y * ratioY);
  const sw = Math.max(1, Math.round(box.width * ratioX));
  const sh = Math.max(1, Math.round(box.height * ratioY));
  const ctx = source.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(sx, sy, sw, sh);
  let area = 0;
  for (let index = 3; index < imageData.data.length; index += 4) {
    if (imageData.data[index] > Math.max(8, Number(els.alphaThreshold.value))) area += 1;
  }
  return {
    id: box.id || state.components.length + 1,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    area: Math.max(1, Math.round(area / Math.max(0.0001, ratioX * ratioY))),
  };
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
  updateManualSelectionActions();
  updateDisabledHints();
}

function computeCurrentQaMetrics() {
  if (!state.refinedCutoutCanvas.width) return null;
  const settings = getRefineSettings();
  const matteQuality = analyzeMatteQuality(state.refinedCutoutCanvas, state.sourceOriginalCanvas, settings);
  const componentCount = state.components.length;
  const canvasArea = Math.max(1, els.resultCanvas.width * els.resultCanvas.height);
  const preset = getAlgorithmPreset(state.currentItem?.imageType || state.imageType || "unknown");
  const largeBoxRiskRatio = getPresetConfig(preset).detection.largeBoxRiskRatio;
  const vectorSettings = getVectorSettings();
  const tinyDebugRelevant = (els.detectMode.value === "split" || preset === "multiSticker")
    && state.lastTinyFragmentDebug?.after === componentCount;
  const tinyDebug = tinyDebugRelevant ? state.lastTinyFragmentDebug : null;
  const smallComponentCount = state.components.filter((component) => {
    const boxRatio = (component.width * component.height) / canvasArea;
    return boxRatio > 0 && boxRatio < 0.012;
  }).length;
  const smallElementStats = measureSmallElementScores(state.components, canvasArea);
  const largeBoxRiskRelevant = els.detectMode.value === "split" || els.detectMode.value === "illustration" || preset === "multiSticker";
  let largeBoxRisk = largeBoxRiskRelevant && state.components.some((component) => {
    const boxRatio = (component.width * component.height) / canvasArea;
    return boxRatio > largeBoxRiskRatio || (boxRatio > largeBoxRiskRatio * 0.62 && component.area / Math.max(1, component.width * component.height) < 0.28);
  });
  if (largeBoxRisk && state.lastOverSplitDebug?.stage === "forced-projection" && componentCount >= 3 && componentCount <= 10) {
    largeBoxRisk = false;
  }
  const svgMetrics = estimateSvgMetrics(state.refinedCutoutCanvas);
  const metrics = {
    imageType: state.currentItem?.imageType || state.imageType || "unknown",
    preset,
    svgMode: vectorSettings.mode,
    svgColorStep: vectorSettings.colorStep,
    alphaCoverage: roundMetric(matteQuality.alphaCoverage),
    edgeJaggednessScore: roundMetric(matteQuality.edgeJaggednessScore),
    semiTransparentCoreRatio: roundMetric(matteQuality.semiTransparentCoreRatio),
    lightRegionLossRatio: roundMetric(matteQuality.lightRegionLossRatio),
    lineArtLossRatio: roundMetric(matteQuality.lineArtLossRatio),
    whiteFringeRatio: roundMetric(matteQuality.whiteFringeRatio),
    whiteFringePixels: Math.round(matteQuality.whiteFringePixels || 0),
    whiteFringeEdgePixels: Math.round(matteQuality.whiteFringeEdgePixels || 0),
    whiteFringeAreaRatio: roundMetric(matteQuality.whiteFringeAreaRatio),
    lowAlphaWhiteFringeRatio: roundMetric(matteQuality.lowAlphaWhiteFringeRatio),
    whiteFringeAverageAlpha: roundMetric(matteQuality.whiteFringeAverageAlpha),
    componentCount,
    smallComponentCount,
    clearSmallElementCount: smallElementStats.clearCount,
    smallElementScoreMax: roundMetric(smallElementStats.max),
    smallElementScoreAverage: roundMetric(smallElementStats.average),
    overSplitBefore: state.lastOverSplitDebug?.before || componentCount,
    overSplitStage: state.lastOverSplitDebug?.stage || "",
    overSplitGrouped: state.lastOverSplitDebug?.grouped || 0,
    overSplitClustered: state.lastOverSplitDebug?.clustered || 0,
    overSplitAccepted: state.lastOverSplitDebug?.accepted || componentCount,
    tinyFragmentBefore: tinyDebug?.before || componentCount,
    tinyFragmentStage: tinyDebug?.stage || "",
    tinyFragmentAfter: tinyDebug?.after || componentCount,
    smallElementRisk: preset === "multiSticker" && (
      (componentCount < 3 && smallComponentCount === 0) ||
      (smallComponentCount > 0 && smallElementStats.clearCount === 0 && componentCount < 6)
    ),
    largeBoxRisk,
    svgPathCount: svgMetrics.pathCount,
    svgCommandCount: svgMetrics.commandCount,
    svgVisibleArea: svgMetrics.visibleArea,
    svgCommandDensity: roundMetric(svgMetrics.commandDensity),
    svgGridAlignedRatio: roundMetric(svgMetrics.gridAlignedRatio),
    svgFractionalCoordinateRatio: roundMetric(svgMetrics.fractionalCoordinateRatio),
    svgBlockyRisk: svgMetrics.blockyRisk,
    warnings: matteQuality.warnings || [],
  };
  window.__cutoutQaCurrentMetrics = metrics;
  return metrics;
}

function measureSmallElementScores(components, canvasArea) {
  const minArea = Math.max(8, canvasArea * 0.001);
  const smallComponents = components.filter((component) => {
    const boxRatio = (component.width * component.height) / Math.max(1, canvasArea);
    return boxRatio > 0 && boxRatio < 0.018;
  });
  if (!smallComponents.length) return { count: 0, clearCount: 0, max: 0, average: 0 };
  const scores = smallComponents.map((component) => scoreSmallComponent(component, canvasArea, minArea));
  const clearCount = scores.filter((score) => score >= 0.72).length;
  const max = Math.max(...scores);
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return { count: smallComponents.length, clearCount, max, average };
}

function buildQaMetricsForItem(item) {
  if (item === state.currentItem && state.refinedCutoutCanvas.width) {
    item.qaMetrics = computeCurrentQaMetrics();
  }
  return item.qaMetrics || item.matteQuality || null;
}

function scoreQaRow(row, item = null) {
  const metrics = row.metrics || {};
  const scenario = row.scenario || item?.qaScenario || "";
  const priority = row.priority || item?.qaPriority || "";
  const recommendedMode = recommendedDetectModeForScenario(scenario);
  const statusDone = row.status === "done";
  const matteScore = scoreMatteQuality(metrics, scenario);
  const componentScore = scoreComponentQuality(metrics, scenario);
  const svgScore = scoreSvgQuality(metrics, scenario);
  const exportScore = statusDone && row.resultSize ? 5 : statusDone ? 4 : 1;
  const scores = { matte: matteScore, components: componentScore, svg: svgScore, export: exportScore };
  const average = roundMetric((scores.matte + scores.components + scores.svg + scores.export) / 4);
  const coreLow = Object.entries(scores)
    .filter(([, value]) => value < 3)
    .map(([key]) => key);
  const criticalScenario = /发丝|毛|商品|贴纸|多元素|靠近|小物体/.test(scenario);
  const releaseBlocker = coreLow.length > 0 || average < 4 || (criticalScenario && Math.min(scores.matte, scores.components) < 3.5);
  const notes = [];
  if (metrics.largeBoxRisk) notes.push("大框风险");
  if (metrics.smallElementRisk) notes.push("小元素漏识别风险");
  if (metrics.svgBlockyRisk) notes.push("SVG 块状风险");
  if (!isTransparentMaterialScenario(scenario) && (metrics.semiTransparentCoreRatio || 0) > 0.36) notes.push("主体半透明风险");
  if (isIllustrationQualityScenario(scenario) && (metrics.lineArtLossRatio || 0) > 0.24) notes.push("线稿断裂风险");
  if (isIllustrationQualityScenario(scenario) && (metrics.lightRegionLossRatio || 0) > 0.28) notes.push("浅色区域缺失风险");
  if (recommendedMode && row.mode && row.mode !== recommendedMode) notes.push(`建议模式：${modeLabel(recommendedMode)}`);
  return { scores, average, pass: average >= 4 && !coreLow.length, releaseBlocker, coreLow, recommendedMode, notes };
}

function recommendedDetectModeForScenario(scenario = "") {
  if (/贴纸合集|靠近多角色|小物体细节|插画图标/.test(scenario)) return "split";
  if (/发丝|卷发|宠物|复杂背景|商品|透明材质|高对比边缘/.test(scenario)) return "subject";
  return "";
}

function modeLabel(mode) {
  if (mode === "split") return "元素拆分";
  if (mode === "subject") return "主体切图";
  if (mode === "complete" || mode === "foreground") return "完整前景";
  if (mode === "illustration") return "色块拆分";
  return mode || "";
}

function batchModeForItem(item, fallbackMode = els.detectMode.value) {
  if (!item?.isQa) return fallbackMode;
  return recommendedDetectModeForScenario(item.qaScenario || "") || fallbackMode;
}

function setDetectModeValue(mode) {
  if (!mode || els.detectMode.value === mode) return;
  els.detectMode.value = mode;
  updateUiState();
}

function scoreMatteQuality(metrics, scenario = "") {
  let score = 5;
  const edge = metrics.edgeJaggednessScore || 0;
  const semi = metrics.semiTransparentCoreRatio || 0;
  const lineLoss = metrics.lineArtLossRatio || 0;
  const lightLoss = metrics.lightRegionLossRatio || 0;
  const fringe = metrics.whiteFringeRatio || 0;
  const fringeArea = metrics.whiteFringeAreaRatio || 0;
  const fringeAlpha = metrics.whiteFringeAverageAlpha || 0;
  const lowAlphaFringe = metrics.lowAlphaWhiteFringeRatio || 0;
  if (!isTransparentMaterialScenario(scenario)) {
    if (semi > 0.36) score -= 2.2;
    else if (semi > 0.24) score -= 1.4;
    else if (semi > 0.14) score -= 0.7;
  }
  if (edge > 0.42) score -= 1.1;
  else if (edge > 0.3) score -= 0.6;
  const mostlySubtleFringe = lowAlphaFringe > 0.9 && fringeAlpha < 24 && fringeArea < 0.002;
  if (fringe > 0.08) score -= mostlySubtleFringe ? 0.35 : 1;
  else if (fringe > 0.04) score -= mostlySubtleFringe ? 0.1 : 0.45;
  if (/插画|图标|贴纸|logo|文字|靠近/.test(scenario)) {
    if (lineLoss > 0.24) score -= 1.6;
    else if (lineLoss > 0.16) score -= 0.9;
    if (lightLoss > 0.28) score -= 1.4;
    else if (lightLoss > 0.18) score -= 0.8;
  }
  return clampScore(score);
}

function isTransparentMaterialScenario(scenario = "") {
  return /透明材质|透明/.test(scenario || "");
}

function isIllustrationQualityScenario(scenario = "") {
  return /插画|图标|贴纸|logo|文字|靠近|高对比/.test(scenario || "");
}

function scoreComponentQuality(metrics, scenario = "") {
  const count = metrics.componentCount || 0;
  let score = count ? 5 : 1;
  const expected = expectedComponentRange(scenario);
  if (expected.min > 1) {
    if (count < expected.min) score -= Math.min(3, (expected.min - count) * 0.75);
    if (count > expected.max) score -= Math.min(2, (count - expected.max) * 0.18);
  } else if (count > expected.max) {
    score -= Math.min(2, (count - expected.max) * 0.18);
  }
  if (metrics.largeBoxRisk) score -= /多元素|靠近|贴纸|小物体|图标/.test(scenario) ? 1.5 : 0.8;
  if (metrics.smallElementRisk) score -= 1.2;
  return clampScore(score);
}

function expectedComponentRange(scenario = "") {
  if (/贴纸合集/.test(scenario)) return { min: 6, max: 16 };
  if (/靠近多角色/.test(scenario)) return { min: 3, max: 10 };
  if (/小物体细节/.test(scenario)) return { min: 3, max: 14 };
  if (/插画图标/.test(scenario)) return { min: 3, max: 12 };
  return { min: 1, max: 8 };
}

function scoreSvgQuality(metrics, scenario = "") {
  if (!/插画|图标|贴纸|logo|文字|商品|靠近/.test(scenario)) return 4;
  let score = 5;
  const density = metrics.svgCommandDensity || 0;
  const pathCount = metrics.svgPathCount || 0;
  const gridAligned = metrics.svgGridAlignedRatio ?? 1;
  if (metrics.svgBlockyRisk) score -= 1.4;
  if (gridAligned > 0.72 && /插画|图标|贴纸|靠近/.test(scenario)) score -= 0.5;
  else if (gridAligned < 0.32 && density < 9 && /插画|图标|贴纸|靠近/.test(scenario)) score += 0.25;
  if (density > 22) score -= 1.2;
  else if (density > 16) score -= 0.7;
  if (pathCount > 220) score -= gridAligned < 0.32 && density < 10 ? 0.65 : 1;
  else if (pathCount > 120) score -= gridAligned < 0.32 && density < 9 ? 0.2 : 0.45;
  return clampScore(score);
}

function clampScore(value) {
  return Math.max(1, Math.min(5, Math.round(value * 10) / 10));
}

function estimateSvgMetrics(canvas) {
  if (!canvas?.width) return { pathCount: 0, commandCount: 0, visibleArea: 0, commandDensity: 0, gridAlignedRatio: 0, fractionalCoordinateRatio: 0, blockyRisk: false };
  const vectorSettings = getVectorSettings();
  const source = prepareVectorCanvas(canvas, vectorSettings.maxEdge);
  const ctx = source.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, source.width, source.height);
  const groups = imageDataToVectorRegions(imageData, Math.max(8, Number(vectorSettings.alphaThreshold) || Number(els.cleanup.value) || 24), vectorSettings);
  const summary = [...groups.values()].reduce((acc, group) => {
    const commands = countSvgPathCommands(group.path);
    const gridCounts = measureGridAlignedCoordinateCounts(group.path);
    const fractionalCounts = measureFractionalCoordinateCounts(group.path);
    acc.pathCount += group.regionCount || 1;
    acc.commandCount += commands;
    acc.visibleArea += group.area || 0;
    acc.gridAlignedValues += gridCounts.aligned;
    acc.fractionalValues += fractionalCounts.fractional;
    acc.coordinateValues += gridCounts.total;
    return acc;
  }, { pathCount: 0, commandCount: 0, visibleArea: 0, commandDensity: 0, gridAlignedRatio: 0, fractionalCoordinateRatio: 0, gridAlignedValues: 0, fractionalValues: 0, coordinateValues: 0, blockyRisk: false });
  summary.commandDensity = summary.commandCount / Math.max(1, Math.sqrt(summary.visibleArea));
  summary.gridAlignedRatio = summary.gridAlignedValues / Math.max(1, summary.coordinateValues);
  summary.fractionalCoordinateRatio = summary.fractionalValues / Math.max(1, summary.coordinateValues);
  summary.blockyRisk = summary.visibleArea > 0 && (
    summary.commandDensity > 18 ||
    (vectorSettings.mode === "precise" && summary.commandDensity > 14 && summary.pathCount > 60) ||
    (vectorSettings.mode === "precise" && summary.gridAlignedRatio > 0.62 && summary.commandCount > 24) ||
    (vectorSettings.mode === "precise" && summary.fractionalCoordinateRatio < 0.24 && summary.commandCount > 24)
  );
  return summary;
}

function countSvgPathCommands(path) {
  return (path.match(/[MLQCZ]/g) || []).length;
}

function measureGridAlignedCoordinateCounts(path) {
  const values = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  const aligned = values.filter((value) => Math.abs(value - Math.round(value)) < 0.035).length;
  return { aligned, total: values.length };
}

function measureFractionalCoordinateCounts(path) {
  const values = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  const fractional = values.filter((value) => Math.abs(value - Math.round(value)) >= 0.08).length;
  return { fractional, total: values.length };
}

function roundMetric(value) {
  return Math.round((Number(value) || 0) * 10000) / 10000;
}

function generateQaReportHtml(report) {
  const summary = summarizeQaReport(report);
  const rows = (report.rows || []).map((row) => {
    const metrics = row.metrics || {};
    const risk = metrics.largeBoxRisk ? "是" : "否";
    const smallRisk = metrics.smallElementRisk ? "是" : "否";
    const svgRisk = metrics.svgBlockyRisk ? "是" : "否";
    const score = row.score || {};
    const scores = score.scores || {};
    const warnings = Array.isArray(metrics.warnings) ? metrics.warnings.join("；") : "";
    return `
      <tr>
        <td>${row.index}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.scenario || "")}</td>
        <td>${escapeHtml(row.priority || "")}</td>
        <td>${escapeHtml(row.imageType || metrics.imageType || "unknown")}</td>
        <td>${escapeHtml(metrics.preset || "")}</td>
        <td>${escapeHtml(modeLabel(row.mode || ""))}</td>
        <td>${escapeHtml(modeLabel(score.recommendedMode || ""))}</td>
        <td>${escapeHtml(metrics.svgMode || "")}</td>
        <td>${escapeHtml(row.status || "")}</td>
        <td>${formatMetric(score.average)}</td>
        <td>${score.pass ? "通过" : "未通过"}</td>
        <td>${score.releaseBlocker ? "是" : "否"}</td>
        <td>${formatMetric(scores.matte)}</td>
        <td>${formatMetric(scores.components)}</td>
        <td>${formatMetric(scores.svg)}</td>
        <td>${formatMetric(scores.export)}</td>
        <td>${row.elements ?? ""}</td>
        <td>${metrics.smallComponentCount ?? ""}</td>
        <td>${smallRisk}</td>
        <td>${formatMetric(metrics.alphaCoverage)}</td>
        <td>${formatMetric(metrics.edgeJaggednessScore)}</td>
        <td>${formatMetric(metrics.semiTransparentCoreRatio)}</td>
        <td>${formatMetric(metrics.lineArtLossRatio)}</td>
        <td>${formatMetric(metrics.lightRegionLossRatio)}</td>
        <td>${formatMetric(metrics.whiteFringeRatio)}</td>
        <td>${metrics.whiteFringePixels ?? ""}</td>
        <td>${formatMetric(metrics.whiteFringeAreaRatio)}</td>
        <td>${formatMetric(metrics.lowAlphaWhiteFringeRatio)}</td>
        <td>${formatMetric(metrics.whiteFringeAverageAlpha)}</td>
        <td>${risk}</td>
        <td>${metrics.svgPathCount ?? ""}</td>
        <td>${metrics.svgCommandCount ?? ""}</td>
        <td>${formatMetric(metrics.svgCommandDensity)}</td>
        <td>${formatMetric(metrics.svgGridAlignedRatio)}</td>
        <td>${svgRisk}</td>
        <td>${escapeHtml([...score.notes || [], warnings || row.error || ""].filter(Boolean).join("；"))}</td>
        <td>${formatMetric(metrics.svgFractionalCoordinateRatio)}</td>
        <td>${metrics.clearSmallElementCount ?? ""}</td>
        <td>${formatMetric(metrics.smallElementScoreMax)}</td>
        <td>${formatMetric(metrics.smallElementScoreAverage)}</td>
      </tr>`;
  }).join("");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>Cutout QA Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; color: #111827; }
    h1 { margin: 0 0 8px; }
    p { margin: 0 0 20px; color: #667085; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; }
    th, td { border: 1px solid #e4e7ec; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f8fafc; }
    tr:nth-child(even) td { background: #fcfcfd; }
  </style>
</head>
<body>
  <h1>Cutout QA Report</h1>
  <p>Started: ${escapeHtml(report.startedAt || "")} · Finished: ${escapeHtml(report.finishedAt || "")} · Mode: ${escapeHtml(report.mode || "")} · Split: ${escapeHtml(report.splitStrength || "")}</p>
  <p>${escapeHtml(report.qaModePolicy || "")}</p>
  <p>Total: ${summary.total} · Pass: ${summary.pass} · Failed: ${summary.failed} · Avg score: ${formatMetric(summary.averageScore)} · Release blockers: ${summary.releaseBlockers} · Large box risk: ${summary.largeBoxRisk} · Small element risk: ${summary.smallElementRisk} · SVG blocky risk: ${summary.svgBlockyRisk} · Line art risk: ${summary.lineArtRisk} · Light region risk: ${summary.lightRegionRisk} · Semi-transparent core risk: ${summary.semiTransparentRisk}</p>
  <table>
    <thead>
      <tr>
        <th>#</th><th>图片</th><th>场景</th><th>优先级</th><th>类型</th><th>预设</th><th>识别模式</th><th>推荐模式</th><th>SVG 模式</th><th>状态</th>
        <th>平均分</th><th>评分</th><th>上线阻塞</th><th>matte</th><th>元素</th><th>SVG</th><th>导出</th>
        <th>元素数</th><th>小元素数</th><th>小元素风险</th>
        <th>alphaCoverage</th><th>edgeJaggedness</th><th>semiTransparentCore</th>
        <th>lineArtLoss</th><th>lightRegionLoss</th><th>whiteFringe</th><th>whiteFringePx</th><th>whiteFringeArea</th><th>lowAlphaFringe</th><th>fringeAvgAlpha</th><th>大框风险</th><th>svgPathCount</th><th>svgCommandCount</th><th>svgCommandDensity</th><th>svgGridAligned</th><th>SVG 块状风险</th><th>提示</th>
        <th>svgFractional</th>
        <th>clearSmallElements</th><th>smallElementScoreMax</th><th>smallElementScoreAvg</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

function summarizeQaReport(report) {
  const rows = report.rows || [];
  const summary = rows.reduce((acc, row) => {
    const metrics = row.metrics || {};
    const score = row.score || {};
    acc.total += 1;
    if (row.status !== "done" || score.pass === false) acc.failed += 1;
    if (score.pass) acc.pass += 1;
    if (score.releaseBlocker) acc.releaseBlockers += 1;
    if (typeof score.average === "number") acc.scoreSum += score.average;
    if (metrics.largeBoxRisk) acc.largeBoxRisk += 1;
    if (metrics.smallElementRisk) acc.smallElementRisk += 1;
    if (metrics.svgBlockyRisk) acc.svgBlockyRisk += 1;
    if (isIllustrationQualityScenario(row.scenario || "") && (metrics.lineArtLossRatio || 0) > 0.24) acc.lineArtRisk += 1;
    if (isIllustrationQualityScenario(row.scenario || "") && (metrics.lightRegionLossRatio || 0) > 0.28) acc.lightRegionRisk += 1;
    if (!isTransparentMaterialScenario(row.scenario || "") && (metrics.semiTransparentCoreRatio || 0) > 0.36) acc.semiTransparentRisk += 1;
    return acc;
  }, {
    total: 0,
    pass: 0,
    failed: 0,
    releaseBlockers: 0,
    scoreSum: 0,
    averageScore: 0,
    largeBoxRisk: 0,
    smallElementRisk: 0,
    svgBlockyRisk: 0,
    lineArtRisk: 0,
    lightRegionRisk: 0,
    semiTransparentRisk: 0,
  });
  summary.averageScore = summary.total ? roundMetric(summary.scoreSum / summary.total) : 0;
  return summary;
}

function formatMetric(value) {
  return typeof value === "number" ? value.toFixed(4) : "";
}

async function downloadBatchZip() {
  if (!state.queue.length || state.batchRunning) return;
  state.batchRunning = true;
  const originalMode = els.detectMode.value;
  const report = {
    startedAt: new Date().toISOString(),
    mode: originalMode,
    qaModePolicy: "QA 样本按场景自动使用推荐识别模式；普通图片使用当前识别模式。",
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
      const itemMode = batchModeForItem(item, originalMode);
      setDetectModeValue(itemMode);
      const row = {
        index: index + 1,
        name: item.originalName,
        isQa: Boolean(item.isQa),
        scenario: item.qaScenario || "",
        priority: item.qaPriority || "",
        needsRealPhoto: Boolean(item.qaNeedsRealPhoto),
        imageType: item.imageType || "unknown",
        mode: itemMode,
        startedAt: new Date().toISOString(),
        reused: item.status === "done" && Boolean(item.cutoutBlob) && (
          item.isQa ? item.processMode === itemMode : (!item.processMode || item.processMode === itemMode)
        ),
        status: "processing",
        elements: 0,
        metrics: null,
        sourceSize: item.originalWidth && item.originalHeight ? `${item.originalWidth}x${item.originalHeight}` : "",
        resultSize: item.resultWidth && item.resultHeight ? `${item.resultWidth}x${item.resultHeight}` : "",
        error: "",
        score: null,
      };
      report.rows.push(row);
      if (row.reused) {
        row.status = "done";
        row.elements = item.components?.length || 0;
        row.imageType = item.imageType || "unknown";
        row.metrics = buildQaMetricsForItem(item);
        row.score = scoreQaRow(row, item);
        row.resultSize = item.resultWidth && item.resultHeight ? `${item.resultWidth}x${item.resultHeight}` : "";
        continue;
      }
      setProgress(Math.round((index / total) * 100), `${index + 1} / ${total}`);
      await loadItem(item);
      setDetectModeValue(itemMode);
      await processImage({ message: `批量处理中：${index + 1}/${total} ${item.originalName}` });
      row.status = item.status || "unknown";
      row.elements = item.components?.length || 0;
      row.imageType = item.imageType || "unknown";
      row.metrics = buildQaMetricsForItem(item);
      row.sourceSize = item.originalWidth && item.originalHeight ? `${item.originalWidth}x${item.originalHeight}` : "";
      row.resultSize = item.resultWidth && item.resultHeight ? `${item.resultWidth}x${item.resultHeight}` : "";
      row.error = item.error?.message || "";
      row.score = scoreQaRow(row, item);
    }
    setDetectModeValue(originalMode);
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
      report.summary = summarizeQaReport(report);
      setError("没有可打包的处理结果。");
      return;
    }

    report.exportedImages = exportedImages;
    report.exportedElements = exportedElements;
    report.status = "done";
    report.finishedAt = new Date().toISOString();
    report.summary = summarizeQaReport(report);
    zip.file("qa-report.json", JSON.stringify(report, null, 2));
    zip.file("qa-report.html", generateQaReportHtml(report));

    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, `cutout-batch-${formatDateStamp()}.zip`);
    setStatus(`批量 ZIP 已生成：${exportedImages} 张图片，${exportedElements} 个元素。`);
  } catch (error) {
    report.status = "failed";
    report.finishedAt = new Date().toISOString();
    report.error = error?.message || String(error);
    report.summary = summarizeQaReport(report);
    console.error(error);
    setError(`批量处理失败：${report.error}`);
  } finally {
    setDetectModeValue(originalMode);
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
  const sourceCtx = getReadbackContext(source);
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
  const ctx = getReadbackContext(canvas);
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
  updateManualSelectionActions();
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
  updateManualSelectionActions();
  updateManualPreview();
  drawOverlay();
}

function moveSelection(event) {
  if (!state.dragStart || !state.manual) return;
  const point = eventToCanvasPoint(event);
  state.selection = applyAspectLock(normalizeBox(state.dragStart, point));
  updateManualSelectionActions();
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
    updateManualSelectionActions();
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
  updateManualSelectionActions();
}

function updateManualSelectionActions() {
  const valid = Boolean(state.manual && state.selection && state.selection.width >= 4 && state.selection.height >= 4);
  const selectedCount = state.selectedComponentIds.size;
  els.exportSelectionBtn.disabled = !valid;
  els.addSelectionBtn.disabled = !valid || state.processing;
  els.applySelectionBtn.disabled = !valid || state.processing || selectedCount !== 1;
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
    updateManualSelectionActions();
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

function setStatusLegacy(message, title = "状态") {
  els.statusTitle.textContent = title;
  els.statusCard.className = "status-card";
  els.status.className = "status";
  els.status.textContent = message;
}

function setBusyLegacy(isBusy, message) {
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
  updateManualSelectionActions();
  updateUiState();
}

function setErrorLegacy(message) {
  els.statusTitle.textContent = "出现问题";
  els.statusCard.className = "status-card error";
  els.status.className = "status error";
  els.status.textContent = message;
}

function setSuccessLegacy(message) {
  els.statusTitle.textContent = "处理完成";
  els.statusCard.className = "status-card success";
  els.status.className = "status success";
  els.status.textContent = message;
}

function setStatus(message, title = "状态") {
  els.statusTitle.textContent = title;
  els.statusCard.className = "status-card";
  els.status.className = "status";
  els.status.textContent = message;
  if (!state.cutoutBlob) updateStatusStage(state.currentItem ? "load" : "empty");
}

function setBusy(isBusy, message) {
  if (isBusy) updateStatusStage("matte");
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
  updateManualSelectionActions();
  updateUiState();
}

function setError(message) {
  els.statusTitle.textContent = "出现问题";
  els.statusCard.className = "status-card error";
  els.status.className = "status error";
  els.status.textContent = message;
  if (els.statusActions) els.statusActions.hidden = true;
}

function setSuccess(message) {
  els.statusTitle.textContent = "处理完成";
  els.statusCard.className = "status-card success";
  els.status.className = "status success";
  els.status.textContent = message;
  updateStatusStage("done");
}

function setProgress(percent, label = `${percent}%`) {
  els.progressWrap.hidden = false;
  els.progressFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  els.progressWrap.querySelector("[role='progressbar']")?.setAttribute("aria-valuenow", String(Math.round(percent)));
  els.progressText.value = label;
}

function hideProgress() {
  els.progressWrap.hidden = true;
  els.progressFill.style.width = "0%";
  els.progressWrap.querySelector("[role='progressbar']")?.setAttribute("aria-valuenow", "0");
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
  const vectorSettings = getVectorSettings();
  const source = prepareVectorCanvas(canvas, vectorSettings.maxEdge);
  const ctx = source.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, source.width, source.height);
  const alphaThreshold = Math.max(8, Number(vectorSettings.alphaThreshold) || Number(els.cleanup.value) || 24);
  const groups = imageDataToVectorRegions(imageData, alphaThreshold, vectorSettings);
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

function getVectorSettings() {
  const preset = getAlgorithmPreset(state.currentItem?.imageType || state.imageType || "unknown");
  const svg = getPresetConfig(preset).svg;
  const selectedMode = els.svgMode?.value || "auto";
  const mode = selectedMode === "auto" ? (svg.mode || "auto") : selectedMode;
  const manual = selectedMode !== "auto";
  const colors = clamp(Number(els.svgColors?.value) || 48, 8, 96);
  const smooth = clamp(Number(els.svgSmooth?.value) || 2, 0, 4);
  const detail = clamp(Number(els.svgDetail?.value) || 3, 1, 5);
  const speckle = clamp(Number(els.svgSpeckle?.value) || 2, 0, 5);
  const detailFactor = 1 + (detail - 3) * 0.18;
  const speckleFactor = 1 + (speckle - 2) * 0.35;
  const modeFactor = mode === "fast" ? 1.35 : mode === "precise" ? 0.72 : 1;
  const colorStep = manual
    ? clamp(Math.round(256 / Math.max(4, colors) * (mode === "fast" ? 1.25 : 1)), 4, 48)
    : svg.colorStep;
  return {
    preset,
    selectedMode,
    mode,
    colorStep,
    maxEdge: manual
      ? (mode === "fast" ? 760 : 1180)
      : svg.maxEdge,
    minRegionRatio: manual
      ? clamp(0.000012 * speckleFactor / detailFactor * modeFactor, 0.000003, 0.00008)
      : svg.minRegionRatio,
    mergeTinyRatio: manual
      ? clamp(0.00003 * speckleFactor / detailFactor * modeFactor, 0.000005, 0.00012)
      : svg.mergeTinyRatio,
    simplify: manual
      ? clamp((4.6 - smooth) * 0.42 * modeFactor / detailFactor, 0.45, 2.8)
      : svg.simplify,
    smoothPasses: manual
      ? Math.max(0, Math.min(3, Math.round(smooth)))
      : svg.smoothPasses,
    alphaThreshold: manual
      ? (mode === "precise" ? 24 : 48)
      : (svg.alphaThreshold || 32),
    relaxGrid: Boolean(svg.relaxGrid) || (manual && mode !== "fast"),
    protectLineArt: (Boolean(svg.protectLineArt) || Boolean(els.svgLineArt?.checked)) && (
      preset === "logoIcon" || preset === "illustration" || preset === "sticker" || preset === "multiSticker" || manual
    ),
    flattenAlpha: (
      preset === "logoIcon" ||
      preset === "illustration" ||
      preset === "sticker" ||
      preset === "multiSticker" ||
      (manual && mode === "precise")
    ),
  };
}

function prepareVectorCanvas(canvas, maxVectorEdge = 900) {
  const scale = Math.min(1, maxVectorEdge / Math.max(canvas.width, canvas.height));
  if (scale >= 1) return canvas;
  const vectorCanvas = document.createElement("canvas");
  vectorCanvas.width = Math.max(1, Math.round(canvas.width * scale));
  vectorCanvas.height = Math.max(1, Math.round(canvas.height * scale));
  const ctx = getReadbackContext(vectorCanvas);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, vectorCanvas.width, vectorCanvas.height);
  return vectorCanvas;
}

function imageDataToVectorRegions(imageData, alphaThreshold, vectorSettings = getVectorSettings()) {
  const { width, height, data } = imageData;
  const groups = new Map();
  const colorStep = vectorSettings.colorStep || 32;
  const keys = new Array(width * height);
  const minRegionArea = Math.max(5, Math.round((width * height) * (vectorSettings.minRegionRatio || 0.000012)));
  const mergeTinyArea = Math.max(4, Math.round((width * height) * (vectorSettings.mergeTinyRatio || 0.00003)));

  for (let index = 0; index < keys.length; index += 1) {
    const offset = index * 4;
    if (data[offset + 3] <= alphaThreshold) continue;
    keys[index] = vectorColorKey(data[offset], data[offset + 1], data[offset + 2], data[offset + 3], colorStep, vectorSettings);
  }

  stabilizeVectorColorKeys(keys, width, height, vectorSettings);

  const firstPass = collectVectorRegions(keys, width, height);
  for (const region of firstPass) {
    if (region.pixels.length < mergeTinyArea) {
      const replacement = nearestNeighborVectorKey(region.pixels, keys, width, height, region.key);
      if (replacement) {
        for (const pixel of region.pixels) keys[pixel] = replacement;
      }
    }
  }

  stabilizeVectorColorKeys(keys, width, height, vectorSettings);

  const finalRegions = collectVectorRegions(keys, width, height);
  for (const region of finalRegions) {
    if (region.pixels.length < minRegionArea) continue;
    appendVectorRegion(groups, region.key, region.pixels, keys, width, height, vectorSettings);
  }

  return groups;
}

function collectVectorRegions(keys, width, height) {
  const visited = new Uint8Array(keys.length);
  const stack = [];
  const regions = [];

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

    regions.push({ key, pixels });
  }

  return regions;
}

function vectorColorKey(red, green, blue, alpha, step, vectorSettings = {}) {
  const metrics = colorMetrics(red, green, blue);
  const lineArt = vectorSettings.protectLineArt && isProtectedVectorLineArt(metrics);
  const localStep = lineArt ? Math.max(8, Math.round(step * 0.55)) : step;
  const r = quantizeChannel(red, localStep);
  const g = quantizeChannel(green, localStep);
  const b = quantizeChannel(blue, localStep);
  const opacity = vectorSettings.flattenAlpha || alpha >= 248 ? "1" : (Math.round((alpha / 255) * 10) / 10).toFixed(1);
  return `${rgbToHex(r, g, b)}|${opacity}`;
}

function isProtectedVectorLineArt(metrics) {
  return metrics.lightness < 96 || (metrics.lightness < 142 && metrics.saturation < 0.22);
}

function stabilizeVectorColorKeys(keys, width, height, vectorSettings = {}) {
  const passes = vectorSettings.mode === "precise" ? 2 : 1;
  let current = keys;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = current.slice();
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        const key = current[index];
        if (!key) continue;
        const darkKey = isDarkVectorKey(key);
        const counts = new Map();
        let ownCount = 0;
        for (let yy = y - 1; yy <= y + 1; yy += 1) {
          for (let xx = x - 1; xx <= x + 1; xx += 1) {
            if (xx === x && yy === y) continue;
            const neighbor = current[yy * width + xx];
            if (!neighbor) continue;
            if (neighbor === key) ownCount += 1;
            counts.set(neighbor, (counts.get(neighbor) || 0) + 1);
          }
        }
        const [dominantKey, dominantCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || [];
        if (!dominantKey || dominantKey === key) continue;
        if (darkKey && vectorSettings.protectLineArt && ownCount >= 1) continue;
        if (ownCount <= 1 && dominantCount >= (darkKey ? 6 : 5)) next[index] = dominantKey;
      }
    }
    current = next;
  }
  for (let index = 0; index < keys.length; index += 1) keys[index] = current[index];
}

function isDarkVectorKey(key = "") {
  const hex = key.split("|")[0] || "";
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return false;
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return isProtectedVectorLineArt(colorMetrics(red, green, blue));
}

function nearestNeighborVectorKey(pixels, keys, width, height, ownKey) {
  const counts = new Map();
  for (const index of pixels) {
    const x = index % width;
    const neighbors = [
      x > 0 ? index - 1 : -1,
      x < width - 1 ? index + 1 : -1,
      index >= width ? index - width : -1,
      index < keys.length - width ? index + width : -1,
    ];
    for (const next of neighbors) {
      const key = next >= 0 ? keys[next] : null;
      if (!key || key === ownKey) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function appendVectorRegion(groups, key, pixels, keys, width, height, vectorSettings = getVectorSettings()) {
  let group = groups.get(key);
  if (!group) {
    group = { path: "", area: 0, regionCount: 0 };
    groups.set(key, group);
  }
  const loops = traceRegionLoops(pixels, keys, key, width, height);
  const path = loops
    .map((loop) => loopToPath(
      smoothVectorLoop(simplifyVectorLoop(loop, vectorSettings.simplify || 1.4), vectorSettings.smoothPasses ?? 2),
      vectorSettings,
    ))
    .join("");
  if (!path) return;
  group.path += path;
  group.area += pixels.length;
  group.regionCount += loops.length;
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

function loopToPath(loop, vectorSettings = {}) {
  if (loop.length < 4) return "";
  if (vectorSettings.mode === "precise" && loop.length > 4) return loopToCubicPath(loop, vectorSettings);
  const pathLoop = vectorSettings.relaxGrid && loop.length > 10
    ? relaxGridAlignedLoop(loop, vectorSettings)
    : loop;
  const start = pathLoop[0];
  let d = `M${start[0]} ${start[1]}`;
  if (pathLoop.length > 10) {
    for (let index = 1; index < pathLoop.length - 2; index += 1) {
      const point = pathLoop[index];
      const next = pathLoop[index + 1];
      const midX = roundPathNumber((point[0] + next[0]) / 2);
      const midY = roundPathNumber((point[1] + next[1]) / 2);
      d += `Q${roundPathNumber(point[0])} ${roundPathNumber(point[1])} ${midX} ${midY}`;
    }
  } else {
    for (let index = 1; index < pathLoop.length - 1; index += 1) {
      const point = pathLoop[index];
      d += `L${roundPathNumber(point[0])} ${roundPathNumber(point[1])}`;
    }
  }
  return `${d}Z`;
}

function relaxGridAlignedLoop(loop, vectorSettings = {}) {
  const closed = sameVectorPoint(loop[0], loop[loop.length - 1]);
  const points = closed ? loop.slice(0, -1) : loop;
  if (points.length < 8) return loop;
  const strength = vectorSettings.protectLineArt ? 0.08 : 0.16;
  const relaxed = points.map((point, index) => {
    const prev = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const prevDistance = Math.hypot(point[0] - prev[0], point[1] - prev[1]);
    const nextDistance = Math.hypot(point[0] - next[0], point[1] - next[1]);
    if (prevDistance > 20 || nextDistance > 20) return point;
    const average = [(prev[0] + next[0]) / 2, (prev[1] + next[1]) / 2];
    const corner = Math.abs((point[0] - prev[0]) * (next[1] - point[1]) - (point[1] - prev[1]) * (next[0] - point[0]));
    const localStrength = corner > 10 ? strength * 0.55 : strength;
    return [
      point[0] * (1 - localStrength) + average[0] * localStrength,
      point[1] * (1 - localStrength) + average[1] * localStrength,
    ];
  });
  relaxed.push(relaxed[0]);
  return relaxed;
}

function loopToCubicPath(loop, vectorSettings = {}) {
  const closed = sameVectorPoint(loop[0], loop[loop.length - 1]);
  let points = closed ? loop.slice(0, -1) : loop;
  if (points.length < 4) return loopToPath(loop, { mode: "fast" });
  points = relaxVectorOutline(points, vectorSettings);
  const simplify = clamp((vectorSettings.simplify || 1.2) * 1.15, 0.75, 2.6);
  if (points.length > 18) {
    const simplified = rdpSimplify([...points, points[0]], simplify);
    points = sameVectorPoint(simplified[0], simplified[simplified.length - 1]) ? simplified.slice(0, -1) : simplified;
  }
  points = chaikinClosedPoints(points, vectorSettings.protectLineArt ? 1 : 2);
  points = reduceClosePoints(points, vectorSettings.protectLineArt ? 0.72 : 0.95);
  if (points.length < 4) return loopToPath(loop, { mode: "fast" });
  let d = `M${roundPathNumber(points[0][0])} ${roundPathNumber(points[0][1])}`;
  const tension = vectorSettings.protectLineArt ? 0.42 : 0.5;
  for (let index = 0; index < points.length; index += 1) {
    const p0 = points[(index - 1 + points.length) % points.length];
    const p1 = points[index];
    const p2 = points[(index + 1) % points.length];
    const p3 = points[(index + 2) % points.length];
    const [cp1, cp2] = cubicControlPoints(p0, p1, p2, p3, tension, vectorSettings);
    d += `C${roundPathNumber(cp1[0])} ${roundPathNumber(cp1[1])} ${roundPathNumber(cp2[0])} ${roundPathNumber(cp2[1])} ${roundPathNumber(p2[0])} ${roundPathNumber(p2[1])}`;
  }
  return `${d}Z`;
}

function cubicControlPoints(p0, p1, p2, p3, tension, vectorSettings = {}) {
  const segmentLength = Math.max(0.01, Math.hypot(p2[0] - p1[0], p2[1] - p1[1]));
  const cornerScale = Math.min(
    cubicCornerTensionScale(p0, p1, p2),
    cubicCornerTensionScale(p1, p2, p3),
  );
  const localTension = tension * cornerScale;
  let cp1 = [
    p1[0] + ((p2[0] - p0[0]) * localTension) / 6,
    p1[1] + ((p2[1] - p0[1]) * localTension) / 6,
  ];
  let cp2 = [
    p2[0] - ((p3[0] - p1[0]) * localTension) / 6,
    p2[1] - ((p3[1] - p1[1]) * localTension) / 6,
  ];
  const maxHandleRatio = vectorSettings.protectLineArt ? 0.34 : 0.42;
  cp1 = clampHandleToAnchor(cp1, p1, segmentLength * maxHandleRatio);
  cp2 = clampHandleToAnchor(cp2, p2, segmentLength * maxHandleRatio);
  return [cp1, cp2];
}

function cubicCornerTensionScale(prev, point, next) {
  const ax = point[0] - prev[0];
  const ay = point[1] - prev[1];
  const bx = next[0] - point[0];
  const by = next[1] - point[1];
  const lengthA = Math.hypot(ax, ay);
  const lengthB = Math.hypot(bx, by);
  if (lengthA < 0.01 || lengthB < 0.01) return 0.65;
  const cosine = clamp((ax * bx + ay * by) / (lengthA * lengthB), -1, 1);
  const turn = (1 - cosine) / 2;
  return clamp(1 - turn * 0.48, 0.48, 1);
}

function clampHandleToAnchor(handle, anchor, maxDistance) {
  const dx = handle[0] - anchor[0];
  const dy = handle[1] - anchor[1];
  const distance = Math.hypot(dx, dy);
  if (distance <= maxDistance || distance < 0.001) return handle;
  const scale = maxDistance / distance;
  return [anchor[0] + dx * scale, anchor[1] + dy * scale];
}

function relaxVectorOutline(points, vectorSettings = {}) {
  if (points.length < 8 || vectorSettings.mode !== "precise") return points;
  const passes = vectorSettings.protectLineArt ? 1 : 2;
  const strength = vectorSettings.protectLineArt ? 0.14 : 0.22;
  let output = points;
  for (let pass = 0; pass < passes; pass += 1) {
    output = output.map((point, index) => {
      const prev = output[(index - 1 + output.length) % output.length];
      const next = output[(index + 1) % output.length];
      const prevDistance = Math.hypot(point[0] - prev[0], point[1] - prev[1]);
      const nextDistance = Math.hypot(point[0] - next[0], point[1] - next[1]);
      if (prevDistance > 18 || nextDistance > 18) return point;
      const average = [(prev[0] + next[0]) / 2, (prev[1] + next[1]) / 2];
      const corner = Math.abs((point[0] - prev[0]) * (next[1] - point[1]) - (point[1] - prev[1]) * (next[0] - point[0]));
      const localStrength = corner > 8 && vectorSettings.protectLineArt ? strength * 0.55 : strength;
      return [
        point[0] * (1 - localStrength) + average[0] * localStrength,
        point[1] * (1 - localStrength) + average[1] * localStrength,
      ];
    });
  }
  return output;
}

function chaikinClosedPoints(points, passes = 1) {
  if (points.length < 4 || passes <= 0) return points;
  let output = points;
  for (let pass = 0; pass < Math.min(2, passes); pass += 1) {
    const next = [];
    for (let index = 0; index < output.length; index += 1) {
      const current = output[index];
      const after = output[(index + 1) % output.length];
      const distance = Math.hypot(after[0] - current[0], after[1] - current[1]);
      if (distance < 1.1) {
        next.push(current);
        continue;
      }
      next.push([
        current[0] * 0.72 + after[0] * 0.28,
        current[1] * 0.72 + after[1] * 0.28,
      ]);
      next.push([
        current[0] * 0.28 + after[0] * 0.72,
        current[1] * 0.28 + after[1] * 0.72,
      ]);
    }
    output = next;
  }
  return output;
}

function smoothVectorLoop(loop, passes = 2) {
  if (loop.length < 12) return loop;
  const closed = sameVectorPoint(loop[0], loop[loop.length - 1]);
  const source = closed ? loop.slice(0, -1) : loop;
  const minSegment = 1.2;
  let points = source;
  for (let pass = 0; pass < Math.max(0, Math.min(3, passes)); pass += 1) {
    const next = [];
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const after = points[(index + 1) % points.length];
      const distance = Math.hypot(after[0] - current[0], after[1] - current[1]);
      if (distance < minSegment) {
        next.push(current);
        continue;
      }
      next.push([
        current[0] * 0.75 + after[0] * 0.25,
        current[1] * 0.75 + after[1] * 0.25,
      ]);
      next.push([
        current[0] * 0.25 + after[0] * 0.75,
        current[1] * 0.25 + after[1] * 0.75,
      ]);
    }
    points = next;
  }
  points.push(points[0]);
  return points;
}

function simplifyVectorLoop(loop, epsilon = 1.2) {
  if (loop.length < 16) return loop;
  const closed = sameVectorPoint(loop[0], loop[loop.length - 1]);
  const source = closed ? loop.slice(0, -1) : loop;
  const reduced = reduceClosePoints(source, 1.05);
  if (reduced.length < 8) return loop;
  const anchor = 0;
  const linear = [...reduced.slice(anchor), ...reduced.slice(0, anchor), reduced[anchor]];
  const simplified = rdpSimplify(linear, epsilon);
  if (simplified.length < 4) return loop;
  if (!sameVectorPoint(simplified[0], simplified[simplified.length - 1])) simplified.push(simplified[0]);
  return simplified;
}

function reduceClosePoints(points, minDistance) {
  const output = [];
  for (const point of points) {
    const last = output[output.length - 1];
    if (!last || Math.hypot(point[0] - last[0], point[1] - last[1]) >= minDistance) output.push(point);
  }
  if (output.length > 2 && Math.hypot(output[0][0] - output[output.length - 1][0], output[0][1] - output[output.length - 1][1]) < minDistance) {
    output.pop();
  }
  return output;
}

function rdpSimplify(points, epsilon) {
  if (points.length <= 3) return points;
  let maxDistance = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }
  if (maxDistance <= epsilon) return [start, end];
  const left = rdpSimplify(points.slice(0, index + 1), epsilon);
  const right = rdpSimplify(points.slice(index), epsilon);
  return left.slice(0, -1).concat(right);
}

function perpendicularDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  return Math.abs(dy * point[0] - dx * point[1] + end[0] * start[1] - end[1] * start[0]) / Math.hypot(dx, dy);
}

function roundPathNumber(value) {
  return Math.round(value * 100) / 100;
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
