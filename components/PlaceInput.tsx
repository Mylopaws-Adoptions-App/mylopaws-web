'use client';
import React, { useEffect, useRef } from 'react';
import { loadMaps } from '@/lib/maps';

export type PickedPlace = { address: string; lat: number; lng: number };

// Google Places Autocomplete widget bound to a plain input — SDK handles CORS/session tokens.
// `bare` renders just the styled input (no label/border) for use inside custom cards/sheets.
export default function PlaceInput({ label, placeholder, onPicked, defaultValue, bare, autoFocus }: {
  label?: string; placeholder: string; onPicked: (p: PickedPlace) => void; defaultValue?: string;
  bare?: boolean; autoFocus?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let ac: any;
    loadMaps().then((g) => {
      if (!ref.current) return;
      ac = new g.maps.places.Autocomplete(ref.current, {
        componentRestrictions: { country: 'in' },
        fields: ['geometry', 'formatted_address'],
        bounds: new g.maps.LatLngBounds({ lat: 12.75, lng: 77.35 }, { lat: 13.2, lng: 77.85 }), // Bengaluru bias
      });
      ac.addListener('place_changed', () => {
        const p = ac.getPlace();
        if (!p.geometry?.location) return;
        onPicked({ address: p.formatted_address ?? ref.current!.value, lat: p.geometry.location.lat(), lng: p.geometry.location.lng() });
      });
    });
  }, [onPicked]);

  if (bare) {
    return (
      <input ref={ref} defaultValue={defaultValue} placeholder={placeholder} autoFocus={autoFocus}
        className="min-h-[52px] w-full rounded-input border border-line bg-surface-alt px-4 text-[15px] text-ink outline-none placeholder:text-muted focus:border-plum" />
    );
  }

  return (
    <label className="mb-4 block">
      {label && <span className="mb-1 block text-[13px] font-medium text-muted">{label}</span>}
      <input ref={ref} defaultValue={defaultValue} placeholder={placeholder}
        className="min-h-[52px] w-full rounded-input border border-line bg-surface-alt px-4 text-[15px] text-ink outline-none placeholder:text-muted focus:border-plum" />
    </label>
  );
}
