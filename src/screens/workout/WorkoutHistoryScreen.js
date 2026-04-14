import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchWorkoutHistory, fetchWorkoutDetail } from '../../services/workoutService';

const STATUS_COLORS = {
  completed: '#34C759',
  partial: '#FF9500',
  in_progress: COLORS.secondary,
  assigned: COLORS.textMuted,
};

export default function WorkoutHistoryScreen({ navigation }) {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadData = useCallback(async (pageNum = 1, append = false) => {
    try {
      const data = await fetchWorkoutHistory({ page: pageNum, limit: 20 });
      if (append) {
        setWorkouts((prev) => [...prev, ...(data || [])]);
      } else {
        setWorkouts(data || []);
      }
      setHasMore((data || []).length === 20);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadData(1);
  };

  const loadMore = () => {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    loadData(next, true);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const renderWorkout = ({ item }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id })}
      activeOpacity={0.7}
    >
      <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] || COLORS.textMuted }]} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowDate}>{formatDate(item.workoutDate)}</Text>
        <Text style={styles.rowType}>{item.planId ? 'Trainer Plan' : 'Self-Logged'}</Text>
      </View>
      <View style={styles.rowStats}>
        <Text style={styles.rowVolume}>{Math.round(item.totalVolume || 0)} kg</Text>
        <Text style={styles.rowDuration}>{item.durationMinutes || 0} min</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.secondary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Workout History</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        renderItem={renderWorkout}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="barbell-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No workouts yet</Text>
            <Text style={styles.emptySubtext}>Complete a workout to see it here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.white },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  rowInfo: { flex: 1 },
  rowDate: { color: COLORS.white, fontSize: 15, fontWeight: '500' },
  rowType: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  rowStats: { alignItems: 'flex-end', marginRight: 8 },
  rowVolume: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  rowDuration: { color: COLORS.textMuted, fontSize: 12 },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.white, fontSize: 18, fontWeight: '600', marginTop: 12 },
  emptySubtext: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
});
