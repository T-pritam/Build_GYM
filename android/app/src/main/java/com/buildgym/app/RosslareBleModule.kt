package com.buildgym.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.rosslare.blelib.exceptions.*
import kotlinx.coroutines.*

class RosslareBleModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "RosslareBle"

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private fun hasPermissions(): Boolean {
        val needed = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            listOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
        } else {
            listOf(Manifest.permission.ACCESS_FINE_LOCATION)
        }
        return needed.all {
            ContextCompat.checkSelfPermission(reactContext, it) == PackageManager.PERMISSION_GRANTED
        }
    }

    /**
     * Scan for up to timeoutSeconds, then auto-transmit to the reader with the strongest signal.
     * Resolves with reader name/address on success.
     * Rejects with code: PERMISSION_DENIED | BT_NOT_ENABLED | NO_READERS_FOUND | TRANSMIT_FAILED
     */
    @ReactMethod
    fun autoUnlock(timeoutSeconds: Int, promise: Promise) {
        if (!hasPermissions()) {
            promise.reject("PERMISSION_DENIED", "Bluetooth permissions not granted.")
            return
        }

        val ble = MainApplication.bleService

        scope.launch {
            try {
                ble.searchBLEReaders(timeoutSeconds)
            } catch (e: BluetoothNotEnabled) {
                promise.reject("BT_NOT_ENABLED", "Bluetooth is not enabled."); return@launch
            } catch (e: AccessFineNoPermission) {
                promise.reject("PERMISSION_DENIED", "Location permission required for BLE scan."); return@launch
            } catch (e: AccessCoarseNoPermission) {
                promise.reject("PERMISSION_DENIED", "Location permission required for BLE scan."); return@launch
            } catch (e: Exception) {
                promise.reject("SCAN_ERROR", e.message ?: "Scan failed."); return@launch
            }

            // Poll until first device appears or timeout
            val pollEnd = System.currentTimeMillis() + timeoutSeconds * 1000L
            var devices = ble.getDiscoveredBleDevices()
            while (devices.isNullOrEmpty() && System.currentTimeMillis() < pollEnd) {
                delay(500)
                devices = ble.getDiscoveredBleDevices()
            }

            if (devices.isNullOrEmpty()) {
                promise.reject("NO_READERS_FOUND", "No Rosslare readers found nearby."); return@launch
            }

            val target = devices.maxByOrNull { it.rssi }!!
            try {
                ble.transmitBLEID(target)
                promise.resolve(target.name ?: target.address)
            } catch (e: BLEDeviceToConnectNotFound) {
                promise.reject("TRANSMIT_FAILED", "Reader moved out of range.")
            } catch (e: Exception) {
                promise.reject("TRANSMIT_FAILED", e.message ?: "Transmit failed.")
            }
        }
    }

    /** Returns current discovered readers: [{address, name, rssi}] */
    @ReactMethod
    fun getDiscoveredReaders(promise: Promise) {
        val devices = MainApplication.bleService.getDiscoveredBleDevices() ?: emptyList()
        val arr = Arguments.createArray()
        for (d in devices) {
            val map = Arguments.createMap()
            map.putString("address", d.address)
            map.putString("name", d.name ?: "")
            map.putInt("rssi", d.rssi)
            arr.pushMap(map)
        }
        promise.resolve(arr)
    }

    /** Transmit credential to the reader at the given address (from a prior scan). */
    @ReactMethod
    fun transmitToAddress(address: String, promise: Promise) {
        val ble = MainApplication.bleService
        val target = ble.getDiscoveredBleDevices()?.firstOrNull { it.address == address }
            ?: run { promise.reject("NOT_FOUND", "Reader $address not in scan results."); return }
        scope.launch {
            try {
                ble.transmitBLEID(target)
                promise.resolve(target.name ?: target.address)
            } catch (e: Exception) {
                promise.reject("TRANSMIT_FAILED", e.message ?: "Transmit failed.")
            }
        }
    }

    override fun invalidate() {
        scope.cancel()
        super.invalidate()
    }
}
