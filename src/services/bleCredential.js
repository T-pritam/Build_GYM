/**
 * bleCredential.js
 *
 * The device credential the gym gate reader accepts, as a 16-char hex string
 * (8 bytes). The backend converts it to Wiegand-26 for AxTraxPro:
 *   iCardCode = bytes[0] + bytes[1] * 256,  iSiteCode = bytes[2]
 * (services/axtrax/utils.js — verified against Rosslare's APP-ID converter).
 *
 * Android — Settings.Secure.ANDROID_ID. The SDK's BleService constructor calls
 *   setAutoBLEID(), which encodes exactly that value, so the app only has to
 *   report it. Do not call setCustomBLEID on Android: it reverses the bytes.
 *
 * iOS — there is no ANDROID_ID. `identifierForVendor` is the closest thing but
 *   it resets when the last app from the vendor is uninstalled, which would
 *   silently invalidate a registered gate credential. So we derive an id once,
 *   keep it in the keychain (expo-secure-store survives reinstalls), push it to
 *   the SDK with setCustomBleId(), and register the same hex with the backend.
 */

import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';

const STORE_KEY = 'bg_ble_credential';

/**
 * How the 16-char hex is handed to the iOS SDK's setCustomBleId(UInt64).
 *
 *   'big'    — "4EE4321A8434F7CF" → 0x4EE4321A8434F7CF (bytes in written order)
 *   'little' — reverse the byte pairs first
 *
 * Android's setCustomBLEID(long) is documented to reverse the byte order, which
 * is why that platform never calls it. If a field test shows the reader logging
 * an iCardCode/iSiteCode that does not match androidIdToWiegand26(hex) for the
 * hex we registered, flip this to 'little' — it is the only place to change.
 */
export const IOS_CREDENTIAL_BYTE_ORDER = 'big';

const HEX16 = /^[0-9a-fA-F]{16}$/;

/** Reverse byte pairs: "AABBCC…" → "…CCBBAA". */
function reverseBytes(hex) {
  return (hex.match(/../g) ?? []).reverse().join('');
}

/** 16 hex chars derived from a UUID, or random when none is available. */
function deriveHex(seed) {
  const cleaned = (seed ?? '').replace(/[^0-9a-fA-F]/g, '');
  if (cleaned.length >= 16) return cleaned.slice(0, 16).toUpperCase();

  let out = cleaned.toUpperCase();
  while (out.length < 16) {
    out += Math.floor(Math.random() * 16).toString(16).toUpperCase();
  }
  return out.slice(0, 16);
}

/**
 * The credential to register with the backend (`bleCredentialId` on OTP verify).
 * @returns {Promise<string|null>} 16-char hex, or null if unavailable.
 */
export async function getBleCredentialId() {
  if (Platform.OS === 'android') {
    try {
      return Application.getAndroidId() ?? null;
    } catch {
      return null;
    }
  }

  if (Platform.OS !== 'ios') return null;

  try {
    const stored = await SecureStore.getItemAsync(STORE_KEY);
    if (stored && HEX16.test(stored)) return stored.toUpperCase();
  } catch {
    // keychain unavailable — fall through and derive a fresh one
  }

  let seed = null;
  try {
    seed = await Application.getIosIdForVendorAsync();
  } catch {
    // ignore — deriveHex falls back to random
  }

  const hex = deriveHex(seed);
  try {
    await SecureStore.setItemAsync(STORE_KEY, hex);
  } catch {
    // Not persisted: the next launch derives the same value from the vendor id,
    // and a changed vendor id is handled by an admin credential reset.
  }
  return hex;
}

/**
 * The same credential in the byte order the iOS SDK expects for
 * setCustomBleId(). Android never uses this — the SDK sets its own.
 */
export function toNativeCredentialHex(hex) {
  if (!hex) return null;
  return IOS_CREDENTIAL_BYTE_ORDER === 'little' ? reverseBytes(hex) : hex;
}
