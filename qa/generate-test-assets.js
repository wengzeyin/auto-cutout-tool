const logEl = document.querySelector("#log");
const button = document.querySelector("#generateBtn");

const W = 1200;
const H = 820;

const tests = [
  ["01-portrait-hair-simulated.png", "人像发丝模拟", drawPortraitHair],
  ["02-curly-hair-simulated.png", "卷发碎发模拟", drawCurlyHair],
  ["03-pet-long-fur-simulated.png", "宠物长毛模拟", drawLongFur],
  ["04-pet-short-fur-simulated.png", "宠物短毛模拟", drawShortFur],
  ["05-light-product-white-bg.png", "白底浅色商品", drawLightProduct],
  ["06-dark-product.png", "深色商品", drawDarkProduct],
  ["07-transparent-material.png", "透明材质", drawTransparentMaterial],
  ["08-person-complex-bg.png", "复杂背景人物", drawPersonComplexBg],
  ["09-product-complex-bg.png", "复杂背景商品", drawProductComplexBg],
  ["10-illustration-icons.png", "插画图标", drawIllustrationIcons],
  ["11-sticker-pack.png", "多元素贴纸合集", drawStickerPack],
  ["12-nearby-characters.png", "靠近多角色", drawNearbyCharacters],
  ["13-small-details.png", "小物体细节", drawSmallDetails],
  ["14-logo-text-product.png", "文字 logo 商品", drawLogoProduct],
  ["15-high-contrast-edge.png", "高对比边缘", drawHighContrast],
];

button.addEventListener("click", async () => {
  log("开始生成...");
  for (const [fileName, label, draw] of tests) {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    drawBackground(ctx, "#f3f6f8", "#d9e5ed");
    draw(ctx);
    await downloadCanvas(canvas, fileName);
    log(`已生成 ${fileName} - ${label}`);
    await wait(160);
  }
  const manifest = {
    generatedAt: new Date().toISOString(),
    note: "Synthetic baseline assets. Add real hair/fur photos before release scoring.",
    assets: tests.map(([fileName, label]) => ({ fileName, label })),
  };
  downloadBlob(new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" }), "qa-test-assets-manifest.json");
  log("完成。请把下载的 PNG 放入 qa/assets/，manifest 放入 qa/assets/manifest.json。");
});

function log(message) {
  logEl.textContent += `\n${message}`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function drawBackground(ctx, a, b) {
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, a);
  gradient.addColorStop(1, b);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${0.05 + (i % 5) * 0.02})`;
    ctx.beginPath();
    ctx.arc((i * 97) % W, (i * 53) % H, 28 + (i % 7) * 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPortraitHair(ctx) {
  drawHead(ctx, 610, 390, "#f6b68e", "#2d1f1b");
  drawHairStrands(ctx, 610, 260, 220, 140, "#2d1f1b", 130);
  drawBody(ctx, 610, 640, "#4f46e5");
}

function drawCurlyHair(ctx) {
  drawHead(ctx, 610, 390, "#d9916a", "#111827");
  for (let i = 0; i < 70; i += 1) {
    const angle = (i / 70) * Math.PI * 2;
    const radius = 120 + (i % 8) * 8;
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(610 + Math.cos(angle) * radius * 0.65, 290 + Math.sin(angle) * radius * 0.35, 18, 0, Math.PI * 1.6);
    ctx.stroke();
  }
  drawBody(ctx, 610, 645, "#0ea5e9");
}

function drawLongFur(ctx) {
  ctx.fillStyle = "#f5d6a1";
  ctx.beginPath();
  ctx.ellipse(600, 450, 245, 170, 0, 0, Math.PI * 2);
  ctx.fill();
  drawHairStrands(ctx, 600, 435, 280, 220, "#b77935", 220);
  drawPetFace(ctx, 600, 420);
}

function drawShortFur(ctx) {
  ctx.fillStyle = "#7c5b4f";
  roundRect(ctx, 360, 245, 480, 310, 150);
  ctx.fill();
  for (let i = 0; i < 180; i += 1) {
    const x = 370 + Math.random() * 460;
    const y = 250 + Math.random() * 300;
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 8, y + 3);
    ctx.stroke();
  }
  drawPetFace(ctx, 600, 400);
}

function drawLightProduct(ctx) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#f8fafc";
  roundRect(ctx, 420, 180, 360, 480, 48);
  ctx.fill();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = "#34c786";
  ctx.fillRect(515, 285, 170, 220);
}

function drawDarkProduct(ctx) {
  drawBackground(ctx, "#dde3ea", "#9aa6b2");
  ctx.fillStyle = "#0f172a";
  roundRect(ctx, 410, 180, 380, 480, 62);
  ctx.fill();
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.ellipse(600, 670, 220, 45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 10;
  ctx.strokeRect(500, 270, 200, 240);
}

function drawTransparentMaterial(ctx) {
  drawBackground(ctx, "#94a3b8", "#f8fafc");
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = "#dff6ff";
  roundRect(ctx, 430, 150, 340, 520, 70);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 16;
  roundRect(ctx, 430, 150, 340, 520, 70);
  ctx.stroke();
}

function drawPersonComplexBg(ctx) {
  drawBackground(ctx, "#f59e0b", "#2563eb");
  for (let i = 0; i < 20; i += 1) {
    ctx.fillStyle = i % 2 ? "#ef4444" : "#22c55e";
    ctx.fillRect((i * 83) % W, (i * 47) % H, 160, 80);
  }
  drawHead(ctx, 600, 360, "#e0a17a", "#1f2937");
  drawBody(ctx, 600, 635, "#111827");
}

function drawProductComplexBg(ctx) {
  drawBackground(ctx, "#1e293b", "#fde68a");
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(80, 120, 260, 180);
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(870, 470, 240, 170);
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 430, 160, 340, 500, 52);
  ctx.fill();
  ctx.fillStyle = "#111827";
  ctx.fillRect(500, 270, 200, 220);
}

function drawIllustrationIcons(ctx) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  const colors = ["#ef4444", "#f59e0b", "#34c786", "#3b82f6", "#8b5cf6", "#ec4899"];
  for (let i = 0; i < 6; i += 1) {
    const x = 190 + (i % 3) * 310;
    const y = 230 + Math.floor(i / 3) * 260;
    drawIcon(ctx, x, y, colors[i]);
  }
}

function drawStickerPack(ctx) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      drawCharacter(ctx, 220 + col * 380, 170 + row * 220, ["#fca5a5", "#a7f3d0", "#bfdbfe"][row], col + row);
    }
  }
}

function drawNearbyCharacters(ctx) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  const xs = [250, 460, 650, 835];
  const colors = ["#f9a8d4", "#c4b5fd", "#fde68a", "#fdba74"];
  xs.forEach((x, i) => drawCharacter(ctx, x, 330, colors[i], i));
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.ellipse(545, 585, 430, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawSmallDetails(ctx) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 24; i += 1) {
    ctx.fillStyle = ["#ef4444", "#34c786", "#3b82f6", "#f59e0b"][i % 4];
    ctx.beginPath();
    ctx.arc(120 + (i % 8) * 130, 170 + Math.floor(i / 8) * 190, 18 + (i % 3) * 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLogoProduct(ctx) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#111827";
  roundRect(ctx, 380, 160, 440, 500, 44);
  ctx.fill();
  ctx.fillStyle = "#34c786";
  ctx.font = "bold 72px system-ui";
  ctx.fillText("LOGO", 480, 390);
  ctx.font = "bold 40px system-ui";
  ctx.fillText("CUTOUT", 500, 465);
}

function drawHighContrast(ctx) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(600, 100);
  ctx.lineTo(820, 670);
  ctx.lineTo(270, 310);
  ctx.lineTo(930, 310);
  ctx.lineTo(380, 670);
  ctx.closePath();
  ctx.fill();
}

function drawHead(ctx, x, y, skin, hair) {
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(x, y - 55, 150, 135, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(x, y, 110, 130, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(x - 35, y - 20, 8, 0, Math.PI * 2);
  ctx.arc(x + 35, y - 20, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7f1d1d";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y + 38, 34, 0, Math.PI);
  ctx.stroke();
}

function drawBody(ctx, x, y, color) {
  ctx.fillStyle = color;
  roundRect(ctx, x - 145, y - 95, 290, 210, 60);
  ctx.fill();
}

function drawHairStrands(ctx, cx, cy, rx, ry, color, count) {
  ctx.strokeStyle = color;
  for (let i = 0; i < count; i += 1) {
    const t = i / count;
    const angle = Math.PI * (0.95 + t * 1.1);
    const x = cx + Math.cos(angle) * rx * (0.55 + Math.random() * 0.45);
    const y = cy + Math.sin(angle) * ry * (0.55 + Math.random() * 0.45);
    ctx.lineWidth = 1 + Math.random() * 2.4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * rx * 0.28, cy + Math.sin(angle) * ry * 0.28);
    ctx.quadraticCurveTo((cx + x) / 2 + (Math.random() - 0.5) * 60, (cy + y) / 2, x, y + 120 * Math.random());
    ctx.stroke();
  }
}

function drawPetFace(ctx, x, y) {
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(x - 58, y - 22, 14, 0, Math.PI * 2);
  ctx.arc(x + 58, y - 22, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7f1d1d";
  ctx.beginPath();
  ctx.arc(x, y + 26, 18, 0, Math.PI * 2);
  ctx.fill();
}

function drawIcon(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 88, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 36, y - 36, 72, 72);
}

function drawCharacter(ctx, x, y, color, variant) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y + 70, 95, 112, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(x - 28, y + 45, 8, 0, Math.PI * 2);
  ctx.arc(x + 28, y + 45, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = variant % 2 ? "#ef4444" : "#34c786";
  roundRect(ctx, x - 62, y + 125, 124, 88, 24);
  ctx.fill();
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

function downloadCanvas(canvas, fileName) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      downloadBlob(blob, fileName);
      resolve();
    }, "image/png");
  });
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
