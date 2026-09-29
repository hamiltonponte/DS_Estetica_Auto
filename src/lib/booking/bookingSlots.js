/** Configuração padrão do link público de agendamento. */
export const DEFAULT_BOOKING_CONFIG = {
  enabled: false,
  public_slug: '',
  welcome_message: 'Olá! Seja bem-vindo(a). Escolha o serviço e o melhor horário para você.',
  banner_url: '',
  weekdays: [1, 2, 3, 4, 5], // 0=Dom … 6=Sáb
  start_time: '09:00',
  end_time: '18:00',
  slot_minutes: 60,
  max_per_day: 8,
  advance_days: 30,
};

export const WEEKDAY_LABELS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

export function normalizeSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function parseTimeToMinutes(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Gera horários possíveis no dia (sem checar ocupação). */
export function generateDaySlots(config, dateStr) {
  const cfg = { ...DEFAULT_BOOKING_CONFIG, ...config };
  if (!dateStr) return [];

  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) return [];

  const weekday = date.getDay();
  if (!cfg.weekdays?.includes(weekday)) return [];

  const start = parseTimeToMinutes(cfg.start_time);
  const end = parseTimeToMinutes(cfg.end_time);
  const step = Math.max(15, Number(cfg.slot_minutes) || 60);
  if (end <= start) return [];

  const slots = [];
  for (let t = start; t + step <= end; t += step) {
    slots.push(minutesToTime(t));
  }
  return slots;
}

/** Ocupa horário na agenda (ainda não concluído/cancelado). */
export function isActiveAppointment(apt) {
  if (!apt) return false;
  return apt.status === 'agendado' || apt.status === 'em_andamento';
}

export function countAppointmentsOnDate(appointments, dateStr) {
  return (appointments || []).filter(
    (a) => a.date === dateStr && isActiveAppointment(a),
  ).length;
}

export function isSlotTaken(appointments, dateStr, time, excludeId = null) {
  return (appointments || []).some(
    (a) => (
      a.date === dateStr
      && a.time === time
      && isActiveAppointment(a)
      && a.id !== excludeId
    ),
  );
}

/**
 * Lista horários livres para uma data.
 */
export function getAvailableSlots({ config, appointments, dateStr, excludeId = null }) {
  const cfg = { ...DEFAULT_BOOKING_CONFIG, ...config };
  const all = generateDaySlots(cfg, dateStr);
  const max = Math.max(1, Number(cfg.max_per_day) || 8);
  const used = countAppointmentsOnDate(appointments, dateStr);

  if (used >= max) return [];

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  return all.filter((time) => {
    if (isSlotTaken(appointments, dateStr, time, excludeId)) return false;
    if (dateStr === todayStr && parseTimeToMinutes(time) <= nowMinutes) return false;
    return true;
  });
}

export function validateBookingSlot({ config, appointments, dateStr, time, excludeId = null }) {
  const cfg = { ...DEFAULT_BOOKING_CONFIG, ...config };
  if (!dateStr || !time) {
    return { ok: false, error: 'Informe data e horário.' };
  }

  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: 'Data inválida.' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) {
    return { ok: false, error: 'Não é possível agendar em datas passadas.' };
  }

  const maxAdvance = Math.max(1, Number(cfg.advance_days) || 30);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + maxAdvance);
  if (date > limit) {
    return { ok: false, error: `Agende com até ${maxAdvance} dias de antecedência.` };
  }

  if (!cfg.weekdays?.includes(date.getDay())) {
    return { ok: false, error: 'Este dia da semana não está disponível.' };
  }

  const daySlots = generateDaySlots(cfg, dateStr);
  if (!daySlots.includes(time)) {
    return { ok: false, error: 'Horário fora do expediente.' };
  }

  const max = Math.max(1, Number(cfg.max_per_day) || 8);
  if (countAppointmentsOnDate(appointments, dateStr) >= max) {
    return { ok: false, error: 'Limite de agendamentos do dia atingido.' };
  }

  if (isSlotTaken(appointments, dateStr, time, excludeId)) {
    return { ok: false, error: 'Este horário já está ocupado. Escolha outro.' };
  }

  return { ok: true };
}

/** Link público do PWA (HashRouter + GitHub Pages). */
export function buildPublicBookingUrl(slug) {
  const base = `${window.location.origin}${import.meta.env.BASE_URL || '/'}`.replace(/\/?$/, '/');
  const clean = normalizeSlug(slug);
  return `${base}#/agendar/${clean}`;
}

/** Gera arquivo .ics para salvar na agenda do celular. */
export function buildIcsEvent({
  title,
  description,
  date,
  time,
  durationMinutes = 60,
  location = '',
}) {
  const [y, m, d] = String(date).split('-').map(Number);
  const [hh, mm] = String(time).split(':').map(Number);
  const start = new Date(y, m - 1, d, hh || 0, mm || 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const fmt = (dt) => {
    const pad = (n) => String(n).padStart(2, '0');
    return (
      `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`
      + `T${pad(dt.getHours())}${pad(dt.getMinutes())}${pad(dt.getSeconds())}`
    );
  };

  const escapeText = (t) => String(t || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');

  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@ds-estetica`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DS Estetica Auto//Agendamento//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    location ? `LOCATION:${escapeText(location)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

/** Formata data local para Google Calendar (sem Z = horário local). */
function fmtLocalCalendar(dt) {
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${dt.getFullYear()}${p(dt.getMonth() + 1)}${p(dt.getDate())}`
    + `T${p(dt.getHours())}${p(dt.getMinutes())}${p(dt.getSeconds())}`
  );
}

function eventDateRange({ date, time, durationMinutes = 60 }) {
  const [y, m, d] = String(date).split('-').map(Number);
  const [hh, mm] = String(time).split(':').map(Number);
  const start = new Date(y, m - 1, d, hh || 0, mm || 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return { start, end };
}

/** Abre o Google Agenda para o cliente confirmar (sem baixar arquivo). */
export function buildGoogleCalendarUrl({
  title,
  description,
  date,
  time,
  durationMinutes = 60,
  location = '',
}) {
  const { start, end } = eventDateRange({ date, time, durationMinutes });
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Agendamento',
    dates: `${fmtLocalCalendar(start)}/${fmtLocalCalendar(end)}`,
    details: description || '',
    location: location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Salva na agenda do aparelho com consentimento do cliente.
 * 1) Compartilhar → Agenda (iPhone/Android) — pede permissão do sistema
 * 2) Senão, abre Google Agenda para confirmar (sem download)
 */
export async function addEventToDeviceCalendar(event) {
  const ics = buildIcsEvent(event);
  const file = new File([ics], 'agendamento.ics', { type: 'text/calendar' });

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: event.title || 'Agendamento',
          text: 'Salvar este horário na sua agenda',
        });
        return { method: 'share' };
      }
    } catch (err) {
      // Usuário cancelou o compartilhar — não força download
      if (err?.name === 'AbortError') {
        return { method: 'cancelled' };
      }
    }
  }

  const url = buildGoogleCalendarUrl(event);
  window.open(url, '_blank', 'noopener,noreferrer');
  return { method: 'google' };
}

export function downloadIcs(filename, icsContent) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'agendamento.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
