import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const outDir = path.join(root, "qa", "assets");
await mkdir(outDir, { recursive: true });

const W = 1200;
const H = 820;

let seed = 42;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let cValue = n;
  for (let k = 0; k < 8; k += 1) cValue = cValue & 1 ? 0xedb88320 ^ (cValue >>> 1) : cValue >>> 1;
  return cValue >>> 0;
});

class Raster {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }
  blendPixel(x, y, color) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const index = (y * this.width + x) * 4;
    const alpha = color[3] / 255;
    const inv = 1 - alpha;
    this.data[index] = Math.round(color[0] * alpha + this.data[index] * inv);
    this.data[index + 1] = Math.round(color[1] * alpha + this.data[index + 1] * inv);
    this.data[index + 2] = Math.round(color[2] * alpha + this.data[index + 2] * inv);
    this.data[index + 3] = Math.min(255, Math.round(color[3] + this.data[index + 3] * inv));
  }
  fill(color) {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) this.blendPixel(x, y, color);
    }
  }
  rect(x, y, w, h, color) {
    for (let py = Math.max(0, Math.floor(y)); py < Math.min(this.height, Math.ceil(y + h)); py += 1) {
      for (let px = Math.max(0, Math.floor(x)); px < Math.min(this.width, Math.ceil(x + w)); px += 1) this.blendPixel(px, py, color);
    }
  }
  ellipse(cx, cy, rx, ry, color) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        if (((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1) this.blendPixel(x, y, color);
      }
    }
  }
  line(x1, y1, x2, y2, thickness, color) {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / Math.max(1, steps);
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      this.ellipse(x, y, thickness / 2, thickness / 2, color);
    }
  }
  triangle(points, color) {
    const [a, b, c] = points;
    const minX = Math.floor(Math.min(a[0], b[0], c[0]));
    const maxX = Math.ceil(Math.max(a[0], b[0], c[0]));
    const minY = Math.floor(Math.min(a[1], b[1], c[1]));
    const maxY = Math.ceil(Math.max(a[1], b[1], c[1]));
    const area = edge(a, b, c);
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const p = [x, y];
        const w1 = edge(b, c, p) / area;
        const w2 = edge(c, a, p) / area;
        const w3 = edge(a, b, p) / area;
        if (w1 >= 0 && w2 >= 0 && w3 >= 0) this.blendPixel(x, y, color);
      }
    }
  }
}

function edge(a, b, c) {
  return (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0]);
}

function c(hex, a = 255) {
  const value = hex.replace("#", "");
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16), a];
}

function bg(img, a = "#f3f6f8", b = "#d9e5ed") {
  const ca = c(a);
  const cb = c(b);
  for (let y = 0; y < img.height; y += 1) {
    const t = y / img.height;
    const color = [
      Math.round(ca[0] * (1 - t) + cb[0] * t),
      Math.round(ca[1] * (1 - t) + cb[1] * t),
      Math.round(ca[2] * (1 - t) + cb[2] * t),
      255,
    ];
    img.rect(0, y, img.width, 1, color);
  }
}

function head(img, x, y, skin = "#f6b68e", hair = "#211817") {
  img.ellipse(x, y - 70, 142, 116, c(hair));
  img.ellipse(x, y, 104, 128, c(skin));
  img.ellipse(x - 34, y - 18, 8, 8, c("#111827"));
  img.ellipse(x + 34, y - 18, 8, 8, c("#111827"));
  img.line(x - 28, y + 46, x + 28, y + 46, 6, c("#7f1d1d"));
}

function body(img, x, y, color = "#4f46e5") {
  img.ellipse(x, y, 150, 104, c(color));
  img.rect(x - 150, y, 300, 130, c(color));
}

function hairStrands(img, cx, cy, rx, ry, color, count) {
  for (let i = 0; i < count; i += 1) {
    const t = i / count;
    const angle = Math.PI * (0.9 + t * 1.15);
    const x1 = cx + Math.cos(angle) * rx * 0.25;
    const y1 = cy + Math.sin(angle) * ry * 0.25;
    const x2 = cx + Math.cos(angle) * rx * (0.6 + random() * 0.35);
    const y2 = cy + Math.sin(angle) * ry * (0.7 + random() * 0.5);
    img.line(x1, y1, x2, y2, 1 + random() * 2, c(color, 210));
  }
}

function character(img, x, y, color, variant = 0) {
  img.ellipse(x, y + 55, 92, 105, c(color));
  img.ellipse(x - 28, y + 35, 8, 8, c("#111827"));
  img.ellipse(x + 28, y + 35, 8, 8, c("#111827"));
  img.ellipse(x, y + 145, 64, 48, c(variant % 2 ? "#ef4444" : "#34c786"));
}

function petFace(img, x, y) {
  img.ellipse(x - 52, y - 20, 14, 14, c("#111827"));
  img.ellipse(x + 52, y - 20, 14, 14, c("#111827"));
  img.ellipse(x, y + 30, 18, 14, c("#7f1d1d"));
}

const drawings = [
  ["01-portrait-hair-simulated.png", (img) => { bg(img); head(img, 600, 360); hairStrands(img, 600, 255, 220, 160, "#2d1f1b", 180); body(img, 600, 610); }],
  ["02-curly-hair-simulated.png", (img) => { bg(img); head(img, 600, 370, "#d9916a", "#111827"); for (let i = 0; i < 85; i += 1) img.ellipse(600 + (random() - 0.5) * 250, 260 + (random() - 0.5) * 130, 18, 18, c("#111827", 230)); body(img, 600, 620, "#0ea5e9"); }],
  ["03-pet-long-fur-simulated.png", (img) => { bg(img); img.ellipse(600, 430, 240, 165, c("#f5d6a1")); hairStrands(img, 600, 410, 285, 240, "#b77935", 260); petFace(img, 600, 410); }],
  ["04-pet-short-fur-simulated.png", (img) => { bg(img); img.ellipse(600, 420, 260, 170, c("#7c5b4f")); for (let i = 0; i < 220; i += 1) img.line(380 + random() * 440, 285 + random() * 260, 390 + random() * 440, 288 + random() * 260, 2, c("#ffffff", 60)); petFace(img, 600, 410); }],
  ["05-light-product-white-bg.png", (img) => { img.fill(c("#ffffff")); img.ellipse(600, 420, 190, 270, c("#f8fafc")); img.rect(515, 285, 170, 220, c("#34c786")); img.line(420, 160, 780, 160, 8, c("#cbd5e1")); }],
  ["06-dark-product.png", (img) => { bg(img, "#dde3ea", "#9aa6b2"); img.ellipse(600, 665, 230, 45, c("#111827", 90)); img.ellipse(600, 410, 210, 285, c("#0f172a")); img.rect(500, 280, 200, 225, c("#475569")); }],
  ["07-transparent-material.png", (img) => { bg(img, "#94a3b8", "#f8fafc"); img.ellipse(600, 410, 190, 290, c("#dff6ff", 110)); img.line(450, 170, 750, 650, 16, c("#ffffff", 190)); img.line(760, 170, 450, 650, 12, c("#ffffff", 130)); }],
  ["08-person-complex-bg.png", (img) => { bg(img, "#f59e0b", "#2563eb"); for (let i = 0; i < 22; i += 1) img.rect((i * 89) % W, (i * 57) % H, 165, 76, c(i % 2 ? "#ef4444" : "#22c55e", 190)); head(img, 600, 350, "#e0a17a", "#1f2937"); body(img, 600, 615, "#111827"); }],
  ["09-product-complex-bg.png", (img) => { bg(img, "#1e293b", "#fde68a"); img.rect(80, 120, 260, 180, c("#ef4444")); img.rect(870, 470, 240, 170, c("#22c55e")); img.ellipse(600, 410, 200, 285, c("#ffffff")); img.rect(500, 280, 200, 220, c("#111827")); }],
  ["10-illustration-icons.png", (img) => { img.fill(c("#ffffff")); ["#ef4444", "#f59e0b", "#34c786", "#3b82f6", "#8b5cf6", "#ec4899"].forEach((color, i) => { const x = 190 + (i % 3) * 310; const y = 230 + Math.floor(i / 3) * 260; img.ellipse(x, y, 88, 88, c(color)); img.rect(x - 36, y - 36, 72, 72, c("#ffffff")); }); }],
  ["11-sticker-pack.png", (img) => { img.fill(c("#ffffff")); for (let row = 0; row < 3; row += 1) for (let col = 0; col < 3; col += 1) character(img, 220 + col * 380, 145 + row * 220, ["#fca5a5", "#a7f3d0", "#bfdbfe"][row], col + row); }],
  ["12-nearby-characters.png", (img) => { img.fill(c("#ffffff")); [250, 460, 650, 835].forEach((x, i) => character(img, x, 320, ["#f9a8d4", "#c4b5fd", "#fde68a", "#fdba74"][i], i)); img.ellipse(545, 585, 430, 38, c("#111827", 45)); }],
  ["13-small-details.png", (img) => { img.fill(c("#ffffff")); for (let i = 0; i < 24; i += 1) img.ellipse(120 + (i % 8) * 130, 170 + Math.floor(i / 8) * 190, 18 + (i % 3) * 8, 18 + (i % 3) * 8, c(["#ef4444", "#34c786", "#3b82f6", "#f59e0b"][i % 4])); }],
  ["14-logo-text-product.png", (img) => { img.fill(c("#ffffff")); img.ellipse(600, 410, 230, 290, c("#111827")); img.rect(480, 330, 240, 60, c("#34c786")); img.rect(500, 430, 200, 34, c("#34c786")); img.rect(525, 485, 150, 28, c("#34c786")); }],
  ["15-high-contrast-edge.png", (img) => { img.fill(c("#000000")); img.triangle([[600, 100], [820, 670], [270, 310]], c("#ffffff")); img.triangle([[930, 310], [380, 670], [600, 100]], c("#ffffff")); }],
];

for (const [fileName, draw] of drawings) {
  const img = new Raster(W, H);
  draw(img);
  await writeFile(path.join(outDir, fileName), encodePng(img.width, img.height, img.data));
  console.log(`Generated ${fileName}`);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    Buffer.from(rgba.buffer, y * width * 4, width * 4).copy(raw, rowStart + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", Buffer.concat([u32(width), u32(height), Buffer.from([8, 6, 0, 0, 0])])),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  return Buffer.concat([u32(data.length), typeBuffer, data, u32(crc32(Buffer.concat([typeBuffer, data])))]);
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
