/**
 * PlateCalculatorModal — A.6 barbell plate calculator (client-only).
 * Shows the per-side plate breakdown for a target weight, using the exercise's
 * bar override or the member's default bar (persisted locally). No backend calls.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { computePlates, resolveBarWeight, summarizePlates, DEFAULT_BAR_KG } from '../utils/plateCalc';
import { fetchPlateSettings, updatePlateSettings } from '../services/workoutService';

const BAR_KEY = 'plate_default_bar_kg';
const BAR_OPTIONS = [15, 20, 25];

export default function PlateCalculatorModal({ visible, onClose, exercise }) {
  const override = exercise?.barWeightOverrideKg ?? null;
  const [defaultBar, setDefaultBar] = useState(DEFAULT_BAR_KG);
  const [barKg, setBarKg] = useState(resolveBarWeight(override, DEFAULT_BAR_KG));
  const [target, setTarget] = useState(
    exercise?.targetWeight != null ? String(exercise.targetWeight) : ''
  );

  // Load the member's default bar: server first (source of truth), else the local
  // cache, else 20.
  useEffect(() => {
    if (!visible) return;
    (async () => {
      let parsed = DEFAULT_BAR_KG;
      try {
        const cached = await AsyncStorage.getItem(BAR_KEY);
        if (cached != null) parsed = Number(cached);
      } catch {}
      try {
        const srv = await fetchPlateSettings();
        if (srv?.defaultBarWeightKg != null) {
          parsed = Number(srv.defaultBarWeightKg);
          AsyncStorage.setItem(BAR_KEY, String(parsed)).catch(() => {});
        }
      } catch {}
      setDefaultBar(parsed);
      if (override == null) setBarKg(parsed);
    })();
  }, [override, visible]);

  useEffect(() => {
    setTarget(exercise?.targetWeight != null ? String(exercise.targetWeight) : '');
    setBarKg(resolveBarWeight(override, defaultBar));
  }, [exercise?.id]);

  const chooseBar = async (kg) => {
    setBarKg(kg);
    // Only exercises without an override update the member's remembered default
    // (persisted to the server + local cache).
    if (override == null) {
      setDefaultBar(kg);
      try { await AsyncStorage.setItem(BAR_KEY, String(kg)); } catch {}
      updatePlateSettings(kg).catch(() => {});
    }
  };

  const result = useMemo(() => computePlates(parseFloat(target) || 0, barKg), [target, barKg]);
  const summary = useMemo(() => summarizePlates(result.perSide), [result]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.titleRow}>
            <Text style={s.title}>Plate Calculator</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={COLORS.textMuted} /></TouchableOpacity>
          </View>
          {!!exercise?.name && <Text style={s.sub}>{exercise.name}</Text>}

          <Text style={s.lbl}>Target weight (kg)</Text>
          <TextInput
            style={s.input}
            value={target}
            onChangeText={setTarget}
            keyboardType="decimal-pad"
            placeholder="e.g. 100"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={s.lbl}>Bar weight{override != null ? ' (set for this exercise)' : ''}</Text>
          <View style={s.barRow}>
            {BAR_OPTIONS.map((kg) => (
              <TouchableOpacity
                key={kg}
                disabled={override != null}
                style={[s.barChip, barKg === kg && s.barChipOn, override != null && { opacity: 0.5 }]}
                onPress={() => chooseBar(kg)}
              >
                <Text style={[s.barChipTxt, barKg === kg && s.barChipTxtOn]}>{kg} kg</Text>
              </TouchableOpacity>
            ))}
            {override != null && (
              <View style={[s.barChip, s.barChipOn]}><Text style={s.barChipTxtOn}>{override} kg</Text></View>
            )}
          </View>

          <View style={s.resultBox}>
            {result.justBar ? (
              <Text style={s.justBar}>Just the bar</Text>
            ) : (
              <>
                <Text style={s.perSideLabel}>Per side</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.plateRow}>
                  {summary.map((p, i) => (
                    <View key={i} style={s.plate}>
                      <Text style={s.plateKg}>{p.kg}</Text>
                      <Text style={s.plateCount}>×{p.count}</Text>
                    </View>
                  ))}
                </ScrollView>
                <Text style={s.loaded}>
                  Loads to {result.achievableKg} kg
                  {!result.exact ? `  ·  ${result.deltaKg > 0 ? 'short by' : 'over by'} ${Math.abs(result.deltaKg)} kg` : ''}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface || '#151215', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.textMuted, opacity: 0.4, marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  sub: { color: COLORS.textMuted, fontSize: 13, marginTop: 2, marginBottom: 8 },
  lbl: { color: COLORS.textSecondary || '#D4C1CF', fontSize: 12, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: COLORS.background || '#080608', borderRadius: 10, padding: 12, color: COLORS.white, fontSize: 16, fontWeight: '700', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  barRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  barChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.background || '#080608', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  barChipOn: { backgroundColor: COLORS.secondary || COLORS.primary || '#7C3AED', borderColor: 'transparent' },
  barChipTxt: { color: COLORS.textSecondary || '#D4C1CF', fontSize: 13, fontWeight: '700' },
  barChipTxtOn: { color: '#fff', fontSize: 13, fontWeight: '800' },
  resultBox: { marginTop: 18, backgroundColor: COLORS.background || '#080608', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  justBar: { color: COLORS.white, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  perSideLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase' },
  plateRow: { gap: 8, paddingRight: 8 },
  plate: { minWidth: 52, alignItems: 'center', backgroundColor: COLORS.surface || '#151215', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  plateKg: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  plateCount: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  loaded: { color: COLORS.textSecondary || '#D4C1CF', fontSize: 13, marginTop: 12, textAlign: 'center' },
});
