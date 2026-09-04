//
//  RosslareBle.swift
//  BuildGym
//
//  iOS twin of android/app/src/main/java/com/buildgym/app/RosslareBleModule.kt.
//  Exposes the same three methods with the same promise/reject codes, so
//  src/services/bleService.js works unchanged on both platforms:
//
//      autoUnlock(timeoutSeconds)  -> reader name/UUID
//      getDiscoveredReaders()      -> [{ address, name, rssi }]
//      transmitToAddress(address)  -> reader name/UUID
//
//  Reject codes: PERMISSION_DENIED | BT_NOT_ENABLED | NO_READERS_FOUND
//                | TRANSMIT_FAILED | SCAN_ERROR | NOT_FOUND
//
//  Credential: Android's BleService constructor calls setAutoBLEID() (ANDROID_ID).
//  iOS has no ANDROID_ID, so the JS layer generates a stable 8-byte credential,
//  stores it in the keychain and pushes it here with setCredential(hex) before
//  every unlock — the same hex it registers with AxTraxPro.
//

import Foundation
import CoreBluetooth
import RosslareBleLib
import React

@objc(RosslareBle)
class RosslareBle: NSObject {

  /// One SDK instance for the process — the SDK owns its own CBCentralManager.
  private var bleService: BleService?
  /// Our own manager, used only to read Bluetooth power/authorization state so we
  /// can return BT_NOT_ENABLED / PERMISSION_DENIED instead of a silent timeout.
  private lazy var stateManager: CBCentralManager = {
    // Passing a nil queue is fine — we only read `state`/`authorization`.
    CBCentralManager(delegate: nil, queue: nil, options: [CBCentralManagerOptionShowPowerAlertKey: false])
  }()

  private var credentialId: UInt64?
  private let queue = DispatchQueue(label: "com.buildgym.rosslare.ble")

  @objc static func requiresMainQueueSetup() -> Bool { return false }

  // MARK: - Service lifecycle

  private func service() -> BleService {
    if let existing = bleService { return existing }
    let created = BleService()
    created.initService(withAnalytics: false)
    if let id = credentialId {
      created.setCustomBleId(id: id)
    } else {
      // Fall back to the SDK's own device-derived id. The backend will not know
      // it, so JS should always call setCredential() first.
      created.setAutoBleId()
    }
    bleService = created
    return created
  }

  /// Bluetooth availability, mapped onto the Android module's error codes.
  /// Returns nil when everything is ready.
  private func unavailableReason() -> String? {
    if #available(iOS 13.1, *) {
      switch CBCentralManager.authorization {
      case .denied, .restricted: return "PERMISSION_DENIED"
      default: break
      }
    }
    switch stateManager.state {
    case .poweredOn:    return nil
    case .poweredOff:   return "BT_NOT_ENABLED"
    case .unauthorized: return "PERMISSION_DENIED"
    case .unsupported:  return "BT_NOT_ENABLED"
    // .unknown/.resetting simply mean the manager has not settled yet; the SDK
    // will still scan, so do not block on them.
    default:            return nil
    }
  }

  // MARK: - Credential

  /// hex: 16-char big-endian hex string, e.g. "4EE4321A8434F7CF".
  @objc(setCredential:resolver:rejecter:)
  func setCredential(_ hex: String,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    let cleaned = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    guard let value = UInt64(cleaned, radix: 16) else {
      reject("INVALID_CREDENTIAL", "Expected a hex string, got \(hex)", nil)
      return
    }
    credentialId = value
    bleService?.setCustomBleId(id: value)
    resolve(cleaned.uppercased())
  }

  // MARK: - Unlock

  /// Scan for up to timeoutSeconds, then transmit to the strongest reader.
  @objc(autoUnlock:resolver:rejecter:)
  func autoUnlock(_ timeoutSeconds: NSNumber,
                  resolver resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    if let reason = unavailableReason() {
      reject(reason, reason == "BT_NOT_ENABLED"
             ? "Bluetooth is not enabled."
             : "Bluetooth permission is required to open the gate.", nil)
      return
    }

    let timeout = timeoutSeconds.doubleValue
    let ble = service()

    queue.async {
      ble.searchBleReaders(timeoutSec: timeout)

      // Poll until the first device appears or the scan window closes.
      let deadline = Date().addingTimeInterval(timeout)
      var devices = ble.getDiscoveredBleDevices()
      while devices.isEmpty && Date() < deadline {
        Thread.sleep(forTimeInterval: 0.5)
        devices = ble.getDiscoveredBleDevices()
      }

      guard let target = devices.max(by: { $0.rssi < $1.rssi }) else {
        reject("NO_READERS_FOUND", "No Rosslare readers found nearby.", nil)
        return
      }

      if ble.transmitBleId(currentDevice: target) {
        resolve(self.label(for: target))
      } else {
        reject("TRANSMIT_FAILED", "Reader moved out of range.", nil)
      }
    }
  }

  /// Current list of discovered readers from the last scan.
  @objc(getDiscoveredReaders:rejecter:)
  func getDiscoveredReaders(_ resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {
    let devices = service().getDiscoveredBleDevices()
    resolve(devices.map { device in
      [
        "address": device.peripheral.identifier.uuidString,
        "name": device.advertisementName,
        "rssi": device.rssi,
      ]
    })
  }

  /// Transmit the credential to one reader from a prior scan.
  @objc(transmitToAddress:resolver:rejecter:)
  func transmitToAddress(_ address: String,
                         resolver resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    let ble = service()
    guard let target = ble.getDiscoveredBleDevices()
      .first(where: { $0.peripheral.identifier.uuidString == address }) else {
      reject("NOT_FOUND", "Reader \(address) not in scan results.", nil)
      return
    }

    queue.async {
      if ble.transmitBleId(currentDevice: target) {
        resolve(self.label(for: target))
      } else {
        reject("TRANSMIT_FAILED", "Transmit failed.", nil)
      }
    }
  }

  private func label(for device: BleDeviceInfo) -> String {
    device.advertisementName.isEmpty
      ? device.peripheral.identifier.uuidString
      : device.advertisementName
  }
}
