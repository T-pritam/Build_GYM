import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { activityData } from '../../constants/dummyData';

export default function ActivityDashboardScreen({ navigation }) {
  const maxBarHeight = 80;
  const maxCount = Math.max(...activityData.weeklyVisits.map((w) => w.count));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1A0800', '#0D0D0D']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Dashboard</Text>
        <View style={{ width: 42 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Monthly stats */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Visits\nThis Month', value: activityData.thisMonth.visits, icon: 'calendar-outline', color: COLORS.secondary },
            { label: 'Active\nDays', value: activityData.thisMonth.daysActive, icon: 'checkmark-circle-outline', color: COLORS.success },
            { label: 'Current\nStreak', value: `${activityData.thisMonth.streak} 🔥`, icon: 'flame-outline', color: '#FF9800' },
            { label: 'Est. Calories', value: activityData.thisMonth.caloriesEstimate, icon: 'fitness-outline', color: '#9C27B0' },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${s.color}18` }]}>
                <Ionicons name={s.icon} size={22} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Weekly visit chart */}
        <Text style={styles.sectionTitle}>Weekly Visits</Text>
        <View style={styles.chartCard}>
          <View style={styles.chart}>
            {activityData.weeklyVisits.map((w) => (
              <View key={w.week} style={styles.chartBar}>
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={[COLORS.secondary, COLORS.secondaryDark]}
                    style={[
                      styles.barFill,
                      { height: (w.count / maxCount) * maxBarHeight },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{w.week}</Text>
                <Text style={styles.barValue}>{w.count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* This week's days */}
        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.weekRow}>
          {activityData.visitHistory.map((d) => (
            <View key={d.day} style={styles.dayItem}>
              <View
                style={[
                  styles.dayCircle,
                  d.visited ? styles.dayVisited : styles.dayMissed,
                ]}
              >
                {d.visited ? (
                  <Ionicons name="checkmark" size={14} color={COLORS.white} />
                ) : (
                  <Ionicons name="close" size={12} color={COLORS.textDim} />
                )}
              </View>
              <Text style={[styles.dayLabel, d.visited && { color: COLORS.secondary }]}>
                {d.day}
              </Text>
            </View>
          ))}
        </View>

        {/* Motivational badge */}
        <View style={styles.motivationBox}>
          <LinearGradient
            colors={['#1A0800', '#2A1200']}
            style={styles.motivationInner}
          >
            <Text style={styles.motivationEmoji}>🏆</Text>
            <Text style={styles.motivationTitle}>Keep crushing it!</Text>
            <Text style={styles.motivationText}>
              You're in the top 15% of Build Gym members this month based on visit frequency.
            </Text>
          </LinearGradient>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  scroll: { padding: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  statCard: {
    width: '47%', backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 16, alignItems: 'center', gap: 8,
  },
  statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: COLORS.secondary, textAlign: 'center' },
  statLabel: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', lineHeight: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.white, marginBottom: 14 },
  chartCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.border, padding: 20, marginBottom: 28,
  },
  chart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 110 },
  chartBar: { alignItems: 'center', gap: 6 },
  barTrack: {
    width: 36, height: 80, backgroundColor: COLORS.surface2, borderRadius: 8,
    justifyContent: 'flex-end', overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 8, minHeight: 8 },
  barLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700' },
  barValue: { fontSize: 13, color: COLORS.white, fontWeight: '800' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  dayItem: { alignItems: 'center', gap: 6 },
  dayCircle: {
    width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  dayVisited: { backgroundColor: COLORS.secondaryGlow, borderColor: COLORS.secondary },
  dayMissed: { backgroundColor: COLORS.surface, borderColor: COLORS.border },
  dayLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700' },
  motivationBox: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#3A1A00' },
  motivationInner: { padding: 20, alignItems: 'center' },
  motivationEmoji: { fontSize: 36, marginBottom: 8 },
  motivationTitle: { fontSize: 18, fontWeight: '900', color: COLORS.white, marginBottom: 6 },
  motivationText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },
});
