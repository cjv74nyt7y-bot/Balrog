import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

/** RevenueCat entitlement identifier that unlocks Pro. Must match the RevenueCat dashboard. */
export const PRO_ENTITLEMENT = 'pro';

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

let configured = false;

/** True when a store key is set for this platform, so real purchases can be made. */
export const purchasesAvailable = Platform.OS !== 'web' && !!API_KEY;

export function configurePurchases(onChange: (isPro: boolean) => void): void {
  if (!purchasesAvailable || configured) return;
  Purchases.configure({ apiKey: API_KEY! });
  configured = true;
  Purchases.addCustomerInfoUpdateListener((info) => onChange(hasPro(info)));
}

export function hasPro(info: CustomerInfo): boolean {
  return info.entitlements.active[PRO_ENTITLEMENT] !== undefined;
}

export async function fetchIsPro(): Promise<boolean> {
  if (!configured) return false;
  return hasPro(await Purchases.getCustomerInfo());
}

export async function fetchPackages(): Promise<PurchasesPackage[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

/** Returns whether Pro is active afterwards; `null` if the user cancelled the store sheet. */
export async function purchase(pkg: PurchasesPackage): Promise<boolean | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return hasPro(customerInfo);
  } catch (error: any) {
    if (error?.userCancelled || error?.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return null;
    }
    throw error;
  }
}

export async function restore(): Promise<boolean> {
  if (!configured) return false;
  return hasPro(await Purchases.restorePurchases());
}
