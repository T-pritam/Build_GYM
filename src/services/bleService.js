import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { getBleCredentialId, toNativeCredentialHex } from './bleCredential';

const { RosslareBle } = NativeModules;

/**
 * iOS only: hand the SDK the credential this device registered with AxTraxPro.
 * On Android the SDK derives it from ANDROID_ID itself (setAutoBLEID) and
 * overriding it would reverse the byte order — so this is a no-op there.
 */
let credentialPushed = false;
async function ensureCredential() {
  if (Platform.OS !== 'ios' || credentialPushed) return;
  if (typeof RosslareBle?.setCredential !== 'function') return;

  const hex = await getBleCredentialId();
  if (!hex) return;
  try {
    await RosslareBle.setCredential(toNativeCredentialHex(hex));
    credentialPushed = true;
  } catch {
    // Non-fatal: the SDK falls back to its own device id and the reader denies,
    // which surfaces as a normal "access denied" rather than a crash.
  }
}

async function requestBlePermissions() {
  if (Platform.OS !== 'android') return true;

  if (Platform.Version >= 31) {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return (
      results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === 'granted' &&
      results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === 'granted'
    );
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Location Permission',
      message: 'Bluetooth scanning requires location access on this Android version.',
      buttonPositive: 'Allow',
    },
  );
  return result === 'granted';
}

/**
 * Scans for Rosslare BLE readers and auto-transmits the credential to the
 * reader with the strongest signal. Returns the reader name/address on success.
 * Throws an Error with a `code` property on failure:
 *   PERMISSION_DENIED | BT_NOT_ENABLED | NO_READERS_FOUND | TRANSMIT_FAILED
 */
export async function autoUnlock(timeoutSeconds = 10) {
  const granted = await requestBlePermissions();
  if (!granted) {
    const err = new Error('Bluetooth permissions denied.');
    err.code = 'PERMISSION_DENIED';
    throw err;
  }
  await ensureCredential();
  return RosslareBle.autoUnlock(timeoutSeconds);
}

/**
 * Returns the current list of discovered readers from the last scan.
 * `async` on purpose: a missing native module must reject, not throw
 * synchronously into the caller's render.
 */
export async function getDiscoveredReaders() {
  return RosslareBle.getDiscoveredReaders();
}

/** Transmit the credential to a specific reader by MAC address. */
export async function transmitToAddress(address) {
  await ensureCredential();
  return RosslareBle.transmitToAddress(address);
}
