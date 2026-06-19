import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Share, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchWorkoutDetail, fetchNudges } from '../../services/workoutService';
import { formatLogged } from '../../utils/measurement';

export default function WorkoutSummaryScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { workoutLogId, summary: routeSummary, isCaseA } = route.params || {};
  const [detail, setDetail] = useState(routeSummary || null);
  const [nudges, setNudges] = useState([]);
  const [loading, setLoading] = useState(!routeSummary);

  useEffect(() => {
    (async () => {
      try {
        if (!routeSummary) {
          const d = await fetchWorkoutDetail(workoutLogId);
          setDetail(d);
        }
        if (!isCaseA) {
          const n = await fetchNudges('post_workout');
          setNudges(n || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `💪 Workout Complete!\nVolume: ${Math.round(detail?.totalVolume || 0)} kg\nDuration: ${detail?.durationMinutes || 0} min\n#BuildGym`,
      });
    } catch (e) { /* ignore */ }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  const prs = detail?.sets?.filter((s) => s.isPr) || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      {/* Celebration */}
      <View style={styles.celebration}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>Workout Complete!</Text>
        <Text style={styles.subtitle}>
          {detail?.status === 'completed' ? 'All exercises done' : 'Partial workout logged'}
        </Text>
      </View>

      {/* Summary stats */}
      <View style={styles.statsGrid}>
        <StatCard icon="barbell" label="Total Volume" value={`${Math.round(detail?.totalVolume || 0)} kg`} />
        <StatCard icon="time" label="Duration" value={`${detail?.durationMinutes || 0} min`} />
        <StatCard icon="layers" label="Exercises" value={detail?.exerciseCount || '—'} />
        <StatCard icon="repeat" label="Total Sets" value={detail?.sets?.length || detail?.totalSets || '—'} />
      </View>

      {/* PRs hit */}
      {prs.length > 0 && (
        <View style={styles.prSection}>
          <Text style={styles.sectionTitle}>🏆 Personal Records</Text>
          {prs.map((pr, idx) => (
            <View key={idx} style={styles.prRow}>
              <Text style={styles.prExercise}>{pr.exerciseName || 'Exercise'}</Text>
              <Text style={styles.prValue}>{formatLogged(pr, pr.measurementType)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* PT Nudge (Case B only) */}
      {!isCaseA && nudges.length > 0 && (
        <View style={styles.nudgeCard}>
          <Text style={styles.nudgeTitle}>{nudges[0].title}</Text>
          <Text style={styles.nudgeMessage}>{nudges[0].message}</Text>

          {nudges[0].comparison && (
            <View style={styles.comparisonCard}>
              <Text style={styles.compLabel}>Your Workout</Text>
              <Text style={styles.compValue}>Self-logged • {detail?.sets?.length || 0} sets</Text>
              <View style={styles.compDivider} />
              <Text style={styles.compLabel}>With a Trainer</Text>
              <Text style={styles.compValue}>Structured plan • Progressive overload • Rest timers</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.nudgeCta}
            onPress={() => navigation.navigate('Trainers')}
          >
            <Text style={styles.nudgeCtaText}>{nudges[0].cta || 'Try a Free PT Session'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color={COLORS.secondary} />
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.navigate('WorkoutHome')}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={22} color={COLORS.secondary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  celebration: { alignItems: 'center', paddingVertical: 32 },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.white },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: { width: '48%', backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.white, marginTop: 8 },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  prSection: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.white, marginBottom: 10 },
  prRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  prExercise: { color: COLORS.white, fontSize: 14, fontWeight: '500' },
  prValue: { color: '#FFD700', fontSize: 14, fontWeight: '600' },

  nudgeCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  nudgeTitle: { fontSize: 16, fontWeight: '600', color: COLORS.white, marginBottom: 6 },
  nudgeMessage: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 12 },
  comparisonCard: { backgroundColor: COLORS.background, borderRadius: 12, padding: 14, marginBottom: 12 },
  compLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  compValue: { color: COLORS.white, fontSize: 13, marginBottom: 8 },
  compDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  nudgeCta: { backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  nudgeCtaText: { color: '#3B82F6', fontSize: 15, fontWeight: '600' },

  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.secondary },
  shareBtnText: { color: COLORS.secondary, fontSize: 15, fontWeight: '600' },
  doneBtn: { flex: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.secondary, paddingVertical: 14, borderRadius: 12 },
  doneBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});
