import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import InfoBanner from './auth/InfoBanner';
import {
  FCM_TOKEN_KEY,
  getNotificationPermission,
  registerForPushNotificationsAsync,
  requestNotificationPermission,
  saveFCMToken,
} from '../services/notificationService';
import { useAuthStore } from '../store/authStore';

/**
 * Shown wherever the user should be nudged to turn notifications back on.
 *
 * Both platforms present the system permission dialog exactly once per install.
 * After a denial `requestPermissionsAsync()` resolves to "denied" without showing
 * anything, so the only way back is the OS settings app — hence an in-app banner
 * rather than a repeated system prompt.
 *
 * Renders nothing when permission is granted, so it is safe to mount anywhere.
 * Dismissal is session-only (component state): it comes back on the next launch,
 * which is the "ask on every login / every dashboard visit" behaviour we want
 * without nagging inside a single session.
 *
 * @param {object} props
 * @param {string} [props.message]  Override the body copy for the surface it sits on
 * @param {object} [props.style]    Extra container style (spacing for the host screen)
 */
export default function NotificationPermissionBanner({ message, style }) {
  const [state, setState] = useState({ granted: true, canAskAgain: true });
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setState(await getNotificationPermission());
  }, []);

  useEffect(() => {
    refresh();

    // Re-check when the user comes back from the settings app, so the banner
    // disappears immediately instead of waiting for a relaunch.
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  /** Register the token right away so the first push doesn't wait for a relaunch. */
  const syncToken = useCallback(async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (!token) return;
      const userId = useAuthStore.getState().user?.id ?? null;
      await saveFCMToken(token, null, userId);
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    } catch (err) {
      console.warn('NotificationPermissionBanner: token sync failed:', err?.message);
    }
  }, []);

  const onAction = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (state.canAskAgain) {
        // Still have the one system dialog available — spend it here, where the
        // user has just said yes, rather than cold on the splash screen.
        const granted = await requestNotificationPermission();
        setState({ granted, canAskAgain: state.canAskAgain });
        if (granted) await syncToken();
        return;
      }

      await Linking.openSettings().catch(() =>
        Alert.alert(
          'Unable to open settings',
          'Please enable notifications for Build Fitness in your phone’s Settings app.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }, [busy, state.canAskAgain, syncToken]);

  if (state.granted || dismissed) return null;

  return (
    <InfoBanner
      icon="notifications-off-outline"
      tone="info"
      style={style}
      actionLabel={state.canAskAgain ? 'Turn on notifications' : 'Enable in Settings'}
      onAction={onAction}
      onDismiss={() => setDismissed(true)}
    >
      {message ??
        'Notifications are off. You’ll miss booking reminders, membership updates and messages from your coach.'}
    </InfoBanner>
  );
}
