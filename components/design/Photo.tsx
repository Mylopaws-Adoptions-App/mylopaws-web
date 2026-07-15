'use client';
import Image from 'next/image';
import { useState } from 'react';
import { mediaFor, mediaUrl, type MediaKey } from '@/lib/media';

/** Resolve either a semantic MEDIA key or a raw filename to a public URL. */
function resolve(srcKey?: MediaKey, file?: string): string | null {
  if (srcKey) return mediaFor(srcKey);
  if (file) return mediaUrl(file);
  return null;
}

/**
 * PhotoBg — a full-bleed background photo for a card, with a gradient overlay for text legibility.
 * Drop inside a `relative overflow-hidden` container; put the card's text ABOVE it (z-10).
 * On load error it renders nothing, so the card's own background (brand gradient/solid) shows through
 * — the graceful fallback the brief asks for. Below-the-fold by default (lazy); pass `priority` for heroes.
 */
export function PhotoBg({
  srcKey, file, alt, overlay = 'from-black/70 via-black/30 to-transparent',
  sizes = '(max-width: 480px) 100vw, 480px', priority = false,
}: {
  srcKey?: MediaKey; file?: string; alt: string;
  overlay?: string; sizes?: string; priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = resolve(srcKey, file);
  if (!src || failed) return null;
  return (
    <>
      <Image src={src} alt={alt} fill priority={priority} sizes={sizes}
        className="object-cover" onError={() => setFailed(true)} />
      <div className={`absolute inset-0 bg-gradient-to-t ${overlay}`} aria-hidden />
    </>
  );
}

/**
 * Photo — a standalone framed image (hero, empty-state art). Give the wrapper an aspect/height via
 * `className`. Falls back to a soft brand gradient if the source fails, so layout never collapses.
 */
export function Photo({
  srcKey, file, alt, className = '', rounded = 'rounded-card',
  sizes = '(max-width: 480px) 100vw, 480px', priority = false, overlay,
}: {
  srcKey?: MediaKey; file?: string; alt: string; className?: string;
  rounded?: string; sizes?: string; priority?: boolean; overlay?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = resolve(srcKey, file);
  return (
    <div className={`relative overflow-hidden ${rounded} ${className}`}>
      {src && !failed ? (
        <>
          <Image src={src} alt={alt} fill priority={priority} sizes={sizes}
            className="object-cover" onError={() => setFailed(true)} />
          {overlay && <div className={`absolute inset-0 bg-gradient-to-t ${overlay}`} aria-hidden />}
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-plum-soft via-mint/40 to-butter/30" aria-hidden />
      )}
    </div>
  );
}
