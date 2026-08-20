import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchGamingSession, endGamingSession, reportGamingProblem,
  pauseGamingSession, resumeGamingSession, extendGamingSession,
} from '../../../services/gamingService';
import { getSocket } from '../../../services/socketService';
import { useWalletStore } from '../../../store/walletStore';

const C = { bg: '#0B1020', card: '#111A30', text: '#FFFFFF', sub: '#C8D3F0', accent: '#8FB2FF', danger: '#FF6B6B', warn: '#FFC24B' };

const clock = (sec) => {
  const s = Math.max(0, sec);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// Why the session ended, in the member's words. The server reason is authoritative —
// a pause that ran out and a staff stop must not both read "Thanks for playing!".
const END_MESSAGE = {
  pause_expired: "Your pause ran out before you got back, so the session ended.",
  admin_forced: 'A staff member closed this session.',
  balance_exhausted: 'You ran out of coins.',
  absent_at_boundary: 'The session ended while you were away — no charge.',
  offline: 'That PC stopped responding. Any time you paid for and didn’t get has been refunded.',
  no_show: 'Nobody sat down at that PC, so it was released and your coins were refunded.',
};

export default function GamingActiveSessionScreen({ navigation, route }) {
  const { sessionId } = route.params || {};
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState(0);
  const [pauseLeft, setPauseLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState(null);
  const paidUntilRef = useRef(null);
  const pauseExpiresRef = useRef(null);
  // While paused the paid clock is frozen server-side, so hold the value it froze at
  // rather than recomputing against now (which would show it draining).
  const frozenRef = useRef(null);
  const fetchBalance = useWalletStore((s) => s.fetchBalance);

  const applySession = useCallback((s) => {
    if (!s) return;
    setSession((prev) => {
      const merged = { ...prev, ...s };
      // Socket updates for state changes may omit balance/owner — keep the last known values.
      if (s.balance == null && prev?.balance != null) merged.balance = prev.balance;
      if (s.ownerName == null && prev?.ownerName != null) merged.ownerName = prev.ownerName;
      return merged;
    });

    // Paused: the server already froze timeLeftSec for us. Unpaused: resume the live countdown.
    frozenRef.current = s.isPaused ? (s.timeLeftSec ?? frozenRef.current) : null;
    pauseExpiresRef.current = s.pauseExpiresAt ? new Date(s.pauseExpiresAt).getTime() : null;
    setPauseLeft(s.isPaused ? (s.pauseSecondsLeft ?? 0) : 0);

    if (s.paidUntil) {
      paidUntilRef.current = new Date(s.paidUntil).getTime();
      setRemaining(s.isPaused
        ? (s.timeLeftSec ?? 0)
        : Math.max(0, Math.round((paidUntilRef.current - Date.now()) / 1000)));
    }
    if (s.status === 'ended') {
      const refunded = s.coinsRefunded > 0 ? `

${s.coinsRefunded} coins refunded.` : '';
      Alert.alert('Session ended', (END_MESSAGE[s.endReason] || 'Thanks for playing!') + refunded);
      navigation.goBack();
    }
  }, [navigation]);

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchGamingSession(sessionId);
        applySession(res.data?.data);
      } catch (err) {
        Alert.alert('Session not found', err.response?.data?.message || 'It may have ended.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, applySession, navigation]);

  // Live updates over Socket.IO (same transport as wallet balance).
  useEffect(() => {
    const socket = getSocket();
    const join = () => socket.emit('join:gaming_session', sessionId);
    join();
    // Room membership is lost on reconnect, so without re-joining the screen goes
    // silently stale after any network blip — and this screen is now the control
    // surface for pause/resume, not just a display.
    socket.on('connect', join);
    const onUpdate = (s) => { if (s?.id === sessionId) { applySession(s); fetchBalance?.(); } };
    const onWarning = (w) => setWarning(w);
    socket.on('gaming:session_updated', onUpdate);
    socket.on('gaming:warning', onWarning);
    return () => {
      socket.off('connect', join);
      socket.off('gaming:session_updated', onUpdate);
      socket.off('gaming:warning', onWarning);
    };
  }, [sessionId, applySession, fetchBalance]);

  // Local 1-second countdown (the PC agent is authoritative; this mirrors it).
  // Paused sessions count down the pause window instead; the paid clock holds still.
  useEffect(() => {
    const t = setInterval(() => {
      if (frozenRef.current != null) {
        setRemaining(frozenRef.current);
        if (pauseExpiresRef.current) {
          setPauseLeft(Math.max(0, Math.round((pauseExpiresRef.current - Date.now()) / 1000)));
        }
      } else if (paidUntilRef.current) {
        setRemaining(Math.max(0, Math.round((paidUntilRef.current - Date.now()) / 1000)));
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const paused = Boolean(session?.isPaused);
  const pausesLeft = Math.max(0, (session?.pausesAllowed ?? 0) - (session?.pausesUsed ?? 0));

  // No optimistic local state: the server decides, and the socket push repaints.
  // A pause the backend rejected must never look like it worked on the phone.
  const doPause = () => Alert.alert(
    'Pause your session?',
    `Your ${clock(remaining)} of play time is saved while you're away. You have ${session?.maxPauseMinutes ?? 10} minutes to come back before the session ends.`,
    [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Pause',
        onPress: async () => {
          setBusy(true);
          try {
            const res = await pauseGamingSession(sessionId);
            applySession(res.data?.data?.session);
          } catch (err) {
            Alert.alert('Could not pause', err.response?.data?.message || 'Please try again.');
          } finally { setBusy(false); }
        },
      },
    ],
  );

  const doResume = async () => {
    setBusy(true);
    try {
      const res = await resumeGamingSession(sessionId);
      applySession(res.data?.data?.session);
    } catch (err) {
      Alert.alert('Could not resume', err.response?.data?.message || 'Please try again.');
    } finally { setBusy(false); }
  };

  // Buy the next block now rather than waiting for the boundary. Handy when the
  // zone is busy and you don't want to risk the auto-renew failing on a low balance.
  const doExtend = () => Alert.alert(
    'Add more time?',
    `${session?.pricePerBlock ?? 50} coins for another ${session?.blockLengthMin ?? 30} minutes, added to the end of your current time.`,
    [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Add time',
        onPress: async () => {
          setBusy(true);
          try {
            const res = await extendGamingSession(sessionId);
            applySession(res.data?.data?.session);
            fetchBalance?.();
          } catch (err) {
            Alert.alert('Could not add time', err.response?.data?.message || 'Please try again.');
          } finally { setBusy(false); }
        },
      },
    ],
  );

  const doEnd = () => Alert.alert(
    'End session?',
    `You still have ${clock(remaining)} paid. Unused time is not refunded.`,
    [
      { text: 'Keep playing', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: async () => { try { await endGamingSession(sessionId); } catch (_) {} navigation.goBack(); } },
    ],
  );
  const doReport = () => Alert.alert(
    'Report a problem',
    'Pick a category',
    [
      { text: 'PC crash', onPress: () => reportGamingProblem(sessionId, { category: 'pc_crash' }).catch(() => {}) },
      { text: 'Internet', onPress: () => reportGamingProblem(sessionId, { category: 'internet' }).catch(() => {}) },
      { text: 'Cancel', style: 'cancel' },
    ],
  );

  if (loading || !session) {
    return <View style={styles.root}><ActivityIndicator color={C.accent} style={{ marginTop: 80 }} /></View>;
  }

  return (
    <View style={styles.root}>
      {warning ? (
        <View style={styles.warnBar}>
          <Ionicons name="alert-circle" size={18} color="#0B1020" />
          <Text style={styles.warnText}>{warning.message || 'Next charge coming up'}</Text>
        </View>
      ) : null}

      <View style={styles.body}>
        <Text style={[styles.owner, paused && styles.ownerPaused]}>
          {paused ? 'Paused' : 'Playing'}{session.ownerName ? ` · ${session.ownerName}` : ''}
        </Text>

        {paused ? (
          <>
            <Text style={[styles.clock, styles.clockPaused]}>{clock(pauseLeft)}</Text>
            <Text style={styles.sub}>to come back before the session ends</Text>
            <Text style={styles.saved}>{clock(remaining)} of play time saved</Text>
          </>
        ) : (
          <>
            <Text style={styles.clock}>{clock(remaining)}</Text>
            <Text style={styles.sub}>time left this block</Text>
          </>
        )}

        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statVal}>{session.balance ?? '—'}</Text><Text style={styles.statLbl}>Balance</Text></View>
          <View style={styles.stat}><Text style={styles.statVal}>{session.coinsSpent ?? 0}</Text><Text style={styles.statLbl}>Spent</Text></View>
          <View style={styles.stat}><Text style={styles.statVal}>{session.pricePerBlock ?? 50}</Text><Text style={styles.statLbl}>Next charge</Text></View>
        </View>
      </View>

      {!paused && pausesLeft > 0 ? (
        <Text style={styles.quota}>
          {pausesLeft} pause{pausesLeft === 1 ? '' : 's'} left · up to {session.maxPauseMinutes ?? 10} min
        </Text>
      ) : null}
      {!paused && pausesLeft === 0 && (session.pausesAllowed ?? 0) > 0 ? (
        <Text style={styles.quota}>No pauses left this session</Text>
      ) : null}

      <View style={styles.actions}>
        {paused ? (
          <TouchableOpacity style={[styles.btn, styles.primary]} onPress={doResume} disabled={busy}>
            <Ionicons name="play" size={20} color="#0B1020" />
            <Text style={styles.primaryText}>Resume</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.btn, styles.ghost, (!session.canPause || busy) && styles.btnDisabled]}
            onPress={doPause}
            disabled={!session.canPause || busy}
          >
            <Ionicons name="pause" size={20} color={C.text} />
            <Text style={styles.ghostText}>Pause</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.btn, styles.ghost, (paused || busy) && styles.btnDisabled]}
          onPress={doExtend}
          disabled={paused || busy}
        >
          <Ionicons name="add" size={20} color={C.text} />
          <Text style={styles.ghostText}>Add time</Text>
        </TouchableOpacity>
      </View>

      {/* Second row. Four buttons across one phone width left every label cramped. */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.ghost]} onPress={doReport}>
          <Ionicons name="flag-outline" size={20} color={C.text} />
          <Text style={styles.ghostText}>Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.danger]} onPress={doEnd}>
          <Ionicons name="stop" size={20} color="#fff" />
          <Text style={styles.dangerText}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: 56 },
  warnBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.warn, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 16, borderRadius: 10 },
  warnText: { color: '#0B1020', fontWeight: '700', marginLeft: 8, flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  owner: { color: C.accent, fontSize: 16, fontWeight: '700' },
  ownerPaused: { color: C.warn },
  clock: { color: C.text, fontSize: 72, fontWeight: '800', marginTop: 8 },
  clockPaused: { color: C.warn },
  sub: { color: C.sub, fontSize: 14 },
  saved: { color: C.accent, fontSize: 15, fontWeight: '700', marginTop: 14 },
  quota: { color: C.sub, fontSize: 12, textAlign: 'center', marginBottom: 6 },
  btnDisabled: { opacity: 0.4 },
  stats: { flexDirection: 'row', marginTop: 36 },
  stat: { alignItems: 'center', marginHorizontal: 18 },
  statVal: { color: C.text, fontSize: 24, fontWeight: '800' },
  statLbl: { color: C.sub, fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 6, gap: 10 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 15 },
  primary: { backgroundColor: C.accent },
  primaryText: { color: '#0B1020', fontWeight: '800', marginLeft: 6 },
  ghost: { backgroundColor: C.card },
  ghostText: { color: C.text, fontWeight: '700', marginLeft: 6 },
  danger: { backgroundColor: C.danger },
  dangerText: { color: '#fff', fontWeight: '800', marginLeft: 6 },
});
