import { isCloudEnabled, cloudApiUrl } from '@/lib/cloud/cloudConfig';

/** Base da API pública (mesma nuvem do app, ou fallback Contabo). */
export function getPublicBookingApiBase() {
  if (isCloudEnabled()) {
    return cloudApiUrl('').replace(/\/$/, '');
  }
  const fallback = import.meta.env.VITE_PUBLIC_BOOKING_API_URL
    || 'https://plusseller.185.218.125.181.sslip.io/ds-estetica-api';
  return String(fallback).replace(/\/$/, '');
}

async function publicFetch(pathname, options = {}) {
  const base = getPublicBookingApiBase();
  const response = await fetch(`${base}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Erro HTTP ${response.status}`);
  }
  return data;
}

export async function fetchPublicBookingPage(slug) {
  const data = await publicFetch(`/api/v1/public/booking/${encodeURIComponent(slug)}`);
  const base = getPublicBookingApiBase();
  if (data?.booking?.banner_url?.startsWith('/api/')) {
    data.booking.banner_url = `${base}${data.booking.banner_url}`;
  }
  return data;
}

export async function fetchPublicBookingSlots(slug, date) {
  const qs = new URLSearchParams({ date });
  return publicFetch(`/api/v1/public/booking/${encodeURIComponent(slug)}/slots?${qs}`);
}

export async function createPublicBooking(slug, payload) {
  return publicFetch(`/api/v1/public/booking/${encodeURIComponent(slug)}/appointments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
