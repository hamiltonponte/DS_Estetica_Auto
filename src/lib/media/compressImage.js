const DEFAULTS = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.82,
  mimeType: 'image/jpeg',
};

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem.'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao comprimir imagem.'))),
      type,
      quality,
    );
  });
}

/** Reduz fotos grandes (comum no iOS) antes de salvar no IndexedDB. */
export async function compressImageFile(file, options = {}) {
  if (!file?.type?.startsWith('image/')) return file;

  const settings = { ...DEFAULTS, ...options };
  if (file.size <= 350_000 && file.type === settings.mimeType) {
    return file;
  }

  try {
    const img = await loadImageFromFile(file);
    const ratio = Math.min(
      1,
      settings.maxWidth / img.width,
      settings.maxHeight / img.height,
    );

    const width = Math.max(1, Math.round(img.width * ratio));
    const height = Math.max(1, Math.round(img.height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, settings.mimeType, settings.quality);
    const ext = settings.mimeType === 'image/png' ? 'png' : 'jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'foto';
    return new File([blob], `${baseName}.${ext}`, {
      type: settings.mimeType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
