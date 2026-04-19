import { create } from 'zustand';
import { Platform, AppState, type AppStateStatus } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase, SUPABASE_URL } from '../config/supabase';
import { identifyUser, logoutPurchases } from '../config/purchases';
import { usePremiumStore } from './premiumStore';
import { getMyCharacter } from '../lib/api';
import type { Session, User } from '@supabase/supabase-js';
import { useModerationStore } from './moderationStore';
import { clearUserLocalCaches } from '../utils/clearUserLocalCaches';
import { loginWithKakaoForSupabaseOidc } from '../services/kakaoCore';

WebBrowser.maybeCompleteAuthSession();

function assertSupabaseUrlConfigured(): void {
  if (
    !SUPABASE_URL.startsWith('https://') ||
    SUPABASE_URL.includes('your-project.supabase.co')
  ) {
    throw new Error(
      'Supabase 주소(EXPO_PUBLIC_SUPABASE_URL)가 앱에 포함되지 않았습니다. Expo 환경 변수·EAS Update 시 --environment production 등을 확인하세요. 잘못된 주소로 Safari가 열리면 “서버를 찾을 수 없음”이 날 수 있습니다.',
    );
  }
}

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

function parseQueryOrFragmentSegment(segment: string, into: Record<string, string>): void {
  for (const pair of segment.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;
    const key = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    if (!key) continue;
    try {
      into[key] = decodeURIComponent(value.replace(/\+/g, ' '));
    } catch {
      into[key] = value;
    }
  }
}

function extractParamsFromUrl(url: string): Record<string, string> {
  const params: Record<string, string> = {};

  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    const fragment = url.substring(hashIndex + 1);
    parseQueryOrFragmentSegment(fragment, params);
  }

  const questionIndex = url.indexOf('?');
  if (questionIndex !== -1) {
    const endIndex = hashIndex !== -1 ? hashIndex : url.length;
    const query = url.substring(questionIndex + 1, endIndex);
    parseQueryOrFragmentSegment(query, params);
  }

  return params;
}

function inferUsername(user: User): string {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const candidates = [
    meta['username'],
    meta['name'],
    meta['nickname'],
    user.email?.split('@')[0],
    `user_${user.id.slice(0, 8)}`,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim().slice(0, 30);
    }
  }
  return `user_${user.id.slice(0, 8)}`;
}

async function ensureProfileRow(user: User): Promise<void> {
  // Fallback safety in case auth.users -> profiles trigger is missing in a deployed DB.
  const username = inferUsername(user);
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, username }, { onConflict: 'id' });
  if (error) {
    console.warn('[auth] ensureProfileRow failed:', error);
  }
}

/**
 * Supabase PKCE / implicit 콜백 URL → 세션. Android Custom Tabs는 AppState dismiss가
 * Linking 이벤트보다 먼저 끝나는 경우가 있어, openAuthSessionAsync 결과와 별도로 호출한다.
 */
async function applySessionFromOAuthRedirectUrl(url: string): Promise<Session | null> {
  const trimmed = url.trim();
  const colon = trimmed.indexOf(':');
  if (colon <= 0) return null;
  if (trimmed.slice(0, colon).toLowerCase() !== 'wherehere') return null;

  /** `join?code=` 등 다른 딥링크의 code 쿼리와 구분 */
  const looksLikeOAuth =
    trimmed.includes('auth/callback') ||
    /\baccess_token=/.test(trimmed) ||
    (/\bcode=/.test(trimmed) && trimmed.toLowerCase().includes('callback'));
  if (!looksLikeOAuth) return null;

  const params = extractParamsFromUrl(trimmed);
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

  throw new Error(
    '로그인 응답에 인증 코드가 없습니다. Supabase Redirect URLs에 앱에서 사용하는 리다이렉트 주소가 그대로 등록되어 있는지 확인해주세요.',
  );
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
      assertSupabaseUrlConfigured();

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
            await ensureProfileRow(idData.session.user);
            set({
              session: idData.session,
              user: idData.session.user,
              isAuthenticated: true,
            });
            void useModerationStore.getState().refreshBlockedUsers();
            return;
          }
        } catch (nativeErr) {
          if (__DEV__ && Platform.OS === 'android') {
            try {
              const KakaoCore = require('@react-native-kakao/core').default;
              const keyHash = await KakaoCore.getKeyHashAndroid?.();
              console.warn('[AUTH] Android Kakao keyHash (dev only):', keyHash);
            } catch {
              /* optional key hash for Kakao console registration */
            }
          }
          if (__DEV__) {
            console.warn('[AUTH] Kakao native OIDC failed, falling back to web OAuth:', nativeErr);
          }
        }
      }

      /** Expo가 생성하는 스킴·경로와 일치시키고, Supabase Redirect URLs에 동일 문자열을 등록해야 함 */
      const redirectTo = Linking.createURL('/auth/callback');
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

      const oauth = { handled: false, flowError: null as Error | null };

      const commitOAuthSession = (session: Session): void => {
        void ensureProfileRow(session.user);
        oauth.flowError = null;
        oauth.handled = true;
        set({
          session,
          user: session.user,
          isAuthenticated: true,
        });
        void useModerationStore.getState().refreshBlockedUsers();
      };

      const tryConsumeOAuthUrl = async (url: string | undefined | null): Promise<void> => {
        const u = url?.trim();
        if (!u || oauth.handled) return;
        oauth.flowError = null;
        try {
          const session = await applySessionFromOAuthRedirectUrl(u);
          if (session) commitOAuthSession(session);
        } catch (e) {
          if (!oauth.handled) {
            oauth.flowError = e instanceof Error ? e : new Error(String(e));
          }
        }
      };

      const linkingSub = Linking.addEventListener('url', ({ url }) => {
        void tryConsumeOAuthUrl(url);
      });

      const pollExpoLinkingSnapshot = async (): Promise<void> => {
        const snap = Linking.getLinkingURL();
        if (snap) await tryConsumeOAuthUrl(snap);
      };

      const onAppState = (s: AppStateStatus): void => {
        if (s === 'active') void pollExpoLinkingSnapshot();
      };
      const appStateSub = AppState.addEventListener('change', onAppState);

      try {
        await pollExpoLinkingSnapshot();

        if (Platform.OS === 'android') {
          /**
           * Custom Tabs는 일부 기기에서 커스텀 스킴 복귀가 누락될 수 있어, 우선 시스템 기본 브라우저로 연다.
           * 실패 시에만 in-app 브라우저로 폴백.
           */
          try {
            await Linking.openURL(data.url);
          } catch {
            await WebBrowser.openBrowserAsync(data.url);
          }
          for (let i = 0; i < 250 && !oauth.handled; i++) {
            await new Promise((r) => setTimeout(r, 100));
            if (i % 2 === 0) await pollExpoLinkingSnapshot();
          }
        } else {
          const result = await WebBrowser.openAuthSessionAsync(data.url, authSessionReturnUrl);
          if (result.type === 'success' && result.url) {
            await tryConsumeOAuthUrl(result.url);
          }
          if (!oauth.handled && (result.type === 'dismiss' || result.type === 'cancel')) {
            for (let i = 0; i < 90 && !oauth.handled; i++) {
              await new Promise((r) => setTimeout(r, 100));
              if (i % 2 === 0) await pollExpoLinkingSnapshot();
            }
          }
        }

        if (oauth.flowError) throw oauth.flowError;
        if (!oauth.handled) {
          throw new Error(
            `카카오 로그인 후 앱으로 돌아오지 못했거나 인증 주소가 맞지 않습니다.\n\n` +
              `Supabase 대시보드 → Authentication → URL Configuration → Redirect URLs에 아래 주소를 그대로 추가하세요.\n` +
              `${redirectTo}\n\n` +
              `카카오 개발자 콘솔 → 앱 설정 → 플랫폼 Android 키 해시 등록, Redirect URI에 Supabase 카카오 콜백(…/auth/v1/callback)이 있는지도 확인하세요.`,
          );
        }
      } finally {
        appStateSub.remove();
        linkingSub.remove();
        try {
          await WebBrowser.dismissBrowser();
        } catch {
          /* browser may already be closed */
        }
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Kakao login error:', error);
      }
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
        await ensureProfileRow(data.session.user);
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
        await ensureProfileRow(data.session.user);
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
      await logoutPurchases().catch(() => {});
      usePremiumStore.setState({ offerings: [] });
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
          if (session?.user) {
            void ensureProfileRow(session.user);
            void identifyUser(session.user.id)
              .catch(() => {})
              .finally(() => {
                void usePremiumStore.getState().loadOfferings();
              });
          } else {
            void logoutPurchases().catch(() => {});
            usePremiumStore.setState({ offerings: [] });
          }
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
        await ensureProfileRow(session.user);
        set({
          session,
          user: session.user,
          isAuthenticated: true,
          pendingOnboardingCheck: true,
          hasCompletedOnboarding: false,
        });
        void useModerationStore.getState().refreshBlockedUsers();
        void identifyUser(session.user.id)
          .catch(() => {})
          .finally(() => {
            void usePremiumStore.getState().loadOfferings();
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
