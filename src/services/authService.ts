import { supabase } from '../config/supabase';
import api from './api';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../types';

export const authService = {
  /**
   * Login with Kakao OAuth via Supabase
   */
  async loginWithKakao() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: 'wherehere://auth/callback',
      },
    });
    if (error) throw error;
    return data;
  },

  /**
   * Get current session
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Get current user profile from API
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data } = await api.get<{ success: boolean; data: User }>('/auth/me');
      return data.data;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  },

  /**
   * Refresh token
   */
  async refreshToken() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Logout
   */
  async logout() {
    await supabase.auth.signOut();
    useAuthStore.getState().signOut();
  },

  /**
   * Delete account
   */
  async deleteAccount() {
    await api.delete('/auth/account');
    await supabase.auth.signOut();
    useAuthStore.getState().signOut();
  },

  /**
   * Check if user has completed onboarding (has a character)
   */
  async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const session = await this.getSession();
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
};
