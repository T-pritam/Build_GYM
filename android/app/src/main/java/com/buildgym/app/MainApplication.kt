package com.buildgym.app

import android.app.Application
import android.content.SharedPreferences
import android.content.res.Configuration
import android.nfc.NfcAdapter
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

import java.util.UUID

class MainApplication : Application(), ReactApplication {

  companion object {
    private const val TAG = "RosslareSDK"
    private const val PREFS_NAME = "rosslare_prefs"
    private const val KEY_CREDENTIAL_ID = "credential_id"

    lateinit var bleService: BleService
    var nfcService: NfcService? = null
  }

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  private fun getOrCreateCredentialId(): Long {
    val prefs: SharedPreferences = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
    val stored = prefs.getLong(KEY_CREDENTIAL_ID, -1L)
    if (stored != -1L) return stored
    val generated = UUID.randomUUID().mostSignificantBits and Long.MAX_VALUE
    prefs.edit().putLong(KEY_CREDENTIAL_ID, generated).apply()
    return generated
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

    val credentialId = getOrCreateCredentialId()

    try {
      bleService = BleService(this, TAG, false)
      bleService.init()
      bleService.setCustomBLEID(credentialId)
      Log.d(TAG, "BLE credential ID: $credentialId")
    } catch (e: Exception) {
      Log.e(TAG, "BLE init failed: ${e.javaClass.simpleName} — ${e.message}")
    }

    try {
      if (NfcAdapter.getDefaultAdapter(this) != null) {
        nfcService = NfcService(this, TAG, false)
        nfcService?.SetCustomNfcID(credentialId)
        Log.d(TAG, "NFC credential ID: $credentialId")
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
