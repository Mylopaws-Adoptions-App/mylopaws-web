'use client';
import React, { useEffect, useRef } from 'react';
import { loadMaps, importMapsLibrary } from '@/lib/maps';

export type PickedPlace = { name: string; address: string; lat: number; lng: number };

// Bengaluru bias + India-only, preserved from the legacy Autocomplete config.
const BENGALURU_BIAS = { north: 13.2, south: 12.75, east: 77.85, west: 77.35 };

/**
 * Address autocomplete on the NEW Places API (google.maps.places.PlaceAutocompleteElement),
 * because the legacy Autocomplete class is unavailable on our post-March-2025 GCP project.
 *
 * PlaceAutocompleteElement is a custom element appended to the DOM (not bound to an <input>).
 * We instantiate it ONCE (ref-guarded) and clean it up on unmount — no duplicate elements or
 * leaked listeners. The onPicked({ address, lat, lng }) contract is unchanged.
 */
export default function PlaceInput({ label, placeholder, onPicked, bare, autoFocus }: {
  label?: string; placeholder?: string; onPicked: (p: PickedPlace) => void; defaultValue?: string;
  bare?: boolean; autoFocus?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const elRef = useRef<any>(null);
  // Keep the latest onPicked without re-initialising the element.
  const onPickedRef = useRef(onPicked);
  onPickedRef.current = onPicked;

  useEffect(() => {
    let cancelled = false;
    let el: any;
    let handler: ((e: any) => void) | undefined;

    (async () => {
      try {
        await loadMaps();
        const places: any = await importMapsLibrary('places');
        // Guard: init exactly once, even under StrictMode double-invoke / re-render.
        if (cancelled || !hostRef.current || elRef.current) return;

        el = new places.PlaceAutocompleteElement({
          includedRegionCodes: ['in'],       // India-only (new-API equivalent of componentRestrictions)
          locationBias: BENGALURU_BIAS,       // bias results toward Bengaluru
        });
        el.classList.add('mp-autocomplete');
        if (placeholder) { try { el.setAttribute('placeholder', placeholder); } catch { /* not all versions support it */ } }

        handler = async (e: any) => {
          try {
            const prediction = e?.placePrediction;
            if (!prediction) return;
            const place = prediction.toPlace();
            // displayName = the short POI/primary name Google shows on the first line
            // (e.g. "Godrej 24 Sales Office"); we store it for clean customer-facing display.
            await place.fetchFields({ fields: ['displayName', 'location', 'formattedAddress'] });
            const loc = place.location;
            if (!loc) return;
            const address = place.formattedAddress ?? '';
            const dn = place.displayName;
            const name = (typeof dn === 'string' ? dn : dn?.text) || address.split(',')[0] || address;
            onPickedRef.current({
              name,
              address,
              lat: typeof loc.lat === 'function' ? loc.lat() : loc.lat,
              lng: typeof loc.lng === 'function' ? loc.lng() : loc.lng,
            });
          } catch (err) {
            console.error('[places] selection failed', err);
          }
        };
        el.addEventListener('gmp-select', handler);

        elRef.current = el;
        hostRef.current.appendChild(el);
        if (autoFocus) requestAnimationFrame(() => { try { el.focus?.(); } catch { /* noop */ } });
      } catch (err) {
        console.error('[places] failed to initialise autocomplete', err);
      }
    })();

    return () => {
      cancelled = true;
      if (el && handler) el.removeEventListener('gmp-select', handler);
      if (el && el.parentNode) el.parentNode.removeChild(el);
      elRef.current = null;
    };
    // Init once for this mount. placeholder/autoFocus are captured at init (stable per usage).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (bare) return <div ref={hostRef} className="mp-autocomplete-host" />;

  return (
    <label className="mb-4 block">
      {label && <span className="mb-1 block text-[13px] font-medium text-muted">{label}</span>}
      <div ref={hostRef} className="mp-autocomplete-host" />
    </label>
  );
}
