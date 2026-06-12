/**
 * AccessDeniedScreen
 * ─────────────────────────────────────────────────────────────
 * Full-screen result shown after a failed door unlock (BLE/AxTraxPro).
 * Mockup: NewUi/build_access_denied/code.html.
 * Auto-returns to the access screen after 3 s; also offers Try Again / Home.
 *
 * Route params: { memberName, memberId, accessPoint, time, reason }
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { COLORS, FONTS, GRADIENTS } from '../../theme';
import SafeBottomBar from '../../components/SafeBottomBar';

const RED = '#F44336';
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function AccessDeniedScreen({ navigation, route }) {
  const {
    memberName = 'Member',
    memberId = '------',
    accessPoint = 'Main Entrance',
    time = '',
    reason = 'BLE authentication failed',
  } = route?.params ?? {};

  const circleDash = useRef(new Animated.Value(300)).current;
  const xDash = useRef(new Animated.Value(50)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const navigated = useRef(false);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(circleDash, { toValue: 0, duration: 800, useNativeDriver: false }),
      Animated.timing(xDash, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    ).start();

    const timer = setTimeout(() => { if (!navigated.current) navigation.goBack(); }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const go = (fn) => { navigated.current = true; fn(); };

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <LinearGradient
        colors={['rgba(244,67,54,0.16)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0.3 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />

      <View style={styles.center}>
        {/* Animated X-in-circle */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulse }] }]}>
          <Svg width={90} height={90} viewBox="0 0 90 90" fill="none">
            <AnimatedCircle
              cx={45} cy={45} r={43} stroke={RED} strokeWidth={4}
              strokeDasharray={300} strokeDashoffset={circleDash}
            />
            <AnimatedPath
              d="M30 30L60 60" stroke={COLORS.white} strokeWidth={6} strokeLinecap="round"
              strokeDasharray={50} strokeDashoffset={xDash}
            />
            <AnimatedPath
              d="M60 30L30 60" stroke={COLORS.white} strokeWidth={6} strokeLinecap="round"
              strokeDasharray={50} strokeDashoffset={xDash}
            />
          </Svg>
        </Animated.View>

        <Text style={styles.title}>ACCESS DENIED</Text>
        <Text style={styles.subtitle}>
          Your entry could not be verified.{'\n'}Please contact reception for assistance.
        </Text>

        <View style={styles.card}>
          <Row label="Member" value={memberName} bold />
          <Row label="ID" value={memberId} mono />
          <Row label="Access Point" value={accessPoint} />
          <Row label="Time" value={time} />
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.rowLabel}>Status</Text>
            <Text style={styles.statusDenied}>DENIED</Text>
          </View>
          <Text style={styles.reason}>Reason: {reason}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => go(() => navigation.goBack())} style={styles.tryWrap}>
          <LinearGradient
            colors={GRADIENTS.violetCyan}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.tryBtn}
          >
            <Text style={styles.tryText}>TRY AGAIN</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={() => go(() => navigation.navigate('MainTabs'))} style={styles.homeBtn}>
          <Text style={styles.homeText}>BACK TO HOME</Text>
        </TouchableOpacity>
      </View>
    </SafeBottomBar>
  );
}

function Row({ label, value, mono, bold }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.rowValueMono, bold && { fontFamily: FONTS.bodyBold }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0F' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },

  iconWrap: {
    width: 90, height: 90, borderRadius: 45, marginBottom: 28,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(13,14,18,0.5)',
  },
  title: {
    fontFamily: FONTS.headline, fontSize: 24, color: COLORS.white,
    letterSpacing: 1.5, marginBottom: 10, textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 20, marginBottom: 28, opacity: 0.85,
  },

  card: {
    width: '90%', backgroundColor: 'rgba(244,67,54,0.08)',
    borderWidth: 1, borderColor: 'rgba(244,67,54,0.30)', borderRadius: 16, padding: 20,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 10, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(244,67,54,0.20)',
  },
  rowLast: { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 6 },
  rowLabel: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary },
  rowValue: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.white },
  rowValueMono: { letterSpacing: 1 },
  statusDenied: { fontFamily: FONTS.bodyBold, fontSize: 13, color: RED, letterSpacing: 2 },
  reason: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.textMuted, textAlign: 'right', opacity: 0.8 },

  actions: { paddingHorizontal: 24, paddingTop: 12, gap: 10 },
  tryWrap: { borderRadius: 12, overflow: 'hidden' },
  tryBtn: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  tryText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.white, letterSpacing: 1.5 },
  homeBtn: { paddingVertical: 10, alignItems: 'center' },
  homeText: { fontFamily: FONTS.label, fontSize: 12, color: COLORS.textMuted, letterSpacing: 1.5 },
});
