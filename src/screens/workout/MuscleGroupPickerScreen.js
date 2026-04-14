import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchExercises } from '../../services/workoutService';

const MUSCLE_GROUPS = [
  { key: 'chest', label: 'Chest', icon: 'fitness' },
  { key: 'back', label: 'Back', icon: 'body' },
  { key: 'shoulders', label: 'Shoulders', icon: 'man' },
  { key: 'biceps', label: 'Biceps', icon: 'arm-flex' },
  { key: 'triceps', label: 'Triceps', icon: 'arm-flex' },
  { key: 'legs_quads', label: 'Quads', icon: 'walk' },
  { key: 'legs_hamstrings_glutes', label: 'Hamstrings & Glutes', icon: 'walk' },
  { key: 'core', label: 'Core', icon: 'body' },
  { key: 'cardio', label: 'Cardio', icon: 'heart' },
  { key: 'full_body', label: 'Full Body', icon: 'barbell' },
];

export default function MuscleGroupPickerScreen({ navigation }) {
  const [selected, setSelected] = useState([]);

  const toggle = (key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleNext = () => {
    if (selected.length === 0) return;
    navigation.navigate('ExercisePicker', { muscleGroups: selected });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Select Muscle Groups</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.subtitle}>What are you training today?</Text>

      <ScrollView contentContainerStyle={styles.grid}>
        {MUSCLE_GROUPS.map((mg) => {
          const isActive = selected.includes(mg.key);
          return (
            <TouchableOpacity
              key={mg.key}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => toggle(mg.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={mg.icon === 'arm-flex' ? 'barbell' : mg.icon}
                size={24}
                color={isActive ? COLORS.white : COLORS.textSecondary}
              />
              <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                {mg.label}
              </Text>
              {isActive && (
                <Ionicons name="checkmark-circle" size={18} color={COLORS.white} style={styles.chipCheck} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, selected.length === 0 && { opacity: 0.4 }]}
          onPress={handleNext}
          disabled={selected.length === 0}
        >
          <Text style={styles.nextBtnText}>
            Choose Exercises ({selected.length} group{selected.length !== 1 ? 's' : ''})
          </Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, paddingHorizontal: 16, marginBottom: 16 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, paddingBottom: 100 },
  chip: {
    width: '47%', backgroundColor: COLORS.surface, borderRadius: 14, padding: 18,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  chipLabel: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500', marginTop: 8 },
  chipLabelActive: { color: COLORS.white, fontWeight: '600' },
  chipCheck: { position: 'absolute', top: 10, right: 10 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.secondary, borderRadius: 12, paddingVertical: 16 },
  nextBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});
