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

/**
 * Call before getOfferings / purchase / customerInfo. Safe to call many times.
 * Returns false if EXPO_PUBLIC_REVENUECAT_* is missing (EAS env not inlined in build).
 */
export async function ensurePurchasesReady(): Promise<boolean> {
  if (isConfigured && Purchases) return true;

  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
  if (!apiKey) {
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
      } catch (e) {
        console.warn('RevenueCat init failed:', e);
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

  const subType = P?.PRODUCT_CATEGORY?.SUBSCRIPTION ?? 'SUBSCRIPTION';
  const nonSubType = P?.PRODUCT_CATEGORY?.NON_SUBSCRIPTION ?? 'NON_SUBSCRIPTION';

  try {
    const subs = await P.getProducts([...REVENUECAT_SUBSCRIPTION_PRODUCT_IDS], subType);
    if (Array.isArray(subs) && subs.length) combined.push(...subs);
  } catch (e) {
    console.warn('[RevenueCat] getProducts(subscriptions) fallback:', e);
  }

  try {
    const coins = await P.getProducts([...REVENUECAT_COIN_PRODUCT_IDS], nonSubType);
    if (Array.isArray(coins) && coins.length) combined.push(...coins);
  } catch (e) {
    try {
      const coins2 = await P.getProducts([...REVENUECAT_COIN_PRODUCT_IDS]);
      if (Array.isArray(coins2) && coins2.length) combined.push(...coins2);
    } catch (e2) {
      console.warn('[RevenueCat] getProducts(coins) fallback:', e2);
    }
  }

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

  const fetchOnce = async () => {
    const offerings = await Purchases.getOfferings();
    let picked = pickPurchasesOffering(offerings);

    if (!picked?.availablePackages?.length) {
      const merged = mergeAllOfferingPackages(offerings);
      if (merged.length) {
        picked = {
          ...(picked ?? offerings.current ?? {}),
          availablePackages: merged,
        };
      }
    }

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
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
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
