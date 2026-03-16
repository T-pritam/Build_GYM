import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import axios from 'axios';
import { BASE_API_URL } from '@env';

export const FCM_TOKEN_KEY = '@fcm_token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotificationsAsync = async () => {
  let token = '';

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      try {
        token = await messaging().getToken();
        console.log('FCM Token:', token);
      } catch (error) {
        console.log('Error getting FCM token:', error);
        return null;
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }
  } catch (error) {
    console.error('Error in registerForPushNotificationsAsync:', error);
    return null;
  }

  return token;
};

export const saveFCMToken = async (fcmToken, phone = null) => {
  try {
    const deviceId = Device.osInternalBuildId || Device.modelId || 'unknown';

    const payload = {
      token: fcmToken,
      deviceId,
      platform: Platform.OS,
      ...(phone && { phone }),   // include phone if provided (pre-auth)
    };

    const response = await axios.post(`${BASE_API_URL}/fcm-tokens`, payload);

    console.log('FCM token saved:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error saving FCM token:', error.response?.data || error.message);
    return null;
  }
};

export const setupNotificationListeners = () => {
  try {
    // Handle notifications when app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
    });

    // Handle notification interactions
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    // Handle FCM messages
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      console.log('FCM Message received in foreground:', remoteMessage);

      if (remoteMessage.notification) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: remoteMessage.notification.title,
            body: remoteMessage.notification.body,
            data: remoteMessage.data,
          },
          trigger: null,
        });
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
      unsubscribeOnMessage();
    };
  } catch (error) {
    console.error('Error setting up notification listeners:', error);
    return () => { }; // Return empty cleanup function
  }
};
