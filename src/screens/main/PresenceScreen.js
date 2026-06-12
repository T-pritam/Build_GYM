import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing,
  Image,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { fetchGymPresence, gymCheckIn, gymCheckOut } from '../../services/gymService';
import { fetchMyMembership } from '../../services/membershipService';
import { getSocket } from '../../services/socketService';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS as THEME, FONTS } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { logEvent } from '../../services/analyticsService';
import AccessDial from '../../components/AccessDial';

// Theme-compat: legacy colour keys → new "Holographic Noir" palette.
const COLORS = {
  background: '#050405', surface: '#1B191E', surface2: THEME.surface2,
  secondary: THEME.primaryLight, secondaryDark: THEME.primary, secondaryGlow: THEME.primarySoft, secondaryBorder: THEME.primaryBorder,
  primary: THEME.primary, cyan: '#00F2FF',
  success: THEME.success, successLight: THEME.successSoft, error: '#F44336', errorLight: 'rgba(244,67,54,0.12)',
  textPrimary: THEME.textPrimary, textSecondary: THEME.textSecondary, textMuted: THEME.textMuted,
  border: THEME.border, glass: 'rgba(255,255,255,0.05)', glassBorder: 'rgba(255,255,255,0.08)',
  white: THEME.white,
};

const GREEN = '#00FF64';
const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

export default function PresenceScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);

  const [myStatus, setMyStatus] = useState('out'); // 'in' | 'out'
  const [count, setCount] = useState(0);
  const [actionStatus, setActionStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [cooldownSecs, setCooldownSecs] = useState(0);

  const [membership, setMembership] = useState(null);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;
  const cooldownTimer = useRef(null);
  const pollTimer = useRef(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [presenceRes, memRes] = await Promise.allSettled([
        fetchGymPresence(),
        fetchMyMembership(),
      ]);
      if (presenceRes.status === 'fulfilled') {
        setCount(presenceRes.value?.count ?? 0);
        setMyStatus(presenceRes.value?.myStatus ?? 'out');
      }
      if (memRes.status === 'fulfilled') setMembership(memRes.value);
    } finally {
      setMembershipLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Real-time socket updates ──────────────────────────────────────────────

  useEffect(() => {
    const socket = getSocket();
    const handler = ({ count: newCount }) => setCount(newCount);
    socket.on('gym:presence_updated', handler);
    return () => socket.off('gym:presence_updated', handler);
  }, []);

  // ── Fallback poll every 60s ───────────────────────────────────────────────

  useEffect(() => {
    pollTimer.current = setInterval(() => {
      fetchGymPresence()
        .then((d) => { if (d) setCount(d.count); })
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(pollTimer.current);
  }, []);

  // ── Cooldown countdown ────────────────────────────────────────────────────

  useEffect(() => {
    if (!cooldownUntil) return;
    const tick = () => {
      const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setCooldownUntil(null);
        setCooldownSecs(0);
        clearInterval(cooldownTimer.current);
      } else {
        setCooldownSecs(remaining);
      }
    };
    tick();
    cooldownTimer.current = setInterval(tick, 1000);
    return () => clearInterval(cooldownTimer.current);
  }, [cooldownUntil]);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ── Pulse animation ───────────────────────────────────────────────────────

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.3, duration: 350, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, easing: Easing.in(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseOpacity.stopAnimation();
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    Animated.timing(pulseOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  };

  // ── Tap handler ───────────────────────────────────────────────────────────

  const handleTap = async () => {
    if (actionStatus !== 'idle' || cooldownUntil) return;
    setActionStatus('loading');
    startPulse();
    try {
      const isCheckIn = myStatus === 'out';
      const result = isCheckIn ? await gymCheckIn() : await gymCheckOut();
      stopPulse();
      if (isCheckIn && result.myStatus === 'in') {
        const now = new Date();
        const hour = now.getHours();
        const timeOfDay = hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
        logEvent('check_in_done', {
          member_id: user?.displayId ?? 'guest',
          time_of_day: timeOfDay,
          day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
        }).catch(() => {});
      }
      setMyStatus(result.myStatus);
      setCount(result.count);
      setActionStatus('success');
      setCooldownUntil(Date.now() + COOLDOWN_MS);
      setTimeout(() => setActionStatus('idle'), 2000);
    } catch (err) {
      stopPulse();
      const status = err?.response?.status;
      if (status === 409) {
        // Already in the desired state — treat as success, re-fetch actual state
        fetchGymPresence().then((d) => {
          if (d) { setMyStatus(d.myStatus); setCount(d.count); }
        }).catch(() => {});
        setActionStatus('success');
        setCooldownUntil(Date.now() + COOLDOWN_MS);
        setTimeout(() => setActionStatus('idle'), 2000);
      } else {
        setActionStatus('error');
        setTimeout(() => setActionStatus('idle'), 2000);
      }
    }
  };

  // ── Derived display values ────────────────────────────────────────────────

  const isCheckingIn = myStatus === 'out';

  const getStatusMsg = () => {
    if (cooldownUntil && actionStatus === 'idle') return `Wait ${cooldownSecs}s before next tap`;
    if (actionStatus === 'loading') return isCheckingIn ? 'Checking in...' : 'Checking out...';
    if (actionStatus === 'success') return isCheckingIn ? 'Checked out ✓' : 'Checked in ✓';
    if (actionStatus === 'error') return 'Something went wrong';
    if (!isCheckingIn) return 'Tap to Check Out';
    return 'Tap to Check In';
  };

  const getStatusColor = () => {
    if (actionStatus === 'success') return COLORS.success;
    if (actionStatus === 'error') return COLORS.error;
    if (actionStatus === 'loading') return COLORS.secondary;
    if (!isCheckingIn) return COLORS.success;
    return COLORS.textSecondary;
  };

  const isButtonDisabled = actionStatus !== 'idle' || !!cooldownUntil;

  const displayName = user?.fullName || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Member';
  const photoUrl = user?.profilePhotoUrl || null;
  const shortId = user?.id ? user.id.split('-')[0].toUpperCase() : '------';

  const memStatus = membership?.membership?.status ?? 'inactive';
  const memActive = memStatus === 'active';

  // Action-available colour: check-in = lavender, check-out = green.
  const coreAccent = isCheckingIn ? COLORS.secondary : COLORS.success;

  const coreIcon = actionStatus === 'loading'
    ? <ActivityIndicator size="small" color={coreAccent} />
    : actionStatus === 'success'
      ? <Ionicons name="checkmark-circle" size={34} color={COLORS.success} />
      : actionStatus === 'error'
        ? <Ionicons name="close-circle" size={34} color={COLORS.error} />
        : myStatus === 'in'
          ? <Ionicons name="exit-outline" size={34} color={coreAccent} />
          : <Ionicons name="enter-outline" size={34} color={coreAccent} />;

  const coreLabel = actionStatus === 'loading'
    ? (isCheckingIn ? 'Checking In…' : 'Checking Out…')
    : (isCheckingIn ? 'Tap to Check In' : 'Tap to Check Out');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {/* Purple radial glow from the bottom */}
      <LinearGradient
        colors={['transparent', 'rgba(127,41,130,0.35)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0.4 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gym Presence</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* TEMP: entry point to the real Access Control screen (remove once wired into the flow) */}
          <TouchableOpacity style={styles.liveChip} onPress={() => navigation?.navigate('AccessControl')} hitSlop={6}>
            <Ionicons name="flash-outline" size={12} color={COLORS.cyan} />
            <Text style={styles.liveChipText}>LIVE</Text>
          </TouchableOpacity>
          <View style={[styles.countPill, myStatus === 'in' && styles.countPillIn]}>
            <View style={[styles.countDot, { backgroundColor: myStatus === 'in' ? GREEN : COLORS.textMuted }]} />
            <Text style={[styles.countPillText, { color: myStatus === 'in' ? GREEN : COLORS.textMuted }]}>
              {count} IN GYM
            </Text>
          </View>
        </View>
      </View>

      {/* Member card */}
      <View style={styles.memberCard}>
        <View style={styles.photoWrap}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.memberPhoto} />
          ) : (
            <LinearGradient colors={['rgba(127,41,130,0.4)', COLORS.surface2]} style={styles.memberPhotoPlaceholder}>
              <Ionicons name="person-circle-outline" size={36} color={COLORS.secondary} />
            </LinearGradient>
          )}
        </View>
        <View style={styles.memberCardInfo}>
          <View style={styles.memberCardTopRow}>
            <Text style={styles.memberCardName}>{displayName}</Text>
            {!membershipLoading && (
              <View style={[styles.statusChip, memActive ? styles.statusChipActive : styles.statusChipInactive]}>
                <Text style={[styles.statusChipText, { color: memActive ? GREEN : COLORS.error }]}>
                  {memActive ? 'ACTIVE' : 'INACTIVE'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.memberCardId}>ID: {shortId}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.secondary} colors={[COLORS.secondary]} />
        }
      >
        {/* Precision dial — arc is a CHECK IN / CHECK OUT status indicator */}
        <View style={styles.dialArea}>
          <AccessDial
            leftLabel="CHECK IN"
            rightLabel="CHECK OUT"
            leftColor={COLORS.secondary}
            rightColor={COLORS.success}
            activeSide={isCheckingIn ? 'left' : 'right'}
            onCorePress={handleTap}
            coreDisabled={isButtonDisabled}
            coreIcon={coreIcon}
            coreLabel={coreLabel}
            coreAccent={coreAccent}
            scanning={actionStatus === 'loading'}
            pulseScale={pulseAnim}
            pulseOpacity={pulseOpacity}
          />
        </View>

        {/* Status text */}
        <Text style={[styles.statusMsg, { color: getStatusColor() }]}>{getStatusMsg()}</Text>

        {/* Live count card */}
        <View style={styles.liveCard}>
          <View style={styles.liveCardLeft}>
            <View style={styles.liveIconWrap}>
              <Ionicons name="people" size={24} color={COLORS.secondary} />
            </View>
            <View>
              <View style={styles.liveLabelRow}>
                <View style={styles.liveDot} />
                <Text style={styles.liveLabel}>IN THE GYM NOW</Text>
              </View>
              <View style={styles.liveValueRow}>
                <Text style={styles.liveValue}>{count}</Text>
                <Text style={styles.liveUnit}>members</Text>
              </View>
            </View>
          </View>
          <View style={[styles.myStatusBadge, myStatus === 'in' ? styles.myStatusIn : styles.myStatusOut]}>
            <Ionicons
              name={myStatus === 'in' ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={myStatus === 'in' ? GREEN : COLORS.textMuted}
            />
            <Text style={[styles.myStatusText, { color: myStatus === 'in' ? GREEN : COLORS.textMuted }]}>
              {myStatus === 'in' ? 'YOU\'RE IN' : 'YOU\'RE OUT'}
            </Text>
          </View>
        </View>

        {/* Membership footer */}
        {!membershipLoading && (
          <View style={styles.footer}>
            <View style={styles.footerRow}>
              <Ionicons name="shield-checkmark-outline" size={15} color={memActive ? GREEN : COLORS.error} />
              <Text style={[styles.footerText, { color: memActive ? GREEN : COLORS.error }]}>
                Membership: {memStatus.toUpperCase()}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  circle1: {
    position: 'absolute', width: 400, height: 400, borderRadius: 200,
    backgroundColor: 'rgba(127,41,130,0.05)', top: -100, right: -100,
  },
  circle2: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(0,242,255,0.03)', bottom: 50, left: -80,
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 24, paddingBottom: 8,
  },
  headerTitle: { fontFamily: FONTS.headline, fontSize: 20, color: COLORS.textPrimary },

  liveChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20,
    backgroundColor: 'rgba(0,242,255,0.08)', borderWidth: 1, borderColor: 'rgba(0,242,255,0.25)',
  },
  liveChipText: { fontFamily: FONTS.label, fontSize: 9, color: COLORS.cyan, letterSpacing: 1 },

  countPill: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.glassBorder, gap: 6,
  },
  countPillIn: { backgroundColor: 'rgba(0,255,100,0.10)', borderColor: 'rgba(0,255,100,0.30)' },
  countDot: { width: 6, height: 6, borderRadius: 3 },
  countPillText: { fontFamily: FONTS.label, fontSize: 10, letterSpacing: 0.5 },

  memberCard: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 24,
    marginTop: 16, marginBottom: 4, backgroundColor: COLORS.glass,
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.glassBorder, padding: 14, gap: 14,
  },
  photoWrap: {},
  memberPhoto: { width: 56, height: 56, borderRadius: 28 },
  memberPhotoPlaceholder: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.glassBorder,
  },
  memberCardInfo: { flex: 1 },
  memberCardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberCardName: { fontFamily: FONTS.headline, fontSize: 17, color: COLORS.textPrimary },
  memberCardId: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1, marginTop: 2 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  statusChipActive: { backgroundColor: 'rgba(0,255,100,0.15)', borderColor: 'rgba(0,255,100,0.30)' },
  statusChipInactive: { backgroundColor: 'rgba(244,67,54,0.12)', borderColor: 'rgba(244,67,54,0.30)' },
  statusChipText: { fontFamily: FONTS.label, fontSize: 9, letterSpacing: 1 },

  scroll: { paddingBottom: 40, paddingTop: 24 },
  dialArea: { alignItems: 'center', marginBottom: 12 },
  statusMsg: { textAlign: 'center', fontFamily: FONTS.bodyBold, fontSize: 14, marginBottom: 24 },

  liveCard: {
    marginHorizontal: 24, marginBottom: 20,
    backgroundColor: COLORS.glass, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  liveCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  liveIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.secondaryGlow, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.secondaryBorder,
  },
  liveLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: GREEN },
  liveLabel: { fontFamily: FONTS.label, fontSize: 9, color: COLORS.textMuted, letterSpacing: 2 },
  liveValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  liveValue: { fontFamily: FONTS.headline, fontSize: 26, color: COLORS.white },
  liveUnit: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary },

  myStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1,
  },
  myStatusIn: { backgroundColor: 'rgba(0,255,100,0.10)', borderColor: 'rgba(0,255,100,0.30)' },
  myStatusOut: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: COLORS.glassBorder },
  myStatusText: { fontFamily: FONTS.label, fontSize: 10, letterSpacing: 0.5 },

  footer: { alignItems: 'center', gap: 6, marginTop: 4 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontFamily: FONTS.label, fontSize: 10, letterSpacing: 1.5 },
});
