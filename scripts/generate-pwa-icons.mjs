/**
 * Gera ícones PWA a partir da logo DS Estética Auto
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'public', 'brand', 'logo-ds.jpg');
const outDir = path.join(root, 'public');

const BG = { r: 0, g: 0, b: 0 };

if (!fs.existsSync(src)) {
  console.error('Logo não encontrada:', src);
  process.exit(1);
}

async function writeIcon(size, filename, padding = 0.08) {
  const inner = Math.round(size * (1 - padding * 2));
  const resized = await sharp(src)
    .resize(inner, inner, { fit: 'contain', background: BG })
    .flatten({ background: BG })
    .toBuffer();

  const outPath = path.join(outDir, filename);
  await sharp({
    create: { width: size, height: size, channels: 3, background: BG },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(outPath);

  console.log('OK', outPath);
}

await writeIcon(192, 'pwa-192.png', 0.06);
await writeIcon(512, 'pwa-512.png', 0.06);
await writeIcon(512, 'pwa-512-maskable.png', 0.14);
await writeIcon(32, 'favicon-32.png', 0.05);
await writeIcon(180, 'apple-touch-icon.png', 0.06);

console.log('Ícones PWA gerados a partir de logo-ds.jpg.');
