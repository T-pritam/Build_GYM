/**
 * cafeFcmService.js
 *
 * Registers the device's FCM token with the **Cafe backend** so the cafe
 * push pipeline (order PREPARING / OUT_FOR_DELIVERY / DELIVERED events)
 * can reach the gym customer. Separate from the gym FCM registration in
 * notificationService.js — the gym and cafe backends each have their own
 * fcm_tokens tables.
 */

import * as Device from 'expo-device';
import { Platform } from 'react-native';
import cafeApi from './cafeApiService';
import { ensureCafeAuth } from './cafeAuthService';

let lastRegisteredToken = null;

export async function registerCafeFcmToken(fcmToken, { phone, userId } = {}) {
  if (!fcmToken) return null;
  if (lastRegisteredToken === fcmToken) return null;

  try {
    await ensureCafeAuth();
    const deviceId = Device.osInternalBuildId || Device.modelId || 'gym-unknown';
    const payload = {
      token: fcmToken,
      deviceId,
      platform: Platform.OS,
      app: 'customer',
      ...(phone  && { phone }),
      ...(userId && { userId }),
    };
    const { data } = await cafeApi.post('/fcm-tokens', payload);
    lastRegisteredToken = fcmToken;
    return data;
  } catch (err) {
    console.warn('[cafeFcmService] register failed:', err?.response?.data || err?.message);
    return null;
  }
}
