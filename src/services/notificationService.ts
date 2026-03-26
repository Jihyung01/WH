import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import api from './api';
import { useNotificationStore } from '../stores/notificationStore';

const DAILY_REMINDER_ID = 'daily-reminder';
const STREAK_WARNING_ID = 'streak-warning';

export const notificationService = {
  /**
   * Configure notification appearance and behavior.
   * Must be called at app startup (before any notification arrives).
   */
  configure() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  },

  /**
   * Request permission then register push token with the backend.
   * Returns the push token string or null if denied.
   */
  async registerPushToken(): Promise<string | null> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    useNotificationStore.getState().setPermission(
      finalStatus === 'granted' ? 'granted' : 'denied',
    );

    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'WhereHere',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2DD4A8',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // uses Constants.expoConfig.extra.eas.projectId at build time
    });
    const token = tokenData.data;

    useNotificationStore.getState().setPushToken(token);

    try {
      await api.post('/users/me/push-token', { token });
    } catch {
      // server unreachable — token is saved locally for later retry
    }

    return token;
  },

  // ── Nearby Event Alert ──
  async sendNearbyEventAlert(eventTitle: string, distanceM: number, eventId: string) {
    const { prefs } = useNotificationStore.getState();
    if (!prefs.nearbyEvents) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '주변 탐험 발견!',
        body: `${Math.round(distanceM)}m 앞에 "${eventTitle}" 이(가) 기다리고 있어요!`,
        data: { type: 'nearby_event', eventId, deepLink: `wherehere://event/${eventId}` },
        sound: 'default',
      },
      trigger: null, // immediate
    });
  },

  // ── Daily Reminder (scheduled at 14:00) ──
  async scheduleDailyReminder() {
    const { prefs } = useNotificationStore.getState();
    if (!prefs.dailyReminder) {
      await this.cancelDailyReminder();
      return;
    }

    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: '오늘의 탐험 🗺️',
        body: '오늘의 탐험을 아직 시작하지 않았어요! 주변에 재미있는 이벤트가 기다리고 있어요.',
        data: { type: 'daily_reminder', deepLink: 'wherehere://quests' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 14,
        minute: 0,
      },
    });
  },

  async cancelDailyReminder() {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
  },

  // ── Streak Warning (scheduled at 20:00) ──
  async scheduleStreakWarning(streakDays: number) {
    const { prefs } = useNotificationStore.getState();
    if (!prefs.streakWarning || streakDays < 2) {
      await this.cancelStreakWarning();
      return;
    }

    await Notifications.cancelScheduledNotificationAsync(STREAK_WARNING_ID).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: STREAK_WARNING_ID,
      content: {
        title: `연속 탐험 ${streakDays}일째! 🔥`,
        body: '내일도 잊지 마세요! 연속 탐험 보너스가 기다리고 있어요.',
        data: { type: 'streak_warning', deepLink: 'wherehere://quests' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
      },
    });
  },

  async cancelStreakWarning() {
    await Notifications.cancelScheduledNotificationAsync(STREAK_WARNING_ID).catch(() => {});
  },

  // ── Season Event (triggered by server push or locally) ──
  async sendSeasonEventAlert(title: string, eventId?: string) {
    const { prefs } = useNotificationStore.getState();
    if (!prefs.seasonEvents) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '새로운 시즌 이벤트! 🌸',
        body: title,
        data: {
          type: 'season_event',
          deepLink: eventId ? `wherehere://event/${eventId}` : 'wherehere://quests',
        },
        sound: 'default',
      },
      trigger: null,
    });
  },

  // ── Friend Activity ──
  async sendFriendActivityAlert(friendName: string, activity: string) {
    const { prefs } = useNotificationStore.getState();
    if (!prefs.friendActivity) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '친구 소식',
        body: `친구 ${friendName}이(가) ${activity}`,
        data: { type: 'friend_activity', deepLink: 'wherehere://profile' },
        sound: 'default',
      },
      trigger: null,
    });
  },

  // ── Deep link handler ──
  handleNotificationTap(response: Notifications.NotificationResponse): string | null {
    const data = response.notification.request.content.data;
    if (data?.deepLink && typeof data.deepLink === 'string') {
      return data.deepLink;
    }
    return null;
  },

  // ── Cancel all ──
  async cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};
