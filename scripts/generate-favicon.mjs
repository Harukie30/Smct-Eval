import sharp from "sharp";
import { join } from "node:path";

async function makeIcon(size, outPath) {
  const sourcePath = join(process.cwd(), "public/smct.png");
  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    if (r <= 64 && g <= 64 && b <= 64) {
      pixels[i + 3] = 0;
    }
  }

  const trimmed = await sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 0 })
    .png()
    .toBuffer();

  const padding = Math.max(2, Math.round(size * 0.08));
  const inner = size - padding * 2;

  await sharp(trimmed)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(outPath);

  console.log(`Wrote ${outPath} (${size}x${size}, transparent)`);
}

await makeIcon(32, join(process.cwd(), "src/app/icon.png"));
await makeIcon(180, join(process.cwd(), "src/app/apple-icon.png"));
