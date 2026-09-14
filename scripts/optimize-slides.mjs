import fs from "node:fs/promises";
import sharp from "sharp";
import { createHash } from "node:crypto";
const cache = new Map();
for (let page = 1; page <= 45; page++) {
  const name = String(page).padStart(2, "0");
  let svg = await fs.readFile(`tmp/slides/${name}.svg`, "utf8");
  const images = [
    ...svg.matchAll(/data:image\/(?:png|jpeg);base64,([A-Za-z0-9+/=\s]+)/g),
  ];
  for (const image of images) {
    const source = Buffer.from(image[1], "base64");
    const key = createHash("sha256").update(source).digest("hex");
    if (!cache.has(key)) {
      const output = await sharp(source)
        .resize({
          width: 2400,
          height: 2400,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 88 })
        .toBuffer();
      cache.set(key, `data:image/webp;base64,${output.toString("base64")}`);
    }
    svg = svg.replaceAll(image[0], cache.get(key));
  }
  await fs.writeFile(`public/slides/${name}.svg`, svg);
  console.log(`Slide ${name}: ${Math.round(Buffer.byteLength(svg) / 1024)} KB`);
}
