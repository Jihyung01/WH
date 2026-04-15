import { Platform } from 'react-native';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './storage';
import {
  checkPremiumStatus,
  getOfferings,
  purchaseAny,
  restorePurchases,
  getCustomerInfo,
  type PurchaseResult,
} from '../config/purchases';
import {
  verifyAndGrantCoinPurchase,
  verifyAndActivatePremium,
  getCoinProducts,
  type CoinProduct,
} from '../lib/api';
import { getStoreProductIdFromPurchaseItem } from '../config/revenuecatProductIds';

interface PremiumState {
  isPremium: boolean;
  isLoading: boolean;
  offerings: unknown[];
  coinProducts: CoinProduct[];
  coinProductsLoaded: boolean;

  checkStatus: () => Promise<void>;
  loadOfferings: () => Promise<void>;
  loadCoinProducts: () => Promise<void>;

  purchase: (pkg: unknown) => Promise<{ success: boolean; error?: string }>;
  purchaseCoins: (
    pkg: unknown,
    productId: string,
  ) => Promise<{ success: boolean; coinsGranted?: number; totalCoins?: number; error?: string }>;
  restore: () => Promise<boolean>;
}

export const usePremiumStore = create<PremiumState>()(
  persist(
    (set, get) => ({
      isPremium: false,
      isLoading: false,
      offerings: [],
      coinProducts: [],
      coinProductsLoaded: false,

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
        const fetchPackages = async (): Promise<unknown[] | null> => {
          try {
            const offering = await getOfferings();
            if (offering && Array.isArray(offering.availablePackages)) {
              return offering.availablePackages;
            }
          } catch (e) {
            console.warn('[premium] getOfferings failed:', e);
          }
          return null;
        };
        try {
          let pkgs = await fetchPackages();
          if (!pkgs?.length) {
            await new Promise((r) => setTimeout(r, 1200));
            pkgs = await fetchPackages();
          }
          if (!pkgs?.length) {
            await new Promise((r) => setTimeout(r, 2000));
            pkgs = await fetchPackages();
          }
          if (pkgs?.length) {
            set({ offerings: pkgs });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      loadCoinProducts: async () => {
        if (get().coinProductsLoaded) return;
        try {
          const products = await getCoinProducts();
          set({ coinProducts: products, coinProductsLoaded: true });
        } catch {
          // ignore
        }
      },

      purchase: async (pkg: unknown) => {
        set({ isLoading: true });
        try {
          const result: PurchaseResult = await purchaseAny(pkg);
          if (result.success) {
            const info = result.customerInfo as Record<string, unknown> | undefined;
            const txnId =
              (info as Record<string, unknown>)?.originalTransactionId as string | undefined;
            const productId =
              getStoreProductIdFromPurchaseItem(pkg) ?? 'wh_premium_monthly';

            try {
              await verifyAndActivatePremium(
                productId,
                txnId,
                Platform.OS,
              );
            } catch {
              // Edge Function 실패해도 RevenueCat 구매는 유효
            }

            set({ isPremium: true });
          }
          return { success: result.success, error: result.error };
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'unknown';
          return { success: false, error: msg };
        } finally {
          set({ isLoading: false });
        }
      },

      purchaseCoins: async (pkg: unknown, productId: string) => {
        set({ isLoading: true });
        try {
          const result: PurchaseResult = await purchaseAny(pkg);
          if (!result.success) {
            return { success: false, error: result.error };
          }

          const info = result.customerInfo as Record<string, unknown> | undefined;
          const txnId = (info as Record<string, unknown>)?.originalTransactionId as string | undefined;

          const verified = await verifyAndGrantCoinPurchase(
            productId,
            txnId,
            Platform.OS,
          );

          if (verified.success) {
            return {
              success: true,
              coinsGranted: verified.coins_granted,
              totalCoins: verified.total_coins,
            };
          }
          return { success: false, error: verified.error };
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'unknown';
          return { success: false, error: msg };
        } finally {
          set({ isLoading: false });
        }
      },

      restore: async () => {
        set({ isLoading: true });
        try {
          const info = await restorePurchases();
          if (!info) {
            set({ isLoading: false });
            return false;
          }
          const customerInfo = info as Record<string, Record<string, Record<string, unknown>>>;
          const isPremium = customerInfo?.entitlements?.active?.['premium'] !== undefined;
          set({ isPremium });

          if (isPremium) {
            try {
              const activeProductId =
                customerInfo?.entitlements?.active?.premium?.productIdentifier;
              await verifyAndActivatePremium(
                typeof activeProductId === 'string' && activeProductId.length > 0
                  ? activeProductId
                  : 'wh_premium_monthly',
                undefined,
                Platform.OS,
              );
            } catch {
              // Edge Function 실패해도 RevenueCat 복원은 유효
            }
          }

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
