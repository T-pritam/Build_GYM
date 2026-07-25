import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchGamingPcs } from '../../../services/gamingService';

// Local dark palette (kept literal to match the app's inline-color screens).
const C = {
  bg: '#0B1020', card: '#111A30', line: '#1E2A44',
  text: '#FFFFFF', sub: '#C8D3F0', accent: '#8FB2FF', good: '#00BCD4', busy: '#FFA000',
};

const STATE_LABEL = {
  IDLE: 'Free', ACTIVE: 'In use', AWAY: 'Away', ENDING: 'Ending', CLEANUP: 'Cleaning', OFFLINE: 'Offline',
};

// "2026-07-25T12:34:00Z" -> "12:34"
const hhmm = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function GamingScreen({ navigation }) {
  const [data, setData] = useState({ total: 0, inUse: 0, available: 0, pcs: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchGamingPcs();
      if (res.data?.data) setData(res.data.data);
    } catch (err) {
      console.warn('Failed to load gaming PCs:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // live-ish occupancy
    return () => clearInterval(t);
  }, [load]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Gaming Zone</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}
        >
          <View style={styles.occ}>
            <Text style={styles.occBig}>{data.inUse} of {data.total} in use</Text>
            <Text style={styles.occSub}>{data.available} free right now</Text>
          </View>

          {data.pcs.map((pc) => (
            <View key={pc.id} style={styles.pcRow}>
              <View style={[styles.dot, { backgroundColor: pc.inUse ? C.busy : C.good }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.pcName}>{pc.name || pc.pcCode}</Text>
                <Text style={styles.pcSub}>
                  {STATE_LABEL[pc.state] || pc.state}
                  {pc.paidUntil ? ` · paid until ${hhmm(pc.paidUntil)} (may extend)` : ''}
                </Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('GamingScan')}>
            <Ionicons name="qr-code-outline" size={22} color="#0B1020" />
            <Text style={styles.scanText}>Scan a PC to start</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>Walk to a free PC and scan the QR on its screen.</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  title: { color: C.text, fontSize: 20, fontWeight: '700' },
  occ: { backgroundColor: C.card, borderRadius: 14, padding: 18, marginBottom: 16 },
  occBig: { color: C.text, fontSize: 24, fontWeight: '800' },
  occSub: { color: C.sub, fontSize: 14, marginTop: 4 },
  pcRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  pcName: { color: C.text, fontSize: 16, fontWeight: '600' },
  pcSub: { color: C.sub, fontSize: 13, marginTop: 2 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, marginTop: 20 },
  scanText: { color: '#0B1020', fontSize: 16, fontWeight: '800', marginLeft: 8 },
  hint: { color: C.sub, fontSize: 13, textAlign: 'center', marginTop: 10 },
});
