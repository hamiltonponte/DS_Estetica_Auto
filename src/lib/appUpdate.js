/**
 * Atualiza o PWA (código/cache do app) sem apagar dados do usuário.
 *
 * PRESERVA (nunca toca):
 * - IndexedDB `ds-estetica-data` (cadastros, imagens upload:*, config, pasta de dados)
 * - localStorage (login nuvem, device id, sync)
 * - sessionStorage
 * - pasta de dados no aparelho (File System Access)
 *
 * ATUALIZA apenas:
 * - Cache Storage do service worker (JS/CSS/HTML do app)
 * - Registro do service worker (força baixar a versão nova)
 */

export const APP_UPDATE_FLAG = 'ds-estetica-app-updated';

/**
 * Limpa somente caches de assets do PWA.
 * @returns {Promise<string[]>} nomes dos caches removidos
 */
export async function clearAppShellCaches() {
  if (!('caches' in window)) return [];
  const keys = await caches.keys();
  await Promise.all(keys.map((name) => caches.delete(name)));
  return keys;
}

/**
 * Remove service workers atuais para permitir instalar a versão nova no reload.
 */
export async function unregisterServiceWorkers() {
  if (!('serviceWorker' in navigator)) return 0;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((reg) => reg.unregister()));
  return regs.length;
}

/**
 * Executa atualização segura e recarrega o app.
 * Dados, imagens e configurações permanecem intactos.
 */
export async function updateAppPreservingData() {
  await clearAppShellCaches();
  await unregisterServiceWorkers();

  try {
    sessionStorage.setItem(APP_UPDATE_FLAG, '1');
  } catch {
    /* ignore */
  }

  const url = new URL(window.location.href);
  url.searchParams.set('_v', String(Date.now()));
  // Mantém a rota atual (HashRouter)
  window.location.replace(url.toString());
}

/**
 * Consome flag pós-reload para toast de confirmação.
 */
export function consumeAppUpdatedFlag() {
  let updated = false;
  try {
    if (sessionStorage.getItem(APP_UPDATE_FLAG) === '1') {
      sessionStorage.removeItem(APP_UPDATE_FLAG);
      updated = true;
    }
  } catch {
    /* ignore */
  }

  // Remove parâmetro de cache-bust da URL, sem recarregar
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('_v')) {
      url.searchParams.delete('_v');
      window.history.replaceState({}, '', url.toString());
    }
  } catch {
    /* ignore */
  }

  return updated;
}
