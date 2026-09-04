//
//  RosslareBle.m
//  BuildGym
//
//  Bridges RosslareBle.swift into the React Native module registry. The method
//  signatures mirror the Android module so bleService.js is platform-agnostic.
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RosslareBle, NSObject)

RCT_EXTERN_METHOD(setCredential:(NSString *)hex
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(autoUnlock:(nonnull NSNumber *)timeoutSeconds
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getDiscoveredReaders:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(transmitToAddress:(NSString *)address
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
