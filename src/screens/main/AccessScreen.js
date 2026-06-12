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
import { COLORS as THEME, FONTS } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import AccessDial from '../../components/AccessDial';

// Theme-compat: legacy colour keys → new "Holographic Noir" palette.
const COLORS = {
  background: '#050405', surface: '#1B191E', surfaceLow: THEME.surfaceLow, surface2: THEME.surface2,
  secondary: THEME.primaryLight, secondaryDark: THEME.primary, secondaryGlow: THEME.primarySoft, secondaryBorder: THEME.primaryBorder,
  primary: THEME.primary, cyan: '#00F2FF',
  success: THEME.success, successLight: THEME.successSoft, error: '#F44336', errorLight: 'rgba(244,67,54,0.12)',
  textPrimary: THEME.textPrimary, textSecondary: THEME.textSecondary, textMuted: THEME.textMuted,
  border: THEME.border, glass: 'rgba(255,255,255,0.05)', glassBorder: 'rgba(255,255,255,0.08)',
  white: THEME.white,
};

const GREEN = '#00FF64';

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

function formatNowStr() {
  try {
    const now = new Date();
    const date = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return `${date} · ${time}`;
  } catch {
    return '';
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

  // Build the params passed to the Granted / Denied result screens.
  const buildResultParams = (reason) => ({
    memberName: displayName,
    memberId: shortId,
    accessPoint: mode === 'gate' ? 'Main Entrance' : 'Locker',
    time: formatNowStr(),
    ...(reason ? { reason } : {}),
  });

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
      fetchMyGateEvents(15).then((events) => {
        setLogs((events ?? []).map(eventToLog));
      }).catch(() => {});
      setStatus('idle');
      navigation.navigate('AccessGranted', buildResultParams());
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
          setStatus('idle');
          navigation.navigate('AccessGranted', buildResultParams());
        } else {
          setStatus('idle');
          navigation.navigate('AccessDenied', buildResultParams('BLE authentication failed'));
        }
      } catch {
        setStatus('idle');
        navigation.navigate('AccessDenied', buildResultParams('BLE authentication failed'));
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

  const displayName = user?.fullName || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Member';
  const photoUrl = user?.profilePhotoUrl || null;
  const initials = displayName.charAt(0).toUpperCase();
  const shortId = user?.id ? user.id.split('-')[0].toUpperCase() : '------';

  const memStatus = membership?.membership?.status ?? 'inactive';
  const memActive = memStatus === 'active';
  const validTill = membership?.membership?.endDate ?? null;

  const activeColor = mode === 'gate' ? COLORS.primary : COLORS.cyan;
  const scanning = status === 'scanning';

  const coreIcon = scanning
    ? <MaterialCommunityIcons name="bluetooth-audio" size={34} color={activeColor} />
    : mode === 'gate'
      ? <Ionicons name="enter-outline" size={34} color={activeColor} />
      : <Ionicons name="lock-open-outline" size={34} color={activeColor} />;

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
        <Text style={styles.headerTitle}>Access Control</Text>
        {btState === 'off' ? (
          <View style={[styles.blePill, styles.blePillOff]}>
            <View style={[styles.bleDot, { backgroundColor: COLORS.error }]} />
            <Text style={[styles.bleText, { color: COLORS.error }]}>BT OFF</Text>
          </View>
        ) : (
          <View style={styles.blePill}>
            <View style={styles.bleDot} />
            <Text style={styles.bleText}>BLE READY</Text>
          </View>
        )}
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
        {/* Precision dial */}
        <View style={styles.dialArea}>
          <AccessDial
            leftLabel="GATE"
            rightLabel="LOCKER"
            leftColor={COLORS.primary}
            rightColor={COLORS.cyan}
            activeSide={mode === 'gate' ? 'left' : 'right'}
            onLeftPress={() => { if (status === 'idle') setMode('gate'); }}
            onRightPress={() => { if (status === 'idle') setMode('locker'); }}
            onCorePress={handleAccess}
            coreDisabled={status !== 'idle'}
            coreIcon={coreIcon}
            coreLabel={scanning ? 'Scanning…' : 'Tap to Unlock'}
            coreAccent={activeColor}
            scanning={scanning}
            pulseScale={pulseAnim}
            pulseOpacity={pulseOpacity}
          />
        </View>

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

        {/* Membership footer */}
        {!membershipLoading && (
          <View style={styles.footer}>
            <View style={styles.footerRow}>
              <Ionicons name="shield-checkmark-outline" size={15} color={memActive ? GREEN : COLORS.error} />
              <Text style={[styles.footerText, { color: memActive ? GREEN : COLORS.error }]}>
                Membership: {memStatus.toUpperCase()}
              </Text>
            </View>
            {validTill && (
              <Text style={styles.footerSub}>
                Valid until {new Date(validTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
              </Text>
            )}
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

  blePill: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 12,
    backgroundColor: 'rgba(0,255,100,0.10)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(0,255,100,0.20)', gap: 6,
  },
  blePillOff: { backgroundColor: 'rgba(244,67,54,0.12)', borderColor: 'rgba(244,67,54,0.30)' },
  bleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
  bleText: { fontFamily: FONTS.label, fontSize: 10, color: GREEN, letterSpacing: 1 },

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
  dialArea: { alignItems: 'center', marginBottom: 24 },

  btOffCard: {
    marginHorizontal: 24, marginBottom: 20,
    backgroundColor: 'rgba(244,67,54,0.08)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(244,67,54,0.25)',
    padding: 18, alignItems: 'center',
  },
  btOffTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.error, marginBottom: 4 },
  btOffSub: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginBottom: 14 },
  btSettingsBtn: { backgroundColor: COLORS.error, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  btSettingsBtnText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.white },

  footer: { alignItems: 'center', gap: 6, marginTop: 8 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontFamily: FONTS.label, fontSize: 10, letterSpacing: 1.5 },
  footerSub: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted, letterSpacing: 1, opacity: 0.5 },
});
