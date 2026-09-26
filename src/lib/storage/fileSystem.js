import {
  COLLECTION_FILES,
  EXCEL_FILE,
  MANIFEST_KEY,
} from './constants';
import { idbGet, idbSet } from './idb';

function collectionKey(collectionName) {
  const fileName = COLLECTION_FILES[collectionName];
  if (!fileName) return null;
  return `collection:${fileName}`;
}

export async function initializeStorage() {
  for (const fileName of Object.values(COLLECTION_FILES)) {
    const key = `collection:${fileName}`;
    const existing = await idbGet(key);
    if (existing === undefined) {
      await idbSet(key, []);
    }
  }

  const manifest = await idbGet(MANIFEST_KEY);
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    await idbSet(MANIFEST_KEY, {
      app: 'DS Estética Auto',
      version: '1.1.0',
      storage: 'indexeddb',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
}

export async function readCollection(_root, collectionName) {
  const key = collectionKey(collectionName);
  if (!key) return [];
  const data = await idbGet(key);
  return Array.isArray(data) ? data : [];
}

export async function writeCollection(_root, collectionName, items) {
  const key = collectionKey(collectionName);
  if (!key) return;

  await idbSet(key, items);

  const manifest = (await idbGet(MANIFEST_KEY)) || {};
  await idbSet(MANIFEST_KEY, {
    ...manifest,
    app: manifest.app || 'DS Estética Auto',
    version: manifest.version || '1.1.0',
    storage: 'indexeddb',
    updated_at: new Date().toISOString(),
  });
}

export async function writeExcelFile(_root, buffer) {
  await idbSet(`file:${EXCEL_FILE}`, buffer);
}

export async function readExcelBuffer() {
  return idbGet(`file:${EXCEL_FILE}`);
}

export async function saveUploadFile(_root, file) {
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const dataUrl = await readFileAsDataUrl(file);
  await idbSet(`upload:${safeName}`, dataUrl);
  return `uploads/${safeName}`;
}

export async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
