import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '../../constants/colors';
import { KC, KF } from '../../theme/stitchKit';
import {
  fetchKPIs, fetchWeeklySummary, fetchMuscleDistribution,
  fetchPersonalRecords, fetchWorkoutHistory, fetchExtendedStats,
} from '../../services/workoutService';
import { prMeta } from '../../utils/measurement';

const PERIODS = [['7D', 7], ['30D', 30], ['90D', 90], ['All', 365]];
// Stitch "Forge Tokyo" violet↔cyan family — distinct slices matching the re-skinned V3 screens.
const MUSCLE_PALETTE = ['#7C3AED', '#06B6D4', '#A78BFA', '#22D3EE', '#8B5CF6', '#38BDF8', '#6D28D9', '#0EA5E9', '#C4B5FD', '#67E8F9', '#4F46E5'];

export default function WorkoutStatsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [kpis, setKpis] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [muscle, setMuscle] = useState([]);
  const [prs, setPrs] = useState([]);
  const [history, setHistory] = useState([]);
  const [extended, setExtended] = useState(null);
  const [period, setPeriod] = useState(1); // index into PERIODS (30D)
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [k, w, m, p, h, ex] = await Promise.allSettled([
        fetchKPIs(), fetchWeeklySummary(), fetchMuscleDistribution(),
        fetchPersonalRecords(), fetchWorkoutHistory({ limit: 120 }), fetchExtendedStats(),
      ]);
      setKpis(k.status === 'fulfilled' ? k.value : null);
      setWeekly(w.status === 'fulfilled' ? w.value : null);
      setMuscle(m.status === 'fulfilled' ? (m.value || []) : []);
      setPrs(p.status === 'fulfilled' ? (p.value || []) : []);
      setHistory(h.status === 'fulfilled' ? (Array.isArray(h.value) ? h.value : (h.value?.items || h.value || [])) : []);
      setExtended(ex.status === 'fulfilled' ? ex.value : null);
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
    return <View style={styles.center}><ActivityIndicator size="large" color={KC.primary} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={KC.primary} />}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')}>
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
          {extended && (
            <View style={[styles.statsGrid, { marginTop: 10 }]}>
              <KpiBox label="Reps this week" value={extended.weeklyReps} />
              <KpiBox label="Weight this week" value={`${extended.weeklyWeight} kg`} />
            </View>
          )}
        </View>
      )}

      {/* A.11 Lifetime + calories */}
      {extended && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Lifetime Totals</Text>
            <View style={styles.statsGrid}>
              <KpiBox label="Total Reps" value={extended.lifetimeReps.toLocaleString()} />
              <KpiBox label="Total Weight" value={`${extended.lifetimeWeight.toLocaleString()} kg`} />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Active Calories</Text>
            <Text style={styles.bigValue}>{extended.calories.total.toLocaleString()} kcal</Text>
            <Text style={styles.kpiDesc}>Estimated across all workouts</Text>
            {extended.calories.recent?.length > 0 && (
              <View style={{ marginTop: 10 }}>
                {extended.calories.recent.slice(0, 5).map((r, i) => (
                  <View key={i} style={styles.calRow}>
                    <Text style={styles.calName} numberOfLines={1}>{r.name} · {r.date}</Text>
                    <Text style={styles.calVal}>{r.calories} kcal</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {extended.volumeTrend?.length > 1 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Volume Trend (12 wk)</Text>
              <VolumeTrend data={extended.volumeTrend} />
            </View>
          )}
        </>
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
            {prs.slice(0, 8).map((pr, i) => {
              const meta = prMeta(pr.prType);
              return (
                <View key={i} style={styles.prCard}>
                  <Text style={styles.prCardEx} numberOfLines={1}>{pr.exerciseName || 'Exercise'}</Text>
                  <Text style={styles.prCardVal}>{meta.format(Number(pr.value))}</Text>
                  <Text style={styles.prCardType}>{meta.shortLabel}</Text>
                </View>
              );
            })}
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

// ── Weekly volume trend — lightweight bars (A.11.7) ─────────────────────────
function VolumeTrend({ data }) {
  const max = Math.max(...data.map((d) => d.volume), 1);
  return (
    <View style={styles.trendRow}>
      {data.map((d, i) => (
        <View key={i} style={styles.trendCol}>
          <View style={styles.trendBarTrack}>
            <View style={[styles.trendBarFill, { height: `${Math.max(3, (d.volume / max) * 100)}%` }]} />
          </View>
          <Text style={styles.trendLabel} numberOfLines={1}>{d.week?.slice(5)}</Text>
        </View>
      ))}
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
  const SHADES = ['rgba(255,255,255,0.06)', 'rgba(124,58,237,0.35)', 'rgba(124,58,237,0.65)', '#7C3AED'];
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
      <Ionicons name={icon} size={22} color={KC.cyan} />
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
  title: { fontSize: 20, fontFamily: KF.heading, color: COLORS.white, letterSpacing: 0.3 },

  card: { backgroundColor: KC.card, borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: KC.border },
  cardTitle: { fontSize: 11, fontFamily: KF.label, color: COLORS.textMuted, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 12 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiBox: { width: '47%', alignItems: 'center', paddingVertical: 10 },
  kpiValue: { fontSize: 22, fontFamily: KF.heading, color: COLORS.white },
  kpiLabel: { fontSize: 12, fontFamily: KF.body, color: COLORS.textSecondary, marginTop: 2 },
  calRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: KC.border },
  calName: { color: COLORS.textSecondary, fontSize: 13, fontFamily: KF.body, flex: 1, marginRight: 8 },
  calVal: { color: COLORS.white, fontSize: 13, fontFamily: KF.bodyBold },
  trendRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 100, marginTop: 8 },
  trendCol: { flex: 1, alignItems: 'center' },
  trendBarTrack: { width: '70%', height: 80, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  trendBarFill: { width: '100%', backgroundColor: KC.primary, borderRadius: 4 },
  trendLabel: { color: COLORS.textMuted, fontSize: 8, fontFamily: KF.body, marginTop: 4 },

  bigValue: { fontSize: 32, fontFamily: KF.headingExtra, color: COLORS.white },
  positive: { color: '#34C759' },
  negative: { color: '#FF3B30' },
  kpiDesc: { fontSize: 12, fontFamily: KF.body, color: COLORS.textMuted, marginTop: 4 },

  consistencyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  barOuter: { flex: 1, height: 8, backgroundColor: KC.border, borderRadius: 4 },
  barInner: { height: 8, backgroundColor: KC.primary, borderRadius: 4 },

  linksRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  quickLink: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: KC.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: KC.border },
  quickLinkText: { flex: 1, color: COLORS.white, fontSize: 13, fontFamily: KF.bodyMed },

  // Period selector
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: KC.card, borderWidth: 1, borderColor: KC.border },
  periodBtnOn: { backgroundColor: KC.primary, borderColor: KC.primary },
  periodTxt: { color: COLORS.textSecondary, fontFamily: KF.label, fontSize: 12, letterSpacing: 0.3 },
  periodTxtOn: { color: '#fff', fontFamily: KF.bodyBold },

  // Donut
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { flex: 1, color: COLORS.textSecondary, fontSize: 12, fontFamily: KF.body, textTransform: 'capitalize' },
  legendPct: { color: COLORS.white, fontSize: 12, fontFamily: KF.bodyBold },

  // PR shelf
  prCard: { backgroundColor: 'rgba(255,193,7,0.08)', borderWidth: 1, borderColor: 'rgba(255,193,7,0.3)', borderRadius: 14, padding: 12, width: 120 },
  prCardEx: { color: COLORS.white, fontSize: 12, fontFamily: KF.bodyBold },
  prCardVal: { color: KC.gold, fontSize: 20, fontFamily: KF.headingExtra, marginTop: 4 },
  prCardType: { color: COLORS.textMuted, fontSize: 10, fontFamily: KF.body, marginTop: 2 },

  // Heatmap
  heatRow: { flexDirection: 'row', gap: 3, flexWrap: 'nowrap' },
  heatCell: { width: 12, height: 12, borderRadius: 3 },
});
