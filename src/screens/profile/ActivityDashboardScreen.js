import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';
import SafeBottomBar from '../../components/SafeBottomBar';
import GradientIcon from '../../components/GradientIcon';
import { fetchDashboard } from '../../services/dashboardService';

const PERIODS = [['week', 'This Week'], ['month', 'This Month'], ['all', 'All Time']];
const HEAT = ['rgba(255,255,255,0.05)', 'rgba(124,58,237,0.3)', 'rgba(124,58,237,0.55)', 'rgba(124,58,237,0.8)', '#00BCD4'];

const localIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Build a 5×7 (35-day) intensity grid ending today from [{date, level}].
function buildHeatmap(heatData) {
  const map = new Map((heatData || []).map((h) => [h.date, h.level]));
  const today = localIso();
  const cells = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - i);
    cells.push(map.get(d.toISOString().slice(0, 10)) || 0);
  }
  const rows = [];
  for (let r = 0; r < 5; r++) rows.push(cells.slice(r * 7, r * 7 + 7));
  return rows;
}

const fmtMinutes = (m) => {
  const h = Math.floor(m / 60), min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
};

export default function ActivityDashboardScreen({ navigation }) {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [recapDismissed, setRecapDismissed] = useState(false);

  const load = useCallback(async (p = period) => {
    try {
      const d = await fetchDashboard(p);
      setData(d);
      if (d?.weeklyRecap?.weekStart) {
        const v = await AsyncStorage.getItem(`recap_dismissed_${d.weeklyRecap.weekStart}`);
        setRecapDismissed(v === '1');
      }
    } catch { /* keep prior */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [period]);

  useEffect(() => { load(period); }, [period]);

  const dismissRecap = async () => {
    setRecapDismissed(true);
    if (data?.weeklyRecap?.weekStart) await AsyncStorage.setItem(`recap_dismissed_${data.weeklyRecap.weekStart}`, '1');
  };

  const Kpi = ({ icon, label, value, accent }) => (
    <View style={styles.kpiCard}>
      <View style={styles.kpiTop}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <MaterialIcons name={icon} size={16} color={accent} />
      </View>
      <Text style={[styles.kpiValue, { color: accent }]}>{value}</Text>
    </View>
  );

  const kpis = data?.kpis || { visits: 0, calories: 0, activeMinutes: 0, sessions: 0 };
  const cal = data?.combinedCaloriesToday || { total: 0, workout: 0, activity: 0 };
  const streak = data?.streak || {};
  const progress = data?.progress || {};
  const recap = data?.weeklyRecap;
  const heatRows = buildHeatmap(data?.heatmap);
  const log = data?.activityLogToday || [];

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.glowTop} pointerEvents="none" />

      <TouchableOpacity style={styles.floatLeft} onPress={() => navigation.goBack()} hitSlop={10} activeOpacity={0.7}>
        <GradientIcon name="arrow-back" size={24} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Activity Dashboard</Text>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.cyan || '#00BCD4'} /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#00BCD4" />}
        >
          {/* Weekly recap (Sun/Mon, dismissible) */}
          {recap?.show && !recapDismissed && (
            <View style={styles.recapCard}>
              <View style={styles.recapHead}>
                <Text style={styles.recapTitle}>Weekly Recap</Text>
                <TouchableOpacity onPress={dismissRecap} hitSlop={10}><MaterialIcons name="close" size={18} color={COLORS.textMuted} /></TouchableOpacity>
              </View>
              <View style={styles.recapRow}>
                <RecapStat value={recap.sessions} label="Sessions" />
                <RecapStat value={`${recap.tonnage}`} label="kg lifted" />
                <RecapStat value={recap.prs} label="PRs" />
              </View>
              <Text style={styles.recapDelta}>
                {recap.sessionsDeltaVsLastWeek >= 0 ? '▲' : '▼'} {Math.abs(recap.sessionsDeltaVsLastWeek)} vs last week
                {recap.wellnessEnergyAvg != null ? ` · energy ${recap.wellnessEnergyAvg}/5` : ''}
              </Text>
            </View>
          )}

          {/* Combined daily calories (B.6.3) */}
          <TouchableOpacity style={styles.calCard} activeOpacity={0.9} onPress={() => setShowBreakdown((v) => !v)}>
            <Text style={styles.calLabel}>Active calories today</Text>
            <Text style={styles.calValue}>{cal.total.toLocaleString()} <Text style={styles.calUnit}>kcal</Text></Text>
            {showBreakdown && (
              <View style={styles.calBreak}>
                <Text style={styles.calBreakItem}>Workouts: {cal.workout} kcal</Text>
                <Text style={styles.calBreakItem}>Activities: {cal.activity} kcal</Text>
              </View>
            )}
            <Text style={styles.calHint}>Tap for breakdown</Text>
          </TouchableOpacity>

          {/* Period toggle */}
          <View style={styles.periodRow}>
            {PERIODS.map(([key, label]) => {
              const on = period === key;
              return (
                <TouchableOpacity key={key} style={styles.periodPill} onPress={() => setPeriod(key)} activeOpacity={0.85}>
                  {on && <LinearGradient colors={['#7C3AED', '#00BCD4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />}
                  <Text style={[styles.periodText, on && styles.periodTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* KPI grid */}
          <View style={styles.kpiGrid}>
            <Kpi icon="event-available" label="Visits" value={`${kpis.visits}`} accent="#00BCD4" />
            <Kpi icon="local-fire-department" label="Calories" value={`${kpis.calories.toLocaleString()}`} accent="#F59E0B" />
            <Kpi icon="schedule" label="Active Time" value={fmtMinutes(kpis.activeMinutes)} accent="#A78BFA" />
            <Kpi icon="fitness-center" label="Sessions" value={`${kpis.sessions}`} accent="#22C55E" />
          </View>

          {/* Progress Tracker entry (B.6.7) */}
          <TouchableOpacity style={styles.progressCard} activeOpacity={0.85} onPress={() => navigation.navigate('ProgressTracker')}>
            <View style={styles.progressIcon}><MaterialIcons name="trending-up" size={22} color="#34D399" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.progressTitle}>Progress Tracker</Text>
              <Text style={styles.progressSub}>
                {progress.latestWeightKg != null ? `${progress.latestWeightKg} kg` : 'Log your weight'}
                {progress.photoCount ? ` · ${progress.photoCount} photo${progress.photoCount > 1 ? 's' : ''}` : ''}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Today's activity log (B.6.4) */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Today's Sessions</Text>
            {log.length === 0 ? (
              <Text style={styles.emptyTxt}>No sessions logged today.</Text>
            ) : (
              log.map((it, i) => (
                <View key={i} style={styles.logRow}>
                  <MaterialIcons name={it.type === 'workout' ? 'fitness-center' : 'directions-run'} size={16} color="#00BCD4" />
                  <Text style={styles.logName} numberOfLines={1}>{it.name}</Text>
                  <Text style={styles.logMeta}>{it.minutes}m · {it.calories} kcal</Text>
                </View>
              ))
            )}
          </View>

          {/* Attendance heatmap (35 days) */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Attendance</Text>
              <Text style={styles.sectionSub}>Last 5 weeks</Text>
            </View>
            <View style={styles.heatGrid}>
              {heatRows.map((week, wi) => (
                <View key={wi} style={styles.heatRow}>
                  {week.map((lvl, di) => <View key={di} style={[styles.heatCell, { backgroundColor: HEAT[lvl] }]} />)}
                </View>
              ))}
            </View>
            <View style={styles.legendRow}>
              <Text style={styles.legendText}>Less</Text>
              {HEAT.map((c, i) => <View key={i} style={[styles.legendCell, { backgroundColor: c }]} />)}
              <Text style={styles.legendText}>More</Text>
            </View>
          </View>

          {/* Current Streak */}
          <View style={styles.sectionCard}>
            <View style={styles.streakRow}>
              <View>
                <Text style={styles.sectionTitle}>Check-in Streak</Text>
                <Text style={styles.streakValue}>{streak.checkinCurrent || 0} Days</Text>
                <Text style={styles.sectionSub}>Longest {streak.checkinLongest || 0} Days · Workout streak {streak.workoutCurrent || 0}</Text>
              </View>
              <View style={styles.trophyWrap}><MaterialIcons name="emoji-events" size={26} color="#F59E0B" /></View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeBottomBar>
  );
}

function RecapStat({ value, label }) {
  return (
    <View style={styles.recapStat}>
      <Text style={styles.recapValue}>{value}</Text>
      <Text style={styles.recapLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glowTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 260, backgroundColor: 'rgba(127,41,130,0.06)' },
  floatLeft: { position: 'absolute', top: 52, left: 20, zIndex: 100, padding: 4 },
  headerTitle: { fontFamily: FONTS.bodyBold, fontSize: 16, color: COLORS.white, textAlign: 'center', marginTop: 54 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },

  recapCard: { backgroundColor: '#1A1A2E', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,188,212,0.35)', padding: 16, marginBottom: 16 },
  recapHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  recapTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.white },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between' },
  recapStat: { alignItems: 'center', flex: 1 },
  recapValue: { fontFamily: FONTS.headline, fontSize: 22, color: '#00BCD4' },
  recapLabel: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  recapDelta: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary, marginTop: 12, textAlign: 'center' },

  calCard: { backgroundColor: '#1A1A2E', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', padding: 18, marginBottom: 16, alignItems: 'center' },
  calLabel: { fontFamily: FONTS.label, fontSize: 11, color: COLORS.textMuted, letterSpacing: 1 },
  calValue: { fontFamily: FONTS.headline, fontSize: 40, color: '#F59E0B', marginTop: 4 },
  calUnit: { fontSize: 18, color: COLORS.textMuted },
  calBreak: { marginTop: 10, gap: 2, alignItems: 'center' },
  calBreakItem: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary },
  calHint: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.textMuted, marginTop: 8 },

  periodRow: { flexDirection: 'row', backgroundColor: '#1A1A2E', borderRadius: 999, padding: 4, marginBottom: 20 },
  periodPill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 999, overflow: 'hidden' },
  periodText: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.textMuted },
  periodTextActive: { color: '#000', fontFamily: FONTS.bodyBold },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  kpiCard: { width: '47%', flexGrow: 1, backgroundColor: '#1A1A2E', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 16, gap: 6 },
  kpiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiLabel: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted, letterSpacing: 1 },
  kpiValue: { fontFamily: FONTS.headline, fontSize: 22 },

  progressCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1A1A2E', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 16, marginBottom: 16 },
  progressIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(52,211,153,0.14)', alignItems: 'center', justifyContent: 'center' },
  progressTitle: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white },
  progressSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  sectionCard: { backgroundColor: '#1A1A2E', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 18, marginBottom: 16 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.white },
  sectionSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  emptyTxt: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted, marginTop: 8 },

  logRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  logName: { flex: 1, fontFamily: FONTS.body, fontSize: 13, color: COLORS.textPrimary },
  logMeta: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },

  heatGrid: { gap: 6 },
  heatRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  heatCell: { flex: 1, aspectRatio: 1, borderRadius: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, justifyContent: 'flex-end' },
  legendText: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.textMuted, marginHorizontal: 4 },
  legendCell: { width: 12, height: 12, borderRadius: 3 },

  streakRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  streakValue: { fontFamily: FONTS.headline, fontSize: 28, color: '#F59E0B', marginTop: 4 },
  trophyWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(245,158,11,0.14)', alignItems: 'center', justifyContent: 'center' },
});
