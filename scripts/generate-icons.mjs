import { createCanvas } from "canvas";
import fs from "fs";
import path from "path";

const sizes = [
  { name: "icons/icon-192.png", size: 192 },
  { name: "icons/icon-512.png", size: 512 },
  { name: "icons/apple-touch-icon.png", size: 180 },
  { name: "icons/icon-1024.png", size: 1024 },
];

const dir = path.join(process.cwd(), "public/icons");
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

for (const { name, size } of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // White background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, size, size);

  // "RB" text in black, using serif font
  ctx.fillStyle = "#000000";
  ctx.font = `bold ${Math.round(size * 0.38)}px "Georgia", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("RB", size / 2, size / 2 + Math.round(size * 0.02));

  // Thin border line at bottom (editorial accent)
  ctx.strokeStyle = "#DF3331";
  ctx.lineWidth = Math.max(2, Math.round(size * 0.008));
  const lineY = size * 0.72;
  const lineMargin = size * 0.25;
  ctx.beginPath();
  ctx.moveTo(lineMargin, lineY);
  ctx.lineTo(size - lineMargin, lineY);
  ctx.stroke();

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(process.cwd(), "public", name), buffer);
  console.log(`Generated ${name} (${size}x${size})`);
}

// Favicon: black background, white text, small
const favSize = 32;
const fav = createCanvas(favSize, favSize);
const fctx = fav.getContext("2d");
fctx.fillStyle = "#000000";
fctx.fillRect(0, 0, favSize, favSize);
fctx.fillStyle = "#FFFFFF";
fctx.font = `bold 14px "Georgia", serif`;
fctx.textAlign = "center";
fctx.textBaseline = "middle";
fctx.fillText("RB", favSize / 2, favSize / 2 + 1);
fs.writeFileSync(path.join(process.cwd(), "public/favicon.ico"), fav.toBuffer("image/png"));
console.log("Generated favicon.ico (32x32)");
