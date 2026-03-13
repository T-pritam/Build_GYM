import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotificationsAsync, saveFCMToken, setupNotificationListeners } from './src/services/notificationService';

export default function App() {
  useEffect(() => {
    let cleanupNotifications;

    const initializeNotifications = async () => {
      try {
        const fcmToken = await registerForPushNotificationsAsync();
        
        if (fcmToken) {
          await saveFCMToken(fcmToken);
        }

        cleanupNotifications = setupNotificationListeners();
      } catch (error) {
        console.error('Error initializing notifications:', error);
        // Don't crash the app if notifications fail to initialize
      }
    };

    // Delay initialization slightly to ensure native modules are ready
    const timer = setTimeout(() => {
      initializeNotifications();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (cleanupNotifications) {
        cleanupNotifications();
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
    </GestureHandlerRootView>
  );
}
