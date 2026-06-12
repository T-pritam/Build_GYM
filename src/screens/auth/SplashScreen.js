import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { consumeColdStartData, handleNotificationData } from '../../services/notificationService';

const { width, height } = Dimensions.get('window');
const LOGO = width * 0.44;

// ─── Single dumbbell drawn with Views ────────────────────────────────────────
function Dumbbell({ rotation = '0deg', size = LOGO }) {
  const plateW = size * 0.115;
  const plateH = size * 0.30;
  const barW   = size * 0.40;
  const barH   = size * 0.085;
  const gap    = size * 0.03;

  return (
    <View style={[styles.dumbbell, { transform: [{ rotate: rotation }] }]}>
      {/* Left weight plates */}
      <View style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 2 }}>
        <View style={{ width: plateW * 0.65, height: plateH * 0.8, backgroundColor: '#fff', borderRadius: 3 }} />
        <View style={{ width: plateW, height: plateH, backgroundColor: '#fff', borderRadius: 3 }} />
      </View>

      {/* Bar */}
      <View style={{ width: barW, height: barH, backgroundColor: '#fff', borderRadius: 2, marginHorizontal: gap }} />

      {/* Right weight plates */}
      <View style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 2 }}>
        <View style={{ width: plateW, height: plateH, backgroundColor: '#fff', borderRadius: 3 }} />
        <View style={{ width: plateW * 0.65, height: plateH * 0.8, backgroundColor: '#fff', borderRadius: 3 }} />
      </View>
    </View>
  );
}

// ─── Full BUILD logo mark ────────────────────────────────────────────────────
function BuildLogoMark({ size = LOGO }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Dumbbell 1 — tilted 45° */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Dumbbell rotation="-45deg" size={size} />
      </View>
      {/* Dumbbell 2 — tilted 45° other way */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Dumbbell rotation="45deg" size={size} />
      </View>
      {/* Dumbbell 3 — horizontal */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Dumbbell rotation="0deg" size={size * 0.85} />
      </View>
      {/* Dumbbell 4 — vertical */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Dumbbell rotation="90deg" size={size * 0.85} />
      </View>
      {/* Center knot */}
      <View style={{ position: 'absolute', width: size * 0.085, height: size * 0.085, borderRadius: size * 0.042, backgroundColor: COLORS.background }} />
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SplashScreen({ navigation }) {
  const fadeAnim      = useRef(new Animated.Value(0)).current;
  const scaleAnim     = useRef(new Animated.Value(0.75)).current;
  const taglineAnim   = useRef(new Animated.Value(0)).current;
  const lineWidthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // Run animation independently (fire-and-forget)
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(taglineAnim,   { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(lineWidthAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
      ]),
    ]).start();

    // AppNavigator already called initialize() on mount — SecureStore is read
    // before this screen ever mounts. Just wait for the animation minimum.
    let cancelled = false;
    new Promise((resolve) => setTimeout(resolve, 3200)).then(() => {
      if (cancelled) return;
      const { isAuthenticated, user } = useAuthStore.getState();
      if (isAuthenticated && user) {
        if (user.onboardingCompleted) {
          navigation.replace('MainTabs');
          const pending = consumeColdStartData();
          if (pending) setTimeout(() => handleNotificationData(pending), 400);
        } else {
          navigation.replace('Onboarding');
        }
      } else {
        navigation.replace('Login');
      }
    });

    return () => { cancelled = true; };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Holographic center glow */}
      <LinearGradient
        colors={['rgba(127,41,130,0.22)', 'rgba(6,182,212,0.06)', 'transparent']}
        style={styles.glow}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />

      {/* Logo mark + brand name */}
      <Animated.View
        style={[styles.logoWrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
      >
        <BuildLogoMark size={LOGO} />

        {/* "BUILD" word-mark */}
        <Text style={styles.brandName}>BUILD</Text>

        {/* Divider line — holographic gradient */}
        <Animated.View
          style={[
            styles.divider,
            {
              width: lineWidthAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, width * 0.42],
              }),
            },
          ]}
        >
          <LinearGradient
            colors={GRADIENTS.violetCyan}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineAnim }]}>
        PHYSIQUE · DISCIPLINE · LIFESTYLE
      </Animated.Text>

      {/* Footer */}
      <Animated.Text style={[styles.footer, { opacity: taglineAnim }]}>
        Powered by Techspirit Labs
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 460,
    height: 460,
    borderRadius: 230,
    alignSelf: 'center',
    top: height * 0.5 - 230,
  },
  logoWrap: {
    alignItems: 'center',
    gap: 14,
  },
  dumbbell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  brandName: {
    fontFamily: FONTS.display,
    fontSize: 50,
    color: COLORS.white,
    letterSpacing: 14,
    marginTop: 8,
  },
  divider: {
    height: 2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  tagline: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.primaryLight,
    letterSpacing: 3,
    marginTop: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 44,
    fontFamily: FONTS.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 1,
  },
});
