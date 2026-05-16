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
  Platform,
  Linking,
  AppState,
} from 'react-native';
import { autoUnlock } from '../../services/bleService';
import { fetchMyMembership } from '../../services/membershipService';
import { fetchMyGateEvents } from '../../services/accessService';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

const ACCESS_MODES = [
  {
    id: 'gate',
    label: 'Gate Access',
    ionIcon: 'enter-outline',
    desc: 'Open the main gym entrance gate via Bluetooth.',
    logText: 'Gate opened',
  },
  {
    id: 'locker',
    label: 'Locker',
    ionIcon: 'lock-open-outline',
    desc: 'Unlock your assigned locker via Bluetooth.',
    logText: 'Locker unlocked',
  },
];

function formatEventTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) +
      '  ' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

function eventToLog(event, index) {
  const granted = event.iEventType === 17; // AxTraxPro: 17=Granted, 33/25=Denied
  const reader = event.IdReader ? `Reader ${event.IdReader}` : 'Gate';
  const time = formatEventTime(event.dtEventReal);
  return {
    id: event.dtEventReal ?? index,
    text: granted ? `Access granted · ${reader}` : `Access denied · ${reader}`,
    time,
    type: granted ? 'success' : 'denied',
  };
}

export default function AccessScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);

  const [mode, setMode] = useState('gate');
  const [status, setStatus] = useState('idle'); // idle | scanning | success | denied

  // BT state: 'unknown' | 'on' | 'off'
  const [btState, setBtState] = useState('unknown');

  const [membership, setMembership] = useState(null);
  const [membershipLoading, setMembershipLoading] = useState(true);

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;
  const appStateRef = useRef(AppState.currentState);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [mem, events] = await Promise.allSettled([
        fetchMyMembership(),
        fetchMyGateEvents(15),
      ]);
      if (mem.status === 'fulfilled') setMembership(mem.value);
      if (events.status === 'fulfilled') {
        setLogs((events.value ?? []).map(eventToLog));
      }
    } finally {
      setMembershipLoading(false);
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset btState to 'unknown' when app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        if (btState === 'off') setBtState('unknown');
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [btState]);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ── BLE animations ────────────────────────────────────────────────────────

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

  // ── Access handler ────────────────────────────────────────────────────────

  const handleAccess = async () => {
    setBtState('unknown');
    setStatus('scanning');
    startPulse();
    const tappedAt = Date.now();
    try {
      await autoUnlock(10);
      // Active BLE unlock succeeded
      stopPulse();
      setBtState('on');
      setStatus('success');
      fetchMyGateEvents(15).then((events) => {
        setLogs((events ?? []).map(eventToLog));
      }).catch(() => {});
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err) {
      stopPulse();
      console.log('[BLE] autoUnlock error — code:', err.code, '| message:', err.message);
      const code = err.code ?? err.message;

      if (code === 'BT_NOT_ENABLED') {
        setBtState('off');
        setStatus('idle');
        return;
      }
      if (code === 'PERMISSION_DENIED') {
        setStatus('idle');
        return;
      }

      // Passive BLE mode: reader auto-grants access without active app connection.
      // autoUnlock throws NO_READERS_FOUND even though the gate opened.
      // Verify by checking AxTraxPro for a recent Access Granted event (last 30s).
      try {
        const events = await fetchMyGateEvents(5);
        const passiveGranted = (events ?? []).some((e) => {
          const eventMs = new Date(e.dtEventReal).getTime();
          return e.iEventType === 17 && eventMs >= tappedAt - 10000;
        });
        const logMapped = (events ?? []).map(eventToLog);
        setLogs(logMapped);
        if (passiveGranted) {
          setBtState('on');
          setStatus('success');
          setTimeout(() => setStatus('idle'), 2500);
        } else {
          setStatus('denied');
          setTimeout(() => setStatus('idle'), 2500);
        }
      } catch {
        setStatus('denied');
        setTimeout(() => setStatus('idle'), 2500);
      }
    }
  };

  const openBluetoothSettings = () => {
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS').catch(() => {
        Linking.openSettings();
      });
    } else {
      Linking.openURL('App-Prefs:root=Bluetooth').catch(() => {
        Linking.openSettings();
      });
    }
  };

  // ── Derived display values ─────────────────────────────────────────────────

  const getButtonColors = () => {
    if (status === 'success') return ['#1B5E20', '#4CAF50'];
    if (status === 'denied') return ['#7F0000', '#D32F2F'];
    if (status === 'scanning') return ['#1A0800', COLORS.secondaryDark];
    return [COLORS.secondaryDark, COLORS.secondary];
  };

  const getStatusMsg = () => {
    if (status === 'scanning') return 'Searching for reader...';
    if (status === 'success') return 'Access granted ✓';
    if (status === 'denied') return 'Access denied – inactive membership';
    return 'Tap to unlock';
  };

  const getStatusColor = () => {
    if (status === 'success') return COLORS.success;
    if (status === 'denied') return COLORS.error;
    if (status === 'scanning') return COLORS.secondary;
    return COLORS.textSecondary;
  };

  const displayName = user?.fullName || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Member';
  const photoUrl = user?.profilePhotoUrl || null;
  const initials = displayName.charAt(0).toUpperCase();
  const shortId = user?.id ? user.id.split('-')[0].toUpperCase() : '------';

  const planName = membership?.plan?.name ?? 'Member';
  const memStatus = membership?.membership?.status ?? 'inactive';
  const memActive = memStatus === 'active';
  const validTill = membership?.membership?.endDate ?? null;

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
        <Text style={styles.headerTitle}>Access Control</Text>
        {btState === 'off' ? (
          <View style={[styles.blePill, styles.blePillOff]}>
            <View style={[styles.bleDot, { backgroundColor: COLORS.error }]} />
            <Text style={[styles.bleText, { color: COLORS.error }]}>BT Off</Text>
          </View>
        ) : (
          <View style={styles.blePill}>
            <View style={styles.bleDot} />
            <Text style={styles.bleText}>BLE Ready</Text>
          </View>
        )}
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
        {/* Mode selector */}
        <View style={styles.modeRow}>
          {ACCESS_MODES.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.modeBtn, mode === m.id && styles.modeBtnActive]}
              onPress={() => { if (status === 'idle') setMode(m.id); }}
            >
              <Ionicons
                name={m.ionIcon}
                size={20}
                color={mode === m.id ? COLORS.secondary : COLORS.textMuted}
              />
              <Text style={[styles.modeBtnText, mode === m.id && styles.modeBtnTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.modeDesc}>
          {ACCESS_MODES.find((m) => m.id === mode)?.desc}
        </Text>

        {/* Big access button */}
        <View style={styles.btnArea}>
          <Animated.View
            style={[
              styles.pulseRing,
              { transform: [{ scale: pulseAnim }], opacity: pulseOpacity },
            ]}
          />
          <TouchableOpacity
            onPress={handleAccess}
            activeOpacity={0.85}
            disabled={status !== 'idle'}
            style={styles.accessBtnOuter}
          >
            <LinearGradient colors={getButtonColors()} style={styles.accessBtn}>
              {status === 'scanning' ? (
                <MaterialCommunityIcons name="bluetooth-audio" size={52} color={COLORS.white} />
              ) : status === 'success' ? (
                <Ionicons name="checkmark-circle" size={56} color={COLORS.white} />
              ) : status === 'denied' ? (
                <Ionicons name="close-circle" size={56} color={COLORS.white} />
              ) : mode === 'gate' ? (
                <Ionicons name="enter-outline" size={52} color={COLORS.white} />
              ) : (
                <Ionicons name="lock-open-outline" size={52} color={COLORS.white} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Status text */}
        <Text style={[styles.statusMsg, { color: getStatusColor() }]}>
          {getStatusMsg()}
        </Text>

        {/* Bluetooth off inline card */}
        {btState === 'off' && (
          <View style={styles.btOffCard}>
            <Ionicons name="bluetooth-outline" size={22} color={COLORS.error} style={{ marginBottom: 6 }} />
            <Text style={styles.btOffTitle}>Bluetooth is off</Text>
            <Text style={styles.btOffSub}>Turn on Bluetooth to use the access reader.</Text>
            <TouchableOpacity style={styles.btSettingsBtn} onPress={openBluetoothSettings} activeOpacity={0.8}>
              <Text style={styles.btSettingsBtnText}>Open Bluetooth Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Membership status badge */}
        {!membershipLoading && (
          <View style={[
            styles.memStatusBadge,
            memActive ? styles.memActive : styles.memInactive,
          ]}>
            <View style={[styles.memStatusDot, { backgroundColor: memActive ? COLORS.success : COLORS.error }]} />
            <Text style={[styles.memStatusText, { color: memActive ? COLORS.success : COLORS.error }]}>
              Membership: {memStatus.toUpperCase()}
            </Text>
            {validTill && (
              <Text style={styles.memExpiry}>
                · Valid till {new Date(validTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
            )}
          </View>
        )}

        {/* Recent access log — hidden until iEventType mapping is verified */}
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

  blePill: {
    flexDirection: 'row', alignItems: 'center', padding: 8, paddingHorizontal: 12,
    backgroundColor: 'rgba(33,150,243,0.15)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(33,150,243,0.3)', gap: 6,
  },
  blePillOff: {
    backgroundColor: 'rgba(211,47,47,0.12)',
    borderColor: 'rgba(211,47,47,0.3)',
  },
  bleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2196F3' },
  bleText: { fontSize: 11, fontWeight: '700', color: '#2196F3' },

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

  modeRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginTop: 20, marginBottom: 10 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 14, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  modeBtnActive: { borderColor: COLORS.secondary, backgroundColor: COLORS.secondaryGlow },
  modeBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  modeBtnTextActive: { color: COLORS.secondary },
  modeDesc: {
    fontSize: 13, color: COLORS.textMuted, textAlign: 'center',
    paddingHorizontal: 36, lineHeight: 18, marginBottom: 32,
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

  statusMsg: { textAlign: 'center', fontSize: 15, fontWeight: '700', marginBottom: 20 },

  btOffCard: {
    marginHorizontal: 24, marginBottom: 20,
    backgroundColor: 'rgba(211,47,47,0.08)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(211,47,47,0.25)',
    padding: 18, alignItems: 'center',
  },
  btOffTitle: { fontSize: 15, fontWeight: '800', color: COLORS.error, marginBottom: 4 },
  btOffSub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginBottom: 14 },
  btSettingsBtn: {
    backgroundColor: COLORS.error, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  btSettingsBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.white },

  memStatusBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 6,
    marginBottom: 32, borderWidth: 1,
  },
  memActive: { backgroundColor: COLORS.successLight, borderColor: `${COLORS.success}44` },
  memInactive: { backgroundColor: COLORS.errorLight, borderColor: `${COLORS.error}44` },
  memStatusText: { fontSize: 13, fontWeight: '700' },
  memExpiry: { fontSize: 12, color: COLORS.textMuted },

  logSection: { paddingHorizontal: 24 },
  logTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.5,
    marginBottom: 12, textTransform: 'uppercase',
  },
  logEmpty: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 16 },
  logItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    padding: 12, marginBottom: 8, gap: 10,
  },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  logTime: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
});
