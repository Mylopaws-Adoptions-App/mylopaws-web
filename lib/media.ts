// Central registry for the marketing media in Supabase Storage (bucket "Image Assets", public read).
// Filenames are the owner's descriptive names — kept in ONE place so a re-upload/rename only touches here.
// Every URL is properly encoded (bucket name and filenames contain spaces).
//
// NOTE (flagged to owner): most originals are 3–13 MB. They are delivered through next/image, which
// resizes + re-encodes to WebP/AVIF per device, so phones never download the full file — but the
// originals should still be recompressed at source. The 4 glamour/bikini-named files are intentionally
// omitted (not brand-appropriate).
//
// TRAVEL IMAGE (CHANGE 3): "Air Travel.jpeg" (a pet resting calmly in transit) is used behind the
// Pet Travel card, chosen for a genuinely travel-relevant, on-brand visual. CAVEAT flagged to owner:
// it reads as *air* travel, whereas the product is intracity *cabs* — ideally upload a pet-in-a-car
// shot and repoint `travelCard` here. ("Train Travel.jpeg" is the other in-transit option available.)

const SUPABASE_URL = 'https://sbajixyhyyjpgkxrhltc.supabase.co';
const BUCKET = 'Image Assets';

/** Public URL for an object in the media bucket, fully URL-encoded. */
export const mediaUrl = (filename: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(BUCKET)}/${encodeURIComponent(filename)}`;

// Semantic slots → source files. Change a value here to reskin a placement app-wide.
export const MEDIA = {
  brandLogo: 'Mylopaws Transparent Logo.png',
  loginHero: 'Pawfamily_Cute.jpeg',
  travelCard: 'Air Travel.jpeg',
  dermacareCard: 'A vet with a dog.jpeg',
  homesCard: 'A dog and a cat sleeping close to each other.jpeg',
  // Dermacare service tiles
  dermaVetCat: 'A vet with a cat.jpeg',
  dermaVetInspect: 'A vet inspecting a cat.jpeg',
  dermaWellness: 'Yoga with Pet.jpeg',
  nailClip: "Nail Clipper and a dog's paw.jpeg",
  // Homes surface
  homesCosy: 'Husband and wife smiling and playing with a dog.jpeg',
  // Warm empty-state art
  emptyWarm: 'A lovely woman hugging a dog.jpeg',
} as const;

export type MediaKey = keyof typeof MEDIA;
export const mediaFor = (key: MediaKey) => mediaUrl(MEDIA[key]);
