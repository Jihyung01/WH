/**
 * App Store / Play Console product IDs — used when Offerings.packages are empty
 * but products exist in the store (RevenueCat getProducts fallback).
 * Keep in sync with verify-purchase Edge Function + RevenueCat dashboard.
 */
export const REVENUECAT_SUBSCRIPTION_PRODUCT_IDS = [
  'wh_premium_monthly',
  'wh_premium_annually',
  'wh_premium_annualy',
  'wh_premium_yearly',
  'wh_premium_annual',
] as const;

/**
 * App Store / Play에 실제로 등록된 **스토어 Product ID**만 넣습니다.
 * `wh_coins_500` 은 팀 전역에서 ID 충돌이 나면 ASC에 못 만들 수 있어,
 * 동일 500코인 팩은 **`wh_coins_500_pack`** 같은 새 SKU로 올리고 아래 매핑으로 연결합니다.
 * (ASC·RC에서 쓴 문자열과 반드시 동일하게 맞추세요.)
 */
export const APPLE_STORE_COIN_PRODUCT_ID_FOR_500 = 'wh_coins_500_pack' as const;

/** DB `coin_products.id`(카탈로그) → 스토어 Product ID */
const CATALOG_COIN_ID_TO_APPLE_STORE: Record<string, string> = {
  wh_coins_500: APPLE_STORE_COIN_PRODUCT_ID_FOR_500,
};

export const REVENUECAT_COIN_PRODUCT_IDS = [
  APPLE_STORE_COIN_PRODUCT_ID_FOR_500,
  'wh_coins_1200',
  'wh_coins_3500',
  'wh_coins_8000',
  'wh_coins_20000',
] as const;

const SUB_ID_SET = new Set<string>(REVENUECAT_SUBSCRIPTION_PRODUCT_IDS);
/** 스토어 ID + 카탈로그 ID(오퍼링 메타에 남는 경우) */
const COIN_ID_SET = new Set<string>([
  ...REVENUECAT_COIN_PRODUCT_IDS,
  ...Object.keys(CATALOG_COIN_ID_TO_APPLE_STORE),
]);

/** 코인 팩: 스토어에서 조회·매칭할 때 사용할 Product ID */
export function resolveAppleStoreCoinProductId(catalogProductId: string): string {
  return CATALOG_COIN_ID_TO_APPLE_STORE[catalogProductId] ?? catalogProductId;
}

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
    if (
      id === 'wh_premium_annually' ||
      id === 'wh_premium_annualy' ||
      id === 'wh_premium_yearly' ||
      id === 'wh_premium_annual'
    ) return 1;
    return 99;
  };
  return [...pkgs].sort(
    (a, b) => rank(getStoreProductIdFromPurchaseItem(a)) - rank(getStoreProductIdFromPurchaseItem(b)),
  );
}

export function findPurchaseItemByStoreId(offerings: unknown[], storeId: string): unknown | undefined {
  return offerings.find((o) => getStoreProductIdFromPurchaseItem(o) === storeId);
}
