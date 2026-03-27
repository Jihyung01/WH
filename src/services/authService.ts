import { supabase } from '../config/supabase';

export const authService = {
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async refreshToken() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  },

  async logout() {
    await supabase.auth.signOut();
  },

  async deleteAccount() {
    await supabase.auth.signOut();
  },
};
