import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

const { RosslareBle } = NativeModules;

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
  return RosslareBle.autoUnlock(timeoutSeconds);
}

/** Returns the current list of discovered readers from the last scan. */
export function getDiscoveredReaders() {
  return RosslareBle.getDiscoveredReaders();
}

/** Transmit the credential to a specific reader by MAC address. */
export function transmitToAddress(address) {
  return RosslareBle.transmitToAddress(address);
}
