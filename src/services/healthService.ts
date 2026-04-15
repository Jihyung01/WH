import { Platform, NativeModules, InteractionManager } from 'react-native';

export type HealthAuthResult = {
  granted: boolean;
  nativeMissing?: boolean;
  unavailable?: boolean;
};

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
  return _healthDiagLog.join('\n');
}

function hlog(msg: string): void {
  const ts = new Date().toLocaleTimeString('ko-KR', { hour12: false });
  const line = `[${ts}] ${msg}`;
  _healthDiagLog.push(line);
  if (_healthDiagLog.length > 30) _healthDiagLog.shift();
}

export async function requestHealthPermission(): Promise<HealthAuthResult> {
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
        const mod = await import('react-native-google-fit');
        const GoogleFit = (mod as any)?.default ?? (mod as any)?.GoogleFit ?? mod;
        const options = {
          scopes: ['https://www.googleapis.com/auth/fitness.activity.read'],
        };
        const authRes = await GoogleFit.authorize(options);
        return { granted: !!authRes?.success };
      } catch {
        return { granted: false };
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
        const mod = await import('react-native-google-fit');
        const GoogleFit = (mod as any)?.default ?? (mod as any)?.GoogleFit ?? mod;
        try {
          await GoogleFit.authorize({
            scopes: ['https://www.googleapis.com/auth/fitness.activity.read'],
          });
        } catch {
          // ignore
        }
        const samples = await GoogleFit.getDailyStepCountSamples({
          startDate: startOfToday().toISOString(),
          endDate: new Date().toISOString(),
        });
        const merged = Array.isArray(samples)
          ? samples.flatMap((s: any) => (Array.isArray(s?.steps) ? s.steps : []))
          : [];
        return merged.reduce(
          (sum: number, row: any) => sum + (Number(row?.value) || 0),
          0,
        );
      } catch {
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
