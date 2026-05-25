/**
 * Exporta serviços do Base44 para data/seed/services.json
 * Uso: node scripts/export-base44-services.mjs
 * Requer .env.local na raiz AUTOGLOW ou variáveis VITE_APP_ID / VITE_APP_BASE_URL
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@base44/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnv() {
  const envPaths = [
    path.join(root, '.env.local'),
    path.join(root, '..', '.env.local'),
  ];
  for (const p of envPaths) {
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const appId = process.env.VITE_APP_ID || process.env.VITE_BASE44_APP_ID;
const appBaseUrl = process.env.VITE_APP_BASE_URL || process.env.VITE_BASE44_APP_BASE_URL;

if (!appId || !appBaseUrl) {
  console.error('Defina VITE_APP_ID e VITE_APP_BASE_URL em .env.local');
  process.exit(1);
}

const api = createClient({
  appId,
  token: process.env.VITE_ACCESS_TOKEN || process.env.BASE44_ACCESS_TOKEN || undefined,
  serverUrl: 'https://base44.app',
  requiresAuth: false,
  appBaseUrl,
});

try {
  const services = await api.entities.Service.list('-created_date', 500);
  const normalized = services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description || '',
    price: Number(s.price) || 0,
    duration_minutes: s.duration_minutes ? Number(s.duration_minutes) : undefined,
    category: s.category || 'outros',
    active: s.active !== false,
    created_date: s.created_date || new Date().toISOString(),
    updated_date: s.updated_date || new Date().toISOString(),
  }));

  const outDir = path.join(root, 'data', 'seed');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'services.json');
  fs.writeFileSync(outFile, JSON.stringify(normalized, null, 2), 'utf8');

  console.log(`Exportados ${normalized.length} serviços → ${outFile}`);
  normalized.forEach((s) => console.log(`  - ${s.name} (R$ ${s.price}) [${s.category}]`));
} catch (err) {
  console.error('Falha ao exportar:', err.message || err);
  process.exit(1);
}
