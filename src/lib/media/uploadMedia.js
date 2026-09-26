import { compressImageFile } from './compressImage';
import { readFileAsDataUrl, saveUploadFile } from '@/lib/storage/fileSystem';

const MAX_INLINE_BYTES = 120_000;

/**
 * @param {File} file
 * @param {{ storage?: 'inline'|'indexeddb', maxSizeMb?: number }} options
 */
export async function uploadMediaFile(file, options = {}) {
  const { storage = 'indexeddb', maxSizeMb = 8 } = options;

  if (!file) throw new Error('Arquivo não informado.');
  if (!file.type?.startsWith('image/')) {
    throw new Error('Selecione uma imagem válida.');
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`Imagem muito grande. Limite: ${maxSizeMb}MB`);
  }

  const compressed = await compressImageFile(file);

  if (storage === 'inline' || compressed.size <= MAX_INLINE_BYTES) {
    const file_url = await readFileAsDataUrl(compressed);
    return {
      file_url,
      storage: 'inline',
      mime_type: compressed.type,
      byte_size: compressed.size,
    };
  }

  const file_url = await saveUploadFile(null, compressed);
  return {
    file_url,
    storage: 'indexeddb',
    mime_type: compressed.type,
    byte_size: compressed.size,
  };
}
