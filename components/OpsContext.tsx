'use client';
import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Staff } from '@/lib/types';

export const OpsCtx = createContext<{ session: Session | null; me: Staff | null }>({ session: null, me: null });
export const useStaff = () => useContext(OpsCtx);
