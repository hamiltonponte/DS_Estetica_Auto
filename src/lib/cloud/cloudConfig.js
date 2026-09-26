export const CLOUD_API_URL = import.meta.env.VITE_CLOUD_API_URL || '';

export function isCloudEnabled() {
  return Boolean(CLOUD_API_URL);
}

export function cloudApiUrl(pathname) {
  return `${CLOUD_API_URL.replace(/\/$/, '')}${pathname}`;
}

const DEVICE_KEY = 'ds-estetica-device-id';
const TOKEN_KEY = 'ds-estetica-cloud-token';
const USER_KEY = 'ds-estetica-cloud-user';
const SYNC_META_KEY = 'ds-estetica-sync-meta';

export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAuthUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getSyncMeta() {
  const raw = localStorage.getItem(SYNC_META_KEY);
  if (!raw) {
    return {
      lastPullAt: null,
      lastPushAt: null,
      lastError: null,
      pending: false,
    };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {
      lastPullAt: null,
      lastPushAt: null,
      lastError: null,
      pending: false,
    };
  }
}

export function saveSyncMeta(patch) {
  const next = { ...getSyncMeta(), ...patch };
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('ds-estetica-sync-changed', { detail: next }));
  return next;
}
