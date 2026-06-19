import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchWorkoutDetail } from '../../services/workoutService';
import { formatLogged } from '../../utils/measurement';

export default function WorkoutDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { workoutId } = route.params;
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchWorkoutDetail(workoutId);
        setDetail(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [workoutId]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.secondary} /></View>;
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not load workout</Text>
      </View>
    );
  }

  const dateStr = new Date(detail.workoutDate).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  // Group sets by exercise
  const exerciseMap = {};
  (detail.sets || []).forEach((s) => {
    if (!exerciseMap[s.exerciseId]) {
      exerciseMap[s.exerciseId] = {
        name: s.exerciseName || 'Exercise',
        measurementType: s.measurementType || 'weight_reps',
        sets: [],
      };
    }
    exerciseMap[s.exerciseId].sets.push(s);
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Workout Detail</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.date}>{dateStr}</Text>
      <Text style={styles.type}>{detail.planId ? 'Trainer Plan' : 'Self-Logged'}</Text>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <SummaryChip icon="barbell" label="Volume" value={`${Math.round(detail.totalVolume || 0)} kg`} />
        <SummaryChip icon="time" label="Duration" value={`${detail.durationMinutes || 0} min`} />
        <SummaryChip icon="checkmark-circle" label="Status" value={detail.status} />
      </View>

      {/* Exercises & Sets */}
      {Object.entries(exerciseMap).map(([exId, { name, sets, measurementType }]) => (
        <View key={exId} style={styles.exerciseBlock}>
          <Text style={styles.exerciseName}>{name}</Text>
          <View style={styles.setsHeader}>
            <Text style={styles.setsCol}>Set</Text>
            <Text style={[styles.setsCol, { flex: 2 }]}>Result</Text>
            <Text style={styles.setsCol}>Type</Text>
          </View>
          {sets.map((s) => (
            <View key={s.id || s.setNumber} style={styles.setRow}>
              <Text style={styles.setCol}>{s.setNumber}</Text>
              <Text style={[styles.setCol, { flex: 2 }]}>{formatLogged(s, measurementType)}</Text>
              <View style={styles.setColWrap}>
                <Text style={styles.setCol}>{s.setType}</Text>
                {s.isPr && <Text style={styles.prBadge}>🏆</Text>}
              </View>
            </View>
          ))}
        </View>
      ))}

      {Object.keys(exerciseMap).length === 0 && (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyText}>No sets recorded</Text>
        </View>
      )}
    </ScrollView>
  );
}

function SummaryChip({ icon, label, value }) {
  return (
    <View style={styles.summaryChip}>
      <Ionicons name={icon} size={18} color={COLORS.secondary} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  errorText: { color: COLORS.textMuted, fontSize: 15 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 8 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.white },

  date: { fontSize: 20, fontWeight: '600', color: COLORS.white },
  type: { fontSize: 13, color: COLORS.textMuted, marginBottom: 16 },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryChip: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  summaryValue: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginTop: 4 },
  summaryLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },

  exerciseBlock: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  exerciseName: { color: COLORS.white, fontSize: 16, fontWeight: '600', marginBottom: 10 },
  setsHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 6, marginBottom: 4 },
  setsCol: { flex: 1, color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  setRow: { flexDirection: 'row', paddingVertical: 6 },
  setCol: { flex: 1, color: COLORS.white, fontSize: 14 },
  setColWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  prBadge: { fontSize: 14 },

  emptyBlock: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
});
