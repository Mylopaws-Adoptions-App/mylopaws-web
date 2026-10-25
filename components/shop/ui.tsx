'use client';
import {
  Bone, Bug, Droplets, Ear, Eye, Flame, HeartPulse, Pill, Snowflake, Sparkles, SprayCan, Smile,
  Utensils, Wind, Bandage, PawPrint, ShieldCheck, Truck, RotateCcw, Bath, Baby, type LucideIcon,
} from 'lucide-react';

/** Image Assets bucket (public): lifestyle photos for banners. */
const ASSETS = 'https://sbajixyhyyjpgkxrhltc.supabase.co/storage/v1/object/public/Image%20Assets/';
export const photo = (name: string) => ASSETS + encodeURIComponent(name);

/** Line icon + soft tint per category, so nothing relies on emoji. */
export const CAT_ICON: Record<string, { Icon: LucideIcon; tint: string; fg: string }> = {
  'Antiparasitic': { Icon: Bug, tint: '#E9F5EC', fg: '#1F7A43' },
  'Skin & Coat Care': { Icon: Sparkles, tint: '#FFF4D6', fg: '#9A6B00' },
  'Shampoos & Conditioners': { Icon: Droplets, tint: '#E6F2FB', fg: '#1D5F94' },
  'Supplements & Vitamins': { Icon: HeartPulse, tint: '#FCE9EE', fg: '#B0284F' },
  'Pet Food': { Icon: Utensils, tint: '#FFEFE3', fg: '#A8521B' },
  'Prescription Medicines': { Icon: Pill, tint: '#F1E8F6', fg: '#6B1A47' },
  'Ear Care': { Icon: Ear, tint: '#EAF3F1', fg: '#1E6B60' },
  'Eye Care': { Icon: Eye, tint: '#E9EEFB', fg: '#3449A3' },
  'Wound & Pain Relief': { Icon: Bandage, tint: '#FDECEC', fg: '#B42323' },
  'Cologne & Paw Care': { Icon: PawPrint, tint: '#F3EEE8', fg: '#6D5338' },
  'Dental Care': { Icon: Smile, tint: '#EAF6FB', fg: '#17708F' },
};
export const catIcon = (c: string) => CAT_ICON[c] ?? { Icon: PawPrint, tint: '#F5E9F0', fg: '#6B1A47' };

/** "What's bothering your pet?" tiles. `k` is the search (Mylo answers it on the results page). */
export const CONCERNS: { l: string; k: string; Icon: LucideIcon; tint: string; fg: string }[] = [
  { l: 'Ticks & fleas', k: 'tick and flea protection for my dog', Icon: Bug, tint: '#E9F5EC', fg: '#1F7A43' },
  { l: 'Itching', k: 'my dog keeps itching and scratching', Icon: Flame, tint: '#FDECEC', fg: '#B42323' },
  { l: 'Dandruff', k: 'anti dandruff shampoo for dogs', Icon: Snowflake, tint: '#E6F2FB', fg: '#1D5F94' },
  { l: 'Shedding', k: 'heavy shedding dull coat supplement', Icon: Wind, tint: '#FFF4D6', fg: '#9A6B00' },
  { l: 'Bad smell', k: 'my dog smells even after a bath', Icon: SprayCan, tint: '#F1E8F6', fg: '#6B1A47' },
  { l: 'Joints', k: 'joint supplement for older dog', Icon: Bone, tint: '#F3EEE8', fg: '#6D5338' },
  { l: 'Ear care', k: 'ear cleaner for dogs with smelly ears', Icon: Ear, tint: '#EAF3F1', fg: '#1E6B60' },
  { l: 'Tummy', k: 'probiotic for upset tummy', Icon: Utensils, tint: '#FFEFE3', fg: '#A8521B' },
];

/** Problem starters for the search sheet and categories page (icon versions of PROBLEMS). */
export const STARTERS: { l: string; prompt: string; Icon: LucideIcon }[] = [
  { l: 'Itching & scratching', prompt: 'My pet keeps itching and scratching. What can help?', Icon: Flame },
  { l: 'Ticks & fleas', prompt: 'I need tick and flea protection for my pet.', Icon: Bug },
  { l: 'Shedding, dull coat', prompt: 'My pet is shedding a lot and the coat looks dull.', Icon: Wind },
  { l: 'Smelly ears', prompt: "My pet's ears smell and he keeps shaking his head.", Icon: Ear },
  { l: 'Joint care', prompt: 'My dog is getting older. What helps with joints and mobility?', Icon: Bone },
  { l: 'New puppy kit', prompt: 'I just got a new puppy. What basics do I need?', Icon: Baby },
  { l: 'Bath-time picks', prompt: 'Suggest a good gentle shampoo for regular baths.', Icon: Bath },
  { l: 'Tummy trouble', prompt: 'My pet has an upset tummy now and then. Anything for gut health?', Icon: Utensils },
];

export const TRUST: { l: string; Icon: LucideIcon }[] = [
  { l: 'Genuine, licensed pharmacy', Icon: ShieldCheck },
  { l: 'Evening delivery, Bangalore', Icon: Truck },
  { l: 'Cancel before packing', Icon: RotateCcw },
];

/** Round tinted icon badge. */
export function IconBadge({ Icon, tint, fg, size = 44 }: { Icon: LucideIcon; tint: string; fg: string; size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-2xl" style={{ background: tint, color: fg, width: size, height: size }} aria-hidden>
      <Icon style={{ width: size * 0.48, height: size * 0.48 }} strokeWidth={1.9} />
    </span>
  );
}
