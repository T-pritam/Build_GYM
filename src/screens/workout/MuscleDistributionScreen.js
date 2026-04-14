import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchMuscleDistribution } from '../../services/workoutService';

const MUSCLE_COLORS = {
  chest: '#FF3B30',
  back: '#007AFF',
  shoulders: '#FF9500',
  biceps: '#34C759',
  triceps: '#AF52DE',
  legs_quads: '#5856D6',
  legs_hamstrings_glutes: '#FF2D55',
  core: '#FFCC00',
  cardio: '#00C7BE',
  full_body: COLORS.secondary,
};

export default function MuscleDistributionScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [totalSets, setTotalSets] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetchMuscleDistribution();
        setData(d || []);
        const total = (d || []).reduce((sum, m) => sum + (m.sets || 0), 0);
        setTotalSets(total);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.secondary} /></View>;
  }

  const formatLabel = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Muscle Distribution</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.subtitle}>Sets per muscle group this week</Text>

      {data.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="body-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No data yet</Text>
        </View>
      )}

      {data.map((m) => {
        const pct = totalSets > 0 ? (m.sets / totalSets) * 100 : 0;
        const color = MUSCLE_COLORS[m.muscleGroup] || COLORS.secondary;
        return (
          <View key={m.muscleGroup} style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={styles.muscleLabel}>{formatLabel(m.muscleGroup)}</Text>
            </View>
            <View style={styles.barContainer}>
              <View style={[styles.bar, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
            </View>
            <Text style={styles.setsValue}>{m.sets} sets</Text>
          </View>
        );
      })}

      {totalSets > 0 && (
        <Text style={styles.totalText}>{totalSets} total sets this week</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 8 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 20 },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.textMuted, fontSize: 15, marginTop: 12 },

  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', width: 140 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  muscleLabel: { color: COLORS.white, fontSize: 13, fontWeight: '500' },
  barContainer: { flex: 1, height: 10, backgroundColor: COLORS.surface, borderRadius: 5, marginRight: 10 },
  bar: { height: 10, borderRadius: 5 },
  setsValue: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', width: 55, textAlign: 'right' },

  totalText: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: 16 },
});
