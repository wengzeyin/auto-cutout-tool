const imageData = makeImageData(260, 220);
ellipse(imageData, 78, 86, 48, 48, [240, 84, 84, 255]);
roundRect(imageData, 140, 50, 82, 82, 18, [52, 199, 134, 255]);
ellipse(imageData, 78, 156, 30, 22, [250, 204, 21, 255]);
rect(imageData, 144, 146, 80, 30, [17, 24, 39, 255]);
for (const [x, y, color] of [
  [74, 82, [255, 255, 255, 255]],
  [76, 84, [255, 255, 255, 255]],
  [150, 62, [255, 120, 120, 255]],
  [178, 82, [255, 120, 120, 255]],
  [210, 164, [250, 250, 250, 255]],
]) {
  setPixel(imageData, x, y, color);
}
rect(imageData, 26, 28, 5, 5, [37, 99, 235, 255]);
for (let x = 45; x < 112; x += 1) {
  setPixel(imageData, x, 87, [12, 12, 12, 255]);
  if (x % 8 !== 0) setPixel(imageData, x, 88, [12, 12, 12, 255]);
}
for (let x = 128; x < 224; x += 1) {
  setPixel(imageData, x, 28, [142, 142, 142, 180]);
  setPixel(imageData, x, 29, [118, 118, 118, 255]);
  setPixel(imageData, x, 30, [118, 118, 118, 255]);
  setPixel(imageData, x, 31, [142, 142, 142, 180]);
}

const vectorSettings = {
  mode: "precise",
  colorStep: 24,
  minRegionRatio: 0.00001,
  mergeTinyRatio: 0.00002,
  simplify: 1.1,
  smoothPasses: 2,
  protectLineArt: true,
  flattenAlpha: true,
};

const groups = imageDataToVectorRegions(imageData, 8, vectorSettings);
const paths = [...groups.values()].map((group) => group.path).join("");
const pathCount = [...groups.values()].reduce((sum, group) => sum + group.regionCount, 0);
const commandCount = countSvgPathCommands(paths);
const visibleArea = [...groups.values()].reduce((sum, group) => sum + group.area, 0);
const commandDensity = commandCount / Math.max(1, Math.sqrt(visibleArea));
const gridAlignedRatio = measureGridAlignedCoordinateRatio(paths);
const fractionalCoordinateRatio = measureFractionalCoordinateRatio(paths);
const hasCubic = /C/.test(paths);
const tinyBlueGroup = [...groups.entries()].find(([key, group]) => group.area >= 18 && group.area <= 40 && keyIsBlue(key))?.[1];
const tinyBlueHasCubic = Boolean(tinyBlueGroup && /C/.test(tinyBlueGroup.path));
const hasOpacityGroups = [...groups.keys()].some((key) => !key.endsWith("|1"));
const tinyRegionCount = [...groups.values()].filter((group) => group.area < 14).length;
const darkGroup = [...groups.entries()].find(([key]) => /^#/.test(key) && keyLightness(key) < 70)?.[1];
const grayLineArea = [...groups.entries()]
  .filter(([key]) => /^#/.test(key) && keyLightness(key) >= 96 && keyLightness(key) < 150 && keySaturation(key) < 0.08)
  .reduce((sum, [, group]) => sum + group.area, 0);
const failures = [];

if (pathCount < 3 || pathCount > 10) failures.push(`Expected 3-10 paths, got ${pathCount}.`);
if (!hasCubic) failures.push("Expected precise SVG to include cubic curve commands.");
if (!tinyBlueHasCubic) failures.push("Expected small precise-mode details to use cubic paths instead of blocky straight-line boxes.");
if (hasOpacityGroups) failures.push("Expected precise flat artwork SVG to merge alpha into solid color paths.");
if (commandDensity > 18) failures.push(`Command density ${commandDensity.toFixed(2)} is too high.`);
if (commandCount > 650) failures.push(`Command count ${commandCount} is too high for simple flat artwork.`);
if (gridAlignedRatio > 0.58) failures.push(`Expected precise SVG to smooth off the pixel grid, grid-aligned ratio ${gridAlignedRatio.toFixed(2)} is too high.`);
if (fractionalCoordinateRatio < 0.3) failures.push(`Expected precise SVG to keep subpixel coordinates, fractional ratio ${fractionalCoordinateRatio.toFixed(2)} is too low.`);
if (tinyRegionCount > 0) failures.push(`Expected isolated speckles to merge away, got ${tinyRegionCount}.`);
if (!darkGroup || darkGroup.area < 60) failures.push("Expected protected dark line art to remain as a filled path group.");
if (grayLineArea < 170) failures.push(`Expected protected gray anti-aliased line art to remain, got area ${grayLineArea}.`);

const photoLike = makePhotoLikeImageData(320, 260);
const photoVectorSettings = {
  mode: "auto",
  colorStep: 96,
  minRegionRatio: 0.00062,
  mergeTinyRatio: 0.0011,
  simplify: 4.2,
  smoothPasses: 1,
  protectLineArt: false,
  flattenAlpha: false,
};
const photoGroups = imageDataToVectorRegions(photoLike, 84, photoVectorSettings);
const photoPaths = [...photoGroups.values()].map((group) => group.path).join("");
const photoPathCount = [...photoGroups.values()].reduce((sum, group) => sum + group.regionCount, 0);
const photoCommandCount = countSvgPathCommands(photoPaths);
const photoVisibleArea = [...photoGroups.values()].reduce((sum, group) => sum + group.area, 0);
const photoCommandDensity = photoCommandCount / Math.max(1, Math.sqrt(photoVisibleArea));
const photoTinyRegionCount = [...photoGroups.values()].filter((group) => group.area < 24).length;
const photoHasOpacityGroups = [...photoGroups.keys()].some((key) => !key.endsWith("|1"));

if (photoPathCount > 90) failures.push(`Expected auto photo SVG to avoid excessive paths, got ${photoPathCount}.`);
if (photoCommandDensity > 10) failures.push(`Expected auto photo SVG command density <= 10, got ${photoCommandDensity.toFixed(2)}.`);
if (photoTinyRegionCount > 0) failures.push(`Expected photo-like speckles to merge away, got ${photoTinyRegionCount}.`);
if (!photoHasOpacityGroups) failures.push("Expected photo-like SVG to keep alpha groups for soft material edges.");

const productLike = makeProductLikeImageData(280, 220);
const productVectorSettings = {
  mode: "auto",
  colorStep: 72,
  minRegionRatio: 0.00022,
  mergeTinyRatio: 0.00046,
  simplify: 3.35,
  smoothPasses: 1,
  protectLineArt: false,
  flattenAlpha: false,
  relaxGrid: true,
};
const productGroups = imageDataToVectorRegions(productLike, 64, productVectorSettings);
const productPaths = [...productGroups.values()].map((group) => group.path).join("");
const productPathCount = [...productGroups.values()].reduce((sum, group) => sum + group.regionCount, 0);
const productCommandCount = countSvgPathCommands(productPaths);
const productVisibleArea = [...productGroups.values()].reduce((sum, group) => sum + group.area, 0);
const productCommandDensity = productCommandCount / Math.max(1, Math.sqrt(productVisibleArea));
const productGridAlignedRatio = measureGridAlignedCoordinateRatio(productPaths);
const productFractionalCoordinateRatio = measureFractionalCoordinateRatio(productPaths);

if (!/[QC]/.test(productPaths)) failures.push("Expected product SVG to use smoothed curve commands.");
if (productPathCount > 70) failures.push(`Expected product SVG to keep path count manageable, got ${productPathCount}.`);
if (productCommandDensity > 8) failures.push(`Expected product SVG command density <= 8, got ${productCommandDensity.toFixed(2)}.`);
if (productGridAlignedRatio > 0.62) failures.push(`Expected product SVG to reduce grid alignment, got ${productGridAlignedRatio.toFixed(2)}.`);
if (productFractionalCoordinateRatio < 0.34) failures.push(`Expected product SVG to keep fractional coordinates, got ${productFractionalCoordinateRatio.toFixed(2)}.`);

const result = {
  pathCount,
  commandCount,
  visibleArea,
  commandDensity: Math.round(commandDensity * 100) / 100,
  gridAlignedRatio: Math.round(gridAlignedRatio * 100) / 100,
  fractionalCoordinateRatio: Math.round(fractionalCoordinateRatio * 100) / 100,
  tinyRegionCount,
  darkArea: darkGroup?.area || 0,
  grayLineArea,
  tinyBlueHasCubic,
  hasCubic,
  hasOpacityGroups,
  photoPathCount,
  photoCommandCount,
  photoVisibleArea,
  photoCommandDensity: Math.round(photoCommandDensity * 100) / 100,
  photoTinyRegionCount,
  photoHasOpacityGroups,
  productPathCount,
  productCommandCount,
  productVisibleArea,
  productCommandDensity: Math.round(productCommandDensity * 100) / 100,
  productGridAlignedRatio: Math.round(productGridAlignedRatio * 100) / 100,
  productFractionalCoordinateRatio: Math.round(productFractionalCoordinateRatio * 100) / 100,
  pass: failures.length === 0,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);

function makeImageData(width, height) {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

function setPixel(img, x, y, color) {
  if (x < 0 || x >= img.width || y < 0 || y >= img.height) return;
  const offset = (y * img.width + x) * 4;
  img.data[offset] = color[0];
  img.data[offset + 1] = color[1];
  img.data[offset + 2] = color[2];
  img.data[offset + 3] = color[3];
}

function rect(img, x, y, width, height, color) {
  for (let py = Math.max(0, Math.floor(y)); py < Math.min(img.height, Math.ceil(y + height)); py += 1) {
    for (let px = Math.max(0, Math.floor(x)); px < Math.min(img.width, Math.ceil(x + width)); px += 1) setPixel(img, px, py, color);
  }
}

function ellipse(img, cx, cy, rx, ry, color) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      if (((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1) setPixel(img, x, y, color);
    }
  }
}

function roundRect(img, x, y, width, height, radius, color) {
  rect(img, x + radius, y, width - radius * 2, height, color);
  rect(img, x, y + radius, width, height - radius * 2, color);
  ellipse(img, x + radius, y + radius, radius, radius, color);
  ellipse(img, x + width - radius, y + radius, radius, radius, color);
  ellipse(img, x + radius, y + height - radius, radius, radius, color);
  ellipse(img, x + width - radius, y + height - radius, radius, radius, color);
}

function makePhotoLikeImageData(width, height) {
  const img = makeImageData(width, height);
  ellipse(img, 160, 130, 96, 108, [190, 142, 112, 255]);
  ellipse(img, 145, 106, 82, 62, [80, 52, 42, 255]);
  ellipse(img, 185, 108, 78, 60, [70, 45, 38, 250]);
  ellipse(img, 148, 152, 72, 62, [214, 162, 128, 238]);
  ellipse(img, 202, 158, 46, 52, [180, 126, 98, 216]);
  for (let index = 0; index < 420; index += 1) {
    const x = Math.round(76 + seededNoise(index, 1) * 168);
    const y = Math.round(46 + seededNoise(index, 2) * 182);
    const radius = 1 + Math.round(seededNoise(index, 3) * 2);
    const alpha = Math.round(90 + seededNoise(index, 4) * 95);
    const shade = Math.round(58 + seededNoise(index, 5) * 64);
    ellipse(img, x, y, radius, radius + 1, [shade, Math.max(34, shade - 12), Math.max(28, shade - 18), alpha]);
  }
  for (let index = 0; index < 120; index += 1) {
    const x = Math.round(92 + seededNoise(index, 6) * 142);
    const y = Math.round(92 + seededNoise(index, 7) * 110);
    const alpha = Math.round(96 + seededNoise(index, 8) * 60);
    setPixel(img, x, y, [240, 218, 196, alpha]);
  }
  return img;
}

function makeProductLikeImageData(width, height) {
  const img = makeImageData(width, height);
  roundRect(img, 58, 28, 162, 156, 12, [244, 226, 190, 255]);
  rect(img, 70, 38, 12, 128, [22, 22, 22, 255]);
  for (let y = 48; y < 156; y += 22) rect(img, 76, y, 12, 12, [255, 255, 255, 255]);
  rect(img, 102, 58, 84, 10, [226, 210, 178, 255]);
  rect(img, 102, 84, 92, 10, [226, 210, 178, 255]);
  rect(img, 102, 110, 74, 10, [226, 210, 178, 255]);
  rect(img, 102, 136, 82, 10, [226, 210, 178, 255]);
  ellipse(img, 198, 48, 18, 18, [255, 255, 255, 190]);
  for (let index = 0; index < 160; index += 1) {
    const x = 72 + Math.round(seededNoise(index, 21) * 128);
    const y = 42 + Math.round(seededNoise(index, 22) * 122);
    const offset = (y * width + x) * 4;
    const delta = Math.round((seededNoise(index, 23) - 0.5) * 10);
    img.data[offset] = clamp(img.data[offset] + delta, 0, 255);
    img.data[offset + 1] = clamp(img.data[offset + 1] + delta, 0, 255);
    img.data[offset + 2] = clamp(img.data[offset + 2] + delta, 0, 255);
  }
  return img;
}

function seededNoise(index, salt) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function imageDataToVectorRegions(imageData, alphaThreshold, vectorSettings) {
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
      if (replacement) for (const pixel of region.pixels) keys[pixel] = replacement;
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
      for (const next of [x > 0 ? current - 1 : -1, x < width - 1 ? current + 1 : -1, y > 0 ? current - width : -1, y < height - 1 ? current + width : -1]) {
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
    for (const next of [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, index >= width ? index - width : -1, index < keys.length - width ? index + width : -1]) {
      const key = next >= 0 ? keys[next] : null;
      if (!key || key === ownKey) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function appendVectorRegion(groups, key, pixels, keys, width, height, vectorSettings) {
  let group = groups.get(key);
  if (!group) {
    group = { path: "", area: 0, regionCount: 0 };
    groups.set(key, group);
  }
  const loops = traceRegionLoops(pixels, keys, key, width, height);
  const path = loops
    .map((loop) => loopToPath(smoothVectorLoop(simplifyVectorLoop(loop, vectorSettings.simplify || 1.4), vectorSettings.smoothPasses ?? 2), vectorSettings))
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
    if (loop.length >= 4 && sameVectorPoint(loop[0], loop[loop.length - 1])) loops.push(simplifyOrthogonalLoop(loop));
  }
  return loops;
}

function createVectorEdge(x1, y1, x2, y2) {
  return { x1, y1, x2, y2, start: `${x1},${y1}`, end: `${x2},${y2}`, used: false };
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

function loopToPath(loop, vectorSettings) {
  if (loop.length < 4) return "";
  if (vectorSettings.mode === "precise" && loop.length > 4) return loopToCubicPath(loop, vectorSettings);
  const pathLoop = vectorSettings.relaxGrid && loop.length > 10 ? relaxGridAlignedLoop(loop, vectorSettings) : loop;
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
    for (let index = 1; index < pathLoop.length - 1; index += 1) d += `L${roundPathNumber(pathLoop[index][0])} ${roundPathNumber(pathLoop[index][1])}`;
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

function loopToCubicPath(loop, vectorSettings) {
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
    const cp1 = [p1[0] + ((p2[0] - p0[0]) * tension) / 6, p1[1] + ((p2[1] - p0[1]) * tension) / 6];
    const cp2 = [p2[0] - ((p3[0] - p1[0]) * tension) / 6, p2[1] - ((p3[1] - p1[1]) * tension) / 6];
    d += `C${roundPathNumber(cp1[0])} ${roundPathNumber(cp1[1])} ${roundPathNumber(cp2[0])} ${roundPathNumber(cp2[1])} ${roundPathNumber(p2[0])} ${roundPathNumber(p2[1])}`;
  }
  return `${d}Z`;
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
      next.push([current[0] * 0.72 + after[0] * 0.28, current[1] * 0.72 + after[1] * 0.28]);
      next.push([current[0] * 0.28 + after[0] * 0.72, current[1] * 0.28 + after[1] * 0.72]);
    }
    output = next;
  }
  return output;
}

function smoothVectorLoop(loop, passes = 2) {
  if (loop.length < 12) return loop;
  const closed = sameVectorPoint(loop[0], loop[loop.length - 1]);
  const source = closed ? loop.slice(0, -1) : loop;
  let points = source;
  for (let pass = 0; pass < Math.max(0, Math.min(3, passes)); pass += 1) {
    const next = [];
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const after = points[(index + 1) % points.length];
      const distance = Math.hypot(after[0] - current[0], after[1] - current[1]);
      if (distance < 1.2) {
        next.push(current);
        continue;
      }
      next.push([current[0] * 0.75 + after[0] * 0.25, current[1] * 0.75 + after[1] * 0.25]);
      next.push([current[0] * 0.25 + after[0] * 0.75, current[1] * 0.25 + after[1] * 0.75]);
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
  const linear = [...reduced, reduced[0]];
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
  return output;
}

function rdpSimplify(points, epsilon) {
  if (points.length <= 2) return points;
  let maxDistance = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i += 1) {
    const distance = perpendicularDistance(points[i], points[0], points[end]);
    if (distance > maxDistance) {
      index = i;
      maxDistance = distance;
    }
  }
  if (maxDistance > epsilon) {
    const left = rdpSimplify(points.slice(0, index + 1), epsilon);
    const right = rdpSimplify(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[end]];
}

function perpendicularDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  return Math.abs(dy * point[0] - dx * point[1] + end[0] * start[1] - end[1] * start[0]) / Math.hypot(dx, dy);
}

function countSvgPathCommands(path) {
  return (path.match(/[MLQCZ]/g) || []).length;
}

function measureGridAlignedCoordinateRatio(path) {
  const values = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (!values.length) return 1;
  const aligned = values.filter((value) => Math.abs(value - Math.round(value)) < 0.035).length;
  return aligned / values.length;
}

function measureFractionalCoordinateRatio(path) {
  const values = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (!values.length) return 0;
  const fractional = values.filter((value) => Math.abs(value - Math.round(value)) >= 0.08).length;
  return fractional / values.length;
}

function colorMetrics(red, green, blue) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  return { lightness: red * 0.299 + green * 0.587 + blue * 0.114, saturation: max ? (max - min) / max : 0 };
}

function quantizeChannel(value, step) {
  return Math.max(0, Math.min(255, Math.round(value / step) * step));
}

function rgbToHex(red, green, blue) {
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function keyLightness(key) {
  const hex = key.split("|")[0] || "";
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 255;
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return colorMetrics(red, green, blue).lightness;
}

function keyIsBlue(key) {
  const hex = key.split("|")[0] || "";
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return false;
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return blue > red + 60 && blue > green + 24;
}

function keySaturation(key) {
  const hex = key.split("|")[0] || "";
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 1;
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return colorMetrics(red, green, blue).saturation;
}

function roundPathNumber(value) {
  return Math.round(value * 100) / 100;
}

function sameVectorPoint(a, b) {
  return a && b && Math.abs(a[0] - b[0]) < 0.001 && Math.abs(a[1] - b[1]) < 0.001;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
