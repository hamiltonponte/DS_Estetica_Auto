import { COLLECTION_FILES, EXCEL_FILE } from './constants';
import { idbGet, idbSet, idbDelete } from './idb';
import { readCollection, readExcelBuffer } from './fileSystem';
import { syncWorkbook } from './excelSync';

export const DATA_FOLDER_HANDLE_KEY = 'data-folder-handle';
export const DATA_FOLDER_META_KEY = 'data-folder-meta';
export const APP_FOLDER_NAME = 'DS_Estetica_Auto_Dados';

const listeners = new Set();
let syncTimer = null;
let syncing = false;

export function isDataFolderSupported() {
  return typeof window !== 'undefined'
    && typeof window.showDirectoryPicker === 'function';
}

export function onDataFolderChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify() {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* ignore */ }
  });
}

async function ensurePermission(handle, mode = 'readwrite') {
  if (!handle) return false;
  const opts = { mode };
  if ((await handle.queryPermission?.(opts)) === 'granted') return true;
  if ((await handle.requestPermission?.(opts)) === 'granted') return true;
  return false;
}

export async function getDataFolderMeta() {
  return (await idbGet(DATA_FOLDER_META_KEY)) || null;
}

export async function getDataFolderHandle() {
  return (await idbGet(DATA_FOLDER_HANDLE_KEY)) || null;
}

export async function getDataFolderStatus() {
  const supported = isDataFolderSupported();
  const meta = await getDataFolderMeta();
  const handle = await getDataFolderHandle();

  if (!supported) {
    return {
      supported: false,
      connected: false,
      permission: 'unsupported',
      meta,
      folderName: APP_FOLDER_NAME,
    };
  }

  if (!handle) {
    return {
      supported: true,
      connected: false,
      permission: 'none',
      meta,
      folderName: APP_FOLDER_NAME,
    };
  }

  const granted = await ensurePermission(handle, 'readwrite');
  return {
    supported: true,
    connected: granted,
    permission: granted ? 'granted' : 'prompt',
    meta,
    folderName: meta?.folderName || APP_FOLDER_NAME,
    lastSyncAt: meta?.last_sync_at || null,
  };
}

async function writeTextFile(dirHandle, fileName, text) {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(text);
  await writable.close();
}

async function writeBinaryFile(dirHandle, fileName, data) {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

async function writeReadme(dirHandle) {
  const text = [
    'DS Estética Auto — Pasta de dados',
    '',
    'Esta pasta é atualizada automaticamente pelo app sempre que você:',
    '- cadastra ou edita clientes, veículos, produtos e serviços;',
    '- cria orçamentos e agendamentos;',
    '- finaliza um serviço (dados financeiros).',
    '',
    'Arquivos principais:',
    `- ${EXCEL_FILE} → planilha completa (inclui aba Financeiros)`,
    '- *.json → cópia dos cadastros em formato texto',
    '',
    'Não apague esta pasta enquanto usar o app neste aparelho.',
    `Última sincronização: ${new Date().toLocaleString('pt-BR')}`,
  ].join('\n');
  await writeTextFile(dirHandle, 'LEIA-ME.txt', text);
}

/**
 * Escreve todas as coleções + planilha Excel na pasta conectada.
 */
export async function writeAllToDataFolder(dirHandle) {
  if (!dirHandle) throw new Error('Pasta de dados não conectada');

  const ok = await ensurePermission(dirHandle);
  if (!ok) throw new Error('Permissão da pasta negada. Conecte a pasta novamente.');

  // Garante Excel atualizado no IndexedDB antes de copiar
  await syncWorkbook();

  for (const [collectionName, fileName] of Object.entries(COLLECTION_FILES)) {
    const items = await readCollection(null, collectionName);
    await writeTextFile(dirHandle, fileName, JSON.stringify(items, null, 2));
  }

  const excelBuffer = await readExcelBuffer();
  if (excelBuffer) {
    await writeBinaryFile(dirHandle, EXCEL_FILE, excelBuffer);
  }

  // Snapshot financeiro dedicado (atualizado a cada sync, inclusive ao finalizar serviço)
  const appointments = await readCollection(null, 'Appointment');
  const executions = await readCollection(null, 'ServiceExecution');
  const financial = {
    updated_at: new Date().toISOString(),
    appointments_concluidos: appointments.filter(
      (a) => a.status === 'concluido' || a.payment_status,
    ),
    execucoes: executions,
  };
  await writeTextFile(dirHandle, 'financeiro.json', JSON.stringify(financial, null, 2));

  await writeReadme(dirHandle);

  const meta = (await getDataFolderMeta()) || {};
  const nextMeta = {
    ...meta,
    folderName: APP_FOLDER_NAME,
    last_sync_at: new Date().toISOString(),
  };
  await idbSet(DATA_FOLDER_META_KEY, nextMeta);
  notify();
  return nextMeta;
}

/**
 * Usuário escolhe onde criar a pasta e o app cria DS_Estetica_Auto_Dados.
 */
export async function connectDataFolder() {
  if (!isDataFolderSupported()) {
    throw new Error(
      'Seu navegador não permite criar pasta de dados. Use Chrome ou Edge no Android/PC. No iPhone, use o backup completo em Configurações.',
    );
  }

  const parent = await window.showDirectoryPicker({
    id: 'ds-estetica-dados',
    mode: 'readwrite',
    startIn: 'documents',
  });

  const appDir = await parent.getDirectoryHandle(APP_FOLDER_NAME, { create: true });
  await idbSet(DATA_FOLDER_HANDLE_KEY, appDir);
  await idbSet(DATA_FOLDER_META_KEY, {
    folderName: APP_FOLDER_NAME,
    parentHint: parent.name || '',
    connected_at: new Date().toISOString(),
    last_sync_at: null,
  });

  await writeAllToDataFolder(appDir);
  notify();
  return appDir;
}

export async function reconnectDataFolder() {
  const handle = await getDataFolderHandle();
  if (!handle) throw new Error('Nenhuma pasta conectada. Clique em Criar pasta de dados.');
  const ok = await ensurePermission(handle);
  if (!ok) throw new Error('Permissão negada. Conecte a pasta novamente.');
  await writeAllToDataFolder(handle);
  return handle;
}

export async function disconnectDataFolder() {
  await idbDelete(DATA_FOLDER_HANDLE_KEY);
  await idbDelete(DATA_FOLDER_META_KEY);
  notify();
}

/**
 * Agenda gravação na pasta (debounce) após qualquer alteração no app.
 */
export function scheduleDataFolderSync(delayMs = 900) {
  if (!isDataFolderSupported()) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    flushDataFolderSync().catch((err) => {
      console.warn('[dataFolder] sync falhou:', err?.message || err);
    });
  }, delayMs);
}

export async function flushDataFolderSync() {
  if (syncing) return;
  const handle = await getDataFolderHandle();
  if (!handle) return;

  const permission = await handle.queryPermission?.({ mode: 'readwrite' });
  // Em background não pedimos prompt — só grava se já tiver permissão
  if (permission !== 'granted') return;

  syncing = true;
  try {
    await writeAllToDataFolder(handle);
  } finally {
    syncing = false;
  }
}

/**
 * Tenta restaurar permissão ao abrir o app (sem prompt agressivo).
 */
export async function restoreDataFolderOnBoot() {
  if (!isDataFolderSupported()) return null;
  const handle = await getDataFolderHandle();
  if (!handle) return null;
  const permission = await handle.queryPermission?.({ mode: 'readwrite' });
  if (permission === 'granted') {
    // Sync silencioso ao abrir
    scheduleDataFolderSync(1500);
    return handle;
  }
  return null;
}
