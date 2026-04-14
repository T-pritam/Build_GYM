import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchPersonalRecords } from '../../services/workoutService';

const PR_TYPE_LABELS = {
  max_weight: { label: 'Max Weight', icon: 'barbell', unit: 'kg' },
  max_reps: { label: 'Max Reps', icon: 'repeat', unit: 'reps' },
  max_volume: { label: 'Max Volume', icon: 'layers', unit: 'kg' },
};

export default function PersonalRecordsScreen({ navigation }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchPersonalRecords();
        setRecords(data || []);
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

  // Group by exercise
  const grouped = {};
  records.forEach((pr) => {
    if (!grouped[pr.exerciseId]) {
      grouped[pr.exerciseId] = { name: pr.exerciseName || 'Exercise', prs: [] };
    }
    grouped[pr.exerciseId].prs.push(pr);
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.title}>🏆 Personal Records</Text>
        <View style={{ width: 24 }} />
      </View>

      {Object.keys(grouped).length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="trophy-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No records yet</Text>
          <Text style={styles.emptySubtext}>Complete workouts to set PRs</Text>
        </View>
      )}

      {Object.entries(grouped).map(([exId, { name, prs }]) => (
        <TouchableOpacity
          key={exId}
          style={styles.card}
          onPress={() => navigation.navigate('ExercisePRDetail', { exerciseId: exId, exerciseName: name })}
          activeOpacity={0.7}
        >
          <Text style={styles.exerciseName}>{name}</Text>
          <View style={styles.prRow}>
            {prs.map((pr) => {
              const meta = PR_TYPE_LABELS[pr.prType] || {};
              return (
                <View key={pr.prType} style={styles.prChip}>
                  <Ionicons name={meta.icon || 'star'} size={16} color={COLORS.secondary} />
                  <Text style={styles.prValue}>{pr.value} {meta.unit}</Text>
                  <Text style={styles.prLabel}>{meta.label}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.prDate}>
            Latest: {new Date(prs[prs.length - 1]?.achievedAt).toLocaleDateString()}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 8 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.white },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.white, fontSize: 18, fontWeight: '600', marginTop: 12 },
  emptySubtext: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },

  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)' },
  exerciseName: { color: COLORS.white, fontSize: 17, fontWeight: '600', marginBottom: 10 },
  prRow: { flexDirection: 'row', gap: 10 },
  prChip: { flex: 1, backgroundColor: COLORS.background, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  prValue: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginTop: 4 },
  prLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  prDate: { color: COLORS.textMuted, fontSize: 11, marginTop: 8, textAlign: 'right' },
});
