'use client';
import Image from 'next/image';
import { mediaFor } from '@/lib/media';

/**
 * The Mylopaws brand mark (transparent PNG in Storage). Rendered via next/image with
 * `object-contain` inside a caller-sized box, so the logo keeps its aspect ratio and never
 * distorts regardless of the source's true dimensions. Give the box a size via `boxClassName`
 * (e.g. "h-16 w-44"). alt defaults to "Mylopaws".
 */
export function Logo({
  boxClassName = 'h-14 w-44',
  priority = false,
  alt = 'Mylopaws',
}: {
  boxClassName?: string;
  priority?: boolean;
  alt?: string;
}) {
  return (
    <span className={`relative block ${boxClassName}`}>
      <Image src={mediaFor('brandLogo')} alt={alt} fill priority={priority} sizes="240px" className="object-contain" />
    </span>
  );
}
