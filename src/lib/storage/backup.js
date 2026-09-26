import { COLLECTION_FILES } from './constants';
import { readCollection, writeCollection } from './fileSystem';
import { syncWorkbook } from './excelSync';
import { idbGet, idbGetAllKeys, idbSet } from './idb';
import { clearMediaUrlCache } from '@/lib/media/resolveMediaUrl';

const BACKUP_SCHEMA_VERSION = 2;

async function exportUploadAssets() {
  const keys = await idbGetAllKeys();
  const uploads = {};

  for (const key of keys) {
    if (!String(key).startsWith('upload:')) continue;
    const value = await idbGet(key);
    if (typeof value === 'string') {
      uploads[String(key).slice('upload:'.length)] = value;
    }
  }

  return uploads;
}

async function importUploadAssets(uploads = {}) {
  if (!uploads || typeof uploads !== 'object') return 0;

  let count = 0;
  for (const [name, dataUrl] of Object.entries(uploads)) {
    if (typeof dataUrl !== 'string') continue;
    await idbSet(`upload:${name}`, dataUrl);
    count += 1;
  }
  clearMediaUrlCache();
  return count;
}

function collectionNames() {
  return Object.keys(COLLECTION_FILES);
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

export async function exportBackup() {
  const collections = {};
  for (const name of collectionNames()) {
    collections[name] = await readCollection(null, name);
  }

  const uploads = await exportUploadAssets();

  return {
    meta: {
      app: 'DS Estética Auto',
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      storage: 'indexeddb',
    },
    collections,
    media: {
      uploads,
    },
  };
}

export function downloadBackup(backup, filename = `ds-estetica-backup-${new Date().toISOString().slice(0, 10)}.json`) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function parseBackupFile(file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Arquivo inválido: não é um JSON válido.');
  }
  validateBackupPayload(parsed);
  return parsed;
}

export function validateBackupPayload(payload) {
  if (!isObject(payload)) {
    throw new Error('Backup inválido: estrutura não reconhecida.');
  }
  if (!isObject(payload.meta)) {
    throw new Error('Backup inválido: meta ausente.');
  }
  if (!isObject(payload.collections)) {
    throw new Error('Backup inválido: collections ausente.');
  }

  const schemaVersion = Number(payload.meta.schemaVersion || 0);
  if (!Number.isFinite(schemaVersion) || schemaVersion <= 0) {
    throw new Error('Backup inválido: schemaVersion ausente.');
  }
  if (schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new Error('Backup de versão mais nova. Atualize o app para restaurar.');
  }

  for (const name of collectionNames()) {
    const value = payload.collections[name];
    if (value !== undefined && !Array.isArray(value)) {
      throw new Error(`Backup inválido: coleção ${name} está corrompida.`);
    }
  }
}

export async function importBackup(payload, { replace = true } = {}) {
  validateBackupPayload(payload);

  const importedCollections = {};
  for (const name of collectionNames()) {
    const incoming = payload.collections[name] || [];
    if (!replace) {
      const current = await readCollection(null, name);
      importedCollections[name] = [...current, ...incoming];
    } else {
      importedCollections[name] = incoming;
    }
  }

  for (const name of collectionNames()) {
    await writeCollection(null, name, importedCollections[name]);
  }

  const restoredUploads = await importUploadAssets(payload.media?.uploads);

  await syncWorkbook();
  window.dispatchEvent(new CustomEvent('ds-estetica-data-changed'));

  return {
    restoredAt: new Date().toISOString(),
    schemaVersion: payload.meta.schemaVersion,
    totals: Object.fromEntries(
      collectionNames().map((name) => [name, importedCollections[name].length]),
    ),
    media: {
      uploads: restoredUploads,
    },
  };
}
