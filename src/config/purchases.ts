import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PurchasesPackage, CustomerInfo } from 'react-native-purchases';

const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS ?? '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID ?? '';

let isConfigured = false;

export async function initPurchases() {
  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

  if (!apiKey) {
    console.warn('RevenueCat API key not configured, skipping initialization');
    return;
  }

  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    await Purchases.configure({ apiKey });
    isConfigured = true;
  } catch (e) {
    console.warn('RevenueCat init failed:', e);
  }
}

export async function identifyUser(userId: string) {
  if (!isConfigured) return;
  try {
    await Purchases.logIn(userId);
  } catch (e) {
    console.warn('RevenueCat identify failed:', e);
  }
}

export async function getOfferings() {
  if (!isConfigured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (e) {
    console.warn('Failed to get offerings:', e);
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  if (!isConfigured) return { success: false, error: 'not_configured' };
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

export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!isConfigured) return null;
  try {
    const info = await Purchases.restorePurchases();
    return info;
  } catch (e) {
    console.warn('Restore failed:', e);
    return null;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isConfigured) return null;
  try {
    const info = await Purchases.getCustomerInfo();
    return info;
  } catch (e) {
    return null;
  }
}

export async function checkPremiumStatus(): Promise<boolean> {
  const info = await getCustomerInfo();
  if (!info) return false;
  return info.entitlements.active['premium'] !== undefined;
}

export { Purchases };
