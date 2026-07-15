export type Pet = { id: string; name: string; breed: string | null; age_years: number | null; aggressive: boolean; aggression_level: number; rescue: boolean; critical_notes: string | null };
export type Address = { id: string; label: string; address_text: string; lat: number | null; lng: number | null };
export type Therapy = { id: string; sort_order: number; name: string; branded_name: string; description: string | null; target_symptoms: string | null; price: number; duration_min: number; image_url: string | null; active: boolean };
export type Service = { id: string; sort_order: number; name: string; tagline: string | null; description: string | null; includes: string[] | null; base_price: number; duration_min: number; popular: boolean; active: boolean };
export type Addon = { id: string; sort_order: number; name: string; description: string | null; price: number; active: boolean };
export const rupees = (n: number | string) => `₹${Number(n).toLocaleString('en-IN')}`;

// Aggression 0–3 (ops-design skill). 0 calm · 1 nervous · 2 handle with care · 3 high risk.
export const AGGRESSION_META = [
  { label: 'Calm', text: 'text-muted', chip: 'bg-surface-alt text-muted' },
  { label: 'Nervous', text: 'text-amber-600', chip: 'bg-amber-100 text-amber-700' },
  { label: 'Handle with care', text: 'text-orange-600', chip: 'bg-orange-100 text-orange-700' },
  { label: 'High risk · two-person job', text: 'text-danger font-bold', chip: 'bg-danger/10 text-danger font-bold' },
] as const;
export const aggressionMeta = (level: number | null | undefined) => AGGRESSION_META[Math.max(0, Math.min(3, Number(level ?? 0)))];

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ord = (n: number) => (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
// "13th Jul 2026, 10:00AM" from ('2026-07-13','10:00')
export const fmtApptDateTime = (dateISO?: string, hhmm?: string) => {
  if (!dateISO) return '';
  const d = new Date(dateISO + 'T00:00:00');
  const datePart = `${d.getDate()}${ord(d.getDate())} ${MON[d.getMonth()]} ${d.getFullYear()}`;
  if (!hhmm) return datePart;
  const h = Number(hhmm.slice(0, 2)); const m = hhmm.slice(3, 5);
  return `${datePart}, ${((h + 11) % 12) + 1}:${m}${h < 12 ? 'AM' : 'PM'}`;
};

// Google Maps navigation URL to a destination (prefers coords, falls back to address text).
export const navUrl = (lat?: number | null, lng?: number | null, address?: string | null) =>
  lat != null && lng != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address ?? '')}`;
export type OrderStatus = 'unassigned' | 'assigned' | 'on_the_way' | 'in_progress' | 'delivered' | 'cancelled';
export type Staff = { id: string; auth_user_id: string | null; name: string; email: string | null; phone_number: string | null; role: 'admin' | 'supplier'; vehicle_type: string | null; active: boolean; verticals: string[] };
export type HomesOrder = { id: number; provider: string; pawparent_name: string; furbaby_name: string; phone_number: string; check_in: string; check_out: string; nights: number; num_cats: number; rate_per_night: number; total_estimate: number; notes: string | null; status: string; cancel_reason: string | null; created_at: string };

// Mylopaws Homes — cat boarding. Edit these in ONE place to change pricing/provider everywhere.
export const HOMES_PROVIDER = 'Joanna Cat Boarding';
// ₹ per cat, per night. Placed from a July-2026 Bengaluru market scan: budget starts ~₹600,
// premium home boarding runs ₹800–1,200, cat hotels ₹1,000–1,800. ₹900 positions us as a
// premium home stay without topping the market. Shown only as an ESTIMATE — Joanna confirms the
// final quote before any payment. Edit here to change it everywhere.
export const HOMES_RATE_PER_NIGHT = 900;
export const HOMES_WHATSAPP = '919887445671';
export const nightsBetween = (checkIn: string, checkOut: string) => {
  if (!checkIn || !checkOut) return 0;
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
};
export const STATUS_META: Record<string, { label: string; cls: string }> = {
  unassigned:  { label: 'Finding partner', cls: 'bg-amber-100 text-amber-800' },
  assigned:    { label: 'Confirmed',       cls: 'bg-pink-100 text-magenta' },
  on_the_way:  { label: 'On the way',      cls: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In progress',     cls: 'bg-orange-100 text-orange-800' },
  delivered:   { label: 'Completed',       cls: 'bg-green-100 text-green-800' },
  cancelled:   { label: 'Cancelled',       cls: 'bg-red-100 text-red-700' },
  // Mylopaws Homes (cat boarding) statuses
  requested:   { label: 'Request sent',    cls: 'bg-amber-100 text-amber-800' },
  confirmed:   { label: 'Confirmed',       cls: 'bg-pink-100 text-magenta' },
  in_stay:     { label: 'In stay',         cls: 'bg-blue-100 text-blue-800' },
  completed:   { label: 'Completed',       cls: 'bg-green-100 text-green-800' },
};
export const NEXT_STATUS: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  assigned:    { next: 'on_the_way',  label: 'Start Trip 🚀' },
  on_the_way:  { next: 'in_progress', label: 'Arrived — Start Job' },
  in_progress: { next: 'delivered',   label: 'Mark Completed ✓' },
};
export const mapsLink = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;
export const computeFare = (cfg: any, km: number) =>
  Math.max(Number(cfg?.min_fare ?? 400), Math.round(Number(cfg?.base_fare ?? 300) + Number(cfg?.per_km ?? 30) * km));
