/**
 * AccessGrantedScreen
 * ─────────────────────────────────────────────────────────────
 * Full-screen result shown after a successful door unlock (BLE/AxTraxPro).
 * Mockup: NewUi/build_entry_granted/code.html.
 * Auto-returns to the access screen after 3 s.
 *
 * Route params: { memberName, memberId, accessPoint, time }
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { COLORS, FONTS } from '../../theme';
import SafeBottomBar from '../../components/SafeBottomBar';

const GREEN = '#4CAF50';
const GREEN_BRIGHT = '#78DC77';
const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function AccessGrantedScreen({ navigation, route }) {
  const {
    memberName = 'Member',
    memberId = '------',
    accessPoint = 'Main Entrance',
    time = '',
  } = route?.params ?? {};

  const checkDash = useRef(new Animated.Value(48)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(checkDash, { toValue: 0, duration: 600, useNativeDriver: false }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => navigation.goBack(), 3000);
    return () => clearTimeout(timer);
  }, []);

  const firstName = memberName.split(' ')[0];

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <LinearGradient
        colors={['rgba(76,175,80,0.18)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />

      <View style={styles.center}>
        {/* Animated checkmark */}
        <View style={styles.iconRing}>
          <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
            <AnimatedPath
              d="M5 13l4 4L19 7"
              stroke={GREEN_BRIGHT}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={48}
              strokeDashoffset={checkDash}
            />
          </Svg>
        </View>

        <Text style={styles.title}>ENTRY GRANTED</Text>

        <Animated.View style={{ opacity: contentOpacity, width: '100%', alignItems: 'center' }}>
          <View style={styles.card}>
            <Row label="MEMBER" value={memberName} />
            <Row label="ID" value={memberId} mono />
            <Row label="ACCESS POINT" value={accessPoint} />
            <Row label="TIME" value={time} />
            <Row label="STATUS" value="GRANTED" valueColor={GREEN_BRIGHT} last />
          </View>

          <Text style={styles.greeting}>Welcome, {firstName}.</Text>
        </Animated.View>
      </View>
    </SafeBottomBar>
  );
}

function Row({ label, value, valueColor, mono, last }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.rowValueMono, valueColor && { color: valueColor, fontFamily: FONTS.bodyBold }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0F' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },

  iconRing: {
    width: 90, height: 90, borderRadius: 45, marginBottom: 20,
    borderWidth: 2, borderColor: GREEN, backgroundColor: 'rgba(76,175,80,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontFamily: FONTS.headline, fontSize: 26, color: COLORS.white,
    letterSpacing: 2, marginBottom: 32, textAlign: 'center',
  },

  card: {
    width: '90%', backgroundColor: 'rgba(76,175,80,0.10)',
    borderWidth: 1, borderColor: 'rgba(76,175,80,0.30)', borderRadius: 16, padding: 20,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 10, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowLast: { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 },
  rowLabel: { fontFamily: FONTS.label, fontSize: 11, color: COLORS.textSecondary, letterSpacing: 1 },
  rowValue: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.white },
  rowValueMono: { letterSpacing: 1 },

  greeting: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 28 },
});
