import { create } from 'zustand';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../config/supabase';
import { getMyCharacter } from '../lib/api';
import type { Session, User } from '@supabase/supabase-js';
import { useModerationStore } from './moderationStore';
import { clearUserLocalCaches } from '../utils/clearUserLocalCaches';
import { loginWithKakaoForSupabaseOidc } from '../services/kakaoCore';

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
  signInWithApple: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
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

/**
 * Supabase PKCE / implicit 콜백 URL → 세션. Android Custom Tabs는 AppState dismiss가
 * Linking 이벤트보다 먼저 끝나는 경우가 있어, openAuthSessionAsync 결과와 별도로 호출한다.
 */
async function applySessionFromOAuthRedirectUrl(url: string): Promise<Session | null> {
  if (!url.startsWith('wherehere:')) return null;

  const looksLikeOAuth =
    url.includes('auth/callback') || /[?&#].*(?:code|access_token)=/.test(url);
  if (!looksLikeOAuth) return null;

  const params = extractParamsFromUrl(url);
  if (params.error) {
    const raw = params.error_description ?? '';
    let desc = raw;
    try {
      desc = decodeURIComponent(raw.replace(/\+/g, ' '));
    } catch {
      desc = raw;
    }
    throw new Error(desc || params.error);
  }

  if (params.access_token && params.refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) throw error;
    return data.session ?? null;
  }

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return data.session ?? null;
  }

  return null;
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

      /**
       * Android: 카카오 네이티브 SDK + OIDC id_token → Supabase 세션.
       * 카카오 콘솔에 OpenID Connect 미설정 시 실패하므로, EAS에서
       * EXPO_PUBLIC_USE_KAKAO_NATIVE_AUTH=false 로 끄고 웹 OAuth만 쓸 수 있다.
       */
      const nativeKakaoAuthEnabled =
        Platform.OS === 'android' &&
        (process.env.EXPO_PUBLIC_USE_KAKAO_NATIVE_AUTH ?? 'true').toLowerCase() !== 'false';

      if (nativeKakaoAuthEnabled) {
        try {
          const { idToken, accessToken } = await loginWithKakaoForSupabaseOidc();
          const { data: idData, error: idError } = await supabase.auth.signInWithIdToken({
            provider: 'kakao',
            token: idToken,
            ...(accessToken ? { access_token: accessToken } : {}),
          });
          if (idError) throw idError;
          if (idData.session) {
            set({
              session: idData.session,
              user: idData.session.user,
              isAuthenticated: true,
            });
            void useModerationStore.getState().refreshBlockedUsers();
            return;
          }
        } catch (nativeErr) {
          if (Platform.OS === 'android') {
            try {
              const KakaoCore = require('@react-native-kakao/core').default;
              const keyHash = await KakaoCore.getKeyHashAndroid?.();
              console.log('[AUTH] Android Kakao keyHash:', keyHash);
            } catch {}
          }
          console.warn('[AUTH] Kakao native OIDC failed, falling back to web OAuth:', nativeErr);
        }
      }

      /** Must match Supabase Auth → URL Configuration redirect allowlist. */
      const redirectTo = 'wherehere://auth/callback';
      /**
       * Android `openAuthSessionAsync` polyfill only treats redirects as success when
       * `event.url.startsWith(redirectUrl)`. Some stacks emit `wherehere:///auth/callback`
       * or query-only variants; a `wherehere://` prefix avoids a silent dismiss loop.
       * iOS ASWebAuthenticationSession should keep the exact redirect URL.
       */
      const authSessionReturnUrl =
        Platform.OS === 'android' ? 'wherehere://' : redirectTo;

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
      console.log('[AUTH] authSessionReturnUrl:', authSessionReturnUrl);
      console.log('[AUTH] Opening URL:', data.url);

      let oauthHandled = false;
      const commitOAuthSession = (session: Session) => {
        oauthHandled = true;
        set({
          session,
          user: session.user,
          isAuthenticated: true,
        });
        void useModerationStore.getState().refreshBlockedUsers();
      };

      const tryConsumeOAuthUrl = async (url: string | undefined | null) => {
        if (!url || oauthHandled) return;
        try {
          const session = await applySessionFromOAuthRedirectUrl(url);
          if (session) commitOAuthSession(session);
        } catch (e) {
          console.warn('[AUTH] OAuth URL consume error:', e);
          throw e;
        }
      };

      const linkingSub = Linking.addEventListener('url', ({ url }) => {
        void (async () => {
          try {
            await tryConsumeOAuthUrl(url);
            if (oauthHandled) console.log('[AUTH] Kakao session established via Linking');
          } catch {
            /* logged in tryConsumeOAuthUrl */
          }
        })();
      });

      try {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          authSessionReturnUrl,
        );

        console.log('[AUTH] openAuthSessionAsync result:', result.type);

        if (result.type === 'success' && result.url) {
          await tryConsumeOAuthUrl(result.url);
        }

        if (!oauthHandled && (result.type === 'dismiss' || result.type === 'cancel')) {
          for (let i = 0; i < 30 && !oauthHandled; i++) {
            await new Promise((r) => setTimeout(r, 100));
          }
        }

        if (!oauthHandled) {
          console.warn(
            '[AUTH] Kakao OAuth closed without session. type=',
            result.type,
            'If PKCE, check Supabase redirect allowlist and Kakao redirect URI.',
          );
          throw new Error(
            '카카오 로그인 콜백을 받지 못했습니다. Android 딥링크/Redirect 설정 또는 카카오 키해시를 확인해주세요.',
          );
        }
      } finally {
        await new Promise((r) => setTimeout(r, 400));
        linkingSub.remove();
      }
    } catch (error) {
      console.error('Kakao login error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithApple: async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple 로그인은 iOS에서만 사용할 수 있습니다.');
    }
    try {
      set({ isLoading: true });
      const AppleAuthentication = await import('expo-apple-authentication');
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) throw new Error('이 기기에서 Apple 로그인을 사용할 수 없습니다.');

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('Apple 인증 토큰을 받지 못했습니다.');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) throw error;

      if (data.session) {
        set({
          session: data.session,
          user: data.session.user,
          isAuthenticated: true,
        });
        void useModerationStore.getState().refreshBlockedUsers();
      }
    } catch (error) {
      console.error('Apple login error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithEmailPassword: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (data.session) {
        set({
          session: data.session,
          user: data.session.user,
          isAuthenticated: true,
        });
        void useModerationStore.getState().refreshBlockedUsers();
      }
    } catch (error) {
      console.error('Email login error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      try {
        if (Platform.OS === 'android') {
          const KakaoUser = require('@react-native-kakao/user').default;
          if (await KakaoUser.isLogined()) await KakaoUser.logout();
        }
      } catch {
        /* native Kakao SDK may be unavailable in some builds */
      }
      useModerationStore.getState().clearBlocks();
      await supabase.auth.signOut();
      await clearUserLocalCaches();
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
        void useModerationStore.getState().refreshBlockedUsers();
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
