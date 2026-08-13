/**
 * WellnessSurveyCard — A.5 optional 5-factor (1–5) post-session survey.
 * Each factor saves immediately on tap (no submit). Shown once per member-local
 * day on the first completed workout's summary.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/colors';
import { patchWellness } from '../services/workoutService';

const FACTORS = [
  { field: 'sleep_quality', key: 'sleepQuality', label: 'Sleep' },
  { field: 'soreness', key: 'soreness', label: 'Soreness' },
  { field: 'stress', key: 'stress', label: 'Stress' },
  { field: 'mood', key: 'mood', label: 'Mood' },
  { field: 'energy', key: 'energy', label: 'Energy' },
];

export default function WellnessSurveyCard({ date, sessionId, initial }) {
  const [values, setValues] = useState(() => {
    const v = {};
    for (const f of FACTORS) v[f.field] = initial?.[f.key] ?? null;
    return v;
  });
  const [saving, setSaving] = useState(null);

  const select = async (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setSaving(field);
    try {
      await patchWellness({ field, value, date, sessionId });
    } catch {
      // revert on failure
      setValues((prev) => ({ ...prev, [field]: initial?.[field] ?? null }));
    } finally {
      setSaving(null);
    }
  };

  return (
    <View style={s.card}>
      <Text style={s.title}>How are you feeling?</Text>
      <Text style={s.sub}>Optional — tap to log. Helps your training over time.</Text>
      {FACTORS.map((f) => (
        <View key={f.field} style={s.row}>
          <Text style={s.label}>{f.label}</Text>
          <View style={s.dots}>
            {[1, 2, 3, 4, 5].map((n) => {
              const active = values[f.field] === n;
              return (
                <TouchableOpacity
                  key={n}
                  disabled={saving === f.field}
                  style={[s.dot, active && s.dotOn]}
                  onPress={() => select(f.field, n)}
                >
                  <Text style={[s.dotTxt, active && s.dotTxtOn]}>{n}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: COLORS.surface || '#151215', borderRadius: 16, padding: 18, marginTop: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  title: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  sub: { color: COLORS.textMuted, fontSize: 12, marginTop: 3, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  label: { color: COLORS.textSecondary || '#D4C1CF', fontSize: 14, fontWeight: '600', width: 80 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background || '#080608', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  dotOn: { backgroundColor: COLORS.secondary || COLORS.primary || '#7C3AED', borderColor: 'transparent' },
  dotTxt: { color: COLORS.textMuted, fontSize: 13, fontWeight: '700' },
  dotTxtOn: { color: '#fff', fontWeight: '800' },
});
