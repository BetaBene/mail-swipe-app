import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../supabase';

interface AuthState {
  session: Session | null;
  initializing: boolean;
  mockMode: boolean;
  init: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  enterMockMode: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  initializing: true,
  mockMode: false,

  init: async () => {
    if (!isSupabaseConfigured) {
      set({ initializing: false });
      return;
    }
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, initializing: false });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
    });
  },

  signInWithPassword: async (email, password) => {
    if (!isSupabaseConfigured) return 'Supabase ist nicht konfiguriert.';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  },

  signUpWithPassword: async (email, password) => {
    if (!isSupabaseConfigured) return 'Supabase ist nicht konfiguriert.';
    const { error } = await supabase.auth.signUp({ email, password });
    return error?.message ?? null;
  },

  signOut: async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    set({ session: null, mockMode: false });
  },

  enterMockMode: () => set({ mockMode: true }),
}));

export function useIsAuthenticated() {
  const session = useAuthStore((s) => s.session);
  const mockMode = useAuthStore((s) => s.mockMode);
  return Boolean(session) || mockMode;
}
