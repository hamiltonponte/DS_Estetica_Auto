/** Remove espaços, hífens e normaliza para busca (ABC1D23). */
export function normalizePlate(value = '') {
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/** Formata placa para exibição (Mercosul ou antiga, quando possível). */
export function formatPlateDisplay(value = '') {
  const raw = normalizePlate(value);
  if (raw.length === 7) {
    if (/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(raw)) {
      return `${raw.slice(0, 3)}-${raw.slice(3)}`;
    }
    if (/^[A-Z]{3}[0-9]{4}$/.test(raw)) {
      return `${raw.slice(0, 3)}-${raw.slice(3)}`;
    }
  }
  return raw || String(value).trim().toUpperCase();
}

export function isLikelyPlateQuery(query = '') {
  const normalized = normalizePlate(query);
  return normalized.length >= 3 && /^[A-Z0-9]+$/.test(normalized);
}

export function vehicleMatchesSearch(vehicle, query, clientName = '') {
  const term = String(query || '').trim();
  if (!term) return true;

  const lower = term.toLowerCase();
  const normalizedQuery = normalizePlate(term);

  if (normalizedQuery.length >= 3) {
    const plateNorm = vehicle.plate_normalized || normalizePlate(vehicle.plate);
    if (plateNorm.includes(normalizedQuery)) return true;
  }

  return (
    vehicle.brand?.toLowerCase().includes(lower) ||
    vehicle.model?.toLowerCase().includes(lower) ||
    vehicle.plate?.toLowerCase().includes(lower) ||
    vehicle.color?.toLowerCase().includes(lower) ||
    clientName.toLowerCase().includes(lower)
  );
}

export function preparePlateFields(plate) {
  const formatted = formatPlateDisplay(plate);
  return {
    plate: formatted,
    plate_normalized: normalizePlate(formatted),
  };
}
