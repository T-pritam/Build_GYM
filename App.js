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

export default function App() {
  useEffect(() => {
    let cleanupNotifications;

    const initializeNotifications = async () => {
      try {
        const fcmToken = await registerForPushNotificationsAsync();

        if (fcmToken) {
          const existingToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);

          if (existingToken !== fcmToken) {
            // Token is new or rotated — save to backend + update storage
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

    const timer = setTimeout(() => {
      initializeNotifications();
    }, 100);

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