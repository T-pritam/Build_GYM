/**
 * SafeBottomBar
 * ─────────────────────────────────────────────────────────────
 * Reusable wrapper for floating / sticky bottom elements.
 * Automatically applies the device's bottom safe-area inset
 * so content never hides behind the Android gesture bar or
 * iOS home indicator.
 *
 * Usage:
 *   <SafeBottomBar style={styles.footer}>
 *     <TouchableOpacity …>…</TouchableOpacity>
 *   </SafeBottomBar>
 *
 * Props:
 *   style      – extra styles merged onto the container
 *   minPadding – minimum paddingBottom when inset is 0 (default 16)
 *   children   – inner content
 */
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SafeBottomBar({ children, style, minPadding = 16 }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[{ paddingBottom: Math.max(insets.bottom, minPadding) }, style]}>
      {children}
    </View>
  );
}
