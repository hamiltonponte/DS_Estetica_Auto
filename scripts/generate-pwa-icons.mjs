/**
 * Gera ícones PWA a partir de public/favicon.svg
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'public', 'favicon.svg');
const outDir = path.join(root, 'public');

const BG = { r: 15, g: 23, b: 42 };

if (!fs.existsSync(src)) {
  console.error('favicon.svg não encontrado:', src);
  process.exit(1);
}

async function writeIcon(size, filename, padding = 0.12) {
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

await writeIcon(192, 'pwa-192.png', 0.1);
await writeIcon(512, 'pwa-512.png', 0.1);
await writeIcon(512, 'pwa-512-maskable.png', 0.22);

console.log('Ícones PWA gerados.');
