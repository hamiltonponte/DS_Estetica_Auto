import { syncWorkbook } from './excelSync';
import { readCollection, writeCollection } from './fileSystem';

let rootHandleRef = null;
const listeners = new Set();

export function setStorageRoot(handle) {
  rootHandleRef = handle;
  listeners.forEach((fn) => fn());
}

export function getStorageRoot() {
  return rootHandleRef;
}

export function onStorageChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

async function persist(collectionName, items) {
  if (!rootHandleRef) throw new Error('Pasta de dados não configurada');
  await writeCollection(rootHandleRef, collectionName, items);
  await syncWorkbook(rootHandleRef);
  listeners.forEach((fn) => fn());
  window.dispatchEvent(new CustomEvent('ds-estetica-data-changed'));
}

function parseSort(sort) {
  if (!sort || typeof sort !== 'string') return null;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return { field, desc };
}

function sortItems(items, sort) {
  const s = parseSort(sort);
  if (!s) return items;
  return [...items].sort((a, b) => {
    const av = a[s.field] ?? '';
    const bv = b[s.field] ?? '';
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return s.desc ? -cmp : cmp;
  });
}

function applyFilter(items, where) {
  if (!where || typeof where !== 'object') return items;
  return items.filter((item) =>
    Object.entries(where).every(([k, v]) => item[k] === v)
  );
}

export function createEntityStore(collectionName) {
  return {
    async list(sort, limit) {
      const items = await readCollection(rootHandleRef, collectionName);
      let result = sortItems(items, sort);
      if (limit) result = result.slice(0, limit);
      return result;
    },

    async filter(where, sort, limit) {
      const items = await readCollection(rootHandleRef, collectionName);
      let result = applyFilter(items, where);
      result = sortItems(result, sort);
      if (limit) result = result.slice(0, limit);
      return result;
    },

    async create(data) {
      const items = await readCollection(rootHandleRef, collectionName);
      const now = new Date().toISOString();
      const record = {
        ...data,
        id: data.id || crypto.randomUUID(),
        created_date: data.created_date || now,
        updated_date: now,
      };
      items.push(record);
      await persist(collectionName, items);
      return record;
    },

    async update(id, data) {
      const items = await readCollection(rootHandleRef, collectionName);
      const idx = items.findIndex((i) => i.id === id);
      if (idx === -1) throw new Error('Registro não encontrado');
      const updated = {
        ...items[idx],
        ...data,
        id,
        updated_date: new Date().toISOString(),
      };
      items[idx] = updated;
      await persist(collectionName, items);
      return updated;
    },

    async delete(id) {
      const items = await readCollection(rootHandleRef, collectionName);
      const next = items.filter((i) => i.id !== id);
      await persist(collectionName, next);
    },
  };
}
