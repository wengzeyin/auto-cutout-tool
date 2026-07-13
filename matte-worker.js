self.onmessage = (event) => {
  const { id, imageData, settings } = event.data;
  try {
    const result = refineImageData(imageData, settings);
    self.postMessage({ id, ok: true, imageData: result.imageData, alphaNormalized: result.alphaNormalized }, [
      result.imageData.data.buffer,
    ]);
  } catch (error) {
    self.postMessage({ id, ok: false, message: error?.message || "matte refinement failed" });
  }
};

function refineImageData(imageData, settings) {
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
  normalizeDenseCoreAlpha(imageData, settings);
  guidedSmoothEdgeAlpha(imageData, settings);
  suppressWhiteFringeAlpha(imageData, settings);
  antiAliasHardEdges(imageData, settings);
  normalizePostEdgeCoreAlpha(imageData, settings);
  suppressWhiteFringeAlpha(imageData, settings);
  suppressDarkBackgroundFringeAlpha(imageData, settings);

  return { imageData, alphaNormalized };
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

function normalizeDenseCoreAlpha(imageData, settings) {
  const threshold = Number(settings.denseCoreNormalizeThreshold || 0);
  if (!threshold || settings.imageType === "transparentMaterial") return;
  const { width, height, data } = imageData;
  const source = new Uint8ClampedArray(data.length / 4);
  for (let index = 0; index < source.length; index += 1) source[index] = data[index * 4 + 3];
  const neighborThreshold = Number(settings.denseCoreNeighborThreshold || 96);
  const neighborCount = Number(settings.denseCoreNeighborCount || 15);
  const transparentThreshold = Number(settings.denseCoreTransparentThreshold || 10);
  const transparentLimit = Number(settings.denseCoreTransparentLimit ?? 2);
  for (let index = 0; index < source.length; index += 1) {
    const alpha = source[index];
    if (alpha < threshold || alpha >= 245) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    if (countAlphaNeighbors(source, width, height, x, y, 2, neighborThreshold) < neighborCount) continue;
    if (countAlphaNeighbors(source, width, height, x, y, 2, transparentThreshold, true) > transparentLimit) continue;
    data[index * 4 + 3] = 255;
  }
}

function normalizePostEdgeCoreAlpha(imageData, settings) {
  const threshold = Number(settings.postEdgeCoreNormalizeThreshold || 0);
  if (!threshold || settings.imageType === "transparentMaterial") return;
  const { width, height, data } = imageData;
  const neighborThreshold = Number(settings.postEdgeCoreNeighborThreshold || 224);
  const neighborCount = Number(settings.postEdgeCoreNeighborCount || 5);
  const passes = Math.max(1, Math.min(3, Number(settings.postEdgeCoreNormalizePasses || 1)));
  for (let pass = 0; pass < passes; pass += 1) {
    const source = new Uint8ClampedArray(data.length / 4);
    for (let index = 0; index < source.length; index += 1) source[index] = data[index * 4 + 3];
    let changed = 0;
    for (let index = 0; index < source.length; index += 1) {
      const alpha = source[index];
      if (alpha < threshold || alpha >= 245) continue;
      const x = index % width;
      const y = Math.floor(index / width);
      if (countAlphaNeighbors(source, width, height, x, y, 2, neighborThreshold) < neighborCount) continue;
      data[index * 4 + 3] = 255;
      changed += 1;
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

function countAlphaNeighbors(alphaSource, width, height, x, y, radius, threshold, below = false) {
  let count = 0;
  for (let oy = -radius; oy <= radius; oy += 1) {
    const py = y + oy;
    if (py < 0 || py >= height) continue;
    for (let ox = -radius; ox <= radius; ox += 1) {
      const px = x + ox;
      if (px < 0 || px >= width) continue;
      const alpha = alphaSource[py * width + px];
      if (below ? alpha <= threshold : alpha >= threshold) count += 1;
    }
  }
  return count;
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

function colorMetrics(red, green, blue) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  return {
    lightness: red * 0.299 + green * 0.587 + blue * 0.114,
    saturation: max ? (max - min) / max : 0,
  };
}

function colorDistanceToRgbSq(data, offset, color) {
  const dr = data[offset] - color[0];
  const dg = data[offset + 1] - color[1];
  const db = data[offset + 2] - color[2];
  return (dr * dr + dg * dg + db * db) / 3;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
