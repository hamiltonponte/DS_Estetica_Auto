import { COLLECTION_FILES } from '@/lib/storage/constants';
import { readCollection, writeCollection } from '@/lib/storage/fileSystem';
import { syncWorkbook } from '@/lib/storage/excelSync';
import { idbGet, idbGetAllKeys, idbSet } from '@/lib/storage/idb';
import { clearMediaUrlCache } from '@/lib/media/resolveMediaUrl';
import {
  cloudPull,
  cloudPush,
  cloudUploadMedia,
  cloudFetchMediaDataUrl,
} from './cloudApi';
import { getSyncMeta, saveSyncMeta, isCloudEnabled, getAuthToken } from './cloudConfig';

let applyingRemote = false;
let pushTimer = null;
const syncedMediaKey = 'ds-estetica-synced-media';

function getSyncedMediaSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(syncedMediaKey) || '[]'));
  } catch {
    return new Set();
  }
}

function saveSyncedMediaSet(set) {
  localStorage.setItem(syncedMediaKey, JSON.stringify([...set]));
}

export function isApplyingRemoteSync() {
  return applyingRemote;
}

async function exportLocalCollections() {
  const collections = {};
  for (const name of Object.keys(COLLECTION_FILES)) {
    collections[name] = await readCollection(null, name);
  }
  return collections;
}

async function countLocalRecords() {
  const collections = await exportLocalCollections();
  return Object.values(collections).reduce((sum, items) => sum + items.length, 0);
}

function mergeCollection(localItems = [], remoteItems = []) {
  const map = new Map(localItems.map((item) => [item.id, item]));
  for (const remote of remoteItems) {
    const local = map.get(remote.id);
    if (!local) {
      map.set(remote.id, remote);
      continue;
    }
    const localTs = local.updated_date || local.created_date || '';
    const remoteTs = remote.updated_date || remote.created_date || '';
    if (remoteTs >= localTs) map.set(remote.id, remote);
  }
  return [...map.values()];
}

async function applyCollections(collections, { replace = false } = {}) {
  applyingRemote = true;
  try {
    for (const [name, remoteItems] of Object.entries(collections)) {
      if (!COLLECTION_FILES[name] || !Array.isArray(remoteItems)) continue;
      if (replace) {
        await writeCollection(null, name, remoteItems);
      } else {
        const localItems = await readCollection(null, name);
        const merged = mergeCollection(localItems, remoteItems);
        await writeCollection(null, name, merged);
      }
    }
    await syncWorkbook();
    window.dispatchEvent(new CustomEvent('ds-estetica-data-changed'));
  } finally {
    applyingRemote = false;
  }
}

async function uploadPendingMedia() {
  if (!getAuthToken()) return 0;

  const keys = await idbGetAllKeys();
  const synced = getSyncedMediaSet();
  let uploaded = 0;

  for (const key of keys) {
    if (!String(key).startsWith('upload:')) continue;
    const fileName = String(key).slice('upload:'.length);
    if (synced.has(fileName)) continue;

    const dataUrl = await idbGet(key);
    if (typeof dataUrl !== 'string') continue;

    await cloudUploadMedia(fileName, dataUrl);
    synced.add(fileName);
    uploaded += 1;
  }

  saveSyncedMediaSet(synced);
  return uploaded;
}

async function downloadRemoteMedia(mediaList = []) {
  if (!getAuthToken()) return 0;

  let downloaded = 0;
  const synced = getSyncedMediaSet();

  for (const item of mediaList) {
    const fileName = item.file_name;
    const local = await idbGet(`upload:${fileName}`);
    if (typeof local === 'string') {
      synced.add(fileName);
      continue;
    }

    const dataUrl = await cloudFetchMediaDataUrl(fileName);
    await idbSet(`upload:${fileName}`, dataUrl);
    synced.add(fileName);
    downloaded += 1;
  }

  saveSyncedMediaSet(synced);
  clearMediaUrlCache();
  return downloaded;
}

export async function pushToCloud() {
  if (!isCloudEnabled() || !getAuthToken()) return null;

  saveSyncMeta({ pending: true, lastError: null });

  try {
    const mediaUploaded = await uploadPendingMedia();
    const collections = await exportLocalCollections();
    const result = await cloudPush(collections);
    const meta = saveSyncMeta({
      lastPushAt: result.server_time,
      pending: false,
      lastError: null,
    });
    return { ...result, mediaUploaded, meta };
  } catch (err) {
    saveSyncMeta({ pending: true, lastError: err.message || 'Erro ao enviar dados' });
    throw err;
  }
}

export async function pullFromCloud({ full = false } = {}) {
  if (!isCloudEnabled() || !getAuthToken()) return null;

  saveSyncMeta({ pending: true, lastError: null });

  try {
    const meta = getSyncMeta();
    const result = await cloudPull({ since: meta.lastPullAt, full });
    await applyCollections(result.collections, { replace: full });
    const mediaDownloaded = await downloadRemoteMedia(result.media || []);
    const nextMeta = saveSyncMeta({
      lastPullAt: result.server_time,
      pending: false,
      lastError: null,
    });
    return { ...result, mediaDownloaded, meta: nextMeta };
  } catch (err) {
    saveSyncMeta({ lastError: err.message || 'Erro ao baixar dados' });
    throw err;
  }
}

export async function restoreFromCloud() {
  return pullFromCloud({ full: true });
}

export async function syncNow({ preferPullFirst = true } = {}) {
  if (!isCloudEnabled() || !getAuthToken()) {
    throw new Error('Faça login para sincronizar.');
  }

  if (preferPullFirst) {
    await pullFromCloud({ full: false });
  }
  return pushToCloud();
}

export async function initialSyncAfterLogin() {
  const localCount = await countLocalRecords();
  if (localCount === 0) {
    return restoreFromCloud();
  }
  return syncNow({ preferPullFirst: true });
}

export function schedulePushToCloud(delayMs = 4000) {
  if (!isCloudEnabled() || !getAuthToken() || applyingRemote) return;

  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    // Pull primeiro para trazer agendamentos do Instagram sem perdê-los no push
    syncNow({ preferPullFirst: true }).catch(() => {
      // status already stored in meta
    });
  }, delayMs);
}

export function getCloudSyncStatus() {
  return {
    enabled: isCloudEnabled(),
    authenticated: Boolean(getAuthToken()),
    ...getSyncMeta(),
  };
}
