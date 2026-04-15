import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchExercises } from '../../services/workoutService';

export default function ExercisePickerScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { muscleGroups } = route.params;
  const [exercises, setExercises] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState(muscleGroups[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExercises(activeGroup);
  }, [activeGroup]);

  const loadExercises = async (group) => {
    setLoading(true);
    try {
      const data = await fetchExercises(group);
      setExercises(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleExercise = (ex) => {
    setSelected((prev) => {
      const exists = prev.find((s) => s.id === ex.id);
      return exists ? prev.filter((s) => s.id !== ex.id) : [...prev, ex];
    });
  };

  const isSelected = (id) => selected.some((s) => s.id === id);

  const filtered = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleStart = () => {
    if (selected.length === 0) return;
    navigation.navigate('WorkoutSession', {
      selfLogExercises: selected,
      muscleGroups,
    });
  };

  const renderExercise = ({ item }) => {
    const active = isSelected(item.id);
    return (
      <TouchableOpacity
        style={[styles.exerciseRow, active && styles.exerciseRowActive]}
        onPress={() => toggleExercise(item)}
        activeOpacity={0.7}
      >
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          {item.equipment && (
            <Text style={styles.exerciseEquipment}>{item.equipment}</Text>
          )}
        </View>
        <Ionicons
          name={active ? 'checkmark-circle' : 'add-circle-outline'}
          size={24}
          color={active ? COLORS.secondary : COLORS.textMuted}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Choose Exercises</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Muscle group tabs */}
      <FlatList
        horizontal
        data={muscleGroups}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.tab, activeGroup === item && styles.tabActive]}
            onPress={() => setActiveGroup(item)}
          >
            <Text style={[styles.tabText, activeGroup === item && styles.tabTextActive]}>
              {item.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises…"
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Exercise list */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderExercise}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No exercises found</Text>
          }
        />
      )}

      {/* Start button */}
      {selected.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Ionicons name="play" size={20} color={COLORS.white} />
            <Text style={styles.startBtnText}>
              Start with {selected.length} exercise{selected.length !== 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.white },

  tabs: { flexGrow: 0, paddingHorizontal: 12, marginBottom: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderRadius: 20, backgroundColor: COLORS.surface },
  tabActive: { backgroundColor: COLORS.secondary },
  tabText: { color: COLORS.textSecondary, fontSize: 13 },
  tabTextActive: { color: COLORS.white, fontWeight: '600' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 10, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.white, fontSize: 15, marginLeft: 8 },

  exerciseRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  exerciseRowActive: { backgroundColor: 'rgba(233,99,22,0.08)' },
  exerciseInfo: { flex: 1 },
  exerciseName: { color: COLORS.white, fontSize: 15, fontWeight: '500' },
  exerciseEquipment: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 40 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.secondary, borderRadius: 12, paddingVertical: 16 },
  startBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});
