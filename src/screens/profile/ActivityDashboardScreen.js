import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const WEEK_DAYS = [
  { label: 'M', done: true }, { label: 'T', done: true }, { label: 'W', done: true },
  { label: 'T', done: true }, { label: 'F', done: false }, { label: 'S', done: false }, { label: 'S', done: false },
];

const WEEKLY_BARS = [
  { label: 'W1', pct: 0.66 }, { label: 'W2', pct: 0.83 }, { label: 'W3', pct: 0.50 }, { label: 'W4', pct: 1.0 },
];

const RECENT_VISITS = [
  { date: 'Mon, 24 Feb', check: '06:05 AM', duration: '75 min' },
  { date: 'Tue, 23 Feb', check: '07:12 AM', duration: '60 min' },
  { date: 'Wed, 22 Feb', check: '06:50 AM', duration: '80 min' },
  { date: 'Thu, 21 Feb', check: '06:30 AM', duration: '55 min' },
  { date: 'Fri, 20 Feb', check: '05:55 AM', duration: '90 min' },
];

export default function ActivityDashboardScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.glowTop} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Dashboard</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Stats 2x2 grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.secondaryGlow }]}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.secondary} />
            </View>
            <Text style={[styles.statNum, { color: COLORS.secondary }]}>18</Text>
            <Text style={styles.statLabel}>Visits This Month</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(74,222,128,0.15)' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#4ADE80" />
            </View>
            <Text style={[styles.statNum, { color: '#4ADE80' }]}>18</Text>
            <Text style={styles.statLabel}>Active Days</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.secondaryGlow }]}>
              <Ionicons name="flame-outline" size={20} color={COLORS.secondary} />
            </View>
            <Text style={[styles.statNum, { color: COLORS.secondary }]}>5 🔥</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(168,85,247,0.15)' }]}>
              <Ionicons name="heart-outline" size={20} color="#A855F7" />
            </View>
            <Text style={[styles.statNum, { color: '#A855F7', fontSize: 20 }]}>12,400 kcal</Text>
            <Text style={styles.statLabel}>Est. Calories</Text>
          </View>
        </View>

        {/* Weekly Bar Chart */}
        <Text style={styles.sectionTitle}>Weekly Visits</Text>
        <View style={styles.barChartCard}>
          <View style={styles.barChart}>
            {WEEKLY_BARS.map((b) => (
              <View key={b.label} style={styles.barCol}>
                <View style={styles.barWrapper}>
                  <View style={[styles.bar, { height: `${b.pct * 100}%` }]} />
                </View>
                <Text style={styles.barLabel}>{b.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* This Week tracker */}
        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.weekRow}>
          {WEEK_DAYS.map((d, i) => (
            <View key={i} style={styles.dayCol}>
              <View style={[styles.dayCircle, d.done ? styles.dayCircleDone : styles.dayCirclePending]}>
                {d.done && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={[styles.dayLabel, d.done && styles.dayLabelDone]}>{d.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent Visits */}
        <Text style={styles.sectionTitle}>Recent Visits</Text>
        {RECENT_VISITS.map((v, i) => (
          <View key={i} style={styles.visitRow}>
            <View style={styles.visitIconWrap}>
              <Ionicons name="enter-outline" size={18} color={COLORS.secondary} />
            </View>
            <View style={styles.visitInfo}>
              <Text style={styles.visitDate}>{v.date}</Text>
              <Text style={styles.visitMeta}>Check-in {v.check} · {v.duration}</Text>
            </View>
            <View style={styles.visitDot} />
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  glowTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 260, backgroundColor: 'rgba(233,99,22,0.06)' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#1C1C1E',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },

  scroll: { paddingHorizontal: 16, paddingBottom: 20 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    width: '47%', backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1,
    borderColor: '#333', padding: 16, gap: 8,
  },
  statIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  statNum: { fontSize: 28, fontWeight: '900', lineHeight: 32, color: '#fff' },
  statLabel: { fontSize: 11, color: '#999', lineHeight: 16 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 12 },

  barChartCard: {
    backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#333',
    padding: 20, marginBottom: 24,
  },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, gap: 8 },
  barCol: { flex: 1, alignItems: 'center', gap: 8, height: '100%' },
  barWrapper: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: COLORS.secondary, borderRadius: 4 },
  barLabel: { fontSize: 12, color: '#fff' },

  weekRow: {
    flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1C1C1E',
    borderRadius: 14, borderWidth: 1, borderColor: '#333', padding: 16,
    marginBottom: 24,
  },
  dayCol: { alignItems: 'center', gap: 8 },
  dayCircle: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  dayCircleDone: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  dayCirclePending: { backgroundColor: 'transparent', borderColor: '#444' },
  dayLabel: { fontSize: 12, color: '#666', fontWeight: '600' },
  dayLabelDone: { color: COLORS.secondary },

  visitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1C1C1E', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A',
    padding: 14, marginBottom: 8,
  },
  visitIconWrap: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.secondaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  visitInfo: { flex: 1 },
  visitDate: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 2 },
  visitMeta: { fontSize: 11, color: '#888' },
  visitDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
});
