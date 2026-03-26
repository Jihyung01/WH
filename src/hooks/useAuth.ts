import { useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const { 
    user, 
    session,
    isAuthenticated, 
    isLoading,
    hasCompletedOnboarding,
    signInWithKakao,
    signOut,
  } = useAuthStore();

  const loginWithKakao = useCallback(async () => {
    await signInWithKakao();
  }, [signInWithKakao]);

  const logout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  return { 
    user, 
    session,
    isAuthenticated, 
    isLoading,
    hasCompletedOnboarding,
    loginWithKakao, 
    logout,
  };
}
