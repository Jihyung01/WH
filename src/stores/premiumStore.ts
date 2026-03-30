import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './storage';
import { checkPremiumStatus, getOfferings, purchasePackage, restorePurchases } from '../config/purchases';

interface PremiumState {
  isPremium: boolean;
  isLoading: boolean;
  offerings: unknown[];

  checkStatus: () => Promise<void>;
  loadOfferings: () => Promise<void>;
  purchase: (pkg: unknown) => Promise<{ success: boolean; error?: string }>;
  restore: () => Promise<boolean>;
}

export const usePremiumStore = create<PremiumState>()(
  persist(
    (set) => ({
      isPremium: false,
      isLoading: false,
      offerings: [],

      checkStatus: async () => {
        try {
          const isPremium = await checkPremiumStatus();
          set({ isPremium });
        } catch {
          // keep cached value
        }
      },

      loadOfferings: async () => {
        set({ isLoading: true });
        try {
          const offering = await getOfferings();
          if (offering?.availablePackages) {
            set({ offerings: offering.availablePackages });
          }
        } catch {
          // ignore
        } finally {
          set({ isLoading: false });
        }
      },

      purchase: async (pkg: unknown) => {
        set({ isLoading: true });
        try {
          const result = await purchasePackage(pkg);
          if (result.success) {
            set({ isPremium: true });
          }
          return { success: result.success, error: result.error };
        } catch (e: any) {
          return { success: false, error: e.message };
        } finally {
          set({ isLoading: false });
        }
      },

      restore: async () => {
        set({ isLoading: true });
        try {
          const info: any = await restorePurchases();
          const isPremium = info?.entitlements?.active?.['premium'] !== undefined;
          set({ isPremium });
          return isPremium;
        } catch {
          return false;
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'wherehere-premium',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ isPremium: state.isPremium }),
    },
  ),
);
