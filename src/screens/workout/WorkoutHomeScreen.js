import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import {
  fetchTodaysPlan, fetchActivityRings, fetchStreak,
  fetchWeeklySummary, fetchNudges, fetchInstances,
} from '../../services/workoutService';
import { fetchMyTrainer } from '../../services/trainerService';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function WorkoutHomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [todaysPlan, setTodaysPlan] = useState(null);
  const [myTrainer, setMyTrainer] = useState(null);
  const [rings, setRings] = useState(null);
  const [streak, setStreak] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [nudges, setNudges] = useState([]);
  const [instances, setInstances] = useState({ today: [], upcoming: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [plan, trainerData, ringData, streakData, summary, nudgeData, inst] = await Promise.allSettled([
        fetchTodaysPlan(),
        fetchMyTrainer(),
        fetchActivityRings(),
        fetchStreak(),
        fetchWeeklySummary(),
        fetchNudges('home'),
        fetchInstances(),
      ]);
      setTodaysPlan(plan.status === 'fulfilled' ? plan.value : null);
      setMyTrainer(trainerData.status === 'fulfilled' ? trainerData.value : null);
      setRings(ringData.status === 'fulfilled' ? ringData.value : null);
      setStreak(streakData.status === 'fulfilled' ? streakData.value : null);
      setWeeklySummary(summary.status === 'fulfilled' ? summary.value : null);
      setNudges(nudgeData.status === 'fulfilled' ? nudgeData.value : []);
      setInstances(inst.status === 'fulfilled' ? (inst.value || { today: [], upcoming: [] }) : { today: [], upcoming: [] });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  const hasTrainer = !!myTrainer;

  // Case A: member has trainer + plan today → Start Workout card
  // Case A rest: member has trainer but no plan today → Rest Day card
  // Case B: no trainer → Self-log card
  const renderWorkoutCard = () => {
    if (hasTrainer && todaysPlan) {
      return (
        <TouchableOpacity
          style={styles.todayCard}
          onPress={() => navigation.navigate('WorkoutSession', { planId: todaysPlan.id, plan: todaysPlan })}
          activeOpacity={0.8}
        >
          <View style={styles.todayBadge}>
            <Ionicons name="barbell" size={20} color={COLORS.white} />
            <Text style={styles.todayBadgeText}>TRAINER ASSIGNED</Text>
          </View>
          <Text style={styles.todayTitle}>{todaysPlan.name}</Text>
          <Text style={styles.todaySubtitle}>
            {DAY_NAMES[todaysPlan.dayOfWeek]} • {todaysPlan.exercises?.length || 0} exercises
          </Text>
          {todaysPlan.trainerName && (
            <Text style={styles.todayTrainer}>By {todaysPlan.trainerName}</Text>
          )}
          <View style={styles.startBtn}>
            <Text style={styles.startBtnText}>Start Workout</Text>
            <Ionicons name="play" size={18} color={COLORS.white} />
          </View>
        </TouchableOpacity>
      );
    }

    if (hasTrainer && !todaysPlan) {
      return (
        <View style={styles.restDayCard}>
          <Ionicons name="moon-outline" size={32} color={COLORS.textSecondary} />
          <Text style={styles.restDayTitle}>Rest Day</Text>
          <Text style={styles.restDaySubtitle}>
            No workout assigned for today. Rest up — your trainer has you covered.
          </Text>
          {myTrainer && (
            <Text style={styles.restDayTrainer}>
              Trainer: {myTrainer.name || myTrainer.fullName || 'Your Trainer'}
            </Text>
          )}
        </View>
      );
    }

    // Case B — no trainer
    return (
      <TouchableOpacity
        style={styles.selfLogCard}
        onPress={() => navigation.navigate('MuscleGroupPicker')}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle-outline" size={32} color={COLORS.secondary} />
        <Text style={styles.selfLogTitle}>Start Workout</Text>
        <Text style={styles.selfLogSubtitle}>No plan assigned today — log your own workout</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Workouts</Text>
          <TouchableOpacity onPress={() => navigation.navigate('WorkoutHistory')}>
            <Ionicons name="time-outline" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Assigned workouts (dated instances — Doc 4) */}
        {(instances.today?.length > 0 || instances.upcoming?.length > 0) && (
          <View style={{ marginBottom: 16 }}>
            {instances.today?.map((inst) => {
              const exCount = Array.isArray(inst.snapshot?.exercises) ? inst.snapshot.exercises.length : 0;
              const done = ['completed', 'partial'].includes(inst.status);
              return (
                <TouchableOpacity
                  key={inst.id}
                  style={styles.todayCard}
                  activeOpacity={0.85}
                  disabled={done}
                  onPress={() => navigation.navigate('WorkoutSession', { workoutId: inst.id, plan: inst.snapshot })}
                >
                  <View style={styles.todayBadge}>
                    <Ionicons name="barbell" size={18} color={COLORS.white} />
                    <Text style={styles.todayBadgeText}>{done ? 'DONE TODAY' : 'TODAY · ASSIGNED'}</Text>
                  </View>
                  <Text style={styles.todayTitle}>{inst.snapshot?.name || 'Workout'}</Text>
                  <Text style={styles.todaySubtitle}>{exCount} exercises{inst.status === 'in_progress' ? ' • in progress' : ''}</Text>
                  {!done && (
                    <View style={styles.startBtn}>
                      <Text style={styles.startBtnText}>{inst.status === 'in_progress' ? 'Continue' : 'Start Workout'}</Text>
                      <Ionicons name="play" size={18} color={COLORS.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            {instances.upcoming?.length > 0 && (
              <Text style={styles.upcomingHint}>{instances.upcoming.length} upcoming workout{instances.upcoming.length === 1 ? '' : 's'} this week</Text>
            )}
          </View>
        )}

        {/* Activity Rings */}
        {rings && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Activity</Text>
            <View style={styles.ringsRow}>
              <RingItem
                label="Move"
                value={`${Math.round(rings.move.current)} kg`}
                pct={rings.move.pct}
                color="#FF3B30"
              />
              <RingItem
                label="Train"
                value={`${rings.train.current} min`}
                pct={rings.train.pct}
                color="#34C759"
              />
              <RingItem
                label="Streak"
                value={streak ? `${streak.currentStreak}d` : '0d'}
                pct={streak ? Math.min(streak.currentStreak / 7 * 100, 100) : 0}
                color="#007AFF"
              />
            </View>
          </View>
        )}

        {/* Workout Card: Case A / Rest Day / Case B */}
        {renderWorkoutCard()}

        {/* Weekly Summary */}
        {weeklySummary && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>This Week</Text>
            <View style={styles.statsRow}>
              <StatItem label="Workouts" value={weeklySummary.workoutCount} />
              <StatItem label="Volume" value={`${Math.round(weeklySummary.totalVolumeKg)} kg`} />
              <StatItem label="Minutes" value={weeklySummary.totalMinutes} />
            </View>
          </View>
        )}

        {/* Streak Info */}
        {streak && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('StreakDetail')}
            activeOpacity={0.8}
          >
            <View style={styles.streakRow}>
              <View>
                <Text style={styles.cardTitle}>Streak</Text>
                <Text style={styles.streakValue}>{streak.currentStreak} days</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.textMuted}>Longest: {streak.longestStreak} days</Text>
                {streak.nextMilestone && (
                  <Text style={styles.textMuted}>
                    Next: {streak.nextMilestone.label} ({streak.nextMilestone.daysRemaining}d away)
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <QuickAction icon="stats-chart" label="Stats" onPress={() => navigation.navigate('WorkoutStats')} />
          <QuickAction icon="trophy" label="PRs" onPress={() => navigation.navigate('PersonalRecords')} />
          <QuickAction icon="body" label="Muscles" onPress={() => navigation.navigate('MuscleDistribution')} />
        </View>

        {/* PT Nudge (Case B only — API already filters these out for trainer-assigned members) */}
        {nudges.length > 0 && (
          <View style={styles.nudgeCard}>
            <Text style={styles.nudgeTitle}>{nudges[0].title}</Text>
            <Text style={styles.nudgeMessage}>{nudges[0].message}</Text>
            <TouchableOpacity
              style={styles.nudgeCta}
              onPress={() => navigation.navigate('Trainers')}
            >
              <Text style={styles.nudgeCtaText}>{nudges[0].cta}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function RingItem({ label, value, pct, color }) {
  const clampedPct = Math.min(pct, 100);
  return (
    <View style={styles.ringItem}>
      <View style={[styles.ringCircle, { borderColor: `${color}33` }]}>
        <View style={[styles.ringProgress, {
          borderColor: color,
          borderLeftColor: clampedPct > 50 ? color : 'transparent',
          borderBottomColor: clampedPct > 25 ? color : 'transparent',
        }]} />
        <Text style={[styles.ringPct, { color }]}>{Math.round(pct)}%</Text>
      </View>
      <Text style={styles.ringLabel}>{label}</Text>
      <Text style={styles.ringValue}>{value}</Text>
    </View>
  );
}

function StatItem({ label, value }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color={COLORS.secondary} />
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 28, fontWeight: '700', color: COLORS.white },

  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.white, marginBottom: 12 },

  // Rings
  ringsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  ringItem: { alignItems: 'center' },
  ringCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  ringProgress: { position: 'absolute', width: 72, height: 72, borderRadius: 36, borderWidth: 4 },
  ringPct: { fontSize: 14, fontWeight: '700' },
  ringLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  ringValue: { fontSize: 12, color: COLORS.textMuted },

  // Today's workout card (Case A)
  todayCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: COLORS.secondaryBorder },
  todayBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  todayBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.secondary, letterSpacing: 1 },
  todayTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white, marginBottom: 4 },
  todaySubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 2 },
  upcomingHint: { color: COLORS.textMuted, fontSize: 12, marginTop: 2, marginLeft: 4 },
  todayTrainer: { fontSize: 13, color: COLORS.textMuted, marginBottom: 16 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.secondary, borderRadius: 12, paddingVertical: 14 },
  startBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },

  // Rest day card (Case A, no plan today)
  restDayCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  restDayTitle: { fontSize: 18, fontWeight: '600', color: COLORS.white, marginTop: 8 },
  restDaySubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 18 },
  restDayTrainer: { fontSize: 12, color: COLORS.textSecondary, marginTop: 10 },

  // Self-log card (Case B)
  selfLogCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' },
  selfLogTitle: { fontSize: 18, fontWeight: '600', color: COLORS.white, marginTop: 8 },
  selfLogSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.white },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  // Streak
  streakRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streakValue: { fontSize: 24, fontWeight: '700', color: COLORS.secondary },
  textMuted: { fontSize: 12, color: COLORS.textMuted },

  // Quick Actions
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 10 },
  quickAction: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  quickLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6 },

  // Nudge
  nudgeCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  nudgeTitle: { fontSize: 15, fontWeight: '600', color: COLORS.white, marginBottom: 6 },
  nudgeMessage: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12, lineHeight: 18 },
  nudgeCta: { backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  nudgeCtaText: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },
});
