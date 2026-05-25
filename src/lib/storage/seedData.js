import seedServices from '../../../data/seed/services.json';
import { readCollection, writeCollection } from './fileSystem';
import { syncWorkbook } from './excelSync';

function now() {
  return new Date().toISOString();
}

function withIds(records) {
  const ts = now();
  return records.map((row) => ({
    ...row,
    id: row.id || crypto.randomUUID(),
    created_date: row.created_date || ts,
    updated_date: row.updated_date || ts,
    active: row.active !== false,
    price: Number(row.price) || 0,
    duration_minutes: row.duration_minutes ? Number(row.duration_minutes) : undefined,
    category: row.category || 'outros',
  }));
}

function normalizeImportList(data) {
  const list = Array.isArray(data) ? data : data?.items || data?.records || data?.data || [];
  return withIds(
    list.filter((item) => item && (item.name || item.nome))
      .map((item) => ({
        name: item.name || item.nome,
        description: item.description || item.descricao || '',
        price: item.price ?? item.preco ?? item.valor ?? 0,
        duration_minutes: item.duration_minutes ?? item.duracao_minutos ?? item.duration,
        category: item.category || item.categoria || 'outros',
        active: item.active !== false && item.ativo !== false,
        id: item.id,
        created_date: item.created_date,
        updated_date: item.updated_date,
      })),
  );
}

/** Carrega catálogo padrão (espelha categorias do Base44) se ainda não houver serviços. */
export async function seedServicesIfEmpty(rootHandle) {
  const existing = await readCollection(rootHandle, 'Service');
  if (existing.length > 0) {
    return { seeded: false, count: existing.length };
  }
  const services = withIds(seedServices);
  await writeCollection(rootHandle, 'Service', services);
  await syncWorkbook(rootHandle);
  window.dispatchEvent(new CustomEvent('ds-estetica-data-changed'));
  return { seeded: true, count: services.length };
}

/** Importa serviços de JSON exportado do Base44 (ou lista manual). */
export async function importServicesFromJson(rootHandle, jsonData, { replace = false } = {}) {
  const incoming = normalizeImportList(jsonData);
  if (incoming.length === 0) {
    throw new Error('Nenhum serviço válido encontrado no arquivo.');
  }

  const existing = replace ? [] : await readCollection(rootHandle, 'Service');
  const byKey = new Map(existing.map((s) => [s.id || s.name.toLowerCase(), s]));

  for (const row of incoming) {
    const key = row.id || row.name.toLowerCase();
    const prev = byKey.get(key);
    if (prev) {
      byKey.set(key, { ...prev, ...row, id: prev.id });
    } else {
      byKey.set(row.name.toLowerCase(), row);
    }
  }

  const merged = [...byKey.values()];
  await writeCollection(rootHandle, 'Service', merged);
  await syncWorkbook(rootHandle);
  window.dispatchEvent(new CustomEvent('ds-estetica-data-changed'));
  return { count: merged.length, imported: incoming.length };
}
