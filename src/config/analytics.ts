import { Mixpanel } from 'mixpanel-react-native';

const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN ?? '';

let mixpanel: Mixpanel | null = null;

export async function initAnalytics() {
  if (!MIXPANEL_TOKEN) {
    console.warn('Mixpanel token not configured, skipping initialization');
    return;
  }

  try {
    mixpanel = new Mixpanel(MIXPANEL_TOKEN, true);
    await mixpanel.init();
  } catch (e) {
    console.warn('Mixpanel init failed:', e);
  }
}

export function identify(userId: string, properties?: Record<string, unknown>) {
  if (!mixpanel) return;
  mixpanel.identify(userId);
  if (properties) {
    mixpanel.getPeople().set(properties);
  }
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!mixpanel) return;
  mixpanel.track(event, properties);
}

export function resetAnalytics() {
  if (!mixpanel) return;
  mixpanel.reset();
}

export const AnalyticsEvents = {
  // Auth
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  SIGNUP_COMPLETE: 'Signup Complete',

  // Core Loop
  EVENT_VIEWED: 'Event Viewed',
  CHECKIN_SUCCESS: 'Checkin Success',
  CHECKIN_FAILED: 'Checkin Failed',
  MISSION_STARTED: 'Mission Started',
  MISSION_COMPLETED: 'Mission Completed',
  EVENT_COMPLETED: 'Event Completed',

  // Character
  CHARACTER_CREATED: 'Character Created',
  LEVEL_UP: 'Level Up',

  // Social
  JOURNAL_SHARED: 'Journal Shared',
  CHAT_SENT: 'Chat Sent',

  // Engagement
  DAILY_REWARD_CLAIMED: 'Daily Reward Claimed',
  UGC_EVENT_CREATED: 'UGC Event Created',
  TUTORIAL_COMPLETED: 'Tutorial Completed',
  TUTORIAL_SKIPPED: 'Tutorial Skipped',

  // Navigation
  TAB_VIEWED: 'Tab Viewed',
  SCREEN_VIEWED: 'Screen Viewed',
} as const;
