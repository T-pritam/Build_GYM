import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { FONTS } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const HOLD_MS = 2000;

/**
 * HoldUnlock — Stitch "Precision Access Control" press-and-hold dial.
 * Press and hold for ~2s; an SVG ring fills, then `onComplete` fires. Releasing
 * early animates the ring back. Carries no business logic — the parent decides
 * what completion does (real check-in vs locker shell).
 *
 * Props: size, stroke, color (progress stroke), icon (node), label, holdingLabel,
 *        disabled, onComplete.
 */
export default function HoldUnlock({
  size = 150,
  stroke = 4,
  color = '#00BCD4',
  trackColor = 'rgba(255,255,255,0.08)',
  icon,
  label = 'HOLD TO UNLOCK',
  holdingLabel = 'AUTHORIZING…',
  disabled = false,
  onComplete,
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const progress = useRef(new Animated.Value(0)).current;
  const [holding, setHolding] = useState(false);
  const completedRef = useRef(false);

  // Idle breathing glow on the face.
  const idle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(idle, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(idle, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ]));
    if (!disabled) loop.start();
    return () => loop.stop();
  }, [disabled, idle]);

  const offset = progress.interpolate({ inputRange: [0, 1], outputRange: [circ, 0] });

  const start = () => {
    if (disabled || completedRef.current) return;
    setHolding(true);
    Animated.timing(progress, {
      toValue: 1, duration: HOLD_MS, useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        completedRef.current = true;
        setHolding(false);
        onComplete?.();
      }
    });
  };

  const cancel = () => {
    if (completedRef.current) return;
    setHolding(false);
    progress.stopAnimation();
    Animated.timing(progress, { toValue: 0, duration: 250, useNativeDriver: false }).start();
  };

  const faceScale = idle.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] });
  const faceOpacity = idle.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const face = size - stroke * 2 - 14;

  return (
    <Pressable onPressIn={start} onPressOut={cancel} disabled={disabled} style={{ opacity: disabled ? 0.5 : 1 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={offset}
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <Animated.View
          style={[
            styles.face,
            { width: face, height: face, borderRadius: face / 2, transform: [{ scale: faceScale }], opacity: faceOpacity },
          ]}
        >
          {icon}
          <Text style={[styles.label, { color }]}>{holding ? holdingLabel : label}</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    backgroundColor: '#0D0D0F',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  label: {
    fontFamily: FONTS.label, fontSize: 9, letterSpacing: 1.5,
    textAlign: 'center', marginTop: 2,
  },
});
