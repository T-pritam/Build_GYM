/**
 * WorkoutAssignmentOverviewScreen — view-only landing screen a member reaches
 * by tapping a workout card in chat. Shows every dated day from the same bulk
 * assignment (the chat card's workoutId only points at ONE of them) and lets
 * the member drill into the live log screen for today/past days only —
 * future days are shown but inert (guarded server-side too).
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { COLORS } from '../../constants/colors';
import { fetchMemberAssignmentBatch } from '../../services/workoutService';

const STATUS_COLORS = {
  completed: '#34C759',
  partial: '#FF9500',
  in_progress: COLORS.secondary,
  assigned: COLORS.textMuted,
  missed: COLORS.error,
  cancelled: COLORS.textMuted,
};

export default function WorkoutAssignmentOverviewScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { workoutId } = route.params;
  const [templateName, setTemplateName] = useState('Workout');
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchMemberAssignmentBatch(workoutId);
      setTemplateName(data.templateName);
      setInstances(data.instances);
    } catch (e) { /* keep whatever loaded before */ }
    setLoading(false);
  }, [workoutId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{templateName}</Text>
        <View style={{ width: 24 }} />
      </View>
      {loading ? (
        <View style={[s.root, s.center]}><ActivityIndicator color={COLORS.secondary} /></View>
      ) : (
        <FlatList
          data={instances}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={s.empty}>No days found for this assignment.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.row, item.isFuture && s.rowFuture]}
              disabled={item.isFuture}
              onPress={() => navigation.navigate('WorkoutSession', { workoutId: item.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.rowDate}>{dayjs(item.workoutDate).format('ddd, D MMM')}</Text>
                <View style={s.statusRow}>
                  <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[item.status] || COLORS.textMuted }]} />
                  <Text style={s.statusTxt}>{item.status.replace('_', ' ')}</Text>
                </View>
              </View>
              {item.isFuture ? (
                <Text style={s.upcomingTag}>Upcoming</Text>
              ) : (
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 50 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8 },
  rowFuture: { opacity: 0.5 },
  rowDate: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusTxt: { color: COLORS.textSecondary, fontSize: 12, textTransform: 'capitalize' },
  upcomingTag: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
});
