import { create } from 'zustand';
import { supabase } from '../config/supabase';
import type { User } from '../types';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;

  // Actions
  setUser: (user: User) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  signInWithKakao: () => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  checkOnboardingStatus: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  hasCompletedOnboarding: false,

  setUser: (user) => set({ user, isAuthenticated: true }),
  setSession: (session) => set({ session, isAuthenticated: !!session }),
  setLoading: (loading) => set({ isLoading: loading }),
  setOnboardingComplete: (complete) => set({ hasCompletedOnboarding: complete }),

  signInWithKakao: async () => {
    try {
      set({ isLoading: true });
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: 'wherehere://auth/callback',
        },
      });

      if (error) throw error;

      if (data.session) {
        set({ session: data.session, isAuthenticated: true });
      }
    } catch (error) {
      console.error('Kakao login error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ 
        user: null, 
        session: null, 
        isAuthenticated: false,
        hasCompletedOnboarding: false,
      });
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  initializeAuth: async () => {
    try {
      set({ isLoading: true });

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        set({ session, isAuthenticated: true });
        
        const hasOnboarded = await get().checkOnboardingStatus();
        set({ hasCompletedOnboarding: hasOnboarded });
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, isAuthenticated: !!session });
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  checkOnboardingStatus: async () => {
    try {
      const { session } = get();
      if (!session) return false;

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/characters/me`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return !!data.data;
      }
      
      return false;
    } catch (error) {
      console.error('Check onboarding status error:', error);
      return false;
    }
  },
}));
