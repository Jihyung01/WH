import { Platform, InteractionManager } from 'react-native';

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

export async function requestHealthPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      await afterInteractions();
      await new Promise((r) => setTimeout(r, 400));

      const HealthKit = (await import('react-native-health')).default as any;
      if (typeof HealthKit?.initHealthKit !== 'function') {
        console.warn('[health] AppleHealthKit native module missing (needs dev/production build with react-native-health).');
        return false;
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
        return false;
      }

      return await new Promise<boolean>((resolve) => {
        HealthKit.initHealthKit(
          {
            permissions: {
              read: ['Steps'],
              write: [],
            },
          },
          (err: unknown) => {
            if (err) console.warn('[health] initHealthKit:', err);
            resolve(!err);
          },
        );
      });
    }

    if (Platform.OS === 'android') {
      const GoogleFit = (await import('react-native-google-fit')).default as any;
      const options = {
        scopes: ['https://www.googleapis.com/auth/fitness.activity.read'],
      };
      const authRes = await GoogleFit.authorize(options);
      return !!authRes?.success;
    }
    return false;
  } catch {
    return false;
  }
}

export async function getTodaySteps(): Promise<number> {
  try {
    if (Platform.OS === 'ios') {
      const HealthKit = (await import('react-native-health')).default as any;
      const startDate = startOfToday().toISOString();
      const endDate = new Date().toISOString();
      return await new Promise<number>((resolve) => {
        HealthKit.getStepCount(
          { startDate, endDate },
          (_err: unknown, res: { value?: number }) => {
            resolve(Math.max(0, Math.floor(res?.value ?? 0)));
          },
        );
      });
    }

    if (Platform.OS === 'android') {
      const GoogleFit = (await import('react-native-google-fit')).default as any;
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

