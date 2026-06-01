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
import { COLORS } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

export default function PresenceScreen() {
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
      const result = myStatus === 'out' ? await gymCheckIn() : await gymCheckOut();
      stopPulse();
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

  const getButtonColors = () => {
    if (actionStatus === 'success') return ['#1B5E20', '#4CAF50'];
    if (actionStatus === 'error') return ['#7F0000', '#D32F2F'];
    if (actionStatus === 'loading') return ['#1A0800', COLORS.secondaryDark];
    if (!isCheckingIn) return ['#1B5E20', '#388E3C']; // green when checked in
    return [COLORS.secondaryDark, COLORS.secondary];
  };

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
  const initials = displayName.charAt(0).toUpperCase();
  const shortId = user?.id ? user.id.split('-')[0].toUpperCase() : '------';

  const planName = membership?.plan?.name ?? 'Member';
  const memStatus = membership?.membership?.status ?? 'inactive';
  const memActive = memStatus === 'active';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#1A0800', '#0D0D0D', '#0D0D0D']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
      />
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gym Presence</Text>
        <View style={[styles.countPill, myStatus === 'in' && styles.countPillIn]}>
          <View style={[styles.countDot, { backgroundColor: myStatus === 'in' ? COLORS.success : COLORS.textMuted }]} />
          <Text style={[styles.countPillText, { color: myStatus === 'in' ? COLORS.success : COLORS.textMuted }]}>
            {count} IN GYM
          </Text>
        </View>
      </View>

      {/* Member photo card */}
      <View style={styles.memberCard}>
        <View style={styles.photoWrap}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.memberPhoto} />
          ) : (
            <LinearGradient
              colors={[COLORS.secondaryDark, '#2A1200']}
              style={styles.memberPhotoPlaceholder}
            >
              <Text style={styles.memberPhotoInitial}>{initials}</Text>
            </LinearGradient>
          )}
        </View>
        <View style={styles.memberCardInfo}>
          <Text style={styles.memberCardName}>{displayName}</Text>
          <Text style={styles.memberCardId}>ID: {shortId}</Text>
          {!membershipLoading && (
            <View style={styles.memberCardBadge}>
              <View style={[styles.memStatusDot, { backgroundColor: memActive ? COLORS.success : COLORS.error }]} />
              <Text style={styles.memberCardBadgeText}>{planName.toUpperCase()} MEMBER</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.secondary}
            colors={[COLORS.secondary]}
          />
        }
      >
        {/* Status description */}
        <Text style={styles.modeDesc}>
          {myStatus === 'in'
            ? 'You are currently checked in. Tap the button when you leave.'
            : 'Tap the button below to check in when you arrive at the gym.'}
        </Text>

        {/* Big tap button */}
        <View style={styles.btnArea}>
          <Animated.View
            style={[
              styles.pulseRing,
              { transform: [{ scale: pulseAnim }], opacity: pulseOpacity },
            ]}
          />
          <TouchableOpacity
            onPress={handleTap}
            activeOpacity={0.85}
            disabled={isButtonDisabled}
            style={styles.accessBtnOuter}
          >
            <LinearGradient colors={getButtonColors()} style={styles.accessBtn}>
              {actionStatus === 'loading' ? (
                <ActivityIndicator size="large" color={COLORS.white} />
              ) : actionStatus === 'success' ? (
                <Ionicons name="checkmark-circle" size={56} color={COLORS.white} />
              ) : actionStatus === 'error' ? (
                <Ionicons name="close-circle" size={56} color={COLORS.white} />
              ) : myStatus === 'in' ? (
                <Ionicons name="exit-outline" size={52} color={COLORS.white} />
              ) : (
                <Ionicons name="enter-outline" size={52} color={COLORS.white} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Status text */}
        <Text style={[styles.statusMsg, { color: getStatusColor() }]}>
          {getStatusMsg()}
        </Text>

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
              color={myStatus === 'in' ? COLORS.success : COLORS.textMuted}
            />
            <Text style={[styles.myStatusText, { color: myStatus === 'in' ? COLORS.success : COLORS.textMuted }]}>
              {myStatus === 'in' ? 'YOU\'RE IN' : 'YOU\'RE OUT'}
            </Text>
          </View>
        </View>

        {/* Membership status */}
        {!membershipLoading && (
          <View style={[
            styles.memStatusBadge,
            memActive ? styles.memActive : styles.memInactive,
          ]}>
            <View style={[styles.memStatusDot, { backgroundColor: memActive ? COLORS.success : COLORS.error }]} />
            <Text style={[styles.memStatusText, { color: memActive ? COLORS.success : COLORS.error }]}>
              Membership: {memStatus.toUpperCase()}
            </Text>
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
    backgroundColor: 'rgba(255,107,0,0.04)', top: -100, right: -100,
  },
  circle2: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,107,0,0.03)', bottom: 50, left: -80,
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 24, paddingBottom: 8,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: COLORS.white },

  countPill: {
    flexDirection: 'row', alignItems: 'center', padding: 8, paddingHorizontal: 12,
    backgroundColor: 'rgba(102,102,102,0.12)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(102,102,102,0.25)', gap: 6,
  },
  countPillIn: {
    backgroundColor: 'rgba(76,175,80,0.12)',
    borderColor: 'rgba(76,175,80,0.3)',
  },
  countDot: { width: 7, height: 7, borderRadius: 4 },
  countPillText: { fontSize: 11, fontWeight: '700' },

  memberCard: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 24,
    marginTop: 12, marginBottom: 4, backgroundColor: COLORS.surface,
    borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 16,
  },
  photoWrap: {},
  memberPhoto: { width: 62, height: 62, borderRadius: 18 },
  memberPhotoPlaceholder: {
    width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  memberPhotoInitial: { fontSize: 28, fontWeight: '900', color: COLORS.white },
  memberCardInfo: { flex: 1 },
  memberCardName: { fontSize: 16, fontWeight: '800', color: COLORS.white, marginBottom: 3 },
  memberCardId: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 6 },
  memberCardBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: COLORS.secondaryGlow, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: COLORS.secondaryBorder,
  },
  memberCardBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.secondary, letterSpacing: 1 },
  memStatusDot: { width: 8, height: 8, borderRadius: 4 },

  scroll: { paddingBottom: 40 },

  modeDesc: {
    fontSize: 13, color: COLORS.textMuted, textAlign: 'center',
    paddingHorizontal: 36, lineHeight: 18, marginTop: 20, marginBottom: 32,
  },

  btnArea: { alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  pulseRing: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: COLORS.secondaryGlow, borderWidth: 2, borderColor: COLORS.secondary,
  },
  accessBtnOuter: { borderRadius: 90, overflow: 'hidden' },
  accessBtn: {
    width: 160, height: 160, borderRadius: 80,
    alignItems: 'center', justifyContent: 'center',
  },

  statusMsg: { textAlign: 'center', fontSize: 15, fontWeight: '700', marginBottom: 24 },

  liveCard: {
    marginHorizontal: 24, marginBottom: 20,
    backgroundColor: COLORS.surface, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  liveCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  liveIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.secondaryGlow, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.secondaryBorder,
  },
  liveLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#22C55E' },
  liveLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2 },
  liveValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  liveValue: { fontSize: 28, fontWeight: '900', color: COLORS.white },
  liveUnit: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },

  myStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1,
  },
  myStatusIn: { backgroundColor: 'rgba(76,175,80,0.1)', borderColor: 'rgba(76,175,80,0.3)' },
  myStatusOut: { backgroundColor: 'rgba(102,102,102,0.1)', borderColor: 'rgba(102,102,102,0.25)' },
  myStatusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  memStatusBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 6,
    marginBottom: 32, borderWidth: 1,
  },
  memActive: { backgroundColor: COLORS.successLight, borderColor: `${COLORS.success}44` },
  memInactive: { backgroundColor: COLORS.errorLight, borderColor: `${COLORS.error}44` },
  memStatusText: { fontSize: 13, fontWeight: '700' },
});
