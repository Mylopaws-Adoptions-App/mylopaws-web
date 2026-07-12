export type Pet = { id: string; name: string; breed: string | null; age_years: number | null; aggressive: boolean; rescue: boolean; critical_notes: string | null };
export type Address = { id: string; label: string; address_text: string; lat: number | null; lng: number | null };
export type Therapy = { id: string; sort_order: number; name: string; branded_name: string; description: string | null; target_symptoms: string | null; price: number; duration_min: number; image_url: string | null; active: boolean };
export type OrderStatus = 'unassigned' | 'assigned' | 'on_the_way' | 'in_progress' | 'delivered' | 'cancelled';
export type Staff = { id: string; auth_user_id: string | null; name: string; email: string | null; phone_number: string | null; role: 'admin' | 'supplier'; vehicle_type: string | null; active: boolean };
export type HomesOrder = { id: number; provider: string; pawparent_name: string; furbaby_name: string; phone_number: string; check_in: string; check_out: string; nights: number; num_cats: number; rate_per_night: number; total_estimate: number; notes: string | null; status: string; cancel_reason: string | null; created_at: string };

// Mylopaws Homes — cat boarding. Edit these in ONE place to change pricing/provider everywhere.
export const HOMES_PROVIDER = 'Joanna Cat Boarding';
export const HOMES_RATE_PER_NIGHT = 800; // ₹ per cat, per night
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
