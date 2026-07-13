#!/usr/bin/env node

const cases = [
  {
    name: "black-logo-on-white",
    expected: "line-art",
    draw: (img) => {
      fill(img, [255, 255, 255, 255]);
      rect(img, 82, 48, 160, 18, [12, 12, 12, 255]);
      rect(img, 82, 96, 132, 18, [12, 12, 12, 255]);
      ring(img, 58, 82, 34, 24, [10, 10, 10, 255]);
    },
  },
  {
    name: "light-product-on-white",
    expected: "product",
    draw: (img) => {
      fill(img, [250, 250, 250, 255]);
      roundRect(img, 92, 34, 126, 124, 16, [218, 222, 224, 255]);
      rect(img, 116, 62, 78, 16, [170, 176, 180, 255]);
      ellipse(img, 155, 126, 48, 18, [196, 202, 206, 255]);
      softNoise(img, 92, 34, 126, 124, 16);
    },
  },
  {
    name: "flat-product-on-colored-bg",
    expected: "product",
    draw: (img) => {
      fill(img, [88, 158, 230, 255]);
      rect(img, 66, 24, 174, 144, [12, 12, 12, 255]);
      rect(img, 88, 40, 130, 112, [246, 229, 190, 255]);
      for (let y = 54; y <= 134; y += 20) rect(img, 104, y, 14, 12, [255, 255, 255, 255]);
      rect(img, 132, 58, 58, 8, [226, 210, 178, 255]);
      rect(img, 132, 82, 58, 8, [226, 210, 178, 255]);
      rect(img, 132, 106, 58, 8, [226, 210, 178, 255]);
      rect(img, 132, 130, 58, 8, [226, 210, 178, 255]);
      softNoise(img, 88, 40, 130, 112, 10);
    },
  },
  {
    name: "color-sticker-on-white",
    expected: "sticker",
    draw: (img) => {
      fill(img, [255, 255, 255, 255]);
      ellipse(img, 94, 94, 48, 44, [54, 211, 153, 255]);
      ellipse(img, 164, 88, 44, 46, [250, 204, 21, 255]);
      ellipse(img, 224, 100, 36, 42, [248, 113, 113, 255]);
      rect(img, 74, 130, 174, 14, [30, 41, 59, 255]);
    },
  },
  {
    name: "flat-illustration-no-white-bg",
    expected: "illustration",
    draw: (img) => {
      fill(img, [224, 242, 254, 255]);
      ellipse(img, 132, 86, 70, 54, [251, 146, 60, 255]);
      rect(img, 78, 108, 144, 44, [34, 197, 94, 255]);
      rect(img, 90, 58, 96, 10, [17, 24, 39, 255]);
      ellipse(img, 220, 60, 28, 22, [168, 85, 247, 255]);
    },
  },
  {
    name: "photo-like-texture",
    expected: "photo",
    draw: (img) => {
      for (let y = 0; y < img.height; y += 1) {
        for (let x = 0; x < img.width; x += 1) {
          const n = seededNoise(x + y * img.width, 1);
          const m = seededNoise(x * 3 + y * 5, 2);
          const red = Math.round(92 + x * 0.42 + n * 48);
          const green = Math.round(78 + y * 0.38 + m * 42);
          const blue = Math.round(82 + (1 - n) * 44);
          setPixel(img, x, y, [red, green, blue, 255]);
        }
      }
    },
  },
  {
    name: "transparent-glass-on-white",
    expected: "transparentMaterial",
    draw: (img) => {
      fill(img, [250, 250, 250, 255]);
      ellipse(img, 150, 96, 58, 70, [190, 229, 240, 255]);
      ellipse(img, 150, 98, 42, 54, [224, 244, 248, 255]);
      rect(img, 112, 48, 76, 10, [248, 252, 253, 255]);
      rect(img, 106, 142, 88, 12, [158, 174, 178, 255]);
      ellipse(img, 150, 154, 64, 15, [166, 180, 184, 255]);
      softNoise(img, 92, 30, 116, 136, 10);
    },
  },
];

const failures = [];
for (const testCase of cases) {
  const image = makeImageData(300, 190);
  testCase.draw(image);
  const actual = analyzeImageType(image);
  const metrics = analyzeImageType.lastMetrics || {};
  const pass = actual === testCase.expected;
  console.log(`${pass ? "PASS" : "FAIL"} ${testCase.name}: ${actual}`);
  if (!pass) failures.push(`${testCase.name}: expected ${testCase.expected}, got ${actual}; metrics=${JSON.stringify(metrics)}`);
}

if (failures.length) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exit(1);
}

function makeImageData(width, height) {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

function setPixel(img, x, y, color) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || x >= img.width || y < 0 || y >= img.height) return;
  const offset = (y * img.width + x) * 4;
  img.data[offset] = color[0];
  img.data[offset + 1] = color[1];
  img.data[offset + 2] = color[2];
  img.data[offset + 3] = color[3];
}

function fill(img, color) {
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) setPixel(img, x, y, color);
  }
}

function rect(img, x, y, w, h, color) {
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) setPixel(img, px, py, color);
  }
}

function ellipse(img, cx, cy, rx, ry, color) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      if (((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1) setPixel(img, x, y, color);
    }
  }
}

function ring(img, cx, cy, rx, ry, color) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const outer = ((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1;
      const inner = ((x - cx) ** 2) / ((rx - 8) ** 2) + ((y - cy) ** 2) / ((ry - 7) ** 2) <= 1;
      if (outer && !inner) setPixel(img, x, y, color);
    }
  }
}

function roundRect(img, x, y, w, h, radius, color) {
  rect(img, x + radius, y, w - radius * 2, h, color);
  rect(img, x, y + radius, w, h - radius * 2, color);
  ellipse(img, x + radius, y + radius, radius, radius, color);
  ellipse(img, x + w - radius, y + radius, radius, radius, color);
  ellipse(img, x + radius, y + h - radius, radius, radius, color);
  ellipse(img, x + w - radius, y + h - radius, radius, radius, color);
}

function softNoise(img, x, y, w, h, amount) {
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      if (seededNoise(px + py * img.width, 8) > 0.32) continue;
      const offset = (py * img.width + px) * 4;
      const delta = Math.round((seededNoise(px * 11 + py, 9) - 0.5) * amount);
      img.data[offset] = clamp(img.data[offset] + delta, 0, 255);
      img.data[offset + 1] = clamp(img.data[offset + 1] + delta, 0, 255);
      img.data[offset + 2] = clamp(img.data[offset + 2] + delta, 0, 255);
    }
  }
}

function analyzeImageType(imageData) {
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

  const uniqueRatio = colors.size / samples;
  const whiteRatio = nearWhite / samples;
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
  analyzeImageType.lastMetrics = {
    uniqueRatio: round(uniqueRatio),
    whiteRatio: round(whiteRatio),
    foregroundRatio: round(foregroundRatio),
    darkForegroundRatio: round(darkForegroundRatio),
    saturatedForegroundRatio: round(saturatedForegroundRatio),
    lightColoredForegroundRatio: round(lightColoredForegroundRatio),
    coolTranslucentForegroundRatio: round(coolTranslucentForegroundRatio),
    softSpecularForegroundRatio: round(softSpecularForegroundRatio),
    softShadowForegroundRatio: round(softShadowForegroundRatio),
    saturatedRatio: round(saturatedRatio),
    lowSatRatio: round(lowSatRatio),
    edgeRatio: round(edgeRatio),
    averageGradient: round(averageGradient),
  };

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

function colorMetrics(red, green, blue) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  return {
    lightness: red * 0.299 + green * 0.587 + blue * 0.114,
    saturation: max ? (max - min) / max : 0,
  };
}

function seededNoise(index, salt) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}
