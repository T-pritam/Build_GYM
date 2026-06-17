import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';
import { Platform, Linking } from 'react-native';
import axios from 'axios';
import { BASE_API_URL } from '@env';

import { navigateTo } from '../navigation/navigationRef';
import { useMembershipStore } from '../store/membershipStore';
import { logEvent } from './analyticsService';

export const FCM_TOKEN_KEY = '@fcm_token';

/** Re-check membership freeze status when a membership push arrives. */
const refreshMembershipIfNeeded = (data) => {
  if (data?.type && String(data.type).startsWith('MEMBERSHIP_')) {
    useMembershipStore.getState().refresh();
  }
};

// Gym reception line dialled by "call-admin" notification actions
// (gate access revoked, trainer removed). Matches the hardcoded number used
// across HomeScreen / MembershipScreen.
export const RECEPTION_PHONE = '+919876543210';

/** Dial the gym reception (used by call-admin notification actions). */
export const callAdmin = () => {
  Linking.openURL(`tel:${RECEPTION_PHONE}`).catch((err) =>
    console.warn('callAdmin dial failed:', err),
  );
};

// Cold-start deeplink: store the notification data from getInitialNotification so
// SplashScreen can fire it AFTER replacing to MainTabs (prevents the 3200ms override bug).
let _coldStartData = null;
export const storeColdStartData = (data) => { _coldStartData = data; };
export const consumeColdStartData = () => { const d = _coldStartData; _coldStartData = null; return d; };

/**
 * Parse a buildfitness:// deep link and navigate to the correct screen.
 *
 * Supported routes:
 *   buildfitness://announcements/<id>  → AnnouncementDetail
 *   buildfitness://mybookings          → MyBookings
 *   buildfitness://bookings/<id>       → BookingQR
 *   buildfitness://membership          → Membership
 *   buildfitness://complaints          → MyComplaints
 *   buildfitness://complaint/<id>      → MyComplaintDetail
 *   buildfitness://activities          → Activities
 *   buildfitness://activity/<id>       → ActivityDetail
 *   buildfitness://notifications       → Notifications (bell tab)
 *   buildfitness://blogs/<id>          → BlogFeed (single blog post)
 *   buildfitness://transaction/<id>    → TransactionDetail
 *   buildfitness://transactions        → BuildCoinTransactions (list)
 *   buildfitness://trainers/<id>       → TrainerDetail
 *   buildfitness://community/<id>      → PostDetail (community post)
 */
export const handleDeepLink = (deepLink) => {
  if (!deepLink) return;
  try {
    const withoutScheme = deepLink.replace('buildfitness://', '');
    const [resource, id] = withoutScheme.split('/');

    switch (resource) {
      case 'announcements':
        if (id) navigateTo('AnnouncementDetail', { id });
        break;
      case 'mybookings':
        navigateTo('MyBookings');
        break;
      case 'bookings':
        navigateTo('MyBookings');
        break;
      case 'membership':
        navigateTo('Membership');
        break;
      case 'complaints':
        navigateTo('MyComplaints');
        break;
      case 'complaint':
        if (id) navigateTo('MyComplaintDetail', { complaintId: id });
        break;
      case 'activities':
        navigateTo('Activities');
        break;
      case 'activity':
        if (id) navigateTo('ActivityDetail', { activityId: id });
        break;
      case 'notifications':
        navigateTo('Notifications');
        break;
      case 'blogs':
        if (id) navigateTo('BlogFeed', { postId: id });
        break;
      case 'transaction':
        if (id) navigateTo('TransactionDetail', { transactionId: id });
        break;
      case 'transactions':
        navigateTo('BuildCoinTransactions');
        break;
      case 'trainers':
        if (id) navigateTo('TrainerDetail', { trainerId: id });
        else navigateTo('Trainers');
        break;
      case 'trials':
        if (id) navigateTo('TrialDetail', { trialId: id });
        else navigateTo('MyBookings');
        break;
      case 'community':
        if (id) navigateTo('PostDetail', { postId: id });
        break;
      case 'leaderboard':
        navigateTo('Leaderboard');
        break;
      case 'workout':
        // buildfitness://workout/<id> → resume that instance; bare → Workouts hub
        if (id) navigateTo('WorkoutSession', { workoutId: id });
        else navigateTo('WorkoutHome');
        break;
      case 'workouts':
        navigateTo('WorkoutHome');
        break;
      case 'call-admin':
        callAdmin();
        break;
      default:
        break;
    }
  } catch (err) {
    console.warn('handleDeepLink error:', err);
  }
};

/**
 * Type → fallback deep link for notifications that don't include a deep_link field yet.
 * Used as a safety-net until all call sites pass an explicit deep_link.
 */
const TYPE_FALLBACK_DEEPLINK = {
  MEMBERSHIP_ACTIVATED:        'buildfitness://membership',
  MEMBERSHIP_PAUSE_CREATED:    'buildfitness://membership',
  MEMBERSHIP_PAUSED:           'buildfitness://membership',
  MEMBERSHIP_RESUMED:          'buildfitness://membership',
  MEMBERSHIP_EXPIRED:          'buildfitness://membership',
  MEMBERSHIP_EXPIRY_REMINDER:  'buildfitness://membership',
  booking_cancelled:           'buildfitness://mybookings',
  slot_cancelled:              'buildfitness://mybookings',
  // blog_published: deep_link already in FCM data from blog.worker.js
  // COINS_GRANTED / COINS_PURCHASED: transaction ID needed for specific screen
  COINS_GRANTED:               'buildfitness://transactions',
  COINS_PURCHASED:             'buildfitness://transactions',
  COINS_PURCHASE_FAILED:       'buildfitness://transactions',
  COINS_DEBITED:               'buildfitness://transactions',
  COINS_LOW_BALANCE:           'buildfitness://transactions',
  complaint_submitted:         'buildfitness://complaints',
  complaint_in_progress:       'buildfitness://complaints',
  // Leaderboard (Doc 1 N1–N8)
  LEADERBOARD_MONTHLY_RESULT:  'buildfitness://leaderboard',
  LEADERBOARD_SEASON_END:      'buildfitness://leaderboard',
  LEADERBOARD_CHAMPION:        'buildfitness://leaderboard',
  LEADERBOARD_REWARD:          'buildfitness://leaderboard',
  LEADERBOARD_NEW_SEASON:      'buildfitness://leaderboard',
  LEADERBOARD_STREAK_RISK:     'buildfitness://leaderboard',
  LEADERBOARD_MILESTONE:       'buildfitness://leaderboard',
  LEADERBOARD_ENTER_TOP10:     'buildfitness://leaderboard',
  LEADERBOARD_DROP_TOP10:      'buildfitness://leaderboard',
  // Workouts (Doc 4 §9)
  WORKOUT_ASSIGNED:            'buildfitness://workouts',
  WORKOUT_REMINDER:           'buildfitness://workouts',
  WORKOUT_CANCELLED:          'buildfitness://workouts',
  // GATE_ACCESS_REVOKED / TRAINER_REMOVED carry action:'call_admin' (handled before deep links)
};

/**
 * Primary entry point for handling any notification tap.
 * Checks deep_link first; falls back to data.type → screen mapping.
 */
export const handleNotificationData = (data) => {
  if (!data) return;
  logEvent('notification_tapped', { notification_type: data.type ?? 'unknown' }).catch(() => {});
  if (data.deep_link) {
    handleDeepLink(data.deep_link);
    return;
  }
  const fallback = TYPE_FALLBACK_DEEPLINK[data.type];
  if (fallback) handleDeepLink(fallback);
};

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

export const saveFCMToken = async (fcmToken, phone = null, userId = null) => {
  try {
    const deviceId = Device.osInternalBuildId || Device.modelId || 'unknown';

    const payload = {
      token: fcmToken,
      deviceId,
      platform: Platform.OS,
      app: 'member',
      ...(phone  && { phone }),
      ...(userId && { userId }),
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

    // Handle notification tap (Expo local notifications)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      handleNotificationData(response.notification.request.content.data);
    });

    // Handle FCM messages
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      console.log('FCM Message received in foreground:', remoteMessage);

      refreshMembershipIfNeeded(remoteMessage.data);

      // coins_low_balance_alert_fired — logged when the low-balance push is received
      // (the backend "threshold crossed + notification sent" moment; ties to
      // NOTIFICATIONS.md §4.4). Foreground-received only; remaining_balance /
      // threshold_value come from the FCM data payload when present.
      if (remoteMessage.data?.type === 'COINS_LOW_BALANCE') {
        logEvent('coins_low_balance_alert_fired', {
          remaining_balance: Number(remoteMessage.data.remaining_balance ?? remoteMessage.data.balance ?? 0),
          threshold_value: Number(remoteMessage.data.threshold_value ?? remoteMessage.data.threshold ?? 0),
        }).catch(() => {});
      }

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
