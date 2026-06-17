import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '../../constants/colors';
import {
  fetchKPIs, fetchWeeklySummary, fetchMuscleDistribution,
  fetchPersonalRecords, fetchWorkoutHistory,
} from '../../services/workoutService';

const PERIODS = [['7D', 7], ['30D', 30], ['90D', 90], ['All', 365]];
const MUSCLE_PALETTE = ['#7C3AED', '#06B6D4', '#22C55E', '#F59E0B', '#EF4444', '#A78BFA', '#00F2FF', '#FFD700', '#FF6B9D', '#4ADE80', '#FB923C'];
const PR_LABEL = { max_weight: 'Heaviest', max_reps: 'Most reps', max_volume: 'Best volume' };

export default function WorkoutStatsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [kpis, setKpis] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [muscle, setMuscle] = useState([]);
  const [prs, setPrs] = useState([]);
  const [history, setHistory] = useState([]);
  const [period, setPeriod] = useState(1); // index into PERIODS (30D)
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [k, w, m, p, h] = await Promise.allSettled([
        fetchKPIs(), fetchWeeklySummary(), fetchMuscleDistribution(),
        fetchPersonalRecords(), fetchWorkoutHistory({ limit: 120 }),
      ]);
      setKpis(k.status === 'fulfilled' ? k.value : null);
      setWeekly(w.status === 'fulfilled' ? w.value : null);
      setMuscle(m.status === 'fulfilled' ? (m.value || []) : []);
      setPrs(p.status === 'fulfilled' ? (p.value || []) : []);
      setHistory(h.status === 'fulfilled' ? (Array.isArray(h.value) ? h.value : (h.value?.items || h.value || [])) : []);
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
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.secondary} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Progress</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {PERIODS.map(([label], i) => (
          <TouchableOpacity key={label} style={[styles.periodBtn, period === i && styles.periodBtnOn]} onPress={() => setPeriod(i)}>
            <Text style={[styles.periodTxt, period === i && styles.periodTxtOn]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* This Week Overview */}
      {weekly && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>This Week</Text>
          <View style={styles.statsGrid}>
            <KpiBox label="Workouts" value={weekly.workoutCount} />
            <KpiBox label="Volume" value={`${Math.round(weekly.totalVolumeKg)} kg`} />
            <KpiBox label="Minutes" value={weekly.totalMinutes} />
            <KpiBox label="Avg Duration" value={`${weekly.avgDurationMinutes || 0} min`} />
          </View>
        </View>
      )}

      {/* KPIs */}
      {kpis && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Progressive Overload</Text>
            <Text style={[styles.bigValue, kpis.progressiveOverloadPct >= 0 ? styles.positive : styles.negative]}>
              {kpis.progressiveOverloadPct >= 0 ? '+' : ''}{kpis.progressiveOverloadPct?.toFixed(1)}%
            </Text>
            <Text style={styles.kpiDesc}>Volume change from last week</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Consistency</Text>
            <View style={styles.consistencyRow}>
              <Text style={styles.bigValue}>{kpis.consistencyPct?.toFixed(0)}%</Text>
              <View style={styles.barOuter}>
                <View style={[styles.barInner, { width: `${Math.min(kpis.consistencyPct || 0, 100)}%` }]} />
              </View>
            </View>
            <Text style={styles.kpiDesc}>{kpis.workoutDaysThisWeek}/7 days this week</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Completion Rate</Text>
            <Text style={styles.bigValue}>{kpis.completionRatePct?.toFixed(0)}%</Text>
            <Text style={styles.kpiDesc}>of assigned workouts completed fully</Text>
          </View>
        </>
      )}

      {/* Muscle donut */}
      {muscle.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Muscle split</Text>
          <MuscleDonut data={muscle} />
        </View>
      )}

      {/* Recent PRs shelf */}
      {prs.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent PRs 🏆</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {prs.slice(0, 8).map((pr, i) => (
              <View key={i} style={styles.prCard}>
                <Text style={styles.prCardEx} numberOfLines={1}>{pr.exerciseName || 'Exercise'}</Text>
                <Text style={styles.prCardVal}>{Math.round(pr.value)}{pr.prType === 'max_weight' ? ' kg' : pr.prType === 'max_reps' ? ' reps' : ''}</Text>
                <Text style={styles.prCardType}>{PR_LABEL[pr.prType] || pr.prType}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Activity heatmap */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Activity</Text>
        <Heatmap history={history} weeks={Math.ceil(PERIODS[period][1] / 7)} />
      </View>

      {/* Quick links */}
      <View style={styles.linksRow}>
        <QuickLink icon="trophy" label="Personal Records" onPress={() => navigation.navigate('PersonalRecords')} />
        <QuickLink icon="body" label="Muscle Split" onPress={() => navigation.navigate('MuscleDistribution')} />
      </View>
      <View style={styles.linksRow}>
        <QuickLink icon="flame" label="Streaks" onPress={() => navigation.navigate('StreakDetail')} />
        <QuickLink icon="time" label="History" onPress={() => navigation.navigate('WorkoutHistory')} />
      </View>
    </ScrollView>
  );
}

function KpiBox({ label, value }) {
  return (
    <View style={styles.kpiBox}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

// ── Muscle donut (react-native-svg) ─────────────────────────────────────────
function MuscleDonut({ data }) {
  const items = data
    .map((d) => ({ name: d.muscleGroup || d.muscle_group || d.name, value: Number(d.setCount ?? d.count ?? d.percentage ?? 0) }))
    .filter((d) => d.value > 0);
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  const R = 54, STROKE = 22, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <View style={styles.donutRow}>
      <Svg width={140} height={140} viewBox="0 0 140 140">
        {items.map((it, i) => {
          const frac = it.value / total;
          const dash = `${frac * C} ${C - frac * C}`;
          const circle = (
            <Circle key={i} cx={70} cy={70} r={R} fill="none" stroke={MUSCLE_PALETTE[i % MUSCLE_PALETTE.length]}
              strokeWidth={STROKE} strokeDasharray={dash} strokeDashoffset={-offset * C} rotation={-90} origin="70,70" />
          );
          offset += frac;
          return circle;
        })}
      </Svg>
      <View style={{ flex: 1, gap: 4 }}>
        {items.slice(0, 6).map((it, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: MUSCLE_PALETTE[i % MUSCLE_PALETTE.length] }]} />
            <Text style={styles.legendTxt} numberOfLines={1}>{String(it.name).replace(/_/g, ' ')}</Text>
            <Text style={styles.legendPct}>{Math.round((it.value / total) * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── GitHub-style heatmap from workout history ────────────────────────────────
function Heatmap({ history, weeks = 12 }) {
  const counts = {};
  for (const h of history || []) {
    const d = (h.workoutDate || h.workout_date || '').slice(0, 10);
    if (d && ['completed', 'partial'].includes(h.status)) counts[d] = (counts[d] || 0) + 1;
  }
  const days = weeks * 7;
  const today = new Date();
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(today.getTime() - i * 86400000);
    const key = dt.toISOString().slice(0, 10);
    const c = counts[key] || 0;
    const intensity = c === 0 ? 0 : c === 1 ? 1 : c <= 2 ? 2 : 3;
    cells.push(intensity);
  }
  // chunk into weeks (columns)
  const cols = [];
  for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
  const SHADES = ['rgba(255,255,255,0.06)', 'rgba(124,58,237,0.4)', 'rgba(124,58,237,0.7)', '#7C3AED'];
  return (
    <View style={styles.heatRow}>
      {cols.map((col, ci) => (
        <View key={ci} style={{ gap: 3 }}>
          {col.map((v, ri) => <View key={ri} style={[styles.heatCell, { backgroundColor: SHADES[v] }]} />)}
        </View>
      ))}
    </View>
  );
}

function QuickLink({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.quickLink} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color={COLORS.secondary} />
      <Text style={styles.quickLinkText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 8 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.white },

  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 10 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiBox: { width: '47%', alignItems: 'center', paddingVertical: 10 },
  kpiValue: { fontSize: 22, fontWeight: '700', color: COLORS.white },
  kpiLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  bigValue: { fontSize: 32, fontWeight: '700', color: COLORS.white },
  positive: { color: '#34C759' },
  negative: { color: '#FF3B30' },
  kpiDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },

  consistencyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  barOuter: { flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: 4 },
  barInner: { height: 8, backgroundColor: COLORS.secondary, borderRadius: 4 },

  linksRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  quickLink: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  quickLinkText: { flex: 1, color: COLORS.white, fontSize: 13, fontWeight: '500' },

  // Period selector
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  periodBtnOn: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  periodTxt: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 12 },
  periodTxtOn: { color: COLORS.white },

  // Donut
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { flex: 1, color: COLORS.textSecondary, fontSize: 12, textTransform: 'capitalize' },
  legendPct: { color: COLORS.white, fontSize: 12, fontWeight: '700' },

  // PR shelf
  prCard: { backgroundColor: 'rgba(255,215,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)', borderRadius: 12, padding: 12, width: 120 },
  prCardEx: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  prCardVal: { color: '#FFD700', fontSize: 20, fontWeight: '900', marginTop: 4 },
  prCardType: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },

  // Heatmap
  heatRow: { flexDirection: 'row', gap: 3, flexWrap: 'nowrap' },
  heatCell: { width: 12, height: 12, borderRadius: 3 },
});
