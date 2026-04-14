import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchStreak } from '../../services/workoutService';

const MILESTONES = [
  { days: 7, label: 'Bronze', emoji: '🥉', color: '#CD7F32' },
  { days: 30, label: 'Silver', emoji: '🥈', color: '#C0C0C0' },
  { days: 90, label: 'Gold', emoji: '🥇', color: '#FFD700' },
  { days: 365, label: 'Diamond', emoji: '💎', color: '#B9F2FF' },
];

export default function StreakDetailScreen({ navigation }) {
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchStreak();
        setStreak(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.secondary} /></View>;
  }

  const current = streak?.currentStreak || 0;
  const longest = streak?.longestStreak || 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.title}>🔥 Streak</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Current streak */}
      <View style={styles.heroCard}>
        <Text style={styles.heroEmoji}>🔥</Text>
        <Text style={styles.heroValue}>{current}</Text>
        <Text style={styles.heroLabel}>day streak</Text>
        {streak?.lastWorkoutDate && (
          <Text style={styles.heroSub}>
            Last workout: {new Date(streak.lastWorkoutDate).toLocaleDateString()}
          </Text>
        )}
      </View>

      {/* Longest */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Longest Streak</Text>
        <Text style={styles.cardValue}>{longest} days</Text>
      </View>

      {/* Grace days */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Grace Days Used This Week</Text>
        <Text style={styles.cardValue}>{streak?.graceDaysUsedThisWeek || 0} / 1</Text>
        <Text style={styles.cardHint}>1 rest day per week without breaking your streak</Text>
      </View>

      {/* Milestones */}
      <Text style={styles.sectionTitle}>Milestones</Text>
      {MILESTONES.map((m) => {
        const achieved = current >= m.days || longest >= m.days;
        const progress = Math.min(current / m.days, 1);
        return (
          <View key={m.days} style={[styles.milestoneRow, achieved && styles.milestoneAchieved]}>
            <Text style={styles.milestoneEmoji}>{m.emoji}</Text>
            <View style={styles.milestoneInfo}>
              <Text style={styles.milestoneName}>{m.label} — {m.days} days</Text>
              <View style={styles.milestoneBarOuter}>
                <View
                  style={[styles.milestoneBarInner, {
                    width: `${progress * 100}%`,
                    backgroundColor: achieved ? m.color : COLORS.secondary,
                  }]}
                />
              </View>
            </View>
            {achieved && <Ionicons name="checkmark-circle" size={22} color={m.color} />}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 8 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.white },

  heroCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 32, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(233,99,22,0.3)' },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroValue: { fontSize: 56, fontWeight: '800', color: COLORS.secondary },
  heroLabel: { fontSize: 18, color: COLORS.textSecondary, marginTop: 4 },
  heroSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 8 },

  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardLabel: { fontSize: 13, color: COLORS.textSecondary },
  cardValue: { fontSize: 22, fontWeight: '700', color: COLORS.white, marginTop: 4 },
  cardHint: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },

  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.white, marginTop: 12, marginBottom: 12 },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  milestoneAchieved: { borderColor: 'rgba(255,215,0,0.3)' },
  milestoneEmoji: { fontSize: 28, marginRight: 12 },
  milestoneInfo: { flex: 1 },
  milestoneName: { color: COLORS.white, fontSize: 14, fontWeight: '500', marginBottom: 6 },
  milestoneBarOuter: { height: 6, backgroundColor: COLORS.border, borderRadius: 3 },
  milestoneBarInner: { height: 6, borderRadius: 3 },
});
