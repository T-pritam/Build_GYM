/**
 * analyticsService.js
 *
 * GA4 wrapper for the member app. Mirrors the admin app's analyticsService.ts.
 *
 * MANDATORY: user_id + role ride on EVERY screen_view and event via identity().
 * user_id is the member-facing display_id (BG####) — never the internal UUID.
 * Pre-auth (no user) falls back to 'guest'.
 */
import analytics from '@react-native-firebase/analytics';
import { useAuthStore } from '../store/authStore';

function identity() {
  const user = useAuthStore.getState().user;
  return {
    user_id: user?.displayId ?? 'guest',
    role: user?.role ?? 'guest',
  };
}

export async function logScreenView(screenName) {
  await analytics().logScreenView({
    screen_name: screenName,
    screen_class: screenName,
    ...identity(),
  });
}

export async function logEvent(eventName, params = {}) {
  await analytics().logEvent(eventName, { ...identity(), ...params });
}

export async function setUserId(userId) {
  await analytics().setUserId(userId ? String(userId) : null);
}

export async function setUserRole(role) {
  await analytics().setUserProperty('role', role || 'guest');
}

export async function setUserProperty(name, value) {
  await analytics().setUserProperty(name, value == null ? null : String(value));
}
