import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

/**
 * Wraps a subtree to render it visibly disabled for the legacy-gym build:
 * children stay mounted in normal layout flow (no reflow of siblings), a
 * blur + dim overlay sits on top, and that overlay is the only touch
 * target — it has no onPress, so taps are simply absorbed with no
 * navigation, toast, or alert.
 */
export default function GreyedOut({ children, style, intensity = 30 }) {
  return (
    <View style={style} pointerEvents="box-none">
      {children}
      <View style={StyleSheet.absoluteFill} pointerEvents="auto">
        <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.dim} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
});
