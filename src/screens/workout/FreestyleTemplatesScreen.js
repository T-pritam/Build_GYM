/**
 * FreestyleTemplatesScreen — A.4 template browser for members without a trainer.
 * Browse gym templates (filter by category / activity target), pick a date in the
 * next 14 days, and self-assign. Blocked (403) for members who have a trainer.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { KC, KF } from '../../theme/stitchKit';
import {
  browseTemplates, fetchTemplateTagOptions, selfAssignTemplate,
} from '../../services/workoutService';

const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const nextDays = (n) => Array.from({ length: n }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return { iso: isoDate(d), dow: d.toLocaleDateString(undefined, { weekday: 'short' }), day: d.getDate() };
});

export default function FreestyleTemplatesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [templates, setTemplates] = useState([]);
  const [options, setOptions] = useState({ category: [], activity_target: [] });
  const [category, setCategory] = useState(null);
  const [activityTarget, setActivityTarget] = useState(null);
  const [selectedDate, setSelectedDate] = useState(isoDate(new Date()));
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const days = nextDays(14);

  useEffect(() => {
    fetchTemplateTagOptions().then(setOptions).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (category) filters.category = category;
      if (activityTarget) filters.activity_target = activityTarget;
      const data = await browseTemplates(filters);
      setTemplates(data || []);
      setForbidden(false);
    } catch (e) {
      if (e?.response?.status === 403) setForbidden(true);
    } finally {
      setLoading(false);
    }
  }, [category, activityTarget]);

  useEffect(() => { load(); }, [load]);

  const doAssign = async (template, replace = false) => {
    setAssigningId(template.id);
    try {
      await selfAssignTemplate(template.id, selectedDate, replace);
      Alert.alert('Added', `"${template.name}" added to ${selectedDate}.`);
    } catch (e) {
      const code = e?.response?.data?.code;
      if (code === 'SELF_ASSIGN_EXISTS') {
        Alert.alert('Replace workout?', 'You already have a self-assigned workout that day.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: () => doAssign(template, true) },
        ]);
      } else {
        Alert.alert('Could not add', e?.response?.data?.message || 'Try another date.');
      }
    } finally {
      setAssigningId(null);
    }
  };

  const Chip = ({ label, active, onPress }) => (
    <TouchableOpacity style={[s.chip, active && s.chipOn]} onPress={onPress}>
      <Text style={[s.chipTxt, active && s.chipTxtOn]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.white} /></TouchableOpacity>
        <Text style={s.title}>Browse Workouts</Text>
        <View style={{ width: 24 }} />
      </View>

      {forbidden ? (
        <View style={s.center}>
          <Ionicons name="person-outline" size={44} color={COLORS.textMuted} />
          <Text style={s.forbiddenTxt}>Your trainer assigns your workouts</Text>
          <Text style={s.forbiddenSub}>The template browser is for members training on their own.</Text>
        </View>
      ) : (
        <>
          {/* Date strip */}
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dateStrip}>
              {days.map((d) => (
                <TouchableOpacity key={d.iso} style={[s.dateCell, selectedDate === d.iso && s.dateCellOn]} onPress={() => setSelectedDate(d.iso)}>
                  <Text style={[s.dateDow, selectedDate === d.iso && s.dateTxtOn]}>{d.dow}</Text>
                  <Text style={[s.dateNum, selectedDate === d.iso && s.dateTxtOn]}>{d.day}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
            <Chip label="All" active={!category} onPress={() => setCategory(null)} />
            {(options.category || []).map((o) => (
              <Chip key={o.id} label={o.displayName} active={category === o.value} onPress={() => setCategory(o.value)} />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
            <Chip label="Any target" active={!activityTarget} onPress={() => setActivityTarget(null)} />
            {(options.activity_target || []).map((o) => (
              <Chip key={o.id} label={o.displayName} active={activityTarget === o.value} onPress={() => setActivityTarget(o.value)} />
            ))}
          </ScrollView>

          {loading ? (
            <View style={s.center}><ActivityIndicator size="large" color={COLORS.secondary} /></View>
          ) : (
            <FlatList
              data={templates}
              keyExtractor={(t) => t.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
              ListEmptyComponent={<Text style={s.empty}>No templates match these filters.</Text>}
              renderItem={({ item }) => (
                <View style={s.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{item.name}</Text>
                    <Text style={s.meta}>
                      {item.exercises?.length || 0} exercises
                      {item.category ? ` · ${item.category}` : ''}
                      {item.activityTarget ? ` · ${item.activityTarget}` : ''}
                    </Text>
                    {!!item.muscleGroups?.length && (
                      <Text style={s.muscles}>{item.muscleGroups.join(' · ')}</Text>
                    )}
                  </View>
                  <TouchableOpacity style={s.addBtn} onPress={() => doAssign(item)} disabled={assigningId === item.id}>
                    {assigningId === item.id
                      ? <ActivityIndicator size="small" color={COLORS.white} />
                      : <Text style={s.addTxt}>Add</Text>}
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { color: COLORS.white, fontSize: 18, fontFamily: KF.bodyBold },
  dateStrip: { paddingHorizontal: 12, gap: 8, paddingVertical: 8 },
  dateCell: { width: 52, alignItems: 'center', paddingVertical: 8, borderRadius: 12, backgroundColor: KC.card, borderWidth: 1, borderColor: KC.border },
  dateCellOn: { backgroundColor: COLORS.secondary || COLORS.primary || '#7C3AED', borderColor: 'transparent' },
  dateDow: { color: COLORS.textMuted, fontSize: 11, fontFamily: KF.bodyBold },
  dateNum: { color: COLORS.white, fontSize: 16, fontFamily: KF.heading, marginTop: 2 },
  dateTxtOn: { color: '#fff' },
  filterRow: { paddingHorizontal: 12, gap: 8, paddingVertical: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: KC.card, borderWidth: 1, borderColor: KC.border },
  chipOn: { backgroundColor: COLORS.secondary || COLORS.primary || '#7C3AED', borderColor: 'transparent' },
  chipTxt: { color: COLORS.textSecondary || '#D4C1CF', fontSize: 12, fontFamily: KF.label },
  chipTxtOn: { color: '#fff', fontFamily: KF.heading },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: KC.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: KC.border, marginBottom: 8 },
  name: { color: COLORS.white, fontSize: 15, fontFamily: KF.bodyBold },
  meta: { color: COLORS.textSecondary || '#D4C1CF', fontSize: 12, marginTop: 3 },
  muscles: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },
  addBtn: { backgroundColor: COLORS.secondary || COLORS.primary || '#7C3AED', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, minWidth: 60, alignItems: 'center' },
  addTxt: { color: '#fff', fontFamily: KF.heading, fontSize: 13 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 50 },
  forbiddenTxt: { color: COLORS.white, fontSize: 16, fontFamily: KF.bodyBold, marginTop: 8 },
  forbiddenSub: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
});
