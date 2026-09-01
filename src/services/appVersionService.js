import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './apiService';

/** The running app version, baked in at build time from app.json. */
export const APP_VERSION =
  Constants.expoConfig?.version || Constants.manifest?.version || '0.0.0';

/**
 * Ask the backend whether this build must / can update.
 * Fails open: any error → no update prompt (never block the app on a check).
 * Returns { updateRequired, updateAvailable, storeUrl, message } or null.
 */
export async function checkAppVersion() {
  try {
    const platform = Platform.OS === 'android' ? 'android' : 'ios';
    const { data } = await api.get('/app/version-check', {
      params: { app: 'member', platform, version: APP_VERSION },
    });
    return data && data.success !== false ? data : null;
  } catch {
    return null;
  }
}
