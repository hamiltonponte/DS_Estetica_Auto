import {
  cloudApiUrl,
  getAuthToken,
  getDeviceId,
  isCloudEnabled,
} from './cloudConfig';

async function parseJsonResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Erro HTTP ${response.status}`);
  }
  return data;
}

export async function cloudFetch(pathname, options = {}) {
  if (!isCloudEnabled()) {
    throw new Error('Sincronização na nuvem não configurada.');
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-Device-Id': getDeviceId(),
    ...(options.headers || {}),
  };

  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(cloudApiUrl(pathname), {
    ...options,
    headers,
  });

  return parseJsonResponse(response);
}

export async function cloudLogin(email, password) {
  return cloudFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function cloudMe() {
  return cloudFetch('/api/v1/auth/me');
}

export async function cloudPull({ since, full = false } = {}) {
  const params = new URLSearchParams();
  if (full) params.set('full', '1');
  else if (since) params.set('since', since);
  const qs = params.toString();
  return cloudFetch(`/api/v1/sync/pull${qs ? `?${qs}` : ''}`);
}

export async function cloudPush(collections) {
  return cloudFetch('/api/v1/sync/push', {
    method: 'POST',
    body: JSON.stringify({
      device_id: getDeviceId(),
      collections,
    }),
  });
}

export async function cloudUploadMedia(fileName, dataUrl) {
  return cloudFetch('/api/v1/sync/media', {
    method: 'POST',
    body: JSON.stringify({ file_name: fileName, data_url: dataUrl }),
  });
}

export async function cloudFetchMediaDataUrl(fileName, token = getAuthToken()) {
  const response = await fetch(cloudApiUrl(`/api/v1/sync/media/${encodeURIComponent(fileName)}`), {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Device-Id': getDeviceId(),
    },
  });

  if (!response.ok) {
    throw new Error('Mídia não encontrada na nuvem.');
  }

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function cloudHealth() {
  return cloudFetch('/api/v1/health');
}
