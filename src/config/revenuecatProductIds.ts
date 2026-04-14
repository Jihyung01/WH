/**
 * App Store / Play Console product IDs — used when Offerings.packages are empty
 * but products exist in the store (RevenueCat getProducts fallback).
 * Keep in sync with verify-purchase Edge Function + RevenueCat dashboard.
 */
export const REVENUECAT_SUBSCRIPTION_PRODUCT_IDS = [
  'wh_premium_monthly',
  'wh_premium_yearly',
  'wh_premium_annual',
] as const;

export const REVENUECAT_COIN_PRODUCT_IDS = [
  'wh_coins_500',
  'wh_coins_1200',
  'wh_coins_3500',
  'wh_coins_8000',
  'wh_coins_20000',
] as const;

const SUB_ID_SET = new Set<string>(REVENUECAT_SUBSCRIPTION_PRODUCT_IDS);
const COIN_ID_SET = new Set<string>(REVENUECAT_COIN_PRODUCT_IDS);

/** Store product id: RC Package has `product.identifier`; StoreProduct from getProducts has root `identifier`. */
export function getStoreProductIdFromPurchaseItem(pkg: unknown): string | null {
  if (pkg == null || typeof pkg !== 'object') return null;
  const p = pkg as Record<string, unknown>;
  const nested = p.product;
  if (nested && typeof nested === 'object') {
    const pid = (nested as Record<string, unknown>).identifier;
    if (typeof pid === 'string' && pid.length > 0) return pid;
  }
  if (typeof p.identifier === 'string' && p.identifier.length > 0) {
    return p.identifier;
  }
  return null;
}

export function isSubscriptionPurchaseItem(pkg: unknown): boolean {
  const id = getStoreProductIdFromPurchaseItem(pkg);
  return id != null && SUB_ID_SET.has(id);
}

export function isCoinPurchaseItem(pkg: unknown): boolean {
  const id = getStoreProductIdFromPurchaseItem(pkg);
  return id != null && COIN_ID_SET.has(id);
}

/** Monthly first, then yearly/annual (for premium UI index: [0]=monthly, [1]=annual). */
export function sortSubscriptionPackages(pkgs: unknown[]): unknown[] {
  const rank = (id: string | null): number => {
    if (id === 'wh_premium_monthly') return 0;
    if (id === 'wh_premium_yearly' || id === 'wh_premium_annual') return 1;
    return 99;
  };
  return [...pkgs].sort(
    (a, b) => rank(getStoreProductIdFromPurchaseItem(a)) - rank(getStoreProductIdFromPurchaseItem(b)),
  );
}

export function findPurchaseItemByStoreId(offerings: unknown[], storeId: string): unknown | undefined {
  return offerings.find((o) => getStoreProductIdFromPurchaseItem(o) === storeId);
}
