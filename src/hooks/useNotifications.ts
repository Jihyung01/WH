import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { notificationService } from '../services/notificationService';

export function useNotifications() {
  useEffect(() => {
    notificationService.configureNotifications();
    notificationService.registerPushToken();
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      // TODO: Handle incoming push notifications
      console.log('Notification received:', notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      // TODO: Handle notification taps (navigate to event/mission)
      console.log('Notification response:', response);
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);
}
