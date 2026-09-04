import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  StatusBar,
  Animated,
  Easing,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { fetchGymPresence, gymCheckIn, gymCheckOut } from '../../services/gymService';
import { fetchGateStatus } from '../../services/accessService';
import { getBleCredentialId } from '../../services/bleCredential';
import { unlockGate } from '../../services/gateUnlockService';
import { fetchMyMembership } from '../../services/membershipService';
import { getSocket } from '../../services/socketService';
import { Ionicons } from '@expo/vector-icons';
import { COLORS as THEME, FONTS } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { logEvent } from '../../services/analyticsService';
import HoldUnlock from '../../components/HoldUnlock';

// Theme-compat: legacy colour keys → new "Holographic Noir" palette.
const COLORS = {
  background: '#050405', surface: '#1B191E', surface2: THEME.surface2,
  secondary: THEME.primaryLight, secondaryDark: THEME.primary, secondaryGlow: THEME.primarySoft, secondaryBorder: THEME.primaryBorder,
  primary: THEME.primary, cyan: '#00BCD4',
  success: THEME.success, error: '#F44336',
  textPrimary: THEME.textPrimary, textSecondary: THEME.textSecondary, textMuted: THEME.textMuted,
  border: THEME.border, glass: 'rgba(255,255,255,0.05)', glassBorder: 'rgba(255,255,255,0.08)',
  white: THEME.white,
};

const GREEN = '#00FF64';
const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Why the gate will not open for this phone. The credential is locked to the
 * device that first registered it and only an admin reset can move it, so the
 * member needs to be told rather than left tapping a dial that does nothing.
 */
const GATE_BLOCK_MESSAGES = {
  DEVICE_MISMATCH:          'Gate access is registered to another phone — ask the gym to reset it',
  CLAIMED_BY_OTHER_ACCOUNT: 'This phone is already registered to another account',
  REGISTRATION_FAILED:      'Gate registration failed — please contact reception',
  INVALID_CREDENTIAL:       'This device could not be registered for gate access',
};
const LOCKERS = ['101', '102', '103', '104'];

/** "Mon, 1 Sep 2026 · 09:12" — the timestamp shown on the result screens. */
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

export default function PresenceScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);

  const [myStatus, setMyStatus] = useState('out'); // 'in' | 'out'
  const [count, setCount] = useState(0);
  const [actionStatus, setActionStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [cooldownSecs, setCooldownSecs] = useState(0);

  // Gate (Rosslare BLE + AxTraxPro) behaviour, decided by the backend:
  // ble_required | ble_optional | presence_only. Defaults to presence_only so a
  // slow/unreachable backend still lets the member check in.
  const [gate, setGate] = useState({ enabled: false, mode: 'presence_only' });
  // Replaces the generic status line when the gate needs the user to do something.
  const [statusNote, setStatusNote] = useState(null);
  // Sticky message (device mismatch etc.) — unlike statusNote it does not clear.
  const [blockedNote, setBlockedNote] = useState(null);
  // True after a BT_NOT_ENABLED rejection: the status line becomes a shortcut
  // into the Bluetooth settings (no new UI, the same text element).
  const [btOff, setBtOff] = useState(false);
  // HoldUnlock latches after one completion — bump this to remount it on retries.
  const [attempt, setAttempt] = useState(0);

  const [membership, setMembership] = useState(null);
  const [membershipLoading, setMembershipLoading] = useState(true);

  // Sheet UI state
  const [tab, setTab] = useState('gym'); // 'gym' | 'locker'
  const [selectedLocker, setSelectedLocker] = useState(null);
  const [lockerDone, setLockerDone] = useState(false);

  const cooldownTimer = useRef(null);
  const pollTimer = useRef(null);
  // Every deferred UI reset lives here so dismissing the sheet mid-flow cannot
  // fire setState on an unmounted screen.
  const timers = useRef([]);

  // Sheet slide-up on mount
  const slide = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(slide, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [slide]);
  const sheetTranslate = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 760] });

  const close = () => navigation.goBack();

  /** setTimeout that is cancelled automatically when the sheet unmounts. */
  const schedule = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  };

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      // Ask about THIS phone so the backend can tell us whether the account is
      // registered to a different device (it never moves without an admin reset).
      const credential = await getBleCredentialId().catch(() => null);

      const [presenceRes, memRes, gateRes] = await Promise.allSettled([
        fetchGymPresence(),
        fetchMyMembership(),
        fetchGateStatus(credential),
      ]);
      if (presenceRes.status === 'fulfilled') {
        setCount(presenceRes.value?.count ?? 0);
        setMyStatus(presenceRes.value?.myStatus ?? 'out');
      }
      if (memRes.status === 'fulfilled') setMembership(memRes.value);
      if (gateRes.status === 'fulfilled' && gateRes.value) {
        setGate(gateRes.value);
        setBlockedNote(GATE_BLOCK_MESSAGES[gateRes.value.device?.blockedReason] ?? null);
      }
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

  // ── Hold-to-unlock completion → gate unlock + real check-in / check-out ───

  /** Params for the shared AccessGranted / AccessDenied result screens. */
  const buildResultParams = (reason) => ({
    memberName:  displayName,
    memberId:    shortId,
    accessPoint: 'Main Entrance',
    time:        formatNowStr(),
    ...(reason ? { reason } : {}),
  });

  /**
   * The most specific reason we can give for a refusal. "BLE authentication
   * failed" was shown for every cause — wrong device, expired membership, a
   * reader that never answered — which told the member nothing.
   */
  const denialReason = (fallback) => {
    if (blockedNote) return blockedNote;
    if (!memActive) return 'Membership is not active';
    return fallback ?? 'The reader did not grant access';
  };

  /** Show a transient message on the existing status line, then go back to idle. */
  /** Same intent as AccessScreen's button — reachable from the status line. */
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

  const flashError = (note) => {
    setStatusNote(note);
    setActionStatus('error');
    schedule(() => {
      setActionStatus('idle');
      setStatusNote(null);
    }, 2500);
  };

  const handleTap = async () => {
    // The dial latches after one completion and is only revived by a changing
    // `key`, so bump the counter FIRST — bumping it after the guard below left
    // the dial permanently dead whenever a hold completed while busy.
    setAttempt((n) => n + 1);
    if (actionStatus !== 'idle' || cooldownUntil || isGateBlocked) return;
    setStatusNote(null);
    setBtOff(false);
    setActionStatus('loading');

    // ── Step 1: transmit the credential over BLE ────────────────────────────
    // NOTE: a successful transmit is NOT a grant — the Rosslare SDK resolves as
    // soon as the bytes leave the phone. Only the backend, reading AxTraxPro's
    // event log, can say whether the door actually opened.
    let transmitted = false;
    let transmittedAt = null;
    if (gate.mode !== 'presence_only') {
      transmittedAt = new Date().toISOString();
      const verdict = await unlockGate({ timeoutSeconds: 10 });
      transmitted = verdict.granted;

      if (!verdict.granted) {
        // Device-state problems — nothing was transmitted, record nothing.
        if (verdict.code === 'BT_NOT_ENABLED') {
          setBtOff(true);
          flashError('Turn on Bluetooth to open the gate');
          return;
        }
        if (verdict.code === 'PERMISSION_DENIED') {
          flashError('Allow Bluetooth access to open the gate');
          return;
        }
        // The reader did not respond at all.
        if (gate.mode === 'ble_required') {
          setActionStatus('idle');
          navigation.navigate('AccessDenied', buildResultParams(denialReason(verdict.reason)));
          return;
        }
        // ble_optional — the gate is unreachable, but attendance still counts.
        setStatusNote('Gate not detected — attendance recorded');
      }
    }

    // ── Step 2: attendance / streak / live headcount (unchanged) ────────────
    try {
      const isCheckIn = myStatus === 'out';
      const result = isCheckIn
        ? await gymCheckIn(transmitted ? transmittedAt : undefined)
        : await gymCheckOut();

      // The backend verified the transmit against AxTraxPro's event log.
      const gateConfirmed = !!result?.gateConfirmed;
      const gateChecked   = !!result?.gateChecked;
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
      schedule(() => { setActionStatus('idle'); setStatusNote(null); }, 2000);

      if (gateConfirmed) {
        // Confirmed by the reader — the same confirmation as the access screen.
        navigation.navigate('AccessGranted', buildResultParams());
      } else if (transmitted && gateChecked && gate.mode === 'ble_required') {
        // We transmitted, the reader was asked, and it did not let us in.
        navigation.navigate('AccessDenied', buildResultParams(denialReason(null)));
      } else if (transmitted) {
        // Transmitted but unverifiable (gate server unreachable). Say exactly
        // that rather than claiming the door opened.
        setStatusNote('Signal sent — if the door stays shut, contact reception');
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) {
        // Already in the desired state — treat as success, re-fetch actual state
        fetchGymPresence().then((d) => {
          if (d) { setMyStatus(d.myStatus); setCount(d.count); }
        }).catch(() => {});
        setActionStatus('success');
        setCooldownUntil(Date.now() + COOLDOWN_MS);
        schedule(() => { setActionStatus('idle'); setStatusNote(null); }, 2000);
      } else {
        setActionStatus('error');
        schedule(() => { setActionStatus('idle'); setStatusNote(null); }, 2000);
      }
    }
  };

  // ── Derived display values ────────────────────────────────────────────────

  const isCheckingIn = myStatus === 'out';
  // A blocked device can never open the gate, so the dial is inert until an
  // admin resets the credential — that is the authenticity rule.
  const isGateBlocked = !!blockedNote && gate.mode === 'ble_required';
  const isButtonDisabled = actionStatus !== 'idle' || !!cooldownUntil || isGateBlocked;
  const gateOnline = gate.enabled && gate.mode !== 'presence_only';

  const getStatusMsg = () => {
    if (statusNote) return statusNote;
    if (blockedNote) return blockedNote;
    if (cooldownUntil && actionStatus === 'idle') return `Wait ${cooldownSecs}s before next tap`;
    if (actionStatus === 'loading') return isCheckingIn ? 'Checking in…' : 'Checking out…';
    if (actionStatus === 'success') return isCheckingIn ? 'Checked out ✓' : 'Entry granted ✓';
    if (actionStatus === 'error') return 'Something went wrong';
    return 'Hold the dial to unlock';
  };

  const getStatusColor = () => {
    if (blockedNote && actionStatus === 'idle') return COLORS.error;
    if (actionStatus === 'success') return COLORS.success;
    if (actionStatus === 'error') return COLORS.error;
    if (actionStatus === 'loading') return COLORS.secondary;
    return COLORS.textSecondary;
  };

  const displayName = user?.fullName || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Member';
  const shortId = user?.id ? user.id.split('-')[0].toUpperCase() : '------';
  const memStatus = membership?.membership?.status ?? 'inactive';
  const memActive = memStatus === 'active';

  const coreAccent = isCheckingIn ? COLORS.cyan : COLORS.success;
  const coreIcon = actionStatus === 'loading'
    ? <ActivityIndicator size="small" color={coreAccent} />
    : actionStatus === 'success'
      ? <Ionicons name="checkmark-circle" size={36} color={COLORS.success} />
      : actionStatus === 'error'
        ? <Ionicons name="close-circle" size={36} color={COLORS.error} />
        : myStatus === 'in'
          ? <Ionicons name="exit-outline" size={36} color={coreAccent} />
          : <Ionicons name="enter-outline" size={36} color={coreAccent} />;

  return (
    <Pressable style={styles.backdrop} onPress={close}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslate }] }]}>
        {/* swallow taps so touching the sheet doesn't dismiss it */}
        <Pressable style={{ flex: 1 }} onPress={() => {}}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Status bar */}
          <View style={styles.statusRow}>
            <View style={styles.bleRow}>
              <View style={[styles.bleDot, !gateOnline && { backgroundColor: COLORS.textMuted }]} />
              <Text style={styles.bleText}>
                {gateOnline ? 'BLE CONNECTED · ROSSLARE' : 'GATE OFFLINE · ROSSLARE'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={close} hitSlop={8}>
              <Ionicons name="close" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {[['gym', 'GYM ENTRANCE'], ['locker', 'LOCKER']].map(([key, label]) => (
              <TouchableOpacity key={key} style={styles.tab} onPress={() => setTab(key)} activeOpacity={0.8}>
                <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
                {tab === key && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {tab === 'gym' ? (
              <>
                {/* Identity */}
                <View style={styles.identity}>
                  <Text style={styles.name}>{displayName}</Text>
                  <View style={styles.idRow}>
                    <Text style={styles.idText}>ID: {shortId}</Text>
                    {!membershipLoading && (
                      <View style={[styles.statusChip, memActive ? styles.statusChipActive : styles.statusChipInactive]}>
                        <Text style={[styles.statusChipText, { color: memActive ? GREEN : COLORS.error }]}>
                          {memActive ? 'ACTIVE' : 'INACTIVE'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Hold-to-unlock → real check-in / check-out */}
                <View style={styles.holdArea}>
                  <HoldUnlock
                    key={`gym-${myStatus}-${attempt}`}
                    size={160}
                    color={coreAccent}
                    icon={coreIcon}
                    label={isCheckingIn ? 'HOLD TO ENTER' : 'HOLD TO EXIT'}
                    holdingLabel={isCheckingIn ? 'CHECKING IN…' : 'CHECKING OUT…'}
                    disabled={isButtonDisabled}
                    onComplete={handleTap}
                  />
                  <Text
                    style={[styles.statusMsg, { color: getStatusColor() }]}
                    onPress={btOff ? openBluetoothSettings : undefined}
                    suppressHighlighting
                  >
                    {getStatusMsg()}
                  </Text>
                </View>

                {/* Keep: live "IN THE GYM NOW" count — do not remove */}
                {/* <View style={styles.liveCard}>
                  <View style={styles.liveCardLeft}>
                    <View style={styles.liveIconWrap}>
                      <Ionicons name="people" size={22} color={COLORS.secondary} />
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
                      {myStatus === 'in' ? "YOU'RE IN" : "YOU'RE OUT"}
                    </Text>
                  </View>
                </View> */}

                <Text style={styles.accessLabel}>GYM ACCESS</Text>
              </>
            ) : (
              <>
                {/* Locker grid (visual shell — no locker backend) */}
                <View style={styles.lockerGrid}>
                  {LOCKERS.map((n) => {
                    const on = selectedLocker === n;
                    return (
                      <TouchableOpacity
                        key={n}
                        style={[styles.lockerPill, on && styles.lockerPillActive]}
                        onPress={() => { setSelectedLocker(n); setLockerDone(false); }}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.lockerPillText, on && styles.lockerPillTextActive]}>{n}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.lockerHint}>
                  {lockerDone
                    ? `Locker ${selectedLocker} unlocked`
                    : selectedLocker
                      ? `Locker ${selectedLocker} selected`
                      : 'Select a locker'}
                </Text>

                <View style={styles.holdArea}>
                  <HoldUnlock
                    key={`locker-${selectedLocker}-${lockerDone}`}
                    size={160}
                    color="#F59E0B"
                    icon={(
                      <Ionicons
                        name={lockerDone ? 'checkmark-circle' : 'lock-closed'}
                        size={32}
                        color={lockerDone ? GREEN : '#F59E0B'}
                      />
                    )}
                    label={lockerDone ? 'UNLOCKED' : 'HOLD TO UNLOCK'}
                    holdingLabel="UNLOCKING…"
                    disabled={!selectedLocker || lockerDone}
                    onComplete={() => setLockerDone(true)}
                  />
                </View>

                <Text style={styles.accessLabel}>LOCKER ACCESS</Text>
              </>
            )}
          </ScrollView>
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },

  sheet: {
    height: '86%',
    backgroundColor: '#0D0D0F',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  handle: {
    width: 48, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },

  statusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  bleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
  bleText: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted, letterSpacing: 1.5 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },

  tabs: {
    flexDirection: 'row', paddingHorizontal: 24, marginTop: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tab: { flex: 1, alignItems: 'center', paddingBottom: 12 },
  tabText: { fontFamily: FONTS.label, fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5 },
  tabTextActive: { color: COLORS.white },
  tabUnderline: {
    position: 'absolute', bottom: -1, left: 0, right: 0, height: 2,
    backgroundColor: '#7C3AED', borderRadius: 2,
  },

  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, alignItems: 'center' },

  identity: { alignItems: 'center', marginBottom: 8 },
  name: { fontFamily: FONTS.headline, fontSize: 24, color: COLORS.white, marginBottom: 6 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  idText: { fontFamily: FONTS.label, fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  statusChipActive: { backgroundColor: 'rgba(0,255,100,0.15)', borderColor: 'rgba(0,255,100,0.30)' },
  statusChipInactive: { backgroundColor: 'rgba(244,67,54,0.12)', borderColor: 'rgba(244,67,54,0.30)' },
  statusChipText: { fontFamily: FONTS.label, fontSize: 9, letterSpacing: 1 },

  holdArea: { alignItems: 'center', gap: 16, marginTop: 28, marginBottom: 28 },
  statusMsg: { textAlign: 'center', fontFamily: FONTS.bodyBold, fontSize: 13, letterSpacing: 1 },

  // Live "IN THE GYM NOW" count
  liveCard: {
    width: '100%',
    backgroundColor: COLORS.glass, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
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

  accessLabel: { fontFamily: FONTS.label, fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginTop: 40 },

  // Locker
  lockerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 8 },
  lockerPill: {
    width: '22%', aspectRatio: 1.6, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  lockerPillActive: { backgroundColor: 'rgba(127,41,130,0.25)', borderColor: COLORS.secondary },
  lockerPillText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: 'rgba(255,255,255,0.8)' },
  lockerPillTextActive: { color: COLORS.secondary },
  lockerHint: { fontFamily: FONTS.label, fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, marginTop: 8 },
});
