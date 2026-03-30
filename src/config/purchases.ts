import { Platform } from 'react-native';

const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS ?? '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID ?? '';

let isConfigured = false;
let Purchases: any = null;

export async function initPurchases() {
  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

  if (!apiKey) {
    console.warn('RevenueCat API key not configured, skipping initialization');
    return;
  }

  try {
    const mod = await import('react-native-purchases');
    Purchases = mod.default;
    Purchases.setLogLevel(mod.LOG_LEVEL.DEBUG);
    await Purchases.configure({ apiKey });
    isConfigured = true;
  } catch (e) {
    console.warn('RevenueCat init failed:', e);
  }
}

export async function identifyUser(userId: string) {
  if (!isConfigured || !Purchases) return;
  try {
    await Purchases.logIn(userId);
  } catch (e) {
    console.warn('RevenueCat identify failed:', e);
  }
}

export async function getOfferings() {
  if (!isConfigured || !Purchases) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
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
  if (!isConfigured || !Purchases) return { success: false, error: 'not_configured' };
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

export async function restorePurchases(): Promise<unknown> {
  if (!isConfigured || !Purchases) return null;
  try {
    return await Purchases.restorePurchases();
  } catch (e) {
    console.warn('Restore failed:', e);
    return null;
  }
}

export async function getCustomerInfo(): Promise<any> {
  if (!isConfigured || !Purchases) return null;
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
