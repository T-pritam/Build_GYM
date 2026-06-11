import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Frosted-glass card — faithful to the login mockup:
 *   backdrop-blur-[20px] · bg-white/[0.05] · border-primary-container/40
 *   · rounded-xl · 1px top sheen (transparent → #7f29ff → transparent, .8)
 *
 * Real blur over the textured background (frosted glass), not a flat fill.
 * No coloured drop-shadow — the new RN arch renders shadowColor on Android,
 * which haloed the card purple.
 */
export default function GlassCard({ children, style }) {
  return (
    <View style={[styles.card, style]}>
      {/* ── Background · OPTION A: Frosted glass (current) ──────────────────
          Comment out this BlurView + veil to disable the glass look. */}
      {/* <BlurView
        intensity={28}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      /> */}
      {/* bg-white/[0.05] frost veil */}
      {/* <View style={[StyleSheet.absoluteFill, styles.veil]} pointerEvents="none" /> */}

      {/* ── Background · OPTION B: Solid #1b191e ────────────────────────────
          Uncomment the line below (and comment OPTION A above) to use a flat
          solid background instead of the frosted glass. */}
      <View style={[StyleSheet.absoluteFill, styles.solid]} pointerEvents="none" />

      {/* Shiny top edge gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(127,41,255,0.8)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.sheen}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,                       // rounded-xl (0.75rem)
    borderWidth: 1,
    borderColor: 'rgba(127,41,130,0.40)',   // border-primary-container/40
    backgroundColor: 'transparent',
    padding: 24,
    overflow: 'hidden',
  },
  veil: { backgroundColor: 'rgba(255,255,255,0.05)' },
  solid: { backgroundColor: '#1b191e' },   // OPTION B flat background
  sheen: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1, opacity: 0.8,
  },
});
