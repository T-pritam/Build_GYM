import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const { width, height } = Dimensions.get('window');

const CONFETTI = [
  { top: '22%', left: '18%', color: COLORS.secondary + '66' },
  { top: '30%', right: '20%', color: '#EAB308' + '55' },
  { bottom: '28%', left: '28%', color: COLORS.secondary + '99' },
  { top: '48%', right: '8%', color: '#F97316' + '66' },
  { bottom: '46%', left: '6%', color: '#FEF08A' + '33' },
];

export default function WelcomeScreen({ route, navigation }) {
  const firstName = route?.params?.firstName || 'Member';
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(40)).current;
  const btnAnim = useRef(new Animated.Value(60)).current;
  const glowPulse = useRef(new Animated.Value(0.08)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(cardAnim, { toValue: 0, tension: 70, friction: 8, useNativeDriver: true }),
        Animated.spring(btnAnim, { toValue: 0, tension: 70, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 0.18, duration: 1800, useNativeDriver: false }),
        Animated.timing(glowPulse, { toValue: 0.08, duration: 1800, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Radial glow background */}
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowPulse,
          },
        ]}
      />

      {/* Confetti dots */}
      {CONFETTI.map((dot, i) => (
        <View key={i} style={[styles.confettiDot, dot, { backgroundColor: dot.color }]} />
      ))}

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.replace('Login')}>
          <Ionicons name="close" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.brandLabel}>BUILD GYM</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main content */}
      <Animated.View
        style={[
          styles.mainContent,
          { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoGlow} />
          <View style={styles.logoBox}>
            <Ionicons name="barbell-outline" size={56} color={COLORS.background} />
          </View>
        </View>

        {/* Heading */}
        <View style={styles.headingWrap}>
          <Text style={styles.heading}>Welcome to BUILD,{'\n'}{firstName}! 💪</Text>
          <Text style={styles.subheading}>YOUR FITNESS JOURNEY STARTS NOW</Text>
        </View>
      </Animated.View>

      {/* Member ID Card */}
      <Animated.View
        style={[
          styles.cardContainer,
          { transform: [{ translateY: cardAnim }], opacity: opacityAnim },
        ]}
      >
        <View style={styles.card}>
          {/* Internal glow */}
          <View style={styles.cardGlow} />

          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.memberId}>Member ID: BG-00425</Text>
              <Text style={styles.memberName}>{firstName} Sharma</Text>
            </View>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeLabel}>Active</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={14} color={COLORS.textMuted} />
            </View>
            <Text style={styles.tierLabel}>PREMIUM TIER</Text>
          </View>
        </View>
      </Animated.View>

      {/* Bottom CTA */}
      <Animated.View
        style={[
          styles.bottomArea,
          { transform: [{ translateY: btnAnim }], opacity: opacityAnim },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.replace('MainTabs')}
          activeOpacity={0.85}
          style={styles.ctaBtn}
        >
          <LinearGradient
            colors={[COLORS.secondary, COLORS.secondaryDark]}
            style={styles.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.ctaText}>GO TO DASHBOARD</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.white} style={{ marginLeft: 8 }} />
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.copyright}>© 2024 BUILD GYM PERFORMANCE</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.secondary,
    borderRadius: width / 2,
    transform: [{ scale: 2 }],
  },

  confettiDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
    zIndex: 10,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  brandLabel: {
    fontSize: 12, fontWeight: '800', color: COLORS.white,
    letterSpacing: 4, opacity: 0.5,
  },

  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },

  logoWrap: { marginBottom: 48, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  logoGlow: {
    position: 'absolute',
    width: 120, height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.secondary,
    opacity: 0.12,
  },
  logoBox: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 12,
  },

  headingWrap: { alignItems: 'center' },
  heading: {
    fontSize: 36, fontWeight: '800', color: COLORS.white,
    textAlign: 'center', lineHeight: 44, marginBottom: 8,
  },
  subheading: {
    fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 3, textAlign: 'center',
  },

  cardContainer: { paddingHorizontal: 24, marginBottom: 24, zIndex: 10 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute', top: -40, right: -40,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: COLORS.secondary,
    opacity: 0.05,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  memberId: { fontSize: 16, fontWeight: '800', color: COLORS.white, marginBottom: 4 },
  memberName: { fontSize: 14, fontWeight: '500', color: COLORS.textMuted },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  activeLabel: { fontSize: 10, fontWeight: '900', color: '#4ADE80', letterSpacing: 2 },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  avatarCircle: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: COLORS.surface,
    backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center',
  },
  tierLabel: {
    fontSize: 9, fontWeight: '900', color: COLORS.textMuted,
    letterSpacing: 2, fontStyle: 'italic',
  },

  bottomArea: { paddingHorizontal: 24, paddingBottom: 40, zIndex: 10 },
  ctaBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  ctaGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18,
  },
  ctaText: {
    fontSize: 15, fontWeight: '800', color: COLORS.white, letterSpacing: 2,
  },
  copyright: {
    textAlign: 'center', fontSize: 10, color: COLORS.textMuted,
    opacity: 0.4, letterSpacing: 1,
  },
});
