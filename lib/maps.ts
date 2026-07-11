'use client';
// Loads the Google Maps JS SDK once (Places lib). Browser REST calls to Places/Directions
// are CORS-blocked, so on web everything goes through this SDK.
let loading: Promise<any> | null = null;
export function loadMaps(): Promise<any> {
  if (typeof window === 'undefined') return new Promise(() => {});
  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    (window as any).__mapsReady = () => resolve((window as any).google);
    s.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places&callback=__mapsReady`;
    s.onerror = () => reject(new Error('Maps failed to load'));
    document.head.appendChild(s);
  });
  return loading;
}
