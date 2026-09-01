/**
 * deviceId.js
 * A stable, per-install device identifier for FCM token registration.
 *
 * Why this exists: registration used to send
 * `Device.osInternalBuildId || Device.modelId` as the device id. On iOS that is
 * the OS *build number* (e.g. "23G71") and on Android it is Build.DISPLAY (e.g.
 * "UP1A.231005.007") — the same value on every handset running that build. The
 * backend keys fcm_tokens on a UNIQUE (device_id, app), so every device on a
 * given OS build shared one row: each launch overwrote the previous user's token
 * and user_id, and only the most recent launcher could receive a push.
 *
 * The id is a UUID persisted in SecureStore, so it survives app updates and
 * (on iOS, where the keychain outlives the app) reinstalls. The backend's
 * legacy-row migration keys off the UUID shape, so the format matters.
 */

import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'bg_device_id';

let cached = null;
let inFlight = null;

/** RFC-4122 v4 shape. Not crypto-grade, and does not need to be: it is generated
 *  once per install and then persisted — it only has to be unique, not secret. */
const uuidv4 = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

/**
 * Resolve this install's device id, generating and persisting one on first call.
 * Concurrent callers share a single resolution so two callers can't each mint an id.
 *
 * @returns {Promise<string>} a UUID, or a fresh in-memory UUID if storage is unavailable
 */
export const getDeviceId = async () => {
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      if (stored) {
        cached = stored;
        return cached;
      }

      const fresh = uuidv4();
      await SecureStore.setItemAsync(DEVICE_ID_KEY, fresh);
      cached = fresh;
      return cached;
    } catch (err) {
      // SecureStore can fail on a locked keystore. Fall back to a per-session id so
      // registration still succeeds; the next launch retries persistence.
      console.warn('getDeviceId: SecureStore unavailable, using session id:', err?.message);
      cached = uuidv4();
      return cached;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
};
