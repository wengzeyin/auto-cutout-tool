const width = 900;
const height = 420;

const cases = [
  {
    name: "nearby-characters-with-shadow",
    draw: (img) => {
      for (let i = 0; i < 4; i += 1) {
        const x = 120 + i * 185;
        ellipse(img, x, 190, 62, 92, 255);
        ellipse(img, x, 292, 58, 30, 120);
      }
      rect(img, 95, 292, 600, 16, 32);
    },
    min: 4,
    max: 4,
  },
  {
    name: "sticker-pack-small-details",
    draw: (img) => {
      for (let y = 0; y < 2; y += 1) {
        for (let x = 0; x < 4; x += 1) {
          const cx = 115 + x * 180;
          const cy = 110 + y * 165;
          ellipse(img, cx, cy, 42, 42, 255);
          ellipse(img, cx + 48, cy + 34, 12, 12, 245);
        }
      }
    },
    min: 8,
    max: 16,
  },
  {
    name: "single-character-internal-gaps",
    draw: (img) => {
      ellipse(img, 450, 160, 86, 112, 255);
      rect(img, 378, 250, 144, 96, 255);
      rect(img, 318, 240, 52, 24, 245);
      rect(img, 530, 240, 52, 24, 245);
      rect(img, 410, 270, 20, 68, 0);
      rect(img, 470, 270, 20, 68, 0);
    },
    min: 1,
    max: 1,
  },
  {
    name: "close-objects-with-low-alpha-bridge-and-small-prop",
    draw: (img) => {
      ellipse(img, 190, 190, 56, 76, 255);
      ellipse(img, 325, 190, 48, 68, 255);
      ellipse(img, 455, 206, 24, 28, 255);
      ellipse(img, 585, 188, 58, 78, 255);
      rect(img, 135, 262, 500, 18, 28);
      rect(img, 244, 198, 34, 12, 34);
      rect(img, 378, 202, 36, 12, 34);
      rect(img, 492, 202, 40, 12, 34);
    },
    min: 4,
    max: 5,
  },
  {
    name: "over-split-fragments-regrouped-by-projection",
    draw: (img) => {
      const groups = [
        { x: 165, y: 135, color: 255 },
        { x: 330, y: 150, color: 248 },
        { x: 495, y: 132, color: 250 },
        { x: 660, y: 146, color: 246 },
      ];
      for (const group of groups) {
        ellipse(img, group.x, group.y, 42, 54, group.color);
        ellipse(img, group.x - 36, group.y + 52, 18, 20, 238);
        ellipse(img, group.x + 34, group.y + 54, 18, 18, 238);
        for (let i = 0; i < 14; i += 1) {
          rect(img, group.x - 46 + i * 7, group.y + 86, 3, 12, 230);
        }
        ellipse(img, group.x, group.y + 104, 78, 15, 30);
      }
      rect(img, 86, 238, 660, 10, 22);
    },
    min: 4,
    max: 4,
  },
  {
    name: "clear-small-elements-with-residue-crumbs",
    draw: (img) => {
      for (let i = 0; i < 8; i += 1) {
        const cx = 100 + i * 95;
        const cy = i % 2 ? 245 : 145;
        ellipse(img, cx, cy, 21, 18, 255);
        rect(img, cx - 8, cy + 18, 16, 14, 235);
      }
      for (let i = 0; i < 22; i += 1) {
        const x = 52 + ((i * 37) % 760);
        const y = 74 + ((i * 61) % 275);
        rect(img, x, y, i % 3 === 0 ? 3 : 5, i % 2 === 0 ? 4 : 6, i % 4 === 0 ? 54 : 42);
      }
    },
    min: 8,
    max: 10,
  },
];

const failures = [];
for (const testCase of cases) {
  const imageData = makeImageData(width, height);
  testCase.draw(imageData);
  const components = findMultiObjectComponents(imageData, 32, 800, 8, { strength: "strong" });
  const count = components.length;
  const pass = count >= testCase.min && count <= testCase.max;
  const boxes = components.map((component) => `${Math.round(component.x)},${Math.round(component.y)},${Math.round(component.width)},${Math.round(component.height)}`).join(" | ");
  if (!pass) failures.push(`${testCase.name}: expected ${testCase.min}-${testCase.max}, got ${count}; boxes=${boxes}`);
  console.log(`${pass ? "PASS" : "FAIL"} ${testCase.name}: ${count} component(s)`);
}

if (failures.length) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exit(1);
}

function makeImageData(w, h) {
  return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
}

function setAlpha(img, x, y, alpha) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || x >= img.width || y < 0 || y >= img.height) return;
  const offset = (y * img.width + x) * 4;
  img.data[offset] = 64;
  img.data[offset + 1] = 160;
  img.data[offset + 2] = 120;
  img.data[offset + 3] = Math.max(img.data[offset + 3], alpha);
}

function ellipse(img, cx, cy, rx, ry, alpha) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      if (((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1) setAlpha(img, x, y, alpha);
    }
  }
}

function rect(img, x, y, w, h, alpha) {
  for (let py = Math.max(0, Math.floor(y)); py < Math.min(img.height, Math.ceil(y + h)); py += 1) {
    for (let px = Math.max(0, Math.floor(x)); px < Math.min(img.width, Math.ceil(x + w)); px += 1) setAlpha(img, px, py, alpha);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getSplitSettings(strength = "standard") {
  const presets = {
    conservative: { coreBase: 68, supportBase: 22, minCoreFactor: 0.18, absorbScale: 0.01, mergeDistance: 6, gapDensityRatio: 0.055, valleyDensityRatio: 0.34, gapMinRatio: 0.022, splitPaddingFactor: 1 },
    standard: { coreBase: 72, supportBase: 22, minCoreFactor: 0.12, absorbScale: 0.007, mergeDistance: 4, gapDensityRatio: 0.075, valleyDensityRatio: 0.4, gapMinRatio: 0.018, splitPaddingFactor: 0.8 },
    strong: { coreBase: 80, supportBase: 24, minCoreFactor: 0.08, absorbScale: 0.0045, mergeDistance: 2, gapDensityRatio: 0.1, valleyDensityRatio: 0.48, gapMinRatio: 0.012, splitPaddingFactor: 0.55 },
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
  if (!seeds.length) return findComponentsFromMask(cleanAlphaMask(imageData, alphaThreshold), width, height, minArea, pad);
  const labels = growSeedsIntoSupport(seeds, supportMask, width, height);
  let components = componentsFromLabels(labels, seeds.length, width, height, imageData, Math.max(24, alphaThreshold), pad)
    .filter((component) => keepMultiObjectComponent(component, imageArea, minArea));
  components = splitLargeComponents(components, imageData, coreMask, width, height, minCoreArea, pad, settings);
  components = absorbTinyMultiObjectFragments(components, imageArea, minArea, settings);
  components = mergeAssetFragments(components, imageData, Math.max(24, alphaThreshold), settings);
  components = splitLargeComponents(components, imageData, coreMask, width, height, minCoreArea, pad, settings);
  components = stabilizeOverSplitComponents(components, imageData, coreMask, supportThreshold, minCoreArea, minArea, pad, settings);
  components = stabilizeTinyFragmentBurst(components, imageData, minArea, settings);
  return sortComponentsReadingOrder(components).map((component, index) => ({ ...component, id: index + 1, mask: undefined }));
}

function createAlphaMask(imageData, alphaThreshold) {
  const mask = new Uint8Array(imageData.width * imageData.height);
  for (let index = 0; index < mask.length; index += 1) mask[index] = imageData.data[index * 4 + 3] > alphaThreshold ? 1 : 0;
  return mask;
}

function cleanAlphaMask(imageData, alphaThreshold) {
  return createAlphaMask(imageData, Math.max(16, alphaThreshold));
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
        for (const next of [index - 1, index + 1, index - width, index + width]) {
          if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue;
          if ((next === index - 1 && px === 0) || (next === index + 1 && px === width - 1)) continue;
          visited[next] = 1;
          stack.push(next);
        }
      }
      if (pixels.length >= minArea) seeds.push({ id: seeds.length, pixels, area: pixels.length, x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 });
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
    for (const next of [index - 1, index + 1, index - width, index + width]) {
      if (next < 0 || next >= supportMask.length || !supportMask[next] || labels[next] !== -1) continue;
      if ((next === index - 1 && px === 0) || (next === index + 1 && px === width - 1)) continue;
      labels[next] = label;
      queue.push(next);
    }
  }
  return labels;
}

function componentsFromLabels(labels, count, width, height, imageData, alphaThreshold, pad) {
  const boxes = Array.from({ length: count }, () => ({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, area: 0, strongAlphaArea: 0 }));
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
  return boxes.filter((box) => box.area > 0).map((box, index) => {
    const padded = padBox(box, pad, width, height);
    const component = { id: index + 1, area: box.area, strongAlphaArea: box.strongAlphaArea, x: padded.minX, y: padded.minY, width: padded.maxX - padded.minX + 1, height: padded.maxY - padded.minY + 1 };
    component.alphaDensity = component.area / Math.max(1, component.width * component.height);
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

function splitLargeComponents(components, imageData, coreMask, w, h, minCoreArea, pad, settings) {
  const output = [];
  for (const component of components) {
    const children = splitLargeComponent(component, imageData, coreMask, w, h, minCoreArea, pad, settings);
    if (children.length >= 2) output.push(...children);
    else output.push(component);
  }
  return output;
}

function splitLargeComponent(component, imageData, coreMask, w, h, minCoreArea, pad, settings) {
  const imageArea = w * h;
  const boxArea = component.width * component.height;
  const largeBySize = component.width / w > 0.28 || component.height / h > 0.28;
  const sparseLarge = boxArea / imageArea > 0.22 && component.alphaDensity < 0.42;
  const coreChildren = findCoreSeedsInBox(coreMask, w, h, component, minCoreArea);
  const hasMultipleCore = coreChildren.length >= 2;
  if (!largeBySize && !sparseLarge && !hasMultipleCore) return [];
  const ownershipChildren = splitBySeedOwnership(component, imageData, coreChildren, minCoreArea, pad, settings);
  if (ownershipChildren.length >= 2) return ownershipChildren;
  if (!hasMultipleCore || (!sparseLarge && component.alphaDensity > 0.28)) return [];
  return coreChildren
    .filter((child) => child.area >= minCoreArea)
    .map((child) => {
      const splitPad = Math.max(1, Math.round(pad * settings.splitPaddingFactor));
      const padded = padBox({ minX: child.x, minY: child.y, maxX: child.x + child.width - 1, maxY: child.y + child.height - 1 }, splitPad, w, h);
      return measureBoxAsComponent({ id: child.id, x: padded.minX, y: padded.minY, width: padded.maxX - padded.minX + 1, height: padded.maxY - padded.minY + 1 }, imageData, Math.max(24, settings.supportBase));
    })
    .filter((child) => keepMultiObjectComponent(child, imageArea, minCoreArea));
}

function splitBySeedOwnership(component, imageData, coreChildren, minCoreArea, pad, settings) {
  if (!coreChildren || coreChildren.length < 2 || settings.mergeDistance > 4) return [];
  const { width: w, height: h } = imageData;
  const imageArea = w * h;
  const parentMetrics = measureComponent(component, imageData, Math.max(24, settings.supportBase));
  const sparseOrLarge = parentMetrics.boxRatio > 0.12 || parentMetrics.alphaDensity < 0.34 || component.width / w > 0.26 || component.height / h > 0.26;
  if (!sparseOrLarge) return [];
  const seeds = coreChildren.filter((seed) => seed.area >= minCoreArea).map((seed, index) => ({ ...seed, id: index, cx: seed.x + seed.width / 2, cy: seed.y + seed.height / 2 }));
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
  const clusters = seeds.map((seed) => ({ seed, area: 0, minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }));
  const startX = Math.max(0, Math.floor(component.x));
  const startY = Math.max(0, Math.floor(component.y));
  const endX = Math.min(w, Math.ceil(component.x + component.width));
  const endY = Math.min(h, Math.ceil(component.y + component.height));
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const index = y * w + x;
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
      const padded = padBox(cluster, splitPad, w, h);
      return measureBoxAsComponent({ id: index + 1, x: padded.minX, y: padded.minY, width: padded.maxX - padded.minX + 1, height: padded.maxY - padded.minY + 1 }, imageData, Math.max(24, settings.supportBase));
    })
    .filter((child) => keepMultiObjectComponent(child, imageArea, minCoreArea));
  if (children.length < 2) return [];
  const sorted = [...children].sort((a, b) => dominantAxis === "x" ? a.x - b.x : a.y - b.y);
  if (!hasProjectionValleyBetweenChildren(sorted, component, imageData, dominantAxis, settings)) return [];
  const childDensity = sorted.reduce((sum, child) => sum + child.alphaDensity, 0) / sorted.length;
  const childArea = sorted.reduce((sum, child) => sum + child.area, 0);
  if (childDensity < parentMetrics.alphaDensity * 0.78) return [];
  if (childArea < parentMetrics.alphaArea * 0.72) return [];
  return sorted;
}

function hasProjectionValleyBetweenChildren(children, component, imageData, axis, settings) {
  const valleys = [];
  for (let index = 0; index < children.length - 1; index += 1) {
    const left = children[index];
    const right = children[index + 1];
    const cut = axis === "x" ? Math.round((left.x + left.width + right.x) / 2) : Math.round((left.y + left.height + right.y) / 2);
    valleys.push(projectionStripDensity(component, imageData.data, imageData.width, imageData.height, axis, cut, Math.max(24, settings.supportBase)));
  }
  return valleys.some((value) => value <= 0.18) || (valleys.length >= 2 && valleys.reduce((sum, value) => sum + value, 0) / valleys.length <= 0.26);
}

function projectionStripDensity(component, data, w, h, axis, cut, alphaThreshold) {
  const radius = 2;
  const startX = Math.max(0, Math.floor(component.x));
  const startY = Math.max(0, Math.floor(component.y));
  const endX = Math.min(w, Math.ceil(component.x + component.width));
  const endY = Math.min(h, Math.ceil(component.y + component.height));
  let opaque = 0;
  let total = 0;
  if (axis === "x") {
    for (let x = Math.max(startX, cut - radius); x <= Math.min(endX - 1, cut + radius); x += 1) {
      for (let y = startY; y < endY; y += 1) {
        total += 1;
        if (data[(y * w + x) * 4 + 3] >= alphaThreshold) opaque += 1;
      }
    }
  } else {
    for (let y = Math.max(startY, cut - radius); y <= Math.min(endY - 1, cut + radius); y += 1) {
      for (let x = startX; x < endX; x += 1) {
        total += 1;
        if (data[(y * w + x) * 4 + 3] >= alphaThreshold) opaque += 1;
      }
    }
  }
  return total ? opaque / total : 1;
}

function findCoreSeedsInBox(mask, w, h, box, minArea) {
  const visited = new Uint8Array(mask.length);
  const seeds = [];
  const stack = [];
  const startX = Math.max(0, Math.floor(box.x));
  const startY = Math.max(0, Math.floor(box.y));
  const endX = Math.min(w, Math.ceil(box.x + box.width));
  const endY = Math.min(h, Math.ceil(box.y + box.height));
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const start = y * w + x;
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
        const px = index % w;
        const py = Math.floor(index / w);
        area += 1;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        for (const next of [index - 1, index + 1, index - w, index + w]) {
          if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue;
          const nx = next % w;
          const ny = Math.floor(next / w);
          if (nx < startX || nx >= endX || ny < startY || ny >= endY) continue;
          if ((next === index - 1 && px === 0) || (next === index + 1 && px === w - 1)) continue;
          visited[next] = 1;
          stack.push(next);
        }
      }
      if (area >= minArea) seeds.push({ id: seeds.length + 1, area, x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 });
    }
  }
  return seeds;
}

function measureBoxAsComponent(box, imageData, alphaThreshold) {
  const metrics = measureComponent(box, imageData, alphaThreshold);
  return { ...box, area: metrics.alphaArea, strongAlphaArea: metrics.strongAlphaArea, alphaDensity: metrics.alphaDensity, boxArea: metrics.boxArea, boxRatio: metrics.boxRatio };
}

function measureComponent(component, imageData, alphaThreshold) {
  const startX = Math.max(0, Math.floor(component.x));
  const startY = Math.max(0, Math.floor(component.y));
  const endX = Math.min(imageData.width, Math.ceil(component.x + component.width));
  const endY = Math.min(imageData.height, Math.ceil(component.y + component.height));
  let alphaArea = 0;
  let strongAlphaArea = 0;
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const alpha = imageData.data[(y * imageData.width + x) * 4 + 3];
      if (alpha >= alphaThreshold) alphaArea += 1;
      if (alpha >= 96) strongAlphaArea += 1;
    }
  }
  const boxArea = Math.max(1, (endX - startX) * (endY - startY));
  return { boxArea, alphaArea, strongAlphaArea, alphaDensity: alphaArea / boxArea, boxRatio: boxArea / Math.max(1, imageData.width * imageData.height) };
}

function findComponentsFromMask(mask, w, h, minArea, pad) {
  const visited = new Uint8Array(mask.length);
  const components = [];
  const stack = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const start = y * w + x;
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
        const px = index % w;
        const py = Math.floor(index / w);
        area += 1;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        for (const next of [index - 1, index + 1, index - w, index + w]) {
          if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue;
          if ((next === index - 1 && px === 0) || (next === index + 1 && px === w - 1)) continue;
          visited[next] = 1;
          stack.push(next);
        }
      }
      if (area >= minArea) {
        const box = padBox({ minX, minY, maxX, maxY }, pad, w, h);
        components.push({ id: components.length + 1, area, x: box.minX, y: box.minY, width: box.maxX - box.minX + 1, height: box.maxY - box.minY + 1 });
      }
    }
  }
  return components;
}

function absorbTinyMultiObjectFragments(components, imageArea, minArea, settings) {
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
    const target = output.map((candidate) => ({ candidate, distance: boxDistance(component, candidate) })).filter((entry) => entry.distance <= absorbDistance).sort((a, b) => a.distance - b.distance)[0]?.candidate;
    if (target) mergeBoxInto(target, component);
    else output.push({ ...component });
  }
  return output;
}

function stabilizeTinyFragmentBurst(components, imageData, minArea, settings) {
  if (components.length <= 14) return components;
  const { width: w, height: h } = imageData;
  const imageArea = w * h;
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
  return compacted.map((component, index) => ({ ...component, id: index + 1 }));
}

function compactNearbySmallComponents(components, imageData, minArea, settings) {
  if (components.length <= 14) return components;
  const { width: w, height: h } = imageData;
  const imageArea = w * h;
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

function stabilizeOverSplitComponents(components, imageData, coreMask, supportThreshold, minCoreArea, minArea, pad, settings) {
  if (components.length <= 18) return components;
  const { width: w, height: h } = imageData;
  const imageArea = w * h;
  const supportMask = createAlphaMask(imageData, Math.max(14, supportThreshold));
  const radius = Math.max(3, Math.min(9, Math.round(Math.sqrt(imageArea) * 0.012)));
  const groupedMask = dilateMask(supportMask, w, h, radius);
  let grouped = findComponentsFromMask(groupedMask, w, h, Math.max(minArea, minCoreArea * 2), Math.max(pad, radius))
    .map((component) => measureBoxAsComponent(component, imageData, Math.max(24, supportThreshold)))
    .filter((component) => keepMultiObjectComponent(component, imageArea, minArea));
  if (!grouped.length) return components;
  if (grouped.length === 1) {
    const forced = forceProjectionSplitOverSplitComponent(grouped[0], imageData, coreMask, minCoreArea, pad, settings);
    if (forced.length >= 3 && forced.length <= 24) return forced;
  }
  grouped = splitLargeComponents(grouped, imageData, coreMask, w, h, minCoreArea, pad, {
    ...settings,
    mergeDistance: Math.min(settings.mergeDistance ?? 4, 4),
    splitPaddingFactor: Math.min(settings.splitPaddingFactor ?? 0.8, 0.8),
  });
  grouped = mergeAssetFragments(grouped, imageData, Math.max(24, supportThreshold), {
    ...settings,
    mergeDistance: Math.max(settings.mergeDistance ?? 4, 5),
  });
  grouped = grouped.filter((component) => keepMultiObjectComponent(component, imageArea, minArea));
  if (grouped.length < 2 || grouped.length > Math.max(32, components.length * 0.85)) return components;
  const groupedArea = grouped.reduce((sum, component) => sum + (component.area || 0), 0);
  const originalArea = components.reduce((sum, component) => sum + (component.area || 0), 0);
  return groupedArea >= originalArea * 0.48 ? grouped : components;
}

function forceProjectionSplitOverSplitComponent(component, imageData, coreMask, minCoreArea, pad, settings) {
  const vertical = forceProjectionSplitAxis(component, imageData, coreMask, "x", minCoreArea, pad, settings);
  if (vertical.length >= 2) return vertical;
  return forceProjectionSplitAxis(component, imageData, coreMask, "y", minCoreArea, pad, settings);
}

function forceProjectionSplitAxis(component, imageData, coreMask, axis, minCoreArea, pad, settings) {
  const { width: w, height: h, data } = imageData;
  const startX = Math.max(0, Math.floor(component.x));
  const startY = Math.max(0, Math.floor(component.y));
  const endX = Math.min(w, Math.ceil(component.x + component.width));
  const endY = Math.min(h, Math.ceil(component.y + component.height));
  const length = axis === "x" ? endX - startX : endY - startY;
  const crossLength = axis === "x" ? endY - startY : endX - startX;
  if (length < 80 || crossLength < 24) return [];

  const projection = new Array(length).fill(0);
  const alphaThreshold = Math.max(24, settings.supportBase);
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      if (data[(y * w + x) * 4 + 3] < alphaThreshold) continue;
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
    const extra = cut >= length - cut
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
  const parentArea = Math.max(1, component.area || measureComponent(component, imageData, alphaThreshold).alphaArea);
  const childArea = children.reduce((sum, child) => sum + (child.area || 0), 0);
  return childArea >= parentArea * 0.42 ? children : [];
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

function componentsFromProjectionRanges(ranges, axis, rect, imageData, coreMask, minCoreArea, pad, settings) {
  const { width: w, height: h } = imageData;
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
    const padded = padBox(bounds, splitPad, w, h);
    const child = measureBoxAsComponent({ id: children.length + 1, x: padded.minX, y: padded.minY, width: padded.maxX - padded.minX + 1, height: padded.maxY - padded.minY + 1 }, imageData, Math.max(24, settings.supportBase));
    if (keepMultiObjectComponent(child, w * h, minCoreArea)) children.push(child);
  }
  return children;
}

function contentBoundsInRange(imageData, coreMask, rect) {
  const { width: w, height: h } = imageData;
  const startX = Math.max(0, Math.floor(rect.startX));
  const startY = Math.max(0, Math.floor(rect.startY));
  const endX = Math.min(w, Math.ceil(rect.endX));
  const endY = Math.min(h, Math.ceil(rect.endY));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let area = 0;
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      if (!coreMask[y * w + x]) continue;
      area += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return area ? { minX, minY, maxX, maxY, area } : null;
}

function dilateMask(mask, w, h, radius) {
  const horizontal = new Uint8Array(mask.length);
  const output = new Uint8Array(mask.length);
  for (let y = 0; y < h; y += 1) {
    let sum = 0;
    const row = y * w;
    for (let x = -radius; x < w + radius; x += 1) {
      const addX = x + radius;
      if (addX >= 0 && addX < w) sum += mask[row + addX];
      const removeX = x - radius - 1;
      if (removeX >= 0 && removeX < w) sum -= mask[row + removeX];
      if (x >= 0 && x < w) horizontal[row + x] = sum > 0 ? 1 : 0;
    }
  }
  for (let x = 0; x < w; x += 1) {
    let sum = 0;
    for (let y = -radius; y < h + radius; y += 1) {
      const addY = y + radius;
      if (addY >= 0 && addY < h) sum += horizontal[addY * w + x];
      const removeY = y - radius - 1;
      if (removeY >= 0 && removeY < h) sum -= horizontal[removeY * w + x];
      if (y >= 0 && y < h) output[y * w + x] = sum > 0 ? 1 : 0;
    }
  }
  return output;
}

function mergeAssetFragments(components, imageData, alphaThreshold, settings) {
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

function shouldMergeAssetBoxes(a, b, imageData, alphaThreshold, settings) {
  const distance = boxDistance(a, b);
  const smallerArea = Math.min(a.area, b.area);
  const imageArea = imageData.width * imageData.height;
  const bothMeaningful = a.area > imageArea * 0.003 && b.area > imageArea * 0.003;
  const overlapRatio = boxOverlapRatio(a, b);
  if (bothMeaningful && hasWeakAlphaBridge(a, b, imageData, alphaThreshold, settings)) return false;
  if (shouldAttachSmallPart(a, b, imageData, distance)) return true;
  if (bothMeaningful && settings.mergeDistance <= 4 && distance > settings.mergeDistance && overlapRatio < 0.36) return false;
  if (bothMeaningful && settings.mergeDistance <= 4 && overlapRatio < 0.22) return false;
  if (bothMeaningful && settings.mergeDistance <= 6 && distance > 0 && overlapRatio < 0.14) return false;
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

function shouldAttachSmallPart(a, b, imageData, distance) {
  const imageArea = imageData.width * imageData.height;
  const smaller = a.area <= b.area ? a : b;
  const larger = smaller === a ? b : a;
  const areaRatio = smaller.area / Math.max(1, larger.area);
  if (areaRatio > 0.34 || smaller.area > imageArea * 0.018) return false;
  const attachDistance = Math.max(16, Math.min(imageData.width, imageData.height) * 0.038);
  if (distance > attachDistance) return false;
  const horizontalOverlap = axisOverlapRatio(smaller.x, smaller.width, larger.x, larger.width);
  const verticalOverlap = axisOverlapRatio(smaller.y, smaller.height, larger.y, larger.height);
  const nearSideAttachment = verticalOverlap > 0.18 && distance <= attachDistance;
  const nearTopBottomAttachment = horizontalOverlap > 0.2 && distance <= attachDistance;
  return nearSideAttachment || nearTopBottomAttachment;
}

function hasWeakAlphaBridge(a, b, imageData, alphaThreshold, settings) {
  if ((settings.mergeDistance ?? 4) > 6) return false;
  const centerA = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const centerB = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  const axis = Math.abs(centerA.x - centerB.x) >= Math.abs(centerA.y - centerB.y) ? "x" : "y";
  const cut = axis === "x" ? Math.round((centerA.x + centerB.x) / 2) : Math.round((centerA.y + centerB.y) / 2);
  const merged = mergedBox(a, b);
  const supportDensity = projectionStripDensity(merged, imageData.data, imageData.width, imageData.height, axis, cut, Math.max(18, alphaThreshold));
  const strongDensity = projectionStripDensity(merged, imageData.data, imageData.width, imageData.height, axis, cut, Math.max(80, alphaThreshold * 2.4));
  const overlap = axis === "x" ? axisOverlapRatio(a.y, a.height, b.y, b.height) : axisOverlapRatio(a.x, a.width, b.x, b.width);
  if (overlap < 0.12) return false;
  return strongDensity <= 0.04 && supportDensity <= 0.28;
}

function axisOverlapRatio(aStart, aSize, bStart, bSize) {
  const overlap = Math.max(0, Math.min(aStart + aSize, bStart + bSize) - Math.max(aStart, bStart));
  return overlap / Math.max(1, Math.min(aSize, bSize));
}

function boxDistance(a, b) {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  const dx = Math.max(0, Math.max(b.x - ax2, a.x - bx2));
  const dy = Math.max(0, Math.max(b.y - ay2, a.y - by2));
  return Math.hypot(dx, dy);
}

function boxOverlapRatio(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const overlap = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return overlap / Math.max(1, Math.min(a.width * a.height, b.width * b.height));
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

function mergedBox(a, b) {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, area: a.area + b.area };
}

function padBox(box, pad, w, h) {
  return {
    minX: Math.max(0, Math.floor(box.minX - pad)),
    minY: Math.max(0, Math.floor(box.minY - pad)),
    maxX: Math.min(w - 1, Math.ceil(box.maxX + pad)),
    maxY: Math.min(h - 1, Math.ceil(box.maxY + pad)),
  };
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
