/**
 * NutritionScreen — A.8 member view of the active nutrition plan with per-meal
 * adherence marking (followed / partial / skipped). PT members only; shows an
 * empty state when there is no active plan.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchNutritionPlan, postMealAdherence } from '../../services/nutritionService';

const localIsoDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const STATUSES = [
  { key: 'followed', label: 'Followed', color: '#4CAF50' },
  { key: 'partial', label: 'Partial', color: '#FFC107' },
  { key: 'skipped', label: 'Skipped', color: '#F44336' },
];

export default function NutritionScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const date = localIsoDate();
  const [plan, setPlan] = useState(undefined); // undefined=loading, null=none
  const [refreshing, setRefreshing] = useState(false);
  const [savingMeal, setSavingMeal] = useState(null);

  const load = useCallback(async () => {
    try {
      const p = await fetchNutritionPlan(date);
      setPlan(p || null);
    } catch {
      setPlan(null);
    } finally {
      setRefreshing(false);
    }
  }, [date]);

  useCallback(() => {}, []);
  React.useEffect(() => { load(); }, [load]);

  const mark = async (mealId, status) => {
    setSavingMeal(mealId);
    // optimistic
    setPlan((prev) => prev && ({ ...prev, meals: prev.meals.map((m) => (m.id === mealId ? { ...m, adherence: status } : m)) }));
    try {
      await postMealAdherence({ mealId, date, status });
    } catch {
      load();
    } finally {
      setSavingMeal(null);
    }
  };

  if (plan === undefined) {
    return <View style={[s.root, s.center]}><StatusBar barStyle="light-content" backgroundColor={COLORS.background} /><ActivityIndicator size="large" color={COLORS.secondary} /></View>;
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.white} /></TouchableOpacity>
        <Text style={s.title}>Nutrition</Text>
        <View style={{ width: 24 }} />
      </View>

      {!plan ? (
        <View style={s.center}>
          <Ionicons name="nutrition-outline" size={44} color={COLORS.textMuted} />
          <Text style={s.emptyTxt}>No nutrition plan yet</Text>
          <Text style={s.emptySub}>Your trainer will set one up for you.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.secondary} />}
        >
          <Text style={s.planName}>{plan.name}</Text>
          {(plan.targets?.calories != null || plan.targets?.proteinG != null) && (
            <View style={s.targets}>
              <Target label="kcal" value={plan.targets.calories} />
              <Target label="Protein" value={plan.targets.proteinG} unit="g" />
              <Target label="Carbs" value={plan.targets.carbsG} unit="g" />
              <Target label="Fat" value={plan.targets.fatG} unit="g" />
            </View>
          )}

          {plan.meals.map((meal) => (
            <View key={meal.id} style={s.mealCard}>
              <Text style={s.mealName}>{meal.name}</Text>
              {meal.foods.map((f) => (
                <View key={f.id} style={s.foodRow}>
                  <Text style={s.foodName} numberOfLines={1}>{f.quantity}× {f.name}</Text>
                  <Text style={s.foodMacro}>{f.calories != null ? `${f.calories} kcal` : ''}</Text>
                </View>
              ))}
              <View style={s.adherenceRow}>
                {STATUSES.map((st) => {
                  const active = meal.adherence === st.key;
                  return (
                    <TouchableOpacity
                      key={st.key}
                      disabled={savingMeal === meal.id}
                      style={[s.statusBtn, active && { backgroundColor: st.color, borderColor: st.color }]}
                      onPress={() => mark(meal.id, st.key)}
                    >
                      <Text style={[s.statusTxt, active && { color: '#fff' }]}>{st.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function Target({ label, value, unit }) {
  return (
    <View style={s.targetCell}>
      <Text style={s.targetVal}>{value != null ? value : '—'}{value != null && unit ? unit : ''}</Text>
      <Text style={s.targetLbl}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  planName: { color: COLORS.white, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  targets: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  targetCell: { flex: 1, alignItems: 'center', backgroundColor: COLORS.surface || '#151215', borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  targetVal: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  targetLbl: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  mealCard: { backgroundColor: COLORS.surface || '#151215', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  mealName: { color: COLORS.white, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  foodRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  foodName: { color: COLORS.textSecondary || '#D4C1CF', fontSize: 13, flex: 1, marginRight: 8 },
  foodMacro: { color: COLORS.textMuted, fontSize: 12 },
  adherenceRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statusBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.background || '#080608', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  statusTxt: { color: COLORS.textSecondary || '#D4C1CF', fontSize: 12, fontWeight: '700' },
  emptyTxt: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginTop: 8 },
  emptySub: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
});
