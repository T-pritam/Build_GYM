/**
 * MuscleRecoveryCard — A.7 advisory per-muscle recovery status (member-only).
 * Status labels only (Fresh / Moderate / Worked) — never prescriptive advice.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

const STATUS_COLOR = {
  fresh: '#4CAF50',
  moderate: '#FFC107',
  worked: '#F44336',
};
const LABEL = { fresh: 'Fresh', moderate: 'Moderate', worked: 'Worked' };
const pretty = (m) => m.charAt(0).toUpperCase() + m.slice(1);

export default function MuscleRecoveryCard({ data }) {
  if (!data?.length) return null;
  // Show the least-recovered first so "worked" muscles surface.
  const sorted = [...data].sort((a, b) => a.score - b.score);
  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <Text style={s.title}>Muscle Recovery</Text>
      </View>
      <View style={s.grid}>
        {sorted.map((m) => (
          <View key={m.muscleGroup} style={s.chip}>
            <View style={[s.dot, { backgroundColor: STATUS_COLOR[m.status] || COLORS.textMuted }]} />
            <Text style={s.muscle}>{pretty(m.muscleGroup)}</Text>
            <Text style={[s.status, { color: STATUS_COLOR[m.status] || COLORS.textMuted }]}>{LABEL[m.status] || m.status}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: COLORS.surface || '#151215', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  headerRow: { marginBottom: 12 },
  title: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.background || '#080608', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  muscle: { color: COLORS.textSecondary || '#D4C1CF', fontSize: 12, fontWeight: '600' },
  status: { fontSize: 11, fontWeight: '800' },
});
