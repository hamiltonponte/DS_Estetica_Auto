import React, { useEffect, useState } from 'react';
import { resolveMediaUrl } from '@/lib/media/resolveMediaUrl';

export default function MediaImage({ src, alt = '', className = '', fallbackClassName = '' }) {
  const [resolvedSrc, setResolvedSrc] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!src) {
      setResolvedSrc('');
      return undefined;
    }

    if (src.startsWith('data:') || src.startsWith('blob:') || /^https?:\/\//i.test(src)) {
      setResolvedSrc(src);
      return undefined;
    }

    resolveMediaUrl(src).then((url) => {
      if (!cancelled) setResolvedSrc(url);
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!resolvedSrc) {
    return (
      <div
        className={fallbackClassName || className}
        aria-hidden="true"
        style={{ background: 'var(--muted)' }}
      />
    );
  }

  return <img src={resolvedSrc} alt={alt} className={className} loading="lazy" />;
}
