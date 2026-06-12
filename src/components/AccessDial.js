/**
 * AccessDial
 * ─────────────────────────────────────────────────────────────
 * Shared "precision dial" control for the Access / Presence screens.
 * Mockup: NewUi/build_access_control_precision_dial/code.html.
 *
 *  · A semicircle arc with two labels (left / right). The active side is
 *    accent-coloured and an indicator dot animates (rotation) to it.
 *  · A large circular button with three concentric spinning rings around a
 *    glass core. The core shows a caller-supplied icon + label, and a pulse
 *    ring behind it while `scanning`.
 *
 * It carries no business logic — the parent decides what the sides mean
 * (GATE/LOCKER selector vs CHECK IN/OUT indicator) and what the tap does.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS } from '../theme';

const ARC_W = 200;
const ARC_H = 100;

function useSpin(duration, reverse = false) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [duration]);
  return v.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'],
  });
}

export default function AccessDial({
  leftLabel, rightLabel,
  leftColor, rightColor,
  activeSide = 'left',            // 'left' | 'right'
  onLeftPress, onRightPress,      // optional (selector mode)
  onCorePress, coreDisabled = false,
  coreIcon, coreLabel, coreAccent = COLORS.primaryLight,
  scanning = false, pulseScale, pulseOpacity,
}) {
  const accent = activeSide === 'left' ? leftColor : rightColor;

  // Indicator dot rotates 0deg (left) → 180deg (right) around the arc centre.
  const dotAnim = useRef(new Animated.Value(activeSide === 'left' ? 0 : 1)).current;
  useEffect(() => {
    Animated.timing(dotAnim, {
      toValue: activeSide === 'left' ? 0 : 1,
      duration: 400,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [activeSide]);
  const dotRotate = dotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  const outerSpin = useSpin(12000);
  const midSpin = useSpin(8000, true);
  const innerSpin = useSpin(4000);

  return (
    <View style={styles.wrap}>
      {/* ── Arc dial ─────────────────────────────────────────── */}
      <View style={styles.arcContainer}>
        <Svg width={ARC_W} height={ARC_H} viewBox="0 0 200 100">
          {/* Left quarter */}
          <Path
            d="M1 100 A99 99 0 0 1 100 1"
            stroke={activeSide === 'left' ? leftColor : 'rgba(255,255,255,0.10)'}
            strokeWidth={activeSide === 'left' ? 3 : 2}
            fill="none"
            strokeLinecap="round"
          />
          {/* Right quarter */}
          <Path
            d="M100 1 A99 99 0 0 1 199 100"
            stroke={activeSide === 'right' ? rightColor : 'rgba(255,255,255,0.10)'}
            strokeWidth={activeSide === 'right' ? 3 : 2}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>

        {/* Indicator dot (rotates around arc centre) */}
        <Animated.View style={[styles.indicatorWrap, { transform: [{ rotate: dotRotate }] }]}>
          <View style={[styles.indicatorDot, { backgroundColor: accent, shadowColor: accent }]} />
        </Animated.View>

        {/* Labels */}
        <TouchableOpacity
          style={[styles.label, styles.labelLeft]}
          onPress={onLeftPress}
          disabled={!onLeftPress}
          hitSlop={10}
        >
          <Text style={[styles.labelText, { color: activeSide === 'left' ? leftColor : COLORS.textMuted }]}>
            {leftLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.label, styles.labelRight]}
          onPress={onRightPress}
          disabled={!onRightPress}
          hitSlop={10}
        >
          <Text style={[styles.labelText, { color: activeSide === 'right' ? rightColor : COLORS.textMuted }]}>
            {rightLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Unlock button ───────────────────────────────────── */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onCorePress}
        disabled={coreDisabled}
        style={styles.btnArea}
      >
        {/* Scanning pulse ring */}
        {pulseScale && pulseOpacity ? (
          <Animated.View
            style={[styles.pulseRing, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]}
          />
        ) : null}

        {/* Spinning rings */}
        <Animated.View style={[styles.ringOuter, { transform: [{ rotate: outerSpin }] }]} />
        <Animated.View style={[styles.ringMid, { transform: [{ rotate: midSpin }] }]} />
        <Animated.View style={[styles.ringInnerWrap, { transform: [{ rotate: innerSpin }] }]}>
          <LinearGradient
            colors={GRADIENTS.holographic}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ringInner}
          />
        </Animated.View>

        {/* Glass core */}
        <View style={styles.core}>
          <View style={[styles.coreIconWrap, { backgroundColor: coreAccent + '1A' }]}>
            {coreIcon}
          </View>
          <Text style={[styles.coreLabel, scanning && { color: coreAccent }]}>{coreLabel}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const CORE = 180;
const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },

  // Arc
  arcContainer: { width: ARC_W, height: ARC_H, marginBottom: 28 },
  indicatorWrap: {
    position: 'absolute', top: 0, left: 0, width: 200, height: 200,
  },
  indicatorDot: {
    position: 'absolute', top: 94, left: -6, width: 12, height: 12, borderRadius: 6,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8, elevation: 6,
  },
  label: { position: 'absolute', bottom: -2 },
  labelLeft: { left: -22 },
  labelRight: { right: -30 },
  labelText: { fontFamily: FONTS.label, fontSize: 10, letterSpacing: 1.5 },

  // Button
  btnArea: { width: 210, height: 210, alignItems: 'center', justifyContent: 'center' },
  pulseRing: {
    position: 'absolute', width: 190, height: 190, borderRadius: 95,
    borderWidth: 2, borderColor: COLORS.primaryLight, backgroundColor: 'rgba(127,41,130,0.12)',
  },
  ringOuter: {
    position: 'absolute', width: 210, height: 210, borderRadius: 105,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  ringMid: {
    position: 'absolute', width: 196, height: 196, borderRadius: 98,
    borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(127,41,130,0.30)',
  },
  ringInnerWrap: {
    position: 'absolute', width: CORE + 8, height: CORE + 8, borderRadius: (CORE + 8) / 2,
    overflow: 'hidden',
  },
  ringInner: { flex: 1, borderRadius: (CORE + 8) / 2 },
  core: {
    width: CORE, height: CORE, borderRadius: CORE / 2,
    backgroundColor: COLORS.surfaceLow, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  coreIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  coreLabel: {
    fontFamily: FONTS.label, fontSize: 10, color: COLORS.textPrimary,
    letterSpacing: 2, textTransform: 'uppercase',
  },
});
