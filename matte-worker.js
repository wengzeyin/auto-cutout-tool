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

  return { imageData, alphaNormalized };
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
