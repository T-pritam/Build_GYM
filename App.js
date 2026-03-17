import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import AppNavigator from './src/navigation/AppNavigator';
import {
  FCM_TOKEN_KEY,
  registerForPushNotificationsAsync,
  saveFCMToken,
  setupNotificationListeners,
  handleDeepLink,
} from './src/services/notificationService';
import { useAuthStore } from './src/store/authStore';
import { useAnnouncementStore } from './src/store/announcementStore';

export default function App() {
  useEffect(() => {
    let cleanupNotifications;
    let appStateSubscription;

    const initializeApp = async () => {
      // ── 1. Restore auth session ───────────────────────────────────────────
      const { initialize } = useAuthStore.getState();
      await initialize().catch(() => {});

      // ── 2. Bootstrap unread count (only when authenticated) ───────────────
      const { isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        useAnnouncementStore.getState().refreshUnreadCount().catch(() => {});
      }

      // ── 3. Register & sync FCM device token ──────────────────────────────
      try {
        const fcmToken = await registerForPushNotificationsAsync();

        if (fcmToken) {
          const existingToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);

          if (existingToken !== fcmToken) {
            await saveFCMToken(fcmToken);
            await AsyncStorage.setItem(FCM_TOKEN_KEY, fcmToken);
            console.log('FCM token updated');
          } else {
            console.log('FCM token unchanged, skipping backend save');
          }
        }

        cleanupNotifications = setupNotificationListeners();
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }

      // ── 4. Deep link: app opened from a killed state via notification ─────
      try {
        const initialMessage = await messaging().getInitialNotification();
        if (initialMessage?.data?.deep_link) {
          // Delay to let navigation container mount fully
          setTimeout(() => handleDeepLink(initialMessage.data.deep_link), 1500);
        }
      } catch (err) {
        console.warn('getInitialNotification error:', err);
      }

      // ── 5. Deep link: app in background, user taps notification ──────────
      const unsubscribeOnOpen = messaging().onNotificationOpenedApp((remoteMessage) => {
        if (remoteMessage?.data?.deep_link) {
          handleDeepLink(remoteMessage.data.deep_link);
        }
      });

      // ── 6. Refresh unread count when app comes back to foreground ─────────
      appStateSubscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          const { isAuthenticated: authed } = useAuthStore.getState();
          if (authed) {
            useAnnouncementStore.getState().refreshUnreadCount().catch(() => {});
          }
        }
      });

      // Return combined cleanup
      const origCleanup = cleanupNotifications;
      cleanupNotifications = () => {
        if (origCleanup) origCleanup();
        unsubscribeOnOpen();
      };
    };

    // Small delay so the JS bridge is ready
    const timer = setTimeout(() => { initializeApp(); }, 100);

    return () => {
      clearTimeout(timer);
      if (cleanupNotifications) cleanupNotifications();
      if (appStateSubscription) appStateSubscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
    </GestureHandlerRootView>
  );
}