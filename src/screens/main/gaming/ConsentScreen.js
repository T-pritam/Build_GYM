import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { startGamingSession } from '../../../services/gamingService';
import { useWalletStore } from '../../../store/walletStore';

const C = { bg: '#0B1020', card: '#111A30', text: '#FFFFFF', sub: '#C8D3F0', accent: '#8FB2FF', danger: '#FF6B6B' };

/**
 * BR-3 / FR-12 — one-tap standing consent, shown at every session start. No duration
 * picker; sessions are open-ended. The tap IS the start-session call.
 */
export default function GamingConsentScreen({ navigation, route }) {
  const { pcCode, qrToken } = route.params || {};
  const [busy, setBusy] = useState(false);
  const fetchBalance = useWalletStore((s) => s.fetchBalance);

  const start = async () => {
    setBusy(true);
    try {
      const res = await startGamingSession({ pcCode, qrToken });
      const session = res.data?.data?.session;
      fetchBalance?.();
      navigation.replace('GamingActiveSession', { sessionId: session.id });
    } catch (err) {
      const d = err.response?.data;
      if (d?.code === 'INSUFFICIENT_FUNDS') {
        Alert.alert(
          'Not enough coins',
          `You need ${d.required} coins to start. Balance: ${d.balance}.`,
          [
            { text: 'Recharge', onPress: () => navigation.replace('AddBuildCoins') },
            { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
          ],
        );
      } else {
        Alert.alert('Could not start', d?.message || 'Please try again.');
        setBusy(false);
      }
    }
  };

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.close} onPress={() => navigation.goBack()} hitSlop={12}>
        <Ionicons name="close" size={28} color={C.text} />
      </TouchableOpacity>

      <View style={styles.body}>
        <Ionicons name="game-controller-outline" size={56} color={C.accent} />
        <Text style={styles.pc}>{pcCode}</Text>
        <Text style={styles.consent}>
          50 coins will be charged every 30 minutes automatically until you end the session or your balance runs out. Need a break? Pause from this app — your paid time is saved while you're away.
        </Text>
        <Text style={styles.note}>
          You'll get clear warnings before every charge. Your logins are erased automatically when your session ends.
        </Text>
      </View>

      <TouchableOpacity style={[styles.startBtn, busy && { opacity: 0.6 }]} onPress={start} disabled={busy}>
        {busy ? <ActivityIndicator color="#0B1020" /> : <Text style={styles.startText}>Start playing</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, padding: 24, paddingTop: 56 },
  close: { alignSelf: 'flex-start' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pc: { color: C.accent, fontSize: 18, fontWeight: '700', marginTop: 12 },
  consent: { color: C.text, fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 20, lineHeight: 30 },
  note: { color: C.sub, fontSize: 14, textAlign: 'center', marginTop: 16, lineHeight: 20 },
  startBtn: { backgroundColor: C.accent, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  startText: { color: '#0B1020', fontSize: 17, fontWeight: '800' },
});
