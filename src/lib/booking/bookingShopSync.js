import { api } from '@/api/apiClient';
import { getPublicBookingApiBase } from '@/lib/booking/publicBookingApi';
import { normalizeSlug, buildPublicBookingUrl } from '@/lib/booking/bookingSlots';
import { resolveMediaUrl } from '@/lib/media/resolveMediaUrl';

const SHOP_KEY = 'ds-estetica-booking-shop';

export function getBookingShopSession() {
  try {
    const raw = localStorage.getItem(SHOP_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.slug || !data?.secret) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveBookingShopSession(session) {
  localStorage.setItem(SHOP_KEY, JSON.stringify(session));
}

async function shopFetch(pathname, { method = 'GET', body, secret, slug } = {}) {
  const base = getPublicBookingApiBase();
  const headers = { 'Content-Type': 'application/json' };
  if (secret) headers['X-Shop-Secret'] = secret;

  const response = await fetch(`${base}${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Erro HTTP ${response.status}`);
  }
  return data;
}

/**
 * Garante que este aparelho tem uma página pública.
 * Não pede e-mail, senha nem Instagram — só cria o link.
 */
export async function ensureBookingShop({ slug, businessName }) {
  const clean = normalizeSlug(slug);
  if (!clean) throw new Error('Informe um nome para o link (ex.: minha-estetica).');

  const existing = getBookingShopSession();
  if (existing?.secret && existing.slug === clean) {
    return existing;
  }

  // Se já tem sessão com outro slug, tenta republicar com o segredo antigo
  if (existing?.secret && existing.slug && existing.slug !== clean) {
    try {
      await shopFetch(`/api/v1/public/shops/${encodeURIComponent(existing.slug)}/publish`, {
        method: 'PUT',
        secret: existing.secret,
        body: { slug: clean, business_name: businessName },
      });
      const next = { ...existing, slug: clean };
      saveBookingShopSession(next);
      return next;
    } catch {
      // segue para registrar novo
    }
  }

  const created = await shopFetch('/api/v1/public/shops/register', {
    method: 'POST',
    body: { slug: clean, business_name: businessName },
  });

  const session = {
    shop_id: created.shop_id,
    slug: created.slug,
    secret: created.secret,
  };
  saveBookingShopSession(session);
  return session;
}

async function withResolvedImage(url) {
  if (!url) return '';
  try {
    return await resolveMediaUrl(url);
  } catch {
    return url;
  }
}

/**
 * Publica identidade + serviços + horários na página do link.
 * Depois de salvar, o Instagram já mostra a versão nova.
 */
export async function publishBookingPage({ bookingConfig, businessName }) {
  const slug = normalizeSlug(bookingConfig.public_slug);
  const session = await ensureBookingShop({ slug, businessName });

  const [businessList, services, appointments] = await Promise.all([
    api.entities.BusinessConfig.list(),
    api.entities.Service.list('name'),
    api.entities.Appointment.list('-date', 300),
  ]);

  const business = { ...(businessList[0] || {}) };
  if (!business.id) business.id = crypto.randomUUID();
  business.business_name = business.business_name || businessName;
  business.business_logo_url = await withResolvedImage(business.business_logo_url);
  business.updated_date = new Date().toISOString();

  const booking = {
    ...bookingConfig,
    public_slug: session.slug,
    enabled: bookingConfig.enabled !== false,
    banner_url: await withResolvedImage(bookingConfig.banner_url),
    updated_date: new Date().toISOString(),
  };
  if (!booking.id) booking.id = crypto.randomUUID();

  const activeServices = (services || [])
    .filter((s) => s.active !== false)
    .map(async (s) => ({
      ...s,
      image_url: await withResolvedImage(s.image_url),
    }));
  const resolvedServices = await Promise.all(activeServices);

  const activeAppointments = (appointments || []).filter(
    (a) => a.status === 'agendado' || a.status === 'em_andamento',
  );

  const result = await shopFetch(`/api/v1/public/shops/${encodeURIComponent(session.slug)}/publish`, {
    method: 'PUT',
    secret: session.secret,
    body: {
      slug: session.slug,
      business_name: business.business_name,
      collections: {
        BusinessConfig: [business],
        Service: resolvedServices,
        BookingConfig: [booking],
        Appointment: activeAppointments,
      },
    },
  });

  if (result.slug && result.slug !== session.slug) {
    saveBookingShopSession({ ...session, slug: result.slug });
  }

  return {
    ...result,
    session: getBookingShopSession(),
    publicUrl: buildPublicBookingUrl(result.slug || session.slug),
  };
}

/** Traz agendamentos feitos pelo link para o aparelho (Agendados). */
export async function pullBookingInbox() {
  const session = getBookingShopSession();
  if (!session?.secret || !session?.slug) return { appointments: [], clients: [] };

  const data = await shopFetch(`/api/v1/public/shops/${encodeURIComponent(session.slug)}/inbox`, {
    secret: session.secret,
  });

  const remoteAppointments = data.appointments || [];
  const remoteClients = data.clients || [];

  const localClients = await api.entities.Client.list();
  const clientIds = new Set(localClients.map((c) => c.id));
  for (const client of remoteClients) {
    if (!clientIds.has(client.id)) {
      await api.entities.Client.create({ ...client, id: client.id });
    }
  }

  const localApts = await api.entities.Appointment.list();
  const aptMap = new Map(localApts.map((a) => [a.id, a]));
  for (const apt of remoteAppointments) {
    const found = aptMap.get(apt.id);
    if (!found) {
      await api.entities.Appointment.create({ ...apt, id: apt.id });
    } else if ((apt.updated_date || '') > (found.updated_date || '')) {
      await api.entities.Appointment.update(found.id, { ...found, ...apt });
    }
  }

  return data;
}
