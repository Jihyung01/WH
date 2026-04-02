import { create } from 'zustand';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../config/supabase';
import { getMyCharacter } from '../lib/api';
import type { Session, User } from '@supabase/supabase-js';

WebBrowser.maybeCompleteAuthSession();

/** Avoid stacking Supabase auth listeners if initializeAuth runs more than once. */
let authStateListenerRegistered = false;

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Logged-in only: true until character/onboarding check finishes (or times out). */
  pendingOnboardingCheck: boolean;
  hasCompletedOnboarding: boolean;

  setUser: (user: User) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  /** Emergency: stop any auth/onboarding gate (stuck overlay / redirect). */
  forceAuthGateOpen: () => void;
  signInWithKakao: () => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  checkOnboardingStatus: () => Promise<boolean>;
}

function extractParamsFromUrl(url: string): Record<string, string> {
  const params: Record<string, string> = {};

  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    const fragment = url.substring(hashIndex + 1);
    for (const pair of fragment.split('&')) {
      const [key, value] = pair.split('=');
      if (key && value) params[key] = decodeURIComponent(value);
    }
  }

  const questionIndex = url.indexOf('?');
  if (questionIndex !== -1) {
    const endIndex = hashIndex !== -1 ? hashIndex : url.length;
    const query = url.substring(questionIndex + 1, endIndex);
    for (const pair of query.split('&')) {
      const [key, value] = pair.split('=');
      if (key && value) params[key] = decodeURIComponent(value);
    }
  }

  return params;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  pendingOnboardingCheck: false,
  hasCompletedOnboarding: false,

  setUser: (user) => set({ user, isAuthenticated: true }),
  setSession: (session) => set({ session, isAuthenticated: !!session }),
  setLoading: (loading) => set({ isLoading: loading }),
  setOnboardingComplete: (complete) => set({ hasCompletedOnboarding: complete }),
  forceAuthGateOpen: () =>
    set({ isLoading: false, pendingOnboardingCheck: false }),

  signInWithKakao: async () => {
    try {
      set({ isLoading: true });

      const redirectTo = 'wherehere://auth/callback';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('OAuth URL을 받지 못했습니다.');

      console.log('[AUTH] redirectTo:', redirectTo);
      console.log('[AUTH] Opening URL:', data.url);

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type !== 'success') {
        set({ isLoading: false });
        return;
      }

      const params = extractParamsFromUrl(result.url);

      if (params.access_token && params.refresh_token) {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });

        if (sessionError) throw sessionError;

        if (sessionData.session) {
          set({
            session: sessionData.session,
            user: sessionData.session.user,
            isAuthenticated: true,
          });
        }
      } else if (params.code) {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.exchangeCodeForSession(params.code);

        if (sessionError) throw sessionError;

        if (sessionData.session) {
          set({
            session: sessionData.session,
            user: sessionData.session.user,
            isAuthenticated: true,
          });
        }
      } else {
        throw new Error('인증 토큰을 받지 못했습니다.');
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
        pendingOnboardingCheck: false,
      });
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  initializeAuth: async () => {
    const SESSION_TIMEOUT_MS = 8_000;
    const ONBOARDING_TIMEOUT_MS = 8_000;

    try {
      // Do not set isLoading for cold start — it only blocked the welcome UI.
      set({ pendingOnboardingCheck: false });

      if (!authStateListenerRegistered) {
        authStateListenerRegistered = true;
        supabase.auth.onAuthStateChange((_event, session) => {
          set({
            session,
            user: session?.user ?? null,
            isAuthenticated: !!session,
          });
        });
      }

      let session: Session | null = null;
      try {
        const { data } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('getSession_timeout')), SESSION_TIMEOUT_MS),
          ),
        ]);
        session = data.session;
      } catch (e) {
        console.warn('[auth] getSession failed or timed out:', e);
      }

      if (session) {
        set({
          session,
          user: session.user,
          isAuthenticated: true,
          pendingOnboardingCheck: true,
          hasCompletedOnboarding: false,
        });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      set({ isLoading: false });
    }

    const s = get().session;
    if (!s) {
      set({ pendingOnboardingCheck: false });
      return;
    }

    void (async () => {
      try {
        const hasOnboarded = await Promise.race([
          get().checkOnboardingStatus(),
          new Promise<boolean>((resolve) =>
            setTimeout(() => resolve(false), ONBOARDING_TIMEOUT_MS),
          ),
        ]);
        set({ hasCompletedOnboarding: hasOnboarded });
      } catch {
        set({ hasCompletedOnboarding: false });
      } finally {
        set({ pendingOnboardingCheck: false });
      }
    })();
  },

  checkOnboardingStatus: async () => {
    try {
      const { session } = get();
      if (!session) return false;

      const character = await getMyCharacter();
      return !!character;
    } catch {
      return false;
    }
  },
}));
