#!/usr/bin/env node

const width = 160;
const height = 120;

function makeImageData(fill = [255, 255, 255, 0]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = fill[0];
    data[index + 1] = fill[1];
    data[index + 2] = fill[2];
    data[index + 3] = fill[3];
  }
  return { data, width, height };
}

function setPixel(image, x, y, rgba) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const offset = (y * width + x) * 4;
  image.data[offset] = rgba[0];
  image.data[offset + 1] = rgba[1];
  image.data[offset + 2] = rgba[2];
  image.data[offset + 3] = rgba[3];
}

function fillEllipse(image, cx, cy, rx, ry, rgba, collect) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        setPixel(image, x, y, rgba);
        collect?.push(y * width + x);
      }
    }
  }
}

function fillRect(image, x1, y1, x2, y2, rgba, collect) {
  for (let y = y1; y <= y2; y += 1) {
    for (let x = x1; x <= x2; x += 1) {
      setPixel(image, x, y, rgba);
      collect?.push(y * width + x);
    }
  }
}

function drawLine(image, x1, y1, x2, y2, rgba, thickness = 1, collect) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let step = 0; step <= steps; step += 1) {
    const t = steps ? step / steps : 0;
    const x = Math.round(x1 + (x2 - x1) * t);
    const y = Math.round(y1 + (y2 - y1) * t);
    for (let yy = y - thickness; yy <= y + thickness; yy += 1) {
      for (let xx = x - thickness; xx <= x + thickness; xx += 1) {
        setPixel(image, xx, yy, rgba);
        collect?.push(yy * width + xx);
      }
    }
  }
}

function colorMetrics(red, green, blue) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  return {
    lightness: red * 0.299 + green * 0.587 + blue * 0.114,
    saturation: max ? (max - min) / max : 0,
  };
}

function protectLineArt(metrics, settings) {
  return Boolean(settings.preserveLineArt && metrics.lightness < 132 && metrics.saturation < 0.82) || metrics.lightness < 88;
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

function isInteriorLightDetail(data, x, y, radius, threshold) {
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

function hasDirectionalAlphaSupport(data, x, y, radius, threshold) {
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

function dilateMask(mask, radius) {
  const output = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let hit = false;
      for (let yy = Math.max(0, y - radius); yy <= Math.min(height - 1, y + radius) && !hit; yy += 1) {
        for (let xx = Math.max(0, x - radius); xx <= Math.min(width - 1, x + radius); xx += 1) {
          if (mask[yy * width + xx]) {
            hit = true;
            break;
          }
        }
      }
      output[y * width + x] = hit ? 1 : 0;
    }
  }
  return output;
}

function hasOpaqueNeighbor(data, x, y, radius, threshold) {
  for (let yy = Math.max(0, y - radius); yy <= Math.min(height - 1, y + radius); yy += 1) {
    for (let xx = Math.max(0, x - radius); xx <= Math.min(width - 1, x + radius); xx += 1) {
      if (data[(yy * width + xx) * 4 + 3] >= threshold) return true;
    }
  }
  return false;
}

function refineAlpha(image, settings) {
  defringe(image, settings);
  const data = image.data;
  const residueThreshold = settings.residueThreshold ?? settings.cleanup;
  const edgeLow = settings.edgeLow ?? Math.max(10, Math.round(settings.cleanup * 0.7));
  const coreThreshold = settings.coreThreshold ?? 205;
  const solidThreshold = settings.solidThreshold ?? coreThreshold;
  const midBoost = settings.midBoost ?? 1.05;
  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha < residueThreshold) {
      data[index + 3] = 0;
      continue;
    }
    if (alpha > solidThreshold || alpha > 120) {
      data[index + 3] = 255;
      continue;
    }
    const t = clamp((alpha - edgeLow) / Math.max(1, coreThreshold - edgeLow), 0, 1);
    const curve = t * t * (3 - 2 * t);
    const edgeFloor = settings.preserveLineArt ? Math.min(alpha, 42) : 0;
    data[index + 3] = Math.round(clamp(Math.max(edgeFloor, curve * 255 * midBoost), 0, 255));
  }
  guidedSmoothEdgeAlpha(image, settings);
  suppressWhiteFringeAlpha(image, settings);
  antiAliasHardEdges(image, settings);
  suppressWhiteFringeAlpha(image, settings);
  return image;
}

function guidedSmoothEdgeAlpha(image, settings = {}) {
  if (settings.imageType !== "product") return image;
  const source = new Uint8ClampedArray(image.data);
  const lowThreshold = Math.max(8, Math.round((settings.edgeLow || settings.cleanup || 18) * 0.85));
  const highThreshold = settings.fidelity === "preserve" ? 246 : 238;
  const colorSigma = settings.imageType === "product" ? 72 : 54;
  const strength = settings.imageType === "product" ? 0.34 : settings.fidelity === "clean" ? 0.3 : 0.22;
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
          const colorDistance = Math.abs(red - source[next]) + Math.abs(green - source[next + 1]) + Math.abs(blue - source[next + 2]);
          const colorWeight = Math.exp(-colorDistance / colorSigma);
          const spatialWeight = ox === 0 && oy === 0 ? 2.5 : 1;
          const weight = colorWeight * spatialWeight;
          weightedAlpha += nextAlpha * weight;
          weightSum += weight;
        }
      }
      if (!hasTransparent || !hasSolid || !weightSum) continue;
      const target = weightedAlpha / weightSum;
      image.data[offset + 3] = Math.round(clamp(alpha * (1 - strength) + target * strength, 0, 255));
    }
  }
  return image;
}

function suppressWhiteFringeAlpha(image, settings = {}) {
  if (settings.imageType !== "product") return image;
  const source = new Uint8ClampedArray(image.data);
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
      const fringeStrength = whiteFringeAlphaStrength(settings, alpha, transparentCount, coloredCount);
      if (fringeStrength > 0) {
        image.data[offset + 3] = Math.round(alpha * fringeStrength * preserveMultiplier);
      }
    }
  }
  return image;
}

function antiAliasHardEdges(image, settings = {}) {
  if (settings.imageType === "transparentMaterial") return image;
  const source = new Uint8ClampedArray(image.data);
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
        image.data[offset + 3] = Math.round(clamp(alpha * (1 - factor) + mixed * factor, 128, 242));
      } else if (settings.imageType === "product" && alpha <= lowThreshold && strong >= 1 && transparent <= 7) {
        image.data[offset + 3] = Math.round(clamp(mixed * factor * 0.62, 0, 112));
      } else if (alpha >= 248 && transparent >= 2 && strong <= 6) {
        image.data[offset + 3] = Math.round(clamp(alpha * (1 - factor) + mixed * factor, 96, 246));
      } else if (alpha <= lowThreshold && strong >= 2 && transparent <= 6) {
        image.data[offset + 3] = Math.round(clamp(mixed * factor * 0.55, 0, 96));
      }
    }
  }
  return image;
}

function normalizeSemiOpaqueCore(image, settings) {
  const threshold = Number(settings.postCoreNormalizeThreshold || 0);
  if (!threshold) return image;
  const neighborThreshold = Number(settings.postCoreNeighborThreshold || 180);
  const neighborCount = Number(settings.postCoreNeighborCount || 5);
  const passes = Math.max(1, Math.min(3, Number(settings.postCoreNormalizePasses || 1)));
  for (let pass = 0; pass < passes; pass += 1) {
    const alphaSource = new Uint8ClampedArray(image.data.length / 4);
    for (let index = 0; index < alphaSource.length; index += 1) alphaSource[index] = image.data[index * 4 + 3];
    let changed = 0;
    for (let index = 0; index < alphaSource.length; index += 1) {
      const alpha = alphaSource[index];
      if (alpha < threshold || alpha >= 245) continue;
      const x = index % width;
      const y = Math.floor(index / width);
      if (hasStrongAlphaNeighbor(alphaSource, x, y, 2, neighborThreshold, neighborCount)) {
        image.data[index * 4 + 3] = 255;
        changed += 1;
      }
    }
    if (!changed) break;
  }
  return image;
}

function hasStrongAlphaNeighbor(alphaSource, x, y, radius, threshold, minCount) {
  let count = 0;
  for (let yy = Math.max(0, y - radius); yy <= Math.min(height - 1, y + radius); yy += 1) {
    for (let xx = Math.max(0, x - radius); xx <= Math.min(width - 1, x + radius); xx += 1) {
      if (alphaSource[yy * width + xx] >= threshold) {
        count += 1;
        if (count >= minCount) return true;
      }
    }
  }
  return false;
}

function edgeJaggedness(image) {
  let edgeTransitions = 0;
  let jaggedTransitions = 0;
  const data = image.data;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = data[offset + 3];
      const rightAlpha = data[offset + 7];
      const downAlpha = data[((y + 1) * width + x) * 4 + 3];
      const transition = Math.abs(alpha - rightAlpha) + Math.abs(alpha - downAlpha);
      if (transition <= 80) continue;
      edgeTransitions += 1;
      const diagA = data[((y - 1) * width + x - 1) * 4 + 3];
      const diagB = data[((y + 1) * width + x + 1) * 4 + 3];
      if (Math.abs(diagA - diagB) > 120 && transition > 220) jaggedTransitions += 1;
    }
  }
  return jaggedTransitions / Math.max(1, edgeTransitions);
}

function averageAlphaInRect(image, x1, y1, x2, y2) {
  let total = 0;
  let count = 0;
  for (let y = y1; y <= y2; y += 1) {
    for (let x = x1; x <= x2; x += 1) {
      total += image.data[(y * width + x) * 4 + 3];
      count += 1;
    }
  }
  return count ? total / count : 0;
}

function defringe(image, settings = {}) {
  const source = new Uint8ClampedArray(image.data);
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
        image.data[offset] = Math.round(r / count);
        image.data[offset + 1] = Math.round(g / count);
        image.data[offset + 2] = Math.round(b / count);
      }
      const whiteFringe = pixelMetrics.lightness > 238 && pixelMetrics.saturation < 0.14;
      const fringeStrength = whiteFringeAlphaStrength(settings, alpha, transparentCount, coloredCount);
      if (whiteFringe && !protectTransparent && fringeStrength > 0) {
        image.data[offset + 3] = Math.round(alpha * fringeStrength * preserveMultiplier);
      }
    }
  }
  return image;
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

function restoreIllustrationDetailsData(cutout, original, settings) {
  const supportThreshold = Math.max(8, Math.round((settings.cleanup || 24) * (settings.preserveLineArt ? 0.45 : 0.65)));
  const foreground = new Uint8Array(width * height);
  for (let index = 0; index < foreground.length; index += 1) {
    foreground[index] = cutout.data[index * 4 + 3] > supportThreshold ? 1 : 0;
  }
  const restoreRadius = Math.max(2, Math.min(settings.preserveLineArt ? 8 : 5, Number(settings.edgeSmooth || 2) + 3));
  const nearForeground = dilateMask(foreground, restoreRadius);

  let restoredPixels = 0;
  for (let index = 0; index < foreground.length; index += 1) {
    if (!nearForeground[index]) continue;
    const offset = index * 4;
    const alpha = cutout.data[offset + 3];
    const red = original.data[offset];
    const green = original.data[offset + 1];
    const blue = original.data[offset + 2];
    const metrics = colorMetrics(red, green, blue);
    const nearWhite = metrics.lightness > 246 && metrics.saturation < 0.12;
    const darkStroke = protectLineArt(metrics, settings);
    const coloredFill = metrics.saturation > 0.24 && metrics.lightness < 242;
    const protectedLightFill = protectLightRegion(red, green, blue, metrics, settings);
    const protectedWarmOrCool = protectWarmCoolDetail(red, green, blue, metrics, settings);
    const x = index % width;
    const y = Math.floor(index / width);
    const protectedInteriorWhite = nearWhite && shouldProtectInteriorWhite(settings) && isInteriorLightDetail(cutout.data, x, y, 4, 128);
    if (nearWhite && !protectedInteriorWhite) continue;

    if (alpha > 18 && (darkStroke || coloredFill || protectedLightFill || protectedWarmOrCool || protectedInteriorWhite)) {
      cutout.data[offset] = red;
      cutout.data[offset + 1] = green;
      cutout.data[offset + 2] = blue;
    }

    if (darkStroke && alpha < 220) {
      cutout.data[offset] = red;
      cutout.data[offset + 1] = green;
      cutout.data[offset + 2] = blue;
      cutout.data[offset + 3] = Math.max(alpha, alpha < settings.cleanup ? 235 : 255);
      restoredPixels += 1;
    } else if (settings.preserveLineArt && alpha === 0 && darkStroke) {
      cutout.data[offset] = red;
      cutout.data[offset + 1] = green;
      cutout.data[offset + 2] = blue;
      cutout.data[offset + 3] = 210;
      restoredPixels += 1;
    } else if ((coloredFill || protectedWarmOrCool) && alpha > 0 && alpha < 170) {
      cutout.data[offset] = red;
      cutout.data[offset + 1] = green;
      cutout.data[offset + 2] = blue;
      cutout.data[offset + 3] = Math.max(alpha, 180);
      restoredPixels += 1;
    } else if (settings.preserveColoredDetails && alpha === 0 && (protectedWarmOrCool || (coloredFill && hasOpaqueNeighbor(cutout.data, x, y, 3, 96)))) {
      cutout.data[offset] = red;
      cutout.data[offset + 1] = green;
      cutout.data[offset + 2] = blue;
      cutout.data[offset + 3] = protectedWarmOrCool ? 150 : 128;
      restoredPixels += 1;
    } else if (protectedLightFill && alpha > 0 && alpha < 138) {
      cutout.data[offset] = red;
      cutout.data[offset + 1] = green;
      cutout.data[offset + 2] = blue;
      cutout.data[offset + 3] = Math.max(alpha, hasDirectionalAlphaSupport(cutout.data, x, y, 4, 96) ? 170 : 118);
      restoredPixels += 1;
    } else if (settings.preserveLightRegions && protectedLightFill && alpha === 0 && hasDirectionalAlphaSupport(cutout.data, x, y, 5, 88)) {
      cutout.data[offset] = red;
      cutout.data[offset + 1] = green;
      cutout.data[offset + 2] = blue;
      cutout.data[offset + 3] = 168;
      restoredPixels += 1;
    } else if (settings.preserveLightRegions && protectedLightFill && alpha === 0 && hasOpaqueNeighbor(cutout.data, x, y, 4, 96)) {
      cutout.data[offset] = red;
      cutout.data[offset + 1] = green;
      cutout.data[offset + 2] = blue;
      cutout.data[offset + 3] = 92;
      restoredPixels += 1;
    } else if (protectedInteriorWhite && alpha < 190) {
      cutout.data[offset] = red;
      cutout.data[offset + 1] = green;
      cutout.data[offset + 2] = blue;
      cutout.data[offset + 3] = Math.max(alpha, 210);
      restoredPixels += 1;
    }
  }
  return { image: cutout, restoredPixels };
}

function shouldProtectInteriorWhite(settings = {}) {
  return Boolean(settings.preserveLightRegions) && (
    settings.imageType === "line-art" ||
    settings.imageType === "sticker" ||
    settings.preset === "multiSticker" ||
    settings.preset === "logoIcon"
  );
}

function averageAlpha(image, indices) {
  let total = 0;
  let count = 0;
  for (const index of indices) {
    if (index < 0 || index >= width * height) continue;
    total += image.data[index * 4 + 3];
    count += 1;
  }
  return count ? total / count : 0;
}

function averageLightness(image, indices) {
  let total = 0;
  let count = 0;
  for (const index of indices) {
    if (index < 0 || index >= width * height) continue;
    const offset = index * 4;
    total += colorMetrics(image.data[offset], image.data[offset + 1], image.data[offset + 2]).lightness;
    count += 1;
  }
  return count ? total / count : 0;
}

function residueAlpha(image, indices) {
  let total = 0;
  for (const index of indices) total += image.data[index * 4 + 3];
  return total / indices.length;
}

function alphaCoverage(image, indices, threshold) {
  let hits = 0;
  let count = 0;
  for (const index of indices) {
    if (index < 0 || index >= width * height) continue;
    count += 1;
    if (image.data[index * 4 + 3] >= threshold) hits += 1;
  }
  return count ? hits / count : 0;
}

const original = makeImageData([255, 255, 255, 255]);
const cutout = makeImageData([255, 255, 255, 0]);
const core = [];
const lightFace = [];
const missingLightFace = [];
const warmFlame = [];
const lineArt = [];
const interiorWhite = [];
const backgroundResidue = [];
const whiteFringe = [];

fillEllipse(original, 80, 68, 32, 24, [212, 246, 250, 255], lightFace);
fillEllipse(cutout, 80, 68, 32, 24, [212, 246, 250, 148], core);
fillRect(original, 76, 72, 84, 78, [212, 246, 250, 255], missingLightFace);
fillRect(cutout, 76, 72, 84, 78, [212, 246, 250, 0]);
fillRect(original, 68, 62, 73, 65, [252, 252, 250, 255], interiorWhite);
fillRect(original, 88, 62, 93, 65, [252, 252, 250, 255], interiorWhite);
fillRect(cutout, 68, 62, 73, 65, [252, 252, 250, 0]);
fillRect(cutout, 88, 62, 93, 65, [252, 252, 250, 0]);
for (let y = 42; y <= 94; y += 1) {
  for (let x = 45; x <= 115; x += 1) {
    const edge = Math.abs(((x - 80) ** 2) / (34 ** 2) + ((y - 68) ** 2) / (26 ** 2) - 1);
    if (edge < 0.035) {
      setPixel(cutout, x, y, [255, 255, 255, 72]);
      whiteFringe.push(y * width + x);
    }
  }
}
whiteFringe.length = 0;
fillRect(original, 124, 68, 146, 92, [32, 160, 120, 255]);
fillRect(cutout, 124, 68, 146, 92, [32, 160, 120, 255]);
for (let y = 70; y <= 90; y += 1) {
  setPixel(cutout, 123, y, [255, 255, 255, 72]);
  setPixel(cutout, 147, y, [255, 255, 255, 72]);
  whiteFringe.push(y * width + 123, y * width + 147);
}
fillRect(original, 56, 24, 104, 47, [8, 8, 8, 255]);
fillRect(cutout, 56, 24, 104, 47, [8, 8, 8, 9]);
drawLine(original, 48, 38, 38, 72, [9, 9, 9, 255], 1, lineArt);
drawLine(original, 112, 38, 122, 72, [9, 9, 9, 255], 1, lineArt);
drawLine(cutout, 48, 38, 38, 72, [9, 9, 9, 8], 1);
drawLine(cutout, 112, 38, 122, 72, [9, 9, 9, 8], 1);
fillEllipse(original, 44, 52, 6, 14, [254, 238, 42, 255], warmFlame);
fillEllipse(original, 116, 52, 6, 14, [254, 238, 42, 255], warmFlame);
fillEllipse(cutout, 44, 52, 6, 14, [254, 238, 42, 16]);
fillEllipse(cutout, 116, 52, 6, 14, [254, 238, 42, 16]);

for (let y = 4; y < 14; y += 1) {
  for (let x = 6; x < 24; x += 1) {
    setPixel(cutout, x, y, [250, 250, 250, 7]);
    backgroundResidue.push(y * width + x);
  }
}

const settings = {
  cleanup: 18,
  residueThreshold: 10,
  edgeLow: 8,
  coreThreshold: 220,
  solidThreshold: 220,
  midBoost: 0.98,
  preserveLineArt: true,
  preserveLightRegions: true,
  preserveColoredDetails: true,
  edgeSmooth: 2,
  imageType: "illustration",
  preset: "multiSticker",
};

const refined = refineAlpha(cutout, settings);
const restored = restoreIllustrationDetailsData(refined, original, settings);
const jaggedBefore = makeImageData([255, 255, 255, 0]);
for (let y = 18; y < height - 18; y += 1) {
  const left = 38 + Math.floor(y / 6) % 2;
  for (let x = left; x < 118; x += 1) setPixel(jaggedBefore, x, y, [44, 160, 130, 255]);
}
const jaggedAfter = makeImageData([255, 255, 255, 0]);
jaggedAfter.data.set(jaggedBefore.data);
antiAliasHardEdges(jaggedAfter, { cleanup: 18, edgeLow: 8, imageType: "product" });
const guidedBefore = makeImageData([255, 255, 255, 0]);
for (let y = 24; y <= 96; y += 1) {
  for (let x = 24; x <= 92; x += 1) setPixel(guidedBefore, x, y, [64, 150, 130, 255]);
  setPixel(guidedBefore, 93, y, [68, 148, 128, y % 2 ? 82 : 176]);
  setPixel(guidedBefore, 94, y, [240, 70, 70, y % 3 ? 0 : 120]);
}
const guidedAfter = makeImageData([255, 255, 255, 0]);
guidedAfter.data.set(guidedBefore.data);
guidedSmoothEdgeAlpha(guidedAfter, { cleanup: 18, edgeLow: 8, imageType: "product" });
const stickerFringeBefore = makeImageData([255, 255, 255, 0]);
for (let y = 34; y <= 86; y += 1) {
  for (let x = 34; x <= 86; x += 1) setPixel(stickerFringeBefore, x, y, [80, 180, 130, 255]);
  setPixel(stickerFringeBefore, 33, y, [252, 252, 250, 86]);
  setPixel(stickerFringeBefore, 87, y, [252, 252, 250, 86]);
}
const stickerFringeAfter = makeImageData([255, 255, 255, 0]);
stickerFringeAfter.data.set(stickerFringeBefore.data);
defringe(stickerFringeAfter, { imageType: "sticker", fidelity: "balanced" });
const semiCoreBefore = makeImageData([255, 255, 255, 0]);
fillRect(semiCoreBefore, 22, 22, 42, 42, [80, 120, 160, 255]);
fillRect(semiCoreBefore, 28, 28, 36, 36, [80, 120, 160, 118]);
fillRect(semiCoreBefore, 72, 24, 88, 36, [80, 120, 160, 118]);
const semiCoreAfter = makeImageData([255, 255, 255, 0]);
semiCoreAfter.data.set(semiCoreBefore.data);
normalizeSemiOpaqueCore(semiCoreAfter, { postCoreNormalizeThreshold: 88, postCoreNeighborThreshold: 144, postCoreNeighborCount: 4, postCoreNormalizePasses: 3 });
const metrics = {
  coreAlpha: averageAlpha(restored.image, core),
  lightAlpha: averageAlpha(restored.image, lightFace),
  missingLightAlpha: averageAlpha(restored.image, missingLightFace),
  lineAlpha: averageAlpha(restored.image, lineArt),
  lineCoverage: alphaCoverage(restored.image, lineArt, 180),
  warmAlpha: averageAlpha(restored.image, warmFlame),
  interiorWhiteAlpha: averageAlpha(restored.image, interiorWhite),
  whiteFringeAlpha: averageAlpha(restored.image, whiteFringe),
  whiteFringeLightness: averageLightness(restored.image, whiteFringe),
  jaggedBefore: edgeJaggedness(jaggedBefore),
  jaggedAfter: edgeJaggedness(jaggedAfter),
  guidedBefore: averageAlphaInRect(guidedBefore, 93, 24, 93, 96),
  guidedAfter: averageAlphaInRect(guidedAfter, 93, 24, 93, 96),
  guidedNoiseAfter: averageAlphaInRect(guidedAfter, 94, 24, 94, 96),
  stickerFringeBefore: averageAlphaInRect(stickerFringeBefore, 33, 34, 33, 86),
  stickerFringeAfter: averageAlphaInRect(stickerFringeAfter, 33, 34, 33, 86),
  semiCoreBefore: averageAlphaInRect(semiCoreBefore, 28, 28, 36, 36),
  semiCoreAfter: averageAlphaInRect(semiCoreAfter, 28, 28, 36, 36),
  semiEdgeAfter: averageAlphaInRect(semiCoreAfter, 72, 24, 88, 36),
  residueAlpha: residueAlpha(restored.image, backgroundResidue),
  restoredPixels: restored.restoredPixels,
  fallbackAccepted: shouldUseFallbackMatte(
    { lineArtLossRatio: 0.22, lightRegionLossRatio: 0.12, semiTransparentCoreRatio: 0.1, whiteFringeRatio: 0.01, edgeJaggednessScore: 0.12 },
    { lineArtLossRatio: 0.18, lightRegionLossRatio: 0.11, semiTransparentCoreRatio: 0.12, whiteFringeRatio: 0.09, edgeJaggednessScore: 0.22 },
    { imageType: "illustration" },
  ),
  fallbackImprovedAccepted: shouldUseFallbackMatte(
    { lineArtLossRatio: 0.24, lightRegionLossRatio: 0.22, semiTransparentCoreRatio: 0.14, whiteFringeRatio: 0.02, edgeJaggednessScore: 0.18 },
    { lineArtLossRatio: 0.08, lightRegionLossRatio: 0.1, semiTransparentCoreRatio: 0.1, whiteFringeRatio: 0.035, edgeJaggednessScore: 0.19 },
    { imageType: "illustration" },
  ),
};

const failures = [];
if (metrics.coreAlpha < 240) failures.push(`core alpha too low: ${metrics.coreAlpha.toFixed(1)}`);
if (metrics.lightAlpha < 175) failures.push(`light region not preserved: ${metrics.lightAlpha.toFixed(1)}`);
if (metrics.missingLightAlpha < 150) failures.push(`missing interior light region not restored: ${metrics.missingLightAlpha.toFixed(1)}`);
if (metrics.lineCoverage < 0.82) failures.push(`line art coverage too low: ${(metrics.lineCoverage * 100).toFixed(1)}%`);
if (metrics.warmAlpha < 150) failures.push(`warm detail not restored: ${metrics.warmAlpha.toFixed(1)}`);
if (metrics.interiorWhiteAlpha < 180) failures.push(`interior white detail not restored: ${metrics.interiorWhiteAlpha.toFixed(1)}`);
if (metrics.whiteFringeAlpha > 42 && metrics.whiteFringeLightness > 220) failures.push(`white fringe still visible: alpha ${metrics.whiteFringeAlpha.toFixed(1)}, lightness ${metrics.whiteFringeLightness.toFixed(1)}`);
if (metrics.jaggedAfter >= metrics.jaggedBefore * 0.7) failures.push(`jagged edge not softened: ${metrics.jaggedBefore.toFixed(3)} -> ${metrics.jaggedAfter.toFixed(3)}`);
if (metrics.guidedAfter <= metrics.guidedBefore + 10) failures.push(`guided edge alpha did not move toward similar solid neighbor: ${metrics.guidedBefore.toFixed(1)} -> ${metrics.guidedAfter.toFixed(1)}`);
if (metrics.guidedNoiseAfter > 45) failures.push(`guided smoothing leaked into dissimilar noise: ${metrics.guidedNoiseAfter.toFixed(1)}`);
if (metrics.stickerFringeAfter >= metrics.stickerFringeBefore * 0.45) failures.push(`sticker white fringe not reduced enough: ${metrics.stickerFringeBefore.toFixed(1)} -> ${metrics.stickerFringeAfter.toFixed(1)}`);
if (metrics.semiCoreAfter < 250) failures.push(`semi-transparent core not normalized: ${metrics.semiCoreBefore.toFixed(1)} -> ${metrics.semiCoreAfter.toFixed(1)}`);
if (metrics.semiEdgeAfter > 145) failures.push(`isolated semi-transparent edge was over-normalized: ${metrics.semiEdgeAfter.toFixed(1)}`);
if (metrics.residueAlpha > 1) failures.push(`background residue remains: ${metrics.residueAlpha.toFixed(1)}`);
if (metrics.restoredPixels < 100) failures.push(`restored pixel count too low: ${metrics.restoredPixels}`);
if (metrics.fallbackAccepted) failures.push("fallback decision accepted a worse white-fringe result");
if (!metrics.fallbackImprovedAccepted) failures.push("fallback decision rejected a clear line/light improvement");

const result = {
  pass: failures.length === 0,
  metrics: Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, Number(value.toFixed ? value.toFixed(2) : value)])),
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exit(1);
