import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import {
  startWorkout, logSet, getWorkoutSets, completeWorkout,
} from '../../services/workoutService';

export default function WorkoutSessionScreen({ route, navigation }) {
  const { planId, plan, selfLogExercises, muscleGroups } = route.params || {};
  const isCaseA = !!planId;

  const [workoutLog, setWorkoutLog] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [setsByExercise, setSetsByExercise] = useState({});
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [restTimer, setRestTimer] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Start workout on mount
  useEffect(() => {
    (async () => {
      try {
        const body = isCaseA
          ? { planId }
          : { muscleGroups: muscleGroups || [] };
        const log = await startWorkout(body);
        setWorkoutLog(log);

        if (isCaseA && plan?.exercises) {
          setExercises(plan.exercises.map((ex) => ({
            id: ex.exerciseId,
            name: ex.exerciseName || ex.name,
            targetSets: ex.targetSets,
            targetReps: ex.targetReps,
            targetWeight: ex.targetWeight,
            restSeconds: ex.restSeconds || 90,
          })));
        } else if (selfLogExercises) {
          setExercises(selfLogExercises.map((ex) => ({
            id: ex.id,
            name: ex.name,
            targetSets: null,
            targetReps: null,
            targetWeight: null,
            restSeconds: 90,
          })));
        }
      } catch (e) {
        Alert.alert('Error', e.response?.data?.message || 'Could not start workout');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
    return () => clearInterval(timerRef.current);
  }, []);

  const currentExercise = exercises[currentExIdx];
  const currentSets = setsByExercise[currentExercise?.id] || [];
  const nextSetNumber = currentSets.length + 1;

  // Rest timer
  const startRestTimer = (seconds) => {
    setRestTimer(seconds);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRestTimer((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleLogSet = async (weight, reps, setType = 'normal') => {
    if (!workoutLog || !currentExercise) return;
    try {
      const result = await logSet(workoutLog.id, {
        exerciseId: currentExercise.id,
        setNumber: nextSetNumber,
        actualWeight: parseFloat(weight) || 0,
        actualReps: parseInt(reps) || 0,
        setType,
      });

      const newSet = {
        setNumber: nextSetNumber,
        actualWeight: parseFloat(weight) || 0,
        actualReps: parseInt(reps) || 0,
        setType,
        isPr: result.data?.isPr || false,
      };

      setSetsByExercise((prev) => ({
        ...prev,
        [currentExercise.id]: [...(prev[currentExercise.id] || []), newSet],
      }));

      // Auto-start rest timer for Case A
      if (isCaseA && currentExercise.restSeconds) {
        startRestTimer(currentExercise.restSeconds);
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Could not log set');
    }
  };

  const handleCompleteWorkout = async () => {
    if (!workoutLog) return;
    setCompleting(true);
    try {
      const result = await completeWorkout(workoutLog.id);
      navigation.replace('WorkoutSummary', {
        workoutLogId: workoutLog.id,
        summary: result.data,
        isCaseA,
      });
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Could not complete workout');
    } finally {
      setCompleting(false);
    }
  };

  const confirmFinish = () => {
    Alert.alert('Finish Workout', 'Complete this workout session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Complete', onPress: handleCompleteWorkout, style: 'default' },
    ]);
  };

  const elapsedMinutes = Math.round((Date.now() - startTimeRef.current) / 60000);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
        <Text style={styles.loadingText}>Starting workout…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => Alert.alert('Leave?', 'Progress will be saved as partial.', [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', onPress: () => navigation.goBack(), style: 'destructive' },
        ])}>
          <Ionicons name="close" size={28} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <View style={styles.timerBadge}>
          <Ionicons name="time-outline" size={16} color={COLORS.secondary} />
          <Text style={styles.timerText}>{elapsedMinutes} min</Text>
        </View>
        <TouchableOpacity onPress={confirmFinish} disabled={completing}>
          <Text style={styles.finishText}>{completing ? 'Saving…' : 'Finish'}</Text>
        </TouchableOpacity>
      </View>

      {/* Rest timer overlay */}
      {restTimer > 0 && (
        <View style={styles.restOverlay}>
          <Text style={styles.restLabel}>Rest</Text>
          <Text style={styles.restTime}>{restTimer}s</Text>
          <TouchableOpacity onPress={() => { clearInterval(timerRef.current); setRestTimer(0); }}>
            <Text style={styles.skipRest}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Exercise tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {exercises.map((ex, idx) => {
          const setsCount = (setsByExercise[ex.id] || []).length;
          const isDone = isCaseA && ex.targetSets && setsCount >= ex.targetSets;
          return (
            <TouchableOpacity
              key={ex.id}
              style={[styles.tab, currentExIdx === idx && styles.tabActive]}
              onPress={() => setCurrentExIdx(idx)}
            >
              {isDone && <Ionicons name="checkmark-circle" size={14} color="#34C759" style={{ marginRight: 4 }} />}
              <Text style={[styles.tabText, currentExIdx === idx && styles.tabTextActive]} numberOfLines={1}>
                {ex.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Current exercise detail */}
      {currentExercise && (
        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 120 }}>
          <Text style={styles.exerciseName}>{currentExercise.name}</Text>

          {/* Targets (Case A only) */}
          {isCaseA && currentExercise.targetSets && (
            <View style={styles.targetsRow}>
              <TargetChip label="Sets" value={currentExercise.targetSets} />
              <TargetChip label="Reps" value={currentExercise.targetReps} />
              <TargetChip label="Weight" value={`${currentExercise.targetWeight} kg`} />
            </View>
          )}

          {/* Logged sets */}
          <Text style={styles.sectionTitle}>Sets Logged</Text>
          {currentSets.length === 0 && (
            <Text style={styles.emptyText}>No sets logged yet</Text>
          )}
          {currentSets.map((s) => (
            <View key={s.setNumber} style={styles.setRow}>
              <Text style={styles.setNum}>Set {s.setNumber}</Text>
              <Text style={styles.setDetail}>{s.actualWeight} kg × {s.actualReps} reps</Text>
              <Text style={styles.setType}>{s.setType}</Text>
              {s.isPr && <Text style={styles.prBadge}>🏆 PR!</Text>}
            </View>
          ))}

          {/* Log set form */}
          <SetInputForm
            onSubmit={handleLogSet}
            defaultWeight={isCaseA ? currentExercise.targetWeight : ''}
            defaultReps={isCaseA ? currentExercise.targetReps : ''}
            setNumber={nextSetNumber}
          />
        </ScrollView>
      )}
    </View>
  );
}

// ── Set input form ───────────────────────────────────────────────────────────

import { TextInput } from 'react-native';

function SetInputForm({ onSubmit, defaultWeight, defaultReps, setNumber }) {
  const [weight, setWeight] = useState(defaultWeight?.toString() || '');
  const [reps, setReps] = useState(defaultReps?.toString() || '');
  const [setType, setSetType] = useState('normal');
  const [submitting, setSubmitting] = useState(false);

  const SET_TYPES = ['normal', 'warmup', 'drop', 'failure'];

  const handleSubmit = async () => {
    if (!weight || !reps) return;
    setSubmitting(true);
    await onSubmit(weight, reps, setType);
    setSubmitting(false);
    // Reset reps but keep weight for convenience
    setReps(defaultReps?.toString() || '');
  };

  return (
    <View style={styles.inputCard}>
      <Text style={styles.inputTitle}>Set {setNumber}</Text>

      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Reps</Text>
          <TextInput
            style={styles.input}
            value={reps}
            onChangeText={setReps}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      </View>

      {/* Set type selector */}
      <View style={styles.typeRow}>
        {SET_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeChip, setType === t && styles.typeChipActive]}
            onPress={() => setSetType(t)}
          >
            <Text style={[styles.typeText, setType === t && styles.typeTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.logBtn, submitting && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={submitting || !weight || !reps}
      >
        <Ionicons name="checkmark" size={20} color={COLORS.white} />
        <Text style={styles.logBtnText}>{submitting ? 'Logging…' : 'Log Set'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function TargetChip({ label, value }) {
  return (
    <View style={styles.targetChip}>
      <Text style={styles.targetLabel}>{label}</Text>
      <Text style={styles.targetValue}>{value}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { color: COLORS.textSecondary, marginTop: 12 },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  timerText: { color: COLORS.secondary, fontSize: 14, fontWeight: '600' },
  finishText: { color: COLORS.secondary, fontSize: 16, fontWeight: '700' },

  // Rest overlay
  restOverlay: { position: 'absolute', top: 56, left: 0, right: 0, zIndex: 10, backgroundColor: COLORS.surface, paddingVertical: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  restLabel: { color: COLORS.textSecondary, fontSize: 13 },
  restTime: { color: COLORS.white, fontSize: 40, fontWeight: '700' },
  skipRest: { color: COLORS.secondary, fontSize: 14, fontWeight: '600', marginTop: 6 },

  // Tabs
  tabs: { flexGrow: 0, paddingHorizontal: 12, marginBottom: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderRadius: 20, backgroundColor: COLORS.surface, flexDirection: 'row', alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.secondary },
  tabText: { color: COLORS.textSecondary, fontSize: 13 },
  tabTextActive: { color: COLORS.white, fontWeight: '600' },

  // Body
  body: { flex: 1, paddingHorizontal: 16 },
  exerciseName: { fontSize: 22, fontWeight: '700', color: COLORS.white, marginBottom: 12, marginTop: 8 },

  // Targets
  targetsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  targetChip: { backgroundColor: COLORS.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  targetLabel: { color: COLORS.textMuted, fontSize: 11 },
  targetValue: { color: COLORS.white, fontSize: 15, fontWeight: '600' },

  // Sets
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 13, marginBottom: 12 },
  setRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: COLORS.border },
  setNum: { color: COLORS.textSecondary, fontSize: 13, width: 50 },
  setDetail: { color: COLORS.white, fontSize: 15, fontWeight: '600', flex: 1 },
  setType: { color: COLORS.textMuted, fontSize: 11, marginRight: 8 },
  prBadge: { fontSize: 14 },

  // Input
  inputCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: COLORS.border },
  inputTitle: { color: COLORS.white, fontSize: 16, fontWeight: '600', marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 },
  input: { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.white, fontSize: 18, fontWeight: '600', borderWidth: 1, borderColor: COLORS.border },

  // Set type
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  typeChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  typeText: { color: COLORS.textSecondary, fontSize: 12 },
  typeTextActive: { color: COLORS.white, fontWeight: '600' },

  // Log button
  logBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.secondary, borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  logBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});
