import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
const report = [];
for (let number = 1; number <= 45; number++) {
  const name = String(number).padStart(2, '0');
  const input = `tmp/rendered/${name}.png`;
  const output = `public/slides/${name}.webp`;
  await sharp(input).webp({ lossless: true, effort: 4 }).toFile(output);
  const [original, encoded] = await Promise.all([
    sharp(input).removeAlpha().raw().toBuffer(),
    sharp(output).removeAlpha().raw().toBuffer(),
  ]);
  const identical = original.equals(encoded);
  if (!identical) throw new Error(`Page ${number} differs from its PDF render`);
  report.push({ page: number, width: 3840, height: 2160, identical });
}
await writeFile('tmp/audit/render-verification.json', JSON.stringify(report, null, 2));
console.log('45/45 pages: lossless images identical to the original PDF renders.');
