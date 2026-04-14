import { Platform, InteractionManager } from 'react-native';

/** Result of requesting Health / Google Fit access (see `nativeMissing` when OTA cannot add native HealthKit). */
export type HealthAuthResult = {
  granted: boolean;
  /** iOS: `react-native-health` native module not in this binary — install a full build from TestFlight/App Store, not JS-only update. */
  nativeMissing?: boolean;
  /** iOS: HealthKit not available on this device. */
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

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function afterInteractions(): Promise<void> {
  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
}

export async function requestHealthPermission(): Promise<HealthAuthResult> {
  try {
    if (Platform.OS === 'ios') {
      await afterInteractions();
      await new Promise((r) => setTimeout(r, 400));

      const HealthKit = (await import('react-native-health')).default as any;
      if (typeof HealthKit?.initHealthKit !== 'function') {
        console.warn('[health] AppleHealthKit native module missing (needs dev/production build with react-native-health).');
        return { granted: false, nativeMissing: true };
      }

      const kitAvailable = await new Promise<boolean>((resolve) => {
        if (typeof HealthKit.isAvailable !== 'function') {
          resolve(true);
          return;
        }
        HealthKit.isAvailable((err: unknown, ok: boolean) => {
          if (err) console.warn('[health] isAvailable:', err);
          resolve(!!ok);
        });
      });
      if (!kitAvailable) {
        console.warn('[health] HealthKit not available on this device.');
        return { granted: false, unavailable: true };
      }

      const granted = await new Promise<boolean>((resolve) => {
        // react-native-health versions differ on accepted permission strings.
        // Ask both legacy/new aliases to avoid false negatives.
        HealthKit.initHealthKit(
          {
            permissions: {
              read: ['Steps', 'StepCount'],
              write: [],
            },
          },
          (err: unknown) => {
            if (err) console.warn('[health] initHealthKit:', err);
            resolve(!err);
          },
        );
      });
      return { granted };
    }

    if (Platform.OS === 'android') {
      const GoogleFit = (await import('react-native-google-fit')).default as any;
      const options = {
        scopes: ['https://www.googleapis.com/auth/fitness.activity.read'],
      };
      const authRes = await GoogleFit.authorize(options);
      return { granted: !!authRes?.success };
    }
    return { granted: false };
  } catch {
    return { granted: false };
  }
}

export async function getTodaySteps(): Promise<number> {
  try {
    if (Platform.OS === 'ios') {
      const HealthKit = (await import('react-native-health')).default as any;
      if (typeof HealthKit?.getStepCount !== 'function') {
        return 0;
      }
      const startDate = startOfToday().toISOString();
      const endDate = new Date().toISOString();
      const total = await new Promise<number>((resolve) => {
        HealthKit.getStepCount(
          { startDate, endDate },
          (_err: unknown, res: { value?: number }) => {
            resolve(Math.max(0, Math.floor(res?.value ?? 0)));
          },
        );
      });
      if (total > 0) return total;

      // Some devices return 0 for getStepCount but provide bucketed samples.
      if (typeof HealthKit?.getDailyStepCountSamples === 'function') {
        const samplesTotal = await new Promise<number>((resolve) => {
          HealthKit.getDailyStepCountSamples(
            { startDate, endDate },
            (_err: unknown, rows: Array<{ value?: number }> | undefined) => {
              const sum = (rows ?? []).reduce((acc, row) => acc + Math.max(0, Number(row?.value) || 0), 0);
              resolve(Math.floor(sum));
            },
          );
        });
        return Math.max(0, samplesTotal);
      }
      return 0;
    }

    if (Platform.OS === 'android') {
      const GoogleFit = (await import('react-native-google-fit')).default as any;
      try {
        await GoogleFit.authorize({
          scopes: ['https://www.googleapis.com/auth/fitness.activity.read'],
        });
      } catch {
        // ignore, query below will return 0 on failure
      }
      const samples = await GoogleFit.getDailyStepCountSamples({
        startDate: startOfToday().toISOString(),
        endDate: new Date().toISOString(),
      });
      const merged = Array.isArray(samples)
        ? samples.flatMap((s: any) => (Array.isArray(s?.steps) ? s.steps : []))
        : [];
      return merged.reduce((sum: number, row: any) => sum + (Number(row?.value) || 0), 0);
    }
    return 0;
  } catch {
    return 0;
  }
}

export async function getWeeklySteps(): Promise<number[]> {
  const out: number[] = [];
  try {
    if (Platform.OS === 'ios') {
      const HealthKit = (await import('react-native-health')).default as any;
      for (let i = 6; i >= 0; i--) {
        const start = new Date();
        start.setDate(start.getDate() - i);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        const steps = await new Promise<number>((resolve) => {
          HealthKit.getStepCount(
            { startDate: start.toISOString(), endDate: end.toISOString() },
            (_err: unknown, res: { value?: number }) => resolve(Math.floor(res?.value ?? 0)),
          );
        });
        out.push(Math.max(0, steps));
      }
      return out;
    }

    // Android에서는 오늘 값 기반 단순 주간 fallback
    const today = await getTodaySteps();
    return [0, 0, 0, 0, 0, 0, today];
  } catch {
    return [0, 0, 0, 0, 0, 0, 0];
  }
}

export function getAchievedMilestones(todaySteps: number): HealthMilestone[] {
  return MILESTONES.filter((m) => todaySteps >= m.steps);
}

