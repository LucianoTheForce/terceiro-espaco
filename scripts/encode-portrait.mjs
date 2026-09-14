import sharp from "sharp";
import { mkdir, writeFile, stat } from "node:fs/promises";

await mkdir("tmp/portrait/audit", { recursive: true });
const report = [];
for (let n = 1; n <= 45; n++) {
  const id = String(n).padStart(2, "0");
  const path = `public/portrait/${id}.webp`;
  const source = `tmp/portrait/${id}.png`;
  const existing = await stat(path).catch(() => null);
  if (!existing || (await stat(source)).mtimeMs > existing.mtimeMs) {
    await sharp(source).webp({ lossless: true, effort: 4 }).toFile(path);
  }
  const { width, height, size } = await sharp(path).metadata();
  if (width !== 2160 || height !== 3840)
    throw new Error(`Invalid dimensions: ${id}`);
  report.push({ page: n, width, height, bytes: size });
  console.log(`4K portrait ${id}/45`);
}
for (let start = 1; start <= 45; start += 15) {
  const tiles = [];
  for (let n = start; n < start + 15; n++) {
    const id = String(n).padStart(2, "0");
    const tile = await sharp(`public/portrait/${id}.webp`)
      .resize(216, 384)
      .toBuffer();
    const i = n - start;
    tiles.push({
      input: tile,
      left: (i % 5) * 236 + 10,
      top: Math.floor(i / 5) * 418 + 24,
    });
    const label = Buffer.from(
      `<svg width="216" height="20"><text x="0" y="16" fill="white" font-family="Arial" font-size="14">${id}</text></svg>`,
    );
    tiles.push({
      input: label,
      left: (i % 5) * 236 + 10,
      top: Math.floor(i / 5) * 418 + 2,
    });
  }
  await sharp({
    create: { width: 1180, height: 1254, channels: 3, background: "#444" },
  })
    .composite(tiles)
    .png()
    .toFile(`tmp/portrait/audit/contact-${start}.png`);
}
await writeFile(
  "tmp/portrait/audit/dimensions.json",
  JSON.stringify(report, null, 2),
);
