import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';
import SafeBottomBar from '../../components/SafeBottomBar';
import GradientIcon from '../../components/GradientIcon';

// Static KPI data per period (Stitch "Activity Dashboard").
const DATA = {
  week:  { visits: ['3', '+1 vs last week'],   cal: ['1,250', 'avg 416/session'], time: ['2h 15m', 'avg 45 min/session'], sess: ['3', 'Strength most frequent'] },
  month: { visits: ['8', '+2 vs last month'],  cal: ['4,210', 'avg 526/session'], time: ['7h 12m', 'avg 52 min/session'], sess: ['8', 'Cycling most frequent'] },
  all:   { visits: ['142', 'Top 15% of members'], cal: ['78,400', 'avg 552/session'], time: ['124h', 'avg 52 min/session'], sess: ['142', 'Strength most frequent'] },
};
const PERIODS = [['week', 'This Week'], ['month', 'This Month'], ['all', 'All Time']];

// Static attendance heatmap intensities (0–4) — 5 weeks × 7 days.
const HEATMAP = [
  [0, 2, 3, 1, 4, 0, 0],
  [1, 3, 2, 4, 2, 1, 0],
  [2, 1, 4, 3, 0, 2, 1],
  [0, 4, 2, 1, 3, 0, 0],
  [3, 2, 1, 0, 2, 0, 0],
];
const HEAT = ['rgba(255,255,255,0.05)', 'rgba(124,58,237,0.3)', 'rgba(124,58,237,0.55)', 'rgba(124,58,237,0.8)', '#00BCD4'];

const WHEN = [['Morning', 3], ['Midday', 1], ['Evening', 4], ['Night', 0]];
const BREAKDOWN = [
  { label: 'Cardio', pct: 40, color: '#00BCD4' },
  { label: 'Strength', pct: 25, color: '#7C3AED' },
  { label: 'Recovery', pct: 20, color: '#F59E0B' },
  { label: 'Sport', pct: 15, color: '#22C55E' },
];

export default function ActivityDashboardScreen({ navigation }) {
  const [period, setPeriod] = useState('month');
  const d = DATA[period];

  const Kpi = ({ icon, label, value, desc, accent }) => (
    <View style={styles.kpiCard}>
      <View style={styles.kpiTop}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <MaterialIcons name={icon} size={16} color={accent} />
      </View>
      <Text style={[styles.kpiValue, { color: accent }]}>{value}</Text>
      <Text style={styles.kpiDesc}>{desc}</Text>
    </View>
  );

  const whenMax = Math.max(...WHEN.map((w) => w[1]), 1);

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.glowTop} pointerEvents="none" />

      <TouchableOpacity style={styles.floatLeft} onPress={() => navigation.goBack()} hitSlop={10} activeOpacity={0.7}>
        <GradientIcon name="arrow-back" size={24} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Activity Dashboard</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Period toggle */}
        <View style={styles.periodRow}>
          {PERIODS.map(([key, label]) => {
            const on = period === key;
            return (
              <TouchableOpacity key={key} style={styles.periodPill} onPress={() => setPeriod(key)} activeOpacity={0.85}>
                {on && (
                  <LinearGradient colors={['#7C3AED', '#00BCD4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                )}
                <Text style={[styles.periodText, on && styles.periodTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* KPI grid */}
        <View style={styles.kpiGrid}>
          <Kpi icon="event-available" label="Visits" value={d.visits[0]} desc={d.visits[1]} accent="#00BCD4" />
          <Kpi icon="local-fire-department" label="Calories" value={`${d.cal[0]} kcal`} desc={d.cal[1]} accent="#F59E0B" />
          <Kpi icon="schedule" label="Active Time" value={d.time[0]} desc={d.time[1]} accent="#A78BFA" />
          <Kpi icon="fitness-center" label="Sessions" value={d.sess[0]} desc={d.sess[1]} accent="#22C55E" />
        </View>

        {/* Attendance heatmap */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Attendance</Text>
            <Text style={styles.sectionSub}>December 2024</Text>
          </View>
          <View style={styles.heatGrid}>
            {HEATMAP.map((week, wi) => (
              <View key={wi} style={styles.heatRow}>
                {week.map((lvl, di) => (
                  <View key={di} style={[styles.heatCell, { backgroundColor: HEAT[lvl] }]} />
                ))}
              </View>
            ))}
          </View>
          <View style={styles.legendRow}>
            <Text style={styles.legendText}>Less</Text>
            {HEAT.map((c, i) => <View key={i} style={[styles.legendCell, { backgroundColor: c }]} />)}
            <Text style={styles.legendText}>More</Text>
          </View>
        </View>

        {/* When You Train */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>When You Train</Text>
          <View style={styles.whenRow}>
            {WHEN.map(([label, val]) => (
              <View key={label} style={styles.whenCol}>
                <View style={styles.whenBarTrack}>
                  <LinearGradient
                    colors={['#7C3AED', '#00BCD4']}
                    style={[styles.whenBarFill, { height: `${(val / whenMax) * 100}%` }]}
                  />
                </View>
                <Text style={styles.whenVal}>{val}</Text>
                <Text style={styles.whenLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Activity Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Activity Breakdown</Text>
          <View style={styles.stackBar}>
            {BREAKDOWN.map((b) => (
              <View key={b.label} style={{ width: `${b.pct}%`, backgroundColor: b.color, height: '100%' }} />
            ))}
          </View>
          <View style={styles.breakLegend}>
            {BREAKDOWN.map((b) => (
              <View key={b.label} style={styles.breakItem}>
                <View style={[styles.breakDot, { backgroundColor: b.color }]} />
                <Text style={styles.breakText}>{b.label} ({b.pct}%)</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Current Streak */}
        <View style={styles.sectionCard}>
          <View style={styles.streakRow}>
            <View>
              <Text style={styles.sectionTitle}>Current Streak</Text>
              <Text style={styles.streakValue}>14 Days</Text>
              <Text style={styles.sectionSub}>Longest 21 Days</Text>
            </View>
            <View style={styles.trophyWrap}>
              <MaterialIcons name="emoji-events" size={26} color="#F59E0B" />
            </View>
          </View>
          <View style={styles.bestWeek}>
            <Text style={styles.bestWeekTitle}>Your most active week</Text>
            <Text style={styles.bestWeekSub}>6 visits · week of 8 Dec</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeBottomBar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  glowTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 260, backgroundColor: 'rgba(127,41,130,0.06)' },

  floatLeft: { position: 'absolute', top: 52, left: 20, zIndex: 100, padding: 4 },
  headerTitle: { fontFamily: FONTS.bodyBold, fontSize: 16, color: COLORS.white, textAlign: 'center', marginTop: 54 },

  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },

  periodRow: {
    flexDirection: 'row', backgroundColor: '#1A1A2E', borderRadius: 999, padding: 4, marginBottom: 20,
  },
  periodPill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 999, overflow: 'hidden' },
  periodText: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.textMuted },
  periodTextActive: { color: '#000', fontFamily: FONTS.bodyBold },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  kpiCard: {
    width: '47%', flexGrow: 1, backgroundColor: '#1A1A2E', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 16, gap: 6,
  },
  kpiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiLabel: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted, letterSpacing: 1 },
  kpiValue: { fontFamily: FONTS.headline, fontSize: 22 },
  kpiDesc: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.textMuted },

  sectionCard: {
    backgroundColor: '#1A1A2E', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    padding: 18, marginBottom: 16,
  },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.white },
  sectionSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  heatGrid: { gap: 6 },
  heatRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  heatCell: { flex: 1, aspectRatio: 1, borderRadius: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, justifyContent: 'flex-end' },
  legendText: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.textMuted, marginHorizontal: 4 },
  legendCell: { width: 12, height: 12, borderRadius: 3 },

  whenRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 130, marginTop: 6 },
  whenCol: { flex: 1, alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' },
  whenBarTrack: { width: 28, flex: 1, justifyContent: 'flex-end', borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)' },
  whenBarFill: { width: '100%', borderRadius: 6, minHeight: 4 },
  whenVal: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.white },
  whenLabel: { fontFamily: FONTS.label, fontSize: 9, color: COLORS.textMuted, letterSpacing: 0.5 },

  stackBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginTop: 6, marginBottom: 16 },
  breakLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  breakItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '45%' },
  breakDot: { width: 10, height: 10, borderRadius: 5 },
  breakText: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary },

  streakRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  streakValue: { fontFamily: FONTS.headline, fontSize: 28, color: '#F59E0B', marginTop: 4 },
  trophyWrap: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(245,158,11,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  bestWeek: {
    marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  bestWeekTitle: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.white },
  bestWeekSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});
