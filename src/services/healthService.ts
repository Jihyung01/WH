import {
  Platform,
  NativeModules,
  InteractionManager,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type HealthAuthResult = {
  granted: boolean;
  nativeMissing?: boolean;
  unavailable?: boolean;
  /** Android: Google Fit / Google Sign-In flow did not complete successfully */
  androidAuthFailed?: boolean;
};

export const GOOGLE_FIT_PACKAGE_ID = 'com.google.android.apps.fitness';

const GOOGLE_FIT_PLAY_STORE_WEB = `https://play.google.com/store/apps/details?id=${GOOGLE_FIT_PACKAGE_ID}`;
const GOOGLE_FIT_PLAY_STORE_MARKET = `market://details?id=${GOOGLE_FIT_PACKAGE_ID}`;

const STORAGE_HIDE_STEPS_SECTION = 'wherehere.health.hideStepsSection';

/** Persisted: user chose to hide the pedometer card (profile). */
export async function getStepsSectionHidden(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_HIDE_STEPS_SECTION);
    return v === '1';
  } catch {
    return false;
  }
}

export async function setStepsSectionHidden(hidden: boolean): Promise<void> {
  try {
    if (hidden) await AsyncStorage.setItem(STORAGE_HIDE_STEPS_SECTION, '1');
    else await AsyncStorage.removeItem(STORAGE_HIDE_STEPS_SECTION);
  } catch {
    /* ignore */
  }
}

/** Open Google Fit on Play Store (market:// when available). */
export async function openGoogleFitPlayStore(): Promise<void> {
  try {
    const can = await Linking.canOpenURL(GOOGLE_FIT_PLAY_STORE_MARKET);
    await Linking.openURL(can ? GOOGLE_FIT_PLAY_STORE_MARKET : GOOGLE_FIT_PLAY_STORE_WEB);
  } catch {
    await Linking.openURL(GOOGLE_FIT_PLAY_STORE_WEB);
  }
}

/**
 * Best-effort hint: whether an Intent targeting the Google Fit package may resolve.
 * On Android 11+ this can return false even when the app is installed unless the app
 * manifest declares package visibility (queries for the package). Treat false as "unknown", not definitive.
 */
export async function isGoogleFitAppLikelyInstalled(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const intentUrl = `intent://#Intent;package=${GOOGLE_FIT_PACKAGE_ID};end`;
    return await Linking.canOpenURL(intentUrl);
  } catch {
    return true;
  }
}

export interface HealthMilestone {
  steps: 1000 | 3000 | 5000 | 10000;
  xp: number;
  coins: number;
  badge?: string;
}

const MILESTONES: HealthMilestone[] = [
  { steps: 1000, xp: 5, coins: 0 },
  { steps: 3000, xp: 15, coins: 0 },
  { steps: 5000, xp: 30, coins: 10 },
  { steps: 10000, xp: 50, coins: 30, badge: '만보기' },
];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function afterInteractions(): Promise<void> {
  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
}

/**
 * Get the native AppleHealthKit module directly from NativeModules.
 * react-native-health's index.js does exactly this:
 *   const { AppleHealthKit } = require('react-native').NativeModules
 * By going straight to NativeModules we bypass any CJS/ESM interop issues
 * that dynamic import() might cause.
 */
function getAppleHealthKit(): any | null {
  if (Platform.OS !== 'ios') return null;
  const native = NativeModules.AppleHealthKit;
  if (!native || typeof native.initHealthKit !== 'function') return null;
  return native;
}

let _healthDiagLog: string[] = [];

export function getHealthDiagLog(): string {
  if (!__DEV__) return '';
  return _healthDiagLog.join('\n');
}

function hlog(msg: string): void {
  if (!__DEV__) return;
  const ts = new Date().toLocaleTimeString('ko-KR', { hour12: false });
  const line = `[${ts}] ${msg}`;
  _healthDiagLog.push(line);
  if (_healthDiagLog.length > 30) _healthDiagLog.shift();
}

function resetHealthDiagLog(): void {
  _healthDiagLog = [];
}

type GoogleFitAuthorizeResult = { success?: boolean; message?: string };

async function loadGoogleFitModule(): Promise<{
  GoogleFit: {
    authorize: (opts: { scopes: string[] }) => Promise<GoogleFitAuthorizeResult>;
    getDailyStepCountSamples: (opts: {
      startDate: string;
      endDate: string;
    }) => Promise<unknown>;
  };
  activityReadScope: string;
}> {
  const mod = (await import('react-native-google-fit')) as {
    default: {
      authorize: (opts: { scopes: string[] }) => Promise<GoogleFitAuthorizeResult>;
      getDailyStepCountSamples: (opts: {
        startDate: string;
        endDate: string;
      }) => Promise<unknown>;
    };
    Scopes: { FITNESS_ACTIVITY_READ: string };
  };
  const activityReadScope =
    mod.Scopes?.FITNESS_ACTIVITY_READ ??
    'https://www.googleapis.com/auth/fitness.activity.read';
  return { GoogleFit: mod.default, activityReadScope };
}

async function ensureAndroidActivityPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    if (Platform.Version < 29) return true;
    const perm = PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION;
    const already = await PermissionsAndroid.check(perm);
    if (already) {
      hlog('Android ACTIVITY_RECOGNITION already granted');
      return true;
    }
    const granted = await PermissionsAndroid.request(perm);
    const ok = granted === PermissionsAndroid.RESULTS.GRANTED;
    hlog(`Android ACTIVITY_RECOGNITION request: ${granted}`);
    return ok;
  } catch (e) {
    hlog(`Android ACTIVITY_RECOGNITION error: ${String(e)}`);
    return false;
  }
}

export async function requestHealthPermission(): Promise<HealthAuthResult> {
  resetHealthDiagLog();
  try {
    if (Platform.OS === 'ios') {
      await afterInteractions();
      await new Promise((r) => setTimeout(r, 300));

      const HK = getAppleHealthKit();
      if (!HK) {
        hlog('ERROR: AppleHealthKit native module MISSING');
        return { granted: false, nativeMissing: true };
      }
      hlog(`NativeModule OK, keys: ${Object.keys(HK).length}`);

      const kitAvailable = await new Promise<boolean>((resolve) => {
        if (typeof HK.isAvailable !== 'function') {
          resolve(true);
          return;
        }
        HK.isAvailable((err: unknown, ok: boolean) => {
          if (err) hlog(`isAvailable err: ${err}`);
          resolve(!!ok);
        });
      });
      if (!kitAvailable) {
        hlog('ERROR: HealthKit not available on device');
        return { granted: false, unavailable: true };
      }
      hlog('HealthKit available=true');

      await new Promise<void>((resolve) => {
        HK.initHealthKit(
          {
            permissions: {
              read: ['StepCount'],
              write: [],
            },
          },
          (err: unknown) => {
            if (err) hlog(`initHealthKit cb err (often benign): ${err}`);
            else hlog('initHealthKit success');
            resolve();
          },
        );
      });

      await new Promise((r) => setTimeout(r, 500));
      return { granted: true };
    }

    if (Platform.OS === 'android') {
      try {
        const permissionOk = await ensureAndroidActivityPermission();
        if (!permissionOk) return { granted: false };
        const { GoogleFit, activityReadScope } = await loadGoogleFitModule();
        const options = {
          scopes: [activityReadScope],
        };
        const authRes = await GoogleFit.authorize(options);
        hlog(`GoogleFit authorize: ${JSON.stringify(authRes)}`);
        if (authRes?.success) {
          return { granted: true };
        }
        return { granted: false, androidAuthFailed: true };
      } catch (e) {
        hlog(`GoogleFit authorize exception: ${String(e)}`);
        return { granted: false, androidAuthFailed: true };
      }
    }
    return { granted: false };
  } catch (e) {
    hlog(`requestHealthPermission exception: ${e}`);
    return { granted: false };
  }
}

export async function getTodaySteps(): Promise<number> {
  try {
    if (Platform.OS === 'ios') {
      const HK = getAppleHealthKit();
      if (!HK) {
        hlog('getTodaySteps: native module missing');
        return 0;
      }

      const today = startOfToday();
      const now = new Date();

      hlog(`Query range: ${today.toISOString()} → ${now.toISOString()}`);

      // Method 1: getStepCount (sum for a single day)
      if (typeof HK.getStepCount === 'function') {
        const total = await new Promise<number>((resolve) => {
          HK.getStepCount(
            { date: now.toISOString(), includeManuallyAdded: true },
            (err: unknown, res: any) => {
              if (err) {
                hlog(`getStepCount err: ${JSON.stringify(err)}`);
                resolve(0);
                return;
              }
              const v = Math.floor(Number(res?.value) || 0);
              hlog(`getStepCount result: ${v} (raw: ${JSON.stringify(res)})`);
              resolve(Math.max(0, v));
            },
          );
        });
        if (total > 0) return total;
      } else {
        hlog('getStepCount function not found on native module');
      }

      // Method 2: getDailyStepCountSamples (hourly buckets)
      if (typeof HK.getDailyStepCountSamples === 'function') {
        const samples = await new Promise<number>((resolve) => {
          HK.getDailyStepCountSamples(
            {
              startDate: today.toISOString(),
              endDate: now.toISOString(),
              includeManuallyAdded: true,
            },
            (err: unknown, rows: any[] | undefined) => {
              if (err) {
                hlog(`getDailyStepCountSamples err: ${JSON.stringify(err)}`);
                resolve(0);
                return;
              }
              const arr = Array.isArray(rows) ? rows : [];
              const sum = arr.reduce(
                (acc, row) => acc + Math.max(0, Number(row?.value) || 0),
                0,
              );
              hlog(`getDailyStepCountSamples: ${arr.length} rows, sum=${Math.floor(sum)}`);
              resolve(Math.floor(sum));
            },
          );
        });
        if (samples > 0) return samples;
      } else {
        hlog('getDailyStepCountSamples function not found');
      }

      // Method 3: getSamples with Walking type
      if (typeof HK.getSamples === 'function') {
        const walkingSamples = await new Promise<number>((resolve) => {
          HK.getSamples(
            {
              startDate: today.toISOString(),
              endDate: now.toISOString(),
              type: 'Walking',
            },
            (err: unknown, rows: any[] | undefined) => {
              if (err) {
                hlog(`getSamples Walking err: ${JSON.stringify(err)}`);
                resolve(0);
                return;
              }
              const arr = Array.isArray(rows) ? rows : [];
              hlog(`getSamples Walking: ${arr.length} rows`);
              resolve(arr.length);
            },
          );
        });
        if (walkingSamples > 0) {
          hlog(`Walking samples found (${walkingSamples}) but step count is 0 — permission may be read-denied`);
        }
      }

      hlog('All step queries returned 0');
      return 0;
    }

    if (Platform.OS === 'android') {
      try {
        const permissionOk = await ensureAndroidActivityPermission();
        if (!permissionOk) {
          hlog('Android step query blocked: ACTIVITY_RECOGNITION denied');
          return 0;
        }
        const { GoogleFit, activityReadScope } = await loadGoogleFitModule();
        try {
          const authRes = await GoogleFit.authorize({
            scopes: [activityReadScope],
          });
          hlog(`GoogleFit authorize (query): ${JSON.stringify(authRes)}`);
        } catch (e) {
          hlog(`GoogleFit authorize (query) err: ${String(e)}`);
        }
        const samples = await GoogleFit.getDailyStepCountSamples({
          startDate: startOfToday().toISOString(),
          endDate: new Date().toISOString(),
        });
        const sampleCount = Array.isArray(samples) ? samples.length : 0;
        const merged = Array.isArray(samples)
          ? samples.flatMap((s: any) => (Array.isArray(s?.steps) ? s.steps : []))
          : [];
        const sum = merged.reduce(
          (sum: number, row: any) => sum + (Number(row?.value) || 0),
          0,
        );
        hlog(`GoogleFit daily samples: providers=${sampleCount}, rows=${merged.length}, total=${sum}`);
        return sum;
      } catch (e) {
        hlog(`GoogleFit getDailyStepCountSamples err: ${String(e)}`);
        return 0;
      }
    }
    return 0;
  } catch (e) {
    hlog(`getTodaySteps exception: ${e}`);
    return 0;
  }
}

export async function getWeeklySteps(): Promise<number[]> {
  const out: number[] = [];
  try {
    if (Platform.OS === 'ios') {
      const HK = getAppleHealthKit();
      if (!HK || typeof HK.getStepCount !== 'function') return [0, 0, 0, 0, 0, 0, 0];
      for (let i = 6; i >= 0; i--) {
        const start = new Date();
        start.setDate(start.getDate() - i);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        const steps = await new Promise<number>((resolve) => {
          HK.getStepCount(
            { date: start.toISOString(), includeManuallyAdded: true },
            (_err: unknown, res: { value?: number }) =>
              resolve(Math.floor(res?.value ?? 0)),
          );
        });
        out.push(Math.max(0, steps));
      }
      return out;
    }

    const today = await getTodaySteps();
    return [0, 0, 0, 0, 0, 0, today];
  } catch {
    return [0, 0, 0, 0, 0, 0, 0];
  }
}

export function getAchievedMilestones(todaySteps: number): HealthMilestone[] {
  return MILESTONES.filter((m) => todaySteps >= m.steps);
}
