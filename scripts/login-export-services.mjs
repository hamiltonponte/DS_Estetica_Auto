/**
 * Exporta serviços do Base44 após login (credenciais só no seu PC).
 *
 * Uso (PowerShell — NÃO cole a senha no histórico se possível):
 *   cd autoglow1.1
 *   $env:BASE44_EMAIL="seu@email.com"
 *   $env:BASE44_PASSWORD="sua-senha"
 *   $env:VITE_BASE44_APP_ID="6a13883dde526dee1105b467"
 *   node scripts/login-export-services.mjs
 *
 * Saída: data/seed/services-from-base44.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@base44/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const email = process.env.BASE44_EMAIL;
const password = process.env.BASE44_PASSWORD;
const appId = process.env.VITE_BASE44_APP_ID || process.env.VITE_APP_ID || '6a13883dde526dee1105b467';
const appBaseUrl = process.env.VITE_BASE44_APP_BASE_URL || process.env.VITE_APP_BASE_URL || '';

if (!email || !password) {
  console.error('Defina BASE44_EMAIL e BASE44_PASSWORD no ambiente (não commite no git).');
  process.exit(1);
}

const api = createClient({
  appId,
  serverUrl: 'https://base44.app',
  requiresAuth: false,
  appBaseUrl,
});

try {
  console.log('Autenticando...');
  const login = await api.auth.loginViaEmailPassword(email, password);
  if (login?.access_token) {
    api.auth.setToken(login.access_token);
  }

  console.log('Buscando serviços...');
  const services = await api.entities.Service.list('-created_date', 500);

  const normalized = services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description || '',
    price: Number(s.price) || 0,
    duration_minutes: s.duration_minutes ? Number(s.duration_minutes) : undefined,
    category: s.category || 'outros',
    active: s.active !== false,
    created_date: s.created_date,
    updated_date: s.updated_date,
  }));

  const outDir = path.join(root, 'data', 'seed');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'services-from-base44.json');
  fs.writeFileSync(outFile, JSON.stringify(normalized, null, 2), 'utf8');

  console.log(`\nExportados ${normalized.length} serviços → ${outFile}\n`);
  normalized.forEach((s) => {
    console.log(`  • ${s.name} — R$ ${s.price} [${s.category}]`);
  });
} catch (err) {
  console.error('Falha:', err.message || err);
  if (err.data) console.error(JSON.stringify(err.data, null, 2));
  process.exit(1);
}
