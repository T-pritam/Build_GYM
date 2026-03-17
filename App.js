import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import {
  FCM_TOKEN_KEY,
  registerForPushNotificationsAsync,
  saveFCMToken,
  setupNotificationListeners,
} from './src/services/notificationService';
import { useAuthStore } from './src/store/authStore';
import { BASE_API_URL } from '@env';

export default function App() {
  useEffect(() => {
    let cleanupNotifications;

    const initializeApp = async () => {
      // ── 1. Restore auth session from secure storage ──────────────────────
      // (Also triggered by SplashScreen, but calling here speeds things up
      //  for cases where the navigator renders before Splash is mounted.)
      const { initialize } = useAuthStore.getState();
      initialize().catch(() => {});

      // ── 2. Register & sync FCM device token ──────────────────────────────
      try {
        const fcmToken = await registerForPushNotificationsAsync();
        console.log('BAse API URL:', BASE_API_URL);
        if (fcmToken) {
          const existingToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);

          if (existingToken !== fcmToken) {
            // Token is new or rotated — save to backend (no phone, no userId:
            // this is anonymous pre-auth registration)
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
    };

    // Small delay so the JS bridge is ready
    const timer = setTimeout(() => { initializeApp(); }, 100);

    return () => {
      clearTimeout(timer);
      if (cleanupNotifications) cleanupNotifications();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
    </GestureHandlerRootView>
  );
}