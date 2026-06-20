import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar, Animated, Easing, TextInput, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { getSocket } from '../../services/socketService';
import {
  fetchActiveWorkout, startWorkout, logSet, getWorkoutSets, completeWorkout,
  skipInstanceExercise, setInstanceRemark, startInstance,
} from '../../services/workoutService';
import {
  formatLogged, formatTarget, secondsToMmss, mmssToSeconds, kmToMeters, metersToKm,
} from '../../utils/measurement';

const SKIP_REASONS = [
  { key: 'pain', label: 'Pain/discomfort' },
  { key: 'no_equipment', label: 'No equipment' },
  { key: 'out_of_time', label: 'Out of time' },
  { key: 'trainers_call', label: "Trainer's call" },
  { key: 'other', label: 'Other' },
];

export default function WorkoutSessionScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { planId, plan, selfLogExercises, muscleGroups, workoutId } = route.params || {};
  const isInstance = !!workoutId && !planId;
  const isCaseA = !!planId || isInstance; // instances behave like assigned workouts (targets, rest timers)

  const [workoutLog, setWorkoutLog] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [setsByExercise, setSetsByExercise] = useState({});
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [restTimer, setRestTimer] = useState(0);
  const [skipped, setSkipped] = useState({});       // { [exerciseId]: reason }
  const [showSkipFor, setShowSkipFor] = useState(null);
  const [prCelebrate, setPrCelebrate] = useState(null);
  const [workoutRemark, setWorkoutRemark] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const prAnim = useRef(new Animated.Value(0)).current;

  const celebratePR = (prsHit) => {
    setPrCelebrate(prsHit);
    prAnim.setValue(0);
    Animated.sequence([
      Animated.timing(prAnim, { toValue: 1, duration: 350, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(prAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setPrCelebrate(null));
  };

  // Build exercise list from a source array (plan exercises or server exercises)
  const buildExerciseList = (source) => source.map((ex) => ({
    id: ex.exerciseId || ex.id,
    name: ex.exerciseName || ex.name,
    measurementType: ex.measurementType || 'weight_reps',
    targetSets: ex.targetSets ?? ex.sets ?? null,   // snapshot uses `sets`
    targetReps: ex.targetReps ?? null,
    targetWeight: ex.targetWeight ?? null,
    targetTimeSeconds: ex.targetTimeSeconds ?? null,
    targetDistance: ex.targetDistance ?? null,
    restSeconds: ex.restSeconds || 90,
  }));

  // Group raw set rows into { [exerciseId]: [set, ...] }
  const groupSets = (rawSets) => {
    const grouped = {};
    for (const s of rawSets) {
      const key = s.exerciseId;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        setNumber: s.setNumber,
        actualWeight: s.actualWeight != null ? parseFloat(s.actualWeight) : null,
        actualReps: s.actualReps ?? null,
        actualTimeSeconds: s.actualTimeSeconds ?? null,
        actualDistance: s.actualDistance != null ? parseFloat(s.actualDistance) : null,
        setType: s.setType || 'normal',
        isPr: s.isPr || false,
        markedByRole: s.markedByRole || null,
      });
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.setNumber - b.setNumber);
    }
    return grouped;
  };

  // On mount: check for an existing active session first, only call startWorkout if none found
  useEffect(() => {
    (async () => {
      try {
        // ── Instance mode: a dated trainer-assigned workout (Doc 4) ──────────
        if (isInstance) {
          const inst = await startInstance(workoutId); // flips assigned→in_progress, returns detail
          setWorkoutLog(inst);
          const snapExs = inst?.snapshot?.exercises || plan?.exercises || [];
          setExercises(buildExerciseList(snapExs));
          if (inst?.sets?.length > 0) setSetsByExercise(groupSets(inst.sets));
          setLoading(false);
          return;
        }

        // ── Step 1: Check if there's already an in_progress log for today ──────
        let log = (isCaseA && planId) ? await fetchActiveWorkout(planId) : null;

        if (log) {
          // Resume existing session — sets are already in log.sets
          setWorkoutLog(log);
          if (log.sets?.length > 0) {
            setSetsByExercise(groupSets(log.sets));
          }
        } else {
          // ── Step 2: No active session — startWorkout (idempotent on backend) ─
          const body = isCaseA
            ? { planId }
            : { muscleGroups: muscleGroups || [] };
          log = await startWorkout(body);
          setWorkoutLog(log);

          if (log.alreadyCompleted || log.status === 'completed' || log.status === 'partial') {
            navigation.replace('WorkoutSummary', { workoutLogId: log.id, isCaseA });
            return;
          }

          // If it's a resumed session (backend returned existing in_progress log),
          // load its sets — startWorkout doesn't include sets in response
          if (log.resumed && log.id) {
            try {
              const existingSets = await getWorkoutSets(log.id);
              if (existingSets?.length > 0) {
                setSetsByExercise(groupSets(existingSets));
              }
            } catch (setsErr) {
              console.warn('[WorkoutSession] could not load existing sets:', setsErr?.message);
            }
          }
        }

        // ── Build exercise list (from plan passed via route params) ──────────
        if (isCaseA) {
          const source = plan?.exercises?.length > 0 ? plan.exercises : (log.exercises || []);
          setExercises(buildExerciseList(source));
        } else if (selfLogExercises) {
          setExercises(selfLogExercises.map((ex) => ({
            id: ex.id,
            name: ex.name,
            measurementType: ex.measurementType || 'weight_reps',
            targetSets: null,
            targetReps: null,
            targetWeight: null,
            targetTimeSeconds: null,
            targetDistance: null,
            restSeconds: 90,
          })));
        }
      } catch (e) {
        console.error('[WorkoutSession] mount error:', e?.response?.data || e?.message);
        Alert.alert('Error', e?.response?.data?.message || 'Could not start workout');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
    return () => clearInterval(timerRef.current);
  }, []);

  // Re-fetch this session's sets from the server and merge in, preserving any
  // local optimistic sets that haven't synced yet (so a refresh never drops them).
  const reloadSets = useCallback(async () => {
    if (!workoutLog?.id) return;
    try {
      const serverSets = await getWorkoutSets(workoutLog.id);
      const grouped = groupSets(serverSets || []);
      setSetsByExercise((prev) => {
        const merged = { ...grouped };
        for (const exId of Object.keys(prev)) {
          const localOnly = (prev[exId] || []).filter(
            (st) => (st.pending || st.unsynced) &&
              !(merged[exId] || []).some((s) => s.setNumber === st.setNumber));
          if (localOnly.length) merged[exId] = [...(merged[exId] || []), ...localOnly]
            .sort((a, b) => a.setNumber - b.setNumber);
        }
        return merged;
      });
    } catch (e) {
      console.warn('[WorkoutSession] reloadSets failed:', e?.message);
    }
  }, [workoutLog?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reloadSets();
    setRefreshing(false);
  }, [reloadSets]);

  // Live updates: when a trainer logs a set on this member's behalf, refresh.
  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket();
    socket.emit('join:workout', user.id);
    const onSetLogged = (payload) => {
      if (payload?.markedByRole === 'trainer' && (!workoutLog?.id || payload.workoutLogId === workoutLog.id)) {
        reloadSets();
      }
    };
    socket.on('workout:set_logged', onSetLogged);
    return () => socket.off('workout:set_logged', onSetLogged);
  }, [user?.id, workoutLog?.id, reloadSets]);

  const currentExercise = exercises[currentExIdx];
  const currentSets = setsByExercise[currentExercise?.id] || [];
  // Use max existing set number + 1 (safe even after loading previously logged sets)
  const nextSetNumber = currentSets.length > 0
    ? Math.max(...currentSets.map((s) => s.setNumber)) + 1
    : 1;

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

  // `values` carries only the actuals the exercise's measurement type uses, e.g.
  // { actualWeight, actualReps } | { actualReps } | { actualTimeSeconds } | { actualDistance }.
  const handleLogSet = async (values, setType = 'normal', remark = null) => {
    if (!workoutLog || !currentExercise || isCompleted) return;
    const setNumber = nextSetNumber;
    const clientTs = new Date().toISOString();
    // Idempotency key makes offline retries safe (server dedupes — Doc 4 §7.3).
    const idempotencyKey = `${workoutLog.id}:${currentExercise.id}:${setNumber}:${clientTs}`;

    // Optimistic UI — show the set immediately.
    const optimistic = {
      setNumber,
      actualWeight: values.actualWeight ?? null,
      actualReps: values.actualReps ?? null,
      actualTimeSeconds: values.actualTimeSeconds ?? null,
      actualDistance: values.actualDistance ?? null,
      setType, isPr: false, pending: true,
    };
    setSetsByExercise((prev) => ({ ...prev, [currentExercise.id]: [...(prev[currentExercise.id] || []), optimistic] }));
    if (isCaseA && currentExercise.restSeconds) startRestTimer(currentExercise.restSeconds);

    try {
      const result = await logSet(workoutLog.id, {
        exerciseId: currentExercise.id, setNumber,
        ...values,
        setType, remark, idempotencyKey, clientTs,
      });
      const prsHit = result?.data?.prsHit || [];
      setSetsByExercise((prev) => ({
        ...prev,
        [currentExercise.id]: (prev[currentExercise.id] || []).map((st) =>
          st.setNumber === setNumber && st.pending ? { ...st, isPr: prsHit.length > 0, pending: false } : st),
      }));
      if (prsHit.length > 0) celebratePR(prsHit);
    } catch (e) {
      // Keep the optimistic set flagged as unsynced; the idempotency key means a
      // later retry (e.g. on Finish) will not duplicate it.
      setSetsByExercise((prev) => ({
        ...prev,
        [currentExercise.id]: (prev[currentExercise.id] || []).map((st) =>
          st.setNumber === setNumber && st.pending ? { ...st, unsynced: true } : st),
      }));
    }
  };

  const handleSkip = async (reasonKey) => {
    const exId = showSkipFor;
    setShowSkipFor(null);
    setSkipped((prev) => ({ ...prev, [exId]: reasonKey }));
    try { await skipInstanceExercise(workoutLog.id, { exerciseId: exId, skipped: true, reason: reasonKey }); }
    catch { /* best-effort; will re-sync */ }
  };

  const handleUnskip = async (exId) => {
    setSkipped((prev) => { const n = { ...prev }; delete n[exId]; return n; });
    try { await skipInstanceExercise(workoutLog.id, { exerciseId: exId, skipped: false }); } catch { /* */ }
  };

  const handleCompleteWorkout = async () => {
    if (!workoutLog || isCompleted || completing) return;
    setCompleting(true);
    try {
      if (workoutRemark.trim()) {
        try { await setInstanceRemark(workoutLog.id, workoutRemark.trim()); } catch { /* non-blocking */ }
      }
      const result = await completeWorkout(workoutLog.id);
      setIsCompleted(true);
      // Replace immediately — user should not be able to come back to this screen
      navigation.replace('WorkoutSummary', {
        workoutLogId: workoutLog.id,
        summary: result.data,
        isCaseA,
      });
    } catch (e) {
      const msg = e?.response?.data?.message || 'Could not complete workout';
      // If backend says already done, still navigate to summary
      if (e?.response?.status === 400 && msg.includes('not in progress')) {
        setIsCompleted(true);
        navigation.replace('WorkoutSummary', { workoutLogId: workoutLog.id, isCaseA });
      } else {
        Alert.alert('Error', msg);
      }
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
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => {
          if (isCompleted) {
            navigation.replace('WorkoutSummary', { workoutLogId: workoutLog?.id, isCaseA });
            return;
          }
          Alert.alert('Leave?', 'Progress will be saved. You can resume this workout today.', [
            { text: 'Stay', style: 'cancel' },
            { text: 'Leave', onPress: () => navigation.goBack(), style: 'destructive' },
          ]);
        }}>
          <Ionicons name="close" size={28} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <View style={styles.timerBadge}>
          <Ionicons name="time-outline" size={16} color={COLORS.secondary} />
          <Text style={styles.timerText}>{elapsedMinutes} min</Text>
        </View>
        {isCompleted ? (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.completedText}>Done</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={confirmFinish} disabled={completing}>
            <Text style={styles.finishText}>{completing ? 'Saving…' : 'Finish'}</Text>
          </TouchableOpacity>
        )}
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

      {/* PR celebration burst */}
      {prCelebrate && (
        <Animated.View pointerEvents="none" style={[styles.prOverlay, {
          opacity: prAnim,
          transform: [{ scale: prAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
        }]}>
          <Text style={styles.prEmoji}>🏆✨</Text>
          <Text style={styles.prTitle}>New PR!</Text>
          <Text style={styles.prSub}>{prCelebrate.map((p) => p.replace('max_', '').replace('_', ' ')).join(' · ')}</Text>
        </Animated.View>
      )}

      {/* Skip reason sheet */}
      {showSkipFor && (
        <View style={styles.skipSheetOverlay}>
          <View style={styles.skipSheet}>
            <Text style={styles.skipSheetTitle}>Why skip this exercise?</Text>
            {SKIP_REASONS.map((r) => (
              <TouchableOpacity key={r.key} style={styles.skipReasonRow} onPress={() => handleSkip(r.key)}>
                <Text style={styles.skipReasonTxt}>{r.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.skipCancel} onPress={() => setShowSkipFor(null)}>
              <Text style={styles.skipCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
        <ScrollView
          style={styles.body}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />}
        >
          <View style={styles.exHeaderRow}>
            <Text style={[styles.exerciseName, skipped[currentExercise.id] && styles.exNameSkipped]}>{currentExercise.name}</Text>
            {!isCompleted && (
              skipped[currentExercise.id] ? (
                <TouchableOpacity onPress={() => handleUnskip(currentExercise.id)} style={styles.unskipBtn}>
                  <Text style={styles.unskipTxt}>Un-skip</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setShowSkipFor(currentExercise.id)} style={styles.skipBtn}>
                  <Ionicons name="play-skip-forward-outline" size={14} color={COLORS.textMuted} />
                  <Text style={styles.skipBtnTxt}>Skip</Text>
                </TouchableOpacity>
              )
            )}
          </View>
          {skipped[currentExercise.id] && (
            <View style={styles.skippedBanner}>
              <Text style={styles.skippedBannerTxt}>Skipped — {SKIP_REASONS.find((r) => r.key === skipped[currentExercise.id])?.label || 'skipped'}. It won't count against completion.</Text>
            </View>
          )}

          {/* Targets (Case A only) — fields depend on measurement type */}
          {isCaseA && currentExercise.targetSets && (
            <View style={styles.targetsRow}>
              <TargetChip label="Sets" value={currentExercise.targetSets} />
              <TargetChipsForType exercise={currentExercise} />
            </View>
          )}

          {/* Completed banner */}
          {isCompleted && (
            <View style={styles.completedBanner}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.completedBannerText}>Workout completed!</Text>
            </View>
          )}

          {/* Logged sets */}
          <Text style={styles.sectionTitle}>
            Sets Logged{currentSets.length > 0 ? ` (${currentSets.length})` : ''}
          </Text>
          {currentSets.length === 0 && (
            <Text style={styles.emptyText}>No sets logged yet — log your first set below</Text>
          )}
          {currentSets.map((s) => {
            const typeColors = {
              warmup:  { bg: 'rgba(59,130,246,0.12)', text: '#3B82F6' },
              drop:    { bg: 'rgba(168,85,247,0.12)', text: '#A855F7' },
              failure: { bg: 'rgba(239,68,68,0.12)',  text: '#EF4444' },
              normal:  { bg: 'rgba(255,255,255,0.06)', text: COLORS.textMuted },
            };
            const tc = typeColors[s.setType] || typeColors.normal;
            return (
              <View key={`${s.setNumber}-${s.setType}`} style={styles.setRow}>
                <View style={styles.setNumBadge}>
                  <Text style={styles.setNum}>{s.setNumber}</Text>
                </View>
                <Text style={styles.setDetail}>{formatLogged(s, currentExercise.measurementType)}</Text>
                <View style={[styles.setTypeBadge, { backgroundColor: tc.bg }]}>
                  <Text style={[styles.setType, { color: tc.text }]}>{s.setType}</Text>
                </View>
                {s.markedByRole === 'trainer' && (
                  <View style={styles.byTrainerChip}>
                    <Text style={styles.byTrainerTxt}>T</Text>
                  </View>
                )}
                {s.isPr && <Text style={styles.prBadge}>🏆 PR</Text>}
              </View>
            );
          })}

          {/* Log set form — hidden after completion (or when skipped) */}
          {!isCompleted && !skipped[currentExercise.id] && (
            <SetInputForm
              key={`${currentExercise.id}-${nextSetNumber}`}
              exercise={currentExercise}
              isCaseA={isCaseA}
              onSubmit={handleLogSet}
              setNumber={nextSetNumber}
            />
          )}

          {/* Workout-level remark (flows to the trainer) */}
          {!isCompleted && currentExIdx === exercises.length - 1 && (
            <View style={styles.remarkCard}>
              <Text style={styles.remarkLabel}>Workout note (optional)</Text>
              <TextInput
                style={styles.remarkInput}
                value={workoutRemark}
                onChangeText={setWorkoutRemark}
                placeholder="How did it go? Anything for your coach…"
                placeholderTextColor={COLORS.textMuted}
                multiline
                maxLength={300}
              />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ── Set input form — prefilled steppers + one-tap ✓ (Doc 4 §7.2) ─────────────

function SetInputForm({ exercise, onSubmit, setNumber }) {
  const type = exercise.measurementType || 'weight_reps';
  const clamp = (n) => Math.max(0, n);

  const [weight, setWeight] = useState(exercise.targetWeight != null ? Number(exercise.targetWeight) : 0);
  const [reps, setReps] = useState(exercise.targetReps != null ? Number(exercise.targetReps) : 0);
  // time (seconds) + count-up timer
  const [seconds, setSeconds] = useState(exercise.targetTimeSeconds != null ? Number(exercise.targetTimeSeconds) : 0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerInt = useRef(null);
  // distance
  const initialKm = exercise.targetDistance != null && Number(exercise.targetDistance) >= 1000;
  const [distUnit, setDistUnit] = useState(initialKm ? 'km' : 'm');
  const [distInput, setDistInput] = useState(
    exercise.targetDistance != null
      ? String(initialKm ? metersToKm(Number(exercise.targetDistance)) : Number(exercise.targetDistance))
      : ''
  );
  const [setType, setSetType] = useState('normal');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => () => clearInterval(timerInt.current), []);

  const toggleTimer = () => {
    if (timerRunning) {
      clearInterval(timerInt.current);
      setTimerRunning(false);
    } else {
      setTimerRunning(true);
      timerInt.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
  };

  const buildValues = () => {
    if (type === 'reps') return { actualReps: Math.round(reps) || 0 };
    if (type === 'time') return { actualTimeSeconds: Math.round(seconds) || 0 };
    if (type === 'distance') {
      const meters = distUnit === 'km' ? kmToMeters(distInput) : Math.round(parseFloat(distInput) || 0);
      return { actualDistance: meters };
    }
    return { actualWeight: clamp(weight) || 0, actualReps: Math.round(reps) || 0 };
  };

  const handleSubmit = async () => {
    if (timerRunning) { clearInterval(timerInt.current); setTimerRunning(false); }
    setSubmitting(true);
    await onSubmit(buildValues(), setType);
    setSubmitting(false);
    // Reset to target for the next set (keep weight; reset reps/time).
    if (type === 'time') setSeconds(exercise.targetTimeSeconds != null ? Number(exercise.targetTimeSeconds) : 0);
    if ((type === 'weight_reps' || type === 'reps') && exercise.targetReps != null) setReps(Number(exercise.targetReps));
  };

  const showSetTypes = type === 'weight_reps' || type === 'reps';

  return (
    <View style={styles.inputCard}>
      <Text style={styles.inputTitle}>Set {setNumber}</Text>

      {type === 'weight_reps' && (
        <View style={styles.inputRow}>
          <Stepper label="Weight (kg)" value={weight} onDec={() => setWeight((w) => clamp(w - 2.5))} onInc={() => setWeight((w) => w + 2.5)} />
          <Stepper label="Reps" value={reps} onDec={() => setReps((r) => clamp(r - 1))} onInc={() => setReps((r) => r + 1)} />
        </View>
      )}

      {type === 'reps' && (
        <View style={styles.inputRow}>
          <Stepper label="Reps" value={reps} onDec={() => setReps((r) => clamp(r - 1))} onInc={() => setReps((r) => r + 1)} />
        </View>
      )}

      {type === 'time' && (
        <View style={styles.timeBlock}>
          <Text style={styles.inputLabel}>Time (mm:ss)</Text>
          <View style={styles.timeRow}>
            <TextInput
              style={styles.timeField}
              value={secondsToMmss(seconds)}
              onChangeText={(v) => setSeconds(mmssToSeconds(v))}
              keyboardType="numbers-and-punctuation"
              editable={!timerRunning}
            />
            <TouchableOpacity style={[styles.timerChip, timerRunning && styles.timerChipOn]} onPress={toggleTimer}>
              <Ionicons name={timerRunning ? 'stop' : 'play'} size={16} color={timerRunning ? COLORS.white : COLORS.secondary} />
              <Text style={[styles.timerChipTxt, timerRunning && { color: COLORS.white }]}>{timerRunning ? 'Stop' : 'Start'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {type === 'distance' && (
        <View style={styles.timeBlock}>
          <Text style={styles.inputLabel}>Distance</Text>
          <View style={styles.timeRow}>
            <TextInput
              style={[styles.timeField, { flex: 1 }]}
              value={distInput}
              onChangeText={setDistInput}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
            />
            <TouchableOpacity style={styles.unitToggle} onPress={() => setDistUnit((u) => (u === 'km' ? 'm' : 'km'))}>
              <Text style={styles.unitToggleTxt}>{distUnit}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showSetTypes && (
        <View style={styles.typeRow}>
          {['normal', 'warmup', 'drop', 'failure'].map((t) => (
            <TouchableOpacity key={t} style={[styles.typeChip, setType === t && styles.typeChipActive]} onPress={() => setSetType(t)}>
              <Text style={[styles.typeText, setType === t && styles.typeTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity style={[styles.logBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
        <Ionicons name="checkmark" size={22} color={COLORS.white} />
        <Text style={styles.logBtnText}>{submitting ? 'Logging…' : 'Log set'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function Stepper({ label, value, onDec, onInc }) {
  return (
    <View style={styles.stepperGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <TouchableOpacity style={styles.stepBtn} onPress={onDec}><Ionicons name="remove" size={20} color={COLORS.white} /></TouchableOpacity>
        <Text style={styles.stepVal}>{value}</Text>
        <TouchableOpacity style={styles.stepBtn} onPress={onInc}><Ionicons name="add" size={20} color={COLORS.white} /></TouchableOpacity>
      </View>
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

// Renders the target chips (after the Sets chip) appropriate to the exercise's
// measurement type.
function TargetChipsForType({ exercise }) {
  const type = exercise.measurementType || 'weight_reps';
  if (type === 'reps') {
    return <TargetChip label="Reps" value={exercise.targetReps ?? '—'} />;
  }
  if (type === 'time') {
    return <TargetChip label="Time" value={secondsToMmss(exercise.targetTimeSeconds)} />;
  }
  if (type === 'distance') {
    const m = Number(exercise.targetDistance) || 0;
    return <TargetChip label="Distance" value={m >= 1000 ? `${metersToKm(m)} km` : `${Math.round(m)} m`} />;
  }
  return (
    <>
      <TargetChip label="Reps" value={exercise.targetReps ?? '—'} />
      <TargetChip label="Weight" value={exercise.targetWeight != null ? `${exercise.targetWeight} kg` : '—'} />
    </>
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

  // Completed state
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  completedText: { color: '#34C759', fontSize: 15, fontWeight: '700' },
  completedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(52,199,89,0.1)', borderWidth: 1, borderColor: 'rgba(52,199,89,0.3)',
    borderRadius: 10, padding: 12, marginBottom: 12,
  },
  completedBannerText: { color: '#34C759', fontSize: 14, fontWeight: '600' },

  // Sets
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 13, marginBottom: 12 },
  setRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 10,
    marginBottom: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  setNumBadge: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  setNum: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  setDetail: { color: COLORS.white, fontSize: 14, fontWeight: '600', flex: 1 },
  setTypeBadge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  setType: { fontSize: 10, fontWeight: '700' },
  byTrainerChip: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: COLORS.secondaryGlow ?? 'rgba(233,99,22,0.15)' },
  byTrainerTxt: { fontSize: 10, fontWeight: '800', color: COLORS.secondary },
  prBadge: { fontSize: 12 },

  // Input
  inputCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: COLORS.border },
  inputTitle: { color: COLORS.white, fontSize: 16, fontWeight: '600', marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 },
  input: { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.white, fontSize: 18, fontWeight: '600', borderWidth: 1, borderColor: COLORS.border },

  // Time / distance inputs
  timeBlock: { marginTop: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeField: { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, color: COLORS.white, fontSize: 22, fontWeight: '800', borderWidth: 1, borderColor: COLORS.border, textAlign: 'center', minWidth: 110 },
  timerChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.secondary },
  timerChipOn: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  timerChipTxt: { color: COLORS.secondary, fontSize: 14, fontWeight: '700' },
  unitToggle: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.secondary, alignItems: 'center', minWidth: 50 },
  unitToggleTxt: { color: COLORS.white, fontSize: 16, fontWeight: '800' },

  // Set type
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  typeChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  typeText: { color: COLORS.textSecondary, fontSize: 12 },
  typeTextActive: { color: COLORS.white, fontWeight: '600' },

  // Log button
  logBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.secondary, borderRadius: 12, paddingVertical: 16, marginTop: 16 },
  logBtnText: { color: COLORS.white, fontSize: 17, fontWeight: '800' },

  // Steppers
  stepperGroup: { flex: 1 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 6, paddingVertical: 6 },
  stepBtn: { width: 38, height: 38, borderRadius: 8, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  stepVal: { color: COLORS.white, fontSize: 20, fontWeight: '800' },

  // Exercise header + skip
  exHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  exNameSkipped: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  skipBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  skipBtnTxt: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  unskipBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: COLORS.surface },
  unskipTxt: { color: COLORS.secondary, fontSize: 12, fontWeight: '700' },
  skippedBanner: { backgroundColor: 'rgba(255,193,7,0.12)', borderRadius: 10, padding: 10, marginTop: 8 },
  skippedBannerTxt: { color: '#FFC107', fontSize: 12 },

  // Skip reason sheet
  skipSheetOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 20, justifyContent: 'flex-end' },
  skipSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  skipSheetTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  skipReasonRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  skipReasonTxt: { color: COLORS.textPrimary, fontSize: 15 },
  skipCancel: { marginTop: 14, alignItems: 'center', paddingVertical: 12 },
  skipCancelTxt: { color: COLORS.textMuted, fontWeight: '700' },

  // Remark
  remarkCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: COLORS.border },
  remarkLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 8 },
  remarkInput: { backgroundColor: COLORS.background, borderRadius: 10, padding: 12, color: COLORS.white, minHeight: 64, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border },

  // PR celebration
  prOverlay: { position: 'absolute', top: '38%', left: 0, right: 0, alignItems: 'center', zIndex: 30 },
  prEmoji: { fontSize: 56 },
  prTitle: { color: '#FFD700', fontSize: 28, fontWeight: '900', marginTop: 6 },
  prSub: { color: COLORS.white, fontSize: 14, marginTop: 4, textTransform: 'capitalize' },
});
