export const VEHICLE_DAMAGE_AREAS = [
  'Capô',
  'Para-brisa',
  'Para-choque dianteiro',
  'Para-choque traseiro',
  'Porta dianteira esquerda',
  'Porta dianteira direita',
  'Porta traseira esquerda',
  'Porta traseira direita',
  'Para-lama dianteiro esquerdo',
  'Para-lama dianteiro direito',
  'Para-lama traseiro esquerdo',
  'Para-lama traseiro direito',
  'Teto',
  'Porta-malas / Tampa traseira',
  'Lanterna dianteira',
  'Lanterna traseira',
  'Retrovisor esquerdo',
  'Retrovisor direito',
  'Roda / Pneu',
  'Interior',
  'Outra área',
];

/**
 * Estrutura de confiança para registro de avarias (PWA / sync futuro).
 * @typedef {Object} DamageReport
 * @property {string} id
 * @property {string} photo_ref - data URL, uploads/… ou URL remota
 * @property {string} area_label
 * @property {string} description
 * @property {string} captured_at - ISO 8601
 * @property {'camera'|'gallery'|'legacy'} source
 * @property {string} [mime_type]
 * @property {number} [byte_size]
 */

export function createDamageReport({
  photoRef,
  areaLabel,
  description = '',
  source = 'gallery',
  mimeType,
  byteSize,
}) {
  return {
    id: crypto.randomUUID(),
    photo_ref: photoRef,
    area_label: String(areaLabel || 'Outra área').trim(),
    description: String(description || '').trim(),
    captured_at: new Date().toISOString(),
    source,
    ...(mimeType ? { mime_type: mimeType } : {}),
    ...(Number.isFinite(byteSize) ? { byte_size: byteSize } : {}),
  };
}

export function getVehicleDamageReports(vehicle) {
  if (!vehicle) return [];

  if (Array.isArray(vehicle.damage_reports) && vehicle.damage_reports.length > 0) {
    return vehicle.damage_reports.filter((r) => r && r.photo_ref);
  }

  const legacy = Array.isArray(vehicle.damage_photos) ? vehicle.damage_photos : [];
  return legacy.map((photoRef, index) =>
    createDamageReport({
      photoRef,
      areaLabel: `Avaria ${index + 1}`,
      description: '',
      source: 'legacy',
    }),
  );
}

export function syncDamagePhotosFromReports(reports = []) {
  return reports.map((r) => r.photo_ref).filter(Boolean);
}

export function prepareVehicleDamagePayload(reports = []) {
  const damage_reports = reports.filter((r) => r?.photo_ref && r?.area_label);
  return {
    damage_reports,
    damage_photos: syncDamagePhotosFromReports(damage_reports),
  };
}

export function formatDamageCapturedAt(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
