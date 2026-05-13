package com.buildgym.app

import android.app.Application
import android.content.res.Configuration
import android.nfc.NfcAdapter
import android.provider.Settings
import android.util.Log

import com.buildgym.BuildConfig
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
import com.rosslare.blelib.BleService
import com.rosslare.cardemulation.NfcService

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  companion object {
    private const val TAG = "RosslareSDK"

    lateinit var bleService: BleService
    var nfcService: NfcService? = null
  }

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              add(RosslarePackage())
            }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  // Returns the ANDROID_ID hex string as a signed Long by reading the raw bytes
  // big-endian — exactly how setAutoBLEID() encodes it internally.
  // Used only for NFC (which requires a Long) and for logging.
  private fun androidIdAsLong(): Long {
    val hex = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) ?: return 0L
    return java.lang.Long.parseUnsignedLong(hex, 16)
  }

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)

    val androidId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) ?: ""
    Log.d(TAG, "BLE credential ID (ANDROID_ID hex): $androidId")

    try {
      // BleService constructor calls setAutoBLEID() automatically — DO NOT call
      // setCustomBLEID() here. setCustomBLEID(long) reverses the byte order, so
      // the transmitted credential would not match the registered ANDROID_ID.
      bleService = BleService(this, TAG, false)
      bleService.init()
      Log.d(TAG, "BLE service initialized with auto credential")
    } catch (e: Exception) {
      Log.e(TAG, "BLE init failed: ${e.javaClass.simpleName} — ${e.message}")
    }

    try {
      if (NfcAdapter.getDefaultAdapter(this) != null) {
        nfcService = NfcService(this, TAG, false)
        // NFC requires a Long — use the big-endian interpretation of ANDROID_ID bytes,
        // which is the same value AxTraxPro stores as iCardCode.
        nfcService?.SetCustomNfcID(androidIdAsLong())
        Log.d(TAG, "NFC credential ID: $androidId")
      } else {
        Log.d(TAG, "NFC not available on this device — skipping NFC init")
      }
    } catch (e: Exception) {
      Log.e(TAG, "NFC init failed: ${e.javaClass.simpleName} — ${e.message}")
    }
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
