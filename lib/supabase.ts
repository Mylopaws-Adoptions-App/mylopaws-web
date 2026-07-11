'use client';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const supabase = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
export const fnUrl = (name: string) => `${SUPABASE_URL}/functions/v1/${name}`;

export async function invokeFn(name: string, body: object) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(fnUrl(name), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Request failed');
  return json;
}

export async function getConfig<T = any>(key: string): Promise<T | null> {
  const { data } = await supabase.from('app_config').select('value').eq('key', key).single();
  return (data?.value as T) ?? null;
}
