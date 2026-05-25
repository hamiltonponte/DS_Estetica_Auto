import {
  COLLECTION_FILES,
  DATA_DIR,
  EXCEL_FILE,
  MANIFEST_FILE,
  UPLOADS_DIR,
} from './constants';
import { idbDelete, idbGet, idbSet } from './idb';

const HANDLE_KEY = 'directory-handle';

export function isFileSystemSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

async function getDirHandle() {
  return idbGet(HANDLE_KEY);
}

async function saveDirHandle(handle) {
  await idbSet(HANDLE_KEY, handle);
}

export async function clearStoredDirectory() {
  await idbDelete(HANDLE_KEY);
}

export async function pickDataDirectory() {
  if (!isFileSystemSupported()) {
    throw new Error('UNSUPPORTED');
  }
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  await saveDirHandle(handle);
  await initializeDirectory(handle);
  return handle;
}

export async function restoreDataDirectory() {
  const handle = await getDirHandle();
  if (!handle) return null;
  const perm = await handle.queryPermission({ mode: 'readwrite' });
  if (perm === 'granted') {
    await initializeDirectory(handle);
    return handle;
  }
  const req = await handle.requestPermission({ mode: 'readwrite' });
  if (req === 'granted') {
    await initializeDirectory(handle);
    return handle;
  }
  return null;
}

async function getOrCreateDir(root, name) {
  return root.getDirectoryHandle(name, { create: true });
}

async function getFileHandle(dir, name, create = false) {
  return dir.getFileHandle(name, { create });
}

async function readFileJson(handle, defaultValue) {
  try {
    const file = await handle.getFile();
    const text = await file.text();
    if (!text.trim()) return defaultValue;
    return JSON.parse(text);
  } catch {
    return defaultValue;
  }
}

async function readJson(handle) {
  const parsed = await readFileJson(handle, []);
  return Array.isArray(parsed) ? parsed : [];
}

async function writeJson(handle, data) {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

export async function initializeDirectory(rootHandle) {
  const dataDir = await getOrCreateDir(rootHandle, DATA_DIR);
  await getOrCreateDir(rootHandle, UPLOADS_DIR);

  for (const fileName of Object.values(COLLECTION_FILES)) {
    await getFileHandle(dataDir, fileName, true);
  }

  const manifestHandle = await getFileHandle(rootHandle, MANIFEST_FILE, true);
  const existing = await readFileJson(manifestHandle, null);
  if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
    await writeJson(manifestHandle, {
      app: 'DS Estética Auto',
      version: '1.1.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
}

export async function readCollection(rootHandle, collectionName) {
  const dataDir = await getOrCreateDir(rootHandle, DATA_DIR);
  const fileName = COLLECTION_FILES[collectionName];
  if (!fileName) return [];
  const fileHandle = await getFileHandle(dataDir, fileName, false);
  return readJson(fileHandle);
}

export async function writeCollection(rootHandle, collectionName, items) {
  const dataDir = await getOrCreateDir(rootHandle, DATA_DIR);
  const fileName = COLLECTION_FILES[collectionName];
  const fileHandle = await getFileHandle(dataDir, fileName, true);
  await writeJson(fileHandle, items);

  const manifestHandle = await getFileHandle(rootHandle, MANIFEST_FILE, true);
  const manifest = (await readFileJson(manifestHandle, {})) || {};
  if (!manifest.app) {
    await writeJson(manifestHandle, {
      app: 'DS Estética Auto',
      version: '1.1.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } else {
    await writeJson(manifestHandle, {
      ...manifest,
      updated_at: new Date().toISOString(),
    });
  }
}

export async function writeExcelFile(rootHandle, buffer) {
  const fileHandle = await getFileHandle(rootHandle, EXCEL_FILE, true);
  const writable = await fileHandle.createWritable();
  await writable.write(buffer);
  await writable.close();
}

export async function saveUploadFile(rootHandle, file) {
  const uploadsDir = await getOrCreateDir(rootHandle, UPLOADS_DIR);
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const fileHandle = await getFileHandle(uploadsDir, safeName, true);
  const writable = await fileHandle.createWritable();
  await writable.write(await file.arrayBuffer());
  await writable.close();
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

export async function getDirectoryName(handle) {
  return handle?.name || 'Pasta selecionada';
}
