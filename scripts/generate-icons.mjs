import fs from "fs";
import path from "path";

// Minimal valid PNG (1x1 white pixel) as base64
const MINIMAL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "base64"
);

const dir = path.join(process.cwd(), "public/icons");
fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(path.join(dir, "icon-192.png"), MINIMAL_PNG);
fs.writeFileSync(path.join(dir, "icon-512.png"), MINIMAL_PNG);
fs.writeFileSync(path.join(dir, "apple-touch-icon.png"), MINIMAL_PNG);
fs.writeFileSync(path.join(process.cwd(), "public/favicon.ico"), MINIMAL_PNG);

console.log("Generated placeholder icons");
