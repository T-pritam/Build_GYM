import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { useFonts } from 'expo-font';
import AppNavigator from './src/navigation/AppNavigator';
import { FONT_ASSETS } from './src/theme';
import {
  FCM_TOKEN_KEY,
  registerForPushNotificationsAsync,
  saveFCMToken,
  setupNotificationListeners,
  handleNotificationData,
  storeColdStartData,
} from './src/services/notificationService';
import { useAuthStore } from './src/store/authStore';
import { useAnnouncementStore } from './src/store/announcementStore';

export default function App() {
  const [fontsLoaded] = useFonts(FONT_ASSETS);

  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Build Fitness',
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
        sound: 'default',
        enableVibrate: true,
      });
    }

    let cleanupNotifications;
    let appStateSubscription;

    const initializeApp = async () => {
      // ── 1. Bootstrap unread count (only when authenticated) ───────────────
      // Note: initialize() is called in AppNavigator on mount — no need here.
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
      // Store the data — do NOT navigate yet. SplashScreen fires it after
      // navigation.replace('MainTabs') so the 3200ms Splash timer can't
      // override the deeplink navigation.
      try {
        const initialMessage = await messaging().getInitialNotification();
        if (initialMessage?.data) {
          storeColdStartData(initialMessage.data);
        }
      } catch (err) {
        console.warn('getInitialNotification error:', err);
      }

      // ── 5. Deep link: app in background, user taps notification ──────────
      const unsubscribeOnOpen = messaging().onNotificationOpenedApp((remoteMessage) => {
        if (remoteMessage?.data) {
          handleNotificationData(remoteMessage.data);
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

  // Hold rendering until the brand fonts are ready so the UI never flashes
  // with the system fallback. The native splash stays up in the meantime.
  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}