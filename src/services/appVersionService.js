import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import api from './apiService';

/** The running app version, baked in at build time from app.json. Display only. */
export const APP_VERSION =
  Constants.expoConfig?.version || Constants.manifest?.version || '0.0.0';

/**
 * The native build number — Android versionCode, iOS CFBundleVersion. This is
 * what the update gate actually compares against, because EAS auto-increments
 * it on every production build (eas.json appVersionSource: 'remote'), while the
 * `version` string above is hand-maintained and has sat at 1.0.0 across every
 * release so far.
 *
 * Null unless it parses as a positive integer: under Expo Go this reports the
 * Expo Go client's own build number, which would gate on the wrong number
 * entirely. Sending nothing makes the backend fall back to the semver path.
 */
export const APP_BUILD = (() => {
  const n = Number(Application.nativeBuildVersion);
  return Number.isInteger(n) && n > 0 ? n : null;
})();

/**
 * Ask the backend whether this build must / can update.
 * Fails open: any error → no update prompt (never block the app on a check).
 * Returns { updateRequired, updateAvailable, storeUrl, storeUrlNative, message } or null.
 */
export async function checkAppVersion() {
  try {
    const platform = Platform.OS === 'android' ? 'android' : 'ios';
    const { data } = await api.get('/app/version-check', {
      params: {
        app: 'member',
        platform,
        version: APP_VERSION,
        ...(APP_BUILD !== null ? { build: APP_BUILD } : {}),
      },
    });
    return data && data.success !== false ? data : null;
  } catch {
    return null;
  }
}
