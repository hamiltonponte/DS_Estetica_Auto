import { idbGet } from '@/lib/storage/idb';
import { getAuthToken } from '@/lib/cloud/cloudConfig';
import { cloudFetchMediaDataUrl } from '@/lib/cloud/cloudApi';

const cache = new Map();

function uploadsKeyFromRef(ref) {
  if (!ref || typeof ref !== 'string') return null;
  if (ref.startsWith('uploads/')) {
    return `upload:${ref.slice('uploads/'.length)}`;
  }
  return null;
}

/** Resolve referências locais (uploads/…) e mantém data/http URLs intactas. */
export async function resolveMediaUrl(ref) {
  if (!ref) return '';
  if (ref.startsWith('data:') || ref.startsWith('blob:') || /^https?:\/\//i.test(ref)) {
    return ref;
  }

  if (cache.has(ref)) return cache.get(ref);

  const idbKey = uploadsKeyFromRef(ref);
  if (idbKey) {
    const dataUrl = await idbGet(idbKey);
    if (typeof dataUrl === 'string') {
      cache.set(ref, dataUrl);
      return dataUrl;
    }

    if (getAuthToken() && ref.startsWith('uploads/')) {
      const fileName = ref.slice('uploads/'.length);
      try {
        const remoteDataUrl = await cloudFetchMediaDataUrl(fileName);
        cache.set(ref, remoteDataUrl);
        return remoteDataUrl;
      } catch {
        // fall through
      }
    }
  }

  return ref;
}

export function clearMediaUrlCache() {
  cache.clear();
}
