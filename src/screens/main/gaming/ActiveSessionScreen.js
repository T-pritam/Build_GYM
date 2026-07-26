import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchGamingSession, endGamingSession, reportGamingProblem,
} from '../../../services/gamingService';
import { getSocket } from '../../../services/socketService';
import { useWalletStore } from '../../../store/walletStore';

const C = { bg: '#0B1020', card: '#111A30', text: '#FFFFFF', sub: '#C8D3F0', accent: '#8FB2FF', danger: '#FF6B6B', warn: '#FFC24B' };

const clock = (sec) => {
  const s = Math.max(0, sec);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export default function GamingActiveSessionScreen({ navigation, route }) {
  const { sessionId } = route.params || {};
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState(0);
  const [warning, setWarning] = useState(null);
  const paidUntilRef = useRef(null);
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
    if (s.paidUntil) {
      paidUntilRef.current = new Date(s.paidUntil).getTime();
      setRemaining(Math.max(0, Math.round((paidUntilRef.current - Date.now()) / 1000)));
    }
    if (s.status === 'ended') {
      Alert.alert('Session ended', 'Thanks for playing!');
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
    socket.emit('join:gaming_session', sessionId);
    const onUpdate = (s) => { if (s?.id === sessionId) { applySession(s); fetchBalance?.(); } };
    const onWarning = (w) => setWarning(w);
    socket.on('gaming:session_updated', onUpdate);
    socket.on('gaming:warning', onWarning);
    return () => {
      socket.off('gaming:session_updated', onUpdate);
      socket.off('gaming:warning', onWarning);
    };
  }, [sessionId, applySession, fetchBalance]);

  // Local 1-second countdown (the PC agent is authoritative; this mirrors it).
  useEffect(() => {
    const t = setInterval(() => {
      if (paidUntilRef.current) {
        setRemaining(Math.max(0, Math.round((paidUntilRef.current - Date.now()) / 1000)));
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

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
        <Text style={styles.owner}>Playing{session.ownerName ? ` · ${session.ownerName}` : ''}</Text>
        <Text style={styles.clock}>{clock(remaining)}</Text>
        <Text style={styles.sub}>time left this block</Text>

        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statVal}>{session.balance ?? '—'}</Text><Text style={styles.statLbl}>Balance</Text></View>
          <View style={styles.stat}><Text style={styles.statVal}>{session.coinsSpent ?? 0}</Text><Text style={styles.statLbl}>Spent</Text></View>
          <View style={styles.stat}><Text style={styles.statVal}>{session.pricePerBlock ?? 50}</Text><Text style={styles.statLbl}>Next charge</Text></View>
        </View>
      </View>

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
  clock: { color: C.text, fontSize: 72, fontWeight: '800', marginTop: 8 },
  sub: { color: C.sub, fontSize: 14 },
  stats: { flexDirection: 'row', marginTop: 36 },
  stat: { alignItems: 'center', marginHorizontal: 18 },
  statVal: { color: C.text, fontSize: 24, fontWeight: '800' },
  statLbl: { color: C.sub, fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', padding: 16, gap: 10 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 15 },
  primary: { backgroundColor: C.accent },
  primaryText: { color: '#0B1020', fontWeight: '800', marginLeft: 6 },
  ghost: { backgroundColor: C.card },
  ghostText: { color: C.text, fontWeight: '700', marginLeft: 6 },
  danger: { backgroundColor: C.danger },
  dangerText: { color: '#fff', fontWeight: '800', marginLeft: 6 },
});
