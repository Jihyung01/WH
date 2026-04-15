import { Platform } from 'react-native';

import {
  REVENUECAT_COIN_PRODUCT_IDS,
  REVENUECAT_SUBSCRIPTION_PRODUCT_IDS,
} from './revenuecatProductIds';

// Public SDK keys are safe to ship in client apps.
// Keep env first, but fall back to known production keys so TestFlight builds
// don't break when EXPO_PUBLIC_* is not inlined as expected.
const REVENUECAT_API_KEY_IOS =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS ?? 'appl_oJuyMXIsMCOPhiGtSxjdDusvFcd';
const REVENUECAT_API_KEY_ANDROID =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID ?? 'goog_nnQAGvxyoeMPaLSIKrcAFTQzRhe';

let isConfigured = false;
let Purchases: any = null;
/** Single in-flight init so Shop/Premium don't race before configure() completes. */
let initPromise: Promise<void> | null = null;

type PurchasesDebugState = {
  platform: 'ios' | 'android';
  hasEnvKey: boolean;
  usingFallbackKey: boolean;
  configured: boolean;
  lastOfferingId: string | null;
  lastOfferingsCurrentCount: number;
  lastMergedPackagesCount: number;
  lastDirectProductsCount: number;
  lastError: string | null;
  updatedAt: string;
};

const purchasesDebugState: PurchasesDebugState = {
  platform: Platform.OS === 'ios' ? 'ios' : 'android',
  hasEnvKey: false,
  usingFallbackKey: false,
  configured: false,
  lastOfferingId: null,
  lastOfferingsCurrentCount: 0,
  lastMergedPackagesCount: 0,
  lastDirectProductsCount: 0,
  lastError: null,
  updatedAt: new Date().toISOString(),
};

function setPurchasesDebug(patch: Partial<PurchasesDebugState>) {
  Object.assign(purchasesDebugState, patch, { updatedAt: new Date().toISOString() });
}

export function getPurchasesDebugState(): PurchasesDebugState {
  return { ...purchasesDebugState };
}

/**
 * Call before getOfferings / purchase / customerInfo. Safe to call many times.
 * Returns false if EXPO_PUBLIC_REVENUECAT_* is missing (EAS env not inlined in build).
 */
export async function ensurePurchasesReady(): Promise<boolean> {
  if (isConfigured && Purchases) return true;

  const envKey = Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS ?? ''
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID ?? '';
  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
  setPurchasesDebug({
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    hasEnvKey: !!envKey,
    usingFallbackKey: !envKey && !!apiKey,
  });
  if (!apiKey) {
    setPurchasesDebug({
      configured: false,
      lastError: 'missing_api_key',
    });
    console.warn(
      'RevenueCat: EXPO_PUBLIC_REVENUECAT_IOS / EXPO_PUBLIC_REVENUECAT_ANDROID not set in this build.',
    );
    return false;
  }

  if (!initPromise) {
    initPromise = (async () => {
      try {
        const mod = await import('react-native-purchases');
        Purchases = mod.default;
        Purchases.setLogLevel(mod.LOG_LEVEL.DEBUG);
        await Purchases.configure({ apiKey });
        isConfigured = true;
        setPurchasesDebug({
          configured: true,
          lastError: null,
        });
      } catch (e) {
        console.warn('RevenueCat init failed:', e);
        setPurchasesDebug({
          configured: false,
          lastError: e instanceof Error ? e.message : 'init_failed',
        });
        initPromise = null;
      }
    })();
  }
  await initPromise;
  return isConfigured && !!Purchases;
}

export async function initPurchases() {
  await ensurePurchasesReady();
}

export async function identifyUser(userId: string) {
  const ok = await ensurePurchasesReady();
  if (!ok || !Purchases) return;
  try {
    await Purchases.logIn(userId);
    try {
      await Purchases.syncAttributesAndOfferingsIfNeeded();
    } catch {
      /* optional */
    }
  } catch (e) {
    console.warn('RevenueCat identify failed:', e);
  }
}

/** Call after Supabase sign-out so the next user does not inherit RC entitlements. */
export async function logoutPurchases(): Promise<void> {
  const ok = await ensurePurchasesReady();
  if (!ok || !Purchases) return;
  try {
    if (typeof Purchases.logOut === 'function') {
      await Purchases.logOut();
    }
  } catch (e) {
    console.warn('RevenueCat logOut failed:', e);
  }
}

/** Prefer Current, then named offerings, then any offering that has store-backed packages. */
const OFFERING_FALLBACK_IDS = ['main_subscription', 'default'] as const;

function pickPurchasesOffering(offerings: {
  current?: { availablePackages?: unknown[] } | null;
  all?: Record<string, { availablePackages?: unknown[] } | undefined> | null;
}) {
  const cur = offerings.current ?? null;
  if (cur?.availablePackages?.length) return cur;

  const all = offerings.all ?? {};
  for (const id of OFFERING_FALLBACK_IDS) {
    const o = all[id];
    if (o?.availablePackages?.length) return o;
  }
  for (const key of Object.keys(all)) {
    const o = all[key];
    if (o?.availablePackages?.length) return o;
  }

  return cur;
}

/** Merge packages from every offering (dedupe by package identifier) — helps split configs. */
function mergeAllOfferingPackages(offerings: {
  current?: { availablePackages?: unknown[] } | null;
  all?: Record<string, { availablePackages?: unknown[] } | undefined> | null;
}): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  const add = (pkgs: unknown[] | undefined) => {
    for (const p of pkgs ?? []) {
      const id =
        typeof (p as { identifier?: string })?.identifier === 'string'
          ? (p as { identifier: string }).identifier
          : String((p as { packageIdentifier?: string })?.packageIdentifier ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(p);
    }
  };
  add(offerings.current?.availablePackages);
  const all = offerings.all ?? {};
  for (const key of Object.keys(all)) {
    add(all[key]?.availablePackages);
  }
  return out;
}

/**
 * When Offerings.packages are empty (common while IAPs are "Waiting for Review" or RC cache lags),
 * ask the store directly by product id. Same IDs must exist in App Store Connect / Play Console + RC Products.
 */
async function fetchDirectStoreProducts(PurchasesMod: typeof Purchases): Promise<unknown[]> {
  const P = PurchasesMod as any;
  const combined: unknown[] = [];
  const seen = new Set<string>();

  const subType = P?.PURCHASE_TYPE?.SUBS ?? 'subs';
  const nonSubType = P?.PURCHASE_TYPE?.INAPP ?? 'inapp';
  const pushUnique = (items: unknown[]) => {
    for (const item of items) {
      if (item == null || typeof item !== 'object') continue;
      const id = (item as { identifier?: unknown }).identifier;
      const key = typeof id === 'string' && id.length > 0 ? id : JSON.stringify(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      combined.push(item);
    }
  };

  const fetchPerId = async (ids: readonly string[], type?: string) => {
    for (const id of ids) {
      try {
        const result = type
          ? await P.getProducts([id], type)
          : await P.getProducts([id]);
        if (Array.isArray(result) && result.length) {
          pushUnique(result);
        }
      } catch (e) {
        console.warn(`[RevenueCat] getProducts(single:${id}) fallback:`, e);
      }
    }
  };

  try {
    const subs = await P.getProducts([...REVENUECAT_SUBSCRIPTION_PRODUCT_IDS], subType);
    if (Array.isArray(subs) && subs.length) {
      pushUnique(subs);
    } else {
      await fetchPerId(REVENUECAT_SUBSCRIPTION_PRODUCT_IDS, subType);
    }
  } catch (e) {
    console.warn('[RevenueCat] getProducts(subscriptions) fallback:', e);
    await fetchPerId(REVENUECAT_SUBSCRIPTION_PRODUCT_IDS, subType);
  }

  try {
    const coins = await P.getProducts([...REVENUECAT_COIN_PRODUCT_IDS], nonSubType);
    if (Array.isArray(coins) && coins.length) {
      pushUnique(coins);
    } else {
      await fetchPerId(REVENUECAT_COIN_PRODUCT_IDS, nonSubType);
    }
  } catch (e) {
    try {
      const coins2 = await P.getProducts([...REVENUECAT_COIN_PRODUCT_IDS]);
      if (Array.isArray(coins2) && coins2.length) {
        pushUnique(coins2);
      } else {
        await fetchPerId(REVENUECAT_COIN_PRODUCT_IDS);
      }
    } catch (e2) {
      console.warn('[RevenueCat] getProducts(coins) fallback:', e2);
      await fetchPerId(REVENUECAT_COIN_PRODUCT_IDS, nonSubType);
      await fetchPerId(REVENUECAT_COIN_PRODUCT_IDS);
    }
  }

  setPurchasesDebug({
    lastDirectProductsCount: combined.length,
  });
  return combined;
}

export async function getOfferings() {
  const ok = await ensurePurchasesReady();
  if (!ok || !Purchases) return null;

  try {
    await Purchases.syncAttributesAndOfferingsIfNeeded();
  } catch {
    /* network / optional */
  }
  try {
    if (typeof Purchases.invalidateCustomerInfoCache === 'function') {
      Purchases.invalidateCustomerInfoCache();
    }
  } catch {
    /* optional */
  }

  const fetchOnce = async () => {
    const offerings = await Purchases.getOfferings();
    const currentCount = Array.isArray(offerings?.current?.availablePackages)
      ? offerings.current.availablePackages.length
      : 0;
    let picked = pickPurchasesOffering(offerings);

    if (!picked?.availablePackages?.length) {
      const merged = mergeAllOfferingPackages(offerings);
      if (merged.length) {
        picked = {
          ...(picked ?? offerings.current ?? {}),
          availablePackages: merged,
        };
        setPurchasesDebug({
          lastMergedPackagesCount: merged.length,
        });
      }
    }

    const pickedId = (picked as { identifier?: unknown } | null)?.identifier;
    setPurchasesDebug({
      lastOfferingId: typeof pickedId === 'string' ? pickedId : null,
      lastOfferingsCurrentCount: currentCount,
      lastError: null,
    });

    if (
      __DEV__ &&
      picked &&
      (!picked.availablePackages || picked.availablePackages.length === 0)
    ) {
      console.warn(
        '[RevenueCat] No packages in offerings yet; will try getProducts by id.',
      );
    }
    return picked ?? null;
  };

  try {
    let result = await fetchOnce();
    if (!result?.availablePackages?.length) {
      for (let i = 0; i < 3 && (!result?.availablePackages?.length); i++) {
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
        try {
          await Purchases.syncAttributesAndOfferingsIfNeeded();
        } catch { /* ignore */ }
        result = await fetchOnce();
      }
    }

    if (!result?.availablePackages?.length && Purchases) {
      const direct = await fetchDirectStoreProducts(Purchases);
      if (direct.length) {
        result = {
          availablePackages: direct,
          identifier: 'store_direct',
        } as NonNullable<typeof result>;
      }
    }

    if (
      __DEV__ &&
      result &&
      (!result.availablePackages || result.availablePackages.length === 0)
    ) {
      console.warn(
        '[RevenueCat] Still no products. Confirm IAPs in App Store Connect (in review OK for sandbox), Paid Apps Agreement, and product IDs in revenuecatProductIds.ts.',
      );
    }
    return result;
  } catch (e) {
    console.warn('Failed to get offerings:', e);
    setPurchasesDebug({
      lastError: e instanceof Error ? e.message : 'get_offerings_failed',
    });
    return null;
  }
}

export interface PurchaseResult {
  success: boolean;
  customerInfo?: unknown;
  error?: string;
}

export async function purchasePackage(pkg: unknown): Promise<PurchaseResult> {
  const ok = await ensurePurchasesReady();
  if (!ok || !Purchases) return { success: false, error: 'not_configured' };
  try {
    const result = await Purchases.purchasePackage(pkg);
    return { success: true, customerInfo: result.customerInfo };
  } catch (e: any) {
    if (e.userCancelled) {
      return { success: false, error: 'cancelled' };
    }
    return { success: false, error: e.message ?? 'unknown' };
  }
}

/** Package from getOfferings, or StoreProduct from getProducts fallback. */
export async function purchaseAny(pkg: unknown): Promise<PurchaseResult> {
  const ok = await ensurePurchasesReady();
  if (!ok || !Purchases) return { success: false, error: 'not_configured' };
  if (pkg == null || typeof pkg !== 'object') {
    return { success: false, error: 'invalid_package' };
  }

  const maybePackage = pkg as Record<string, unknown>;
  const isRcPackage = 'packageType' in maybePackage;

  try {
    if (isRcPackage) {
      const result = await Purchases.purchasePackage(pkg as any);
      return { success: true, customerInfo: result.customerInfo };
    }
    const result = await Purchases.purchaseStoreProduct(pkg as any);
    return { success: true, customerInfo: result.customerInfo };
  } catch (e: any) {
    if (e.userCancelled) {
      return { success: false, error: 'cancelled' };
    }
    return { success: false, error: e.message ?? 'unknown' };
  }
}

export async function restorePurchases(): Promise<unknown> {
  const ok = await ensurePurchasesReady();
  if (!ok || !Purchases) return null;
  try {
    return await Purchases.restorePurchases();
  } catch (e) {
    console.warn('Restore failed:', e);
    return null;
  }
}

export async function getCustomerInfo(): Promise<any> {
  const ok = await ensurePurchasesReady();
  if (!ok || !Purchases) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    return null;
  }
}

export async function checkPremiumStatus(): Promise<boolean> {
  const info = await getCustomerInfo();
  if (!info) return false;
  return info.entitlements?.active?.['premium'] !== undefined;
}
