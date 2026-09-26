import { COLLECTION_FILES, MANIFEST_KEY } from './constants';
import { idbGet, idbSet } from './idb';
import { readCollection, writeCollection } from './fileSystem';

const BACKUP_FILE = 'ds-estetica-backup.json';

/**
 * Export all collections and manifest to a complete JSON backup
 */
export async function exportCompleteBackup() {
  const backup = {
    manifest: await idbGet(MANIFEST_KEY),
    collections: {},
    exported_at: new Date().toISOString(),
    version: '1.1.0',
  };

  for (const [entityName, fileName] of Object.entries(COLLECTION_FILES)) {
    const key = `collection:${fileName}`;
    const data = await idbGet(key);
    backup.collections[entityName] = Array.isArray(data) ? data : [];
  }

  return JSON.stringify(backup, null, 2);
}

/**
 * Download the complete backup as a JSON file
 */
export async function downloadBackup() {
  const json = await exportCompleteBackup();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ds-estetica-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import a complete backup from JSON
 * @param {string} json - JSON string of the backup
 * @param {string} mode - 'replace' or 'merge'
 */
export async function importBackup(json, mode = 'replace') {
  const backup = JSON.parse(json);

  if (!backup.collections || typeof backup.collections !== 'object') {
    throw new Error('Formato de backup inválido');
  }

  if (mode === 'replace') {
    // Replace all collections
    for (const [entityName, fileName] of Object.entries(COLLECTION_FILES)) {
      const key = `collection:${fileName}`;
      const data = backup.collections[entityName] || [];
      await idbSet(key, data);
    }
  } else if (mode === 'merge') {
    // Merge collections by ID
    for (const [entityName, fileName] of Object.entries(COLLECTION_FILES)) {
      const key = `collection:${fileName}`;
      const existing = await idbGet(key);
      const incoming = backup.collections[entityName] || [];
      
      const existingMap = new Map((Array.isArray(existing) ? existing : []).map(item => [item.id, item]));
      
      for (const item of incoming) {
        if (item.id) {
          existingMap.set(item.id, item);
        }
      }
      
      await idbSet(key, Array.from(existingMap.values()));
    }
  }

  // Update manifest if present in backup
  if (backup.manifest) {
    await idbSet(MANIFEST_KEY, {
      ...backup.manifest,
      restored_at: new Date().toISOString(),
    });
  }

  // Trigger storage change event
  window.dispatchEvent(new CustomEvent('ds-estetica-data-changed'));
}

/**
 * Read a backup file from user input
 */
export function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Get backup info without importing
 */
export async function getBackupInfo(json) {
  const backup = JSON.parse(json);
  const info = {
    manifest: backup.manifest,
    exported_at: backup.exported_at,
    version: backup.version,
    collections: {},
  };

  for (const [entityName, data] of Object.entries(backup.collections)) {
    info.collections[entityName] = Array.isArray(data) ? data.length : 0;
  }

  return info;
}
