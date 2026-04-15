import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchKPIs, fetchWeeklySummary } from '../../services/workoutService';

export default function WorkoutStatsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [kpis, setKpis] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [k, w] = await Promise.allSettled([fetchKPIs(), fetchWeeklySummary()]);
      setKpis(k.status === 'fulfilled' ? k.value : null);
      setWeekly(w.status === 'fulfilled' ? w.value : null);
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
        <Text style={styles.title}>Workout Stats</Text>
        <View style={{ width: 24 }} />
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
});
