import React, { useEffect, useRef, useState } from 'react';
import {
  Text, StyleSheet, Pressable, Animated, Easing, ActivityIndicator, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPE } from '../../theme';

/**
 * Holographic CTA — a continuously *flowing* purple→cyan→purple gradient
 * (the mockup's `bg-[length:200%_auto] animate-gradient`) plus a white shimmer
 * sweep (`animate-shimmer`). Handles loading / disabled states.
 *
 * Props: label, onPress, loading, disabled, icon (trailing Ionicons), style
 */
export default function HoloButton({ label, onPress, loading, disabled, icon, style }) {
  const [w, setW] = useState(0);
  const flow = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const inactive = disabled || loading;

  // Flowing gradient — slide a double-width strip by one period, looping.
  // Runs ALWAYS (even when disabled) so the CTA always feels alive, like the HTML.
  useEffect(() => {
    if (!w) return undefined;
    const loop = Animated.loop(
      Animated.timing(flow, {
        toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [w, flow]);

  // White shimmer sweep.
  useEffect(() => {
    if (!w) return undefined;
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [w, shimmer]);

  const flowX = flow.interpolate({ inputRange: [0, 1], outputRange: [0, -w] });
  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-160, w + 160] });

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={({ pressed }) => [
        styles.wrap,
        inactive && styles.disabled,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {/* Static base so there's always a gradient (before layout / when paused) */}
      <LinearGradient
        colors={['#7F2982', '#00F2FF', '#7F2982']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Flowing gradient strip (2× width, seamless A-B-A-B-A loop) */}
      {w > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.flowStrip, { width: w * 2, transform: [{ translateX: flowX }] }]}
        >
          <LinearGradient
            colors={['#7F2982', '#00F2FF', '#7F2982', '#00F2FF', '#7F2982']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      {/* Shimmer sweep */}
      {w > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.shimmer, { transform: [{ translateX: shimmerX }, { skewX: '-20deg' }] }]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <>
            <Text style={[TYPE.labelCaps, styles.label]}>{label}</Text>
            {!!icon && <Ionicons name={icon} size={18} color={COLORS.white} />}
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 56,
    borderRadius: 8,                    // rounded-lg
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderStrong,   // border-white/20
    justifyContent: 'center',
    shadowColor: COLORS.primary,        // shadow-[0_0_15px_rgba(127,41,130,0.4)]
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  disabled: { opacity: 0.55 },
  pressed: { transform: [{ scale: 0.97 }] },
  flowStrip: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  shimmer: { position: 'absolute', top: 0, bottom: 0, width: 120 },
  content: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  label: { color: COLORS.white, letterSpacing: 2.4 },
});
