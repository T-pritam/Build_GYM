/**
 * ExerciseTrendScreen — A.11.2 estimated-1RM trend for one exercise (line chart),
 * reached by tapping an exercise in Personal Records.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../../constants/colors';
import { KC, KF } from '../../theme/stitchKit';
import { fetch1rmTrend } from '../../services/workoutService';

export default function ExerciseTrendScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { exerciseId, exerciseName } = route.params || {};
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch1rmTrend(exerciseId).then((d) => setData(d || [])).catch(() => setData([]));
  }, [exerciseId]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.white} /></TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{exerciseName || 'Exercise'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {data == null ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.secondary} /></View>
      ) : data.length < 2 ? (
        <View style={s.center}>
          <Ionicons name="analytics-outline" size={44} color={COLORS.textMuted} />
          <Text style={s.emptyTxt}>Not enough data yet</Text>
          <Text style={s.emptySub}>Log this exercise across a few sessions to see your estimated 1RM trend.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={s.sub}>Estimated 1RM (Epley) — last {data.length} sessions</Text>
          <TrendChart data={data} />
          <View style={s.legendRow}>
            <Text style={s.legendVal}>Latest: {data[data.length - 1].est1rm} kg</Text>
            <Text style={s.legendVal}>Best: {Math.max(...data.map((d) => d.est1rm))} kg</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function TrendChart({ data }) {
  const W = 320, H = 180, PAD = 30;
  const xs = data.map((_, i) => i);
  const ys = data.map((d) => d.est1rm);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = maxY - minY || 1;
  const px = (i) => PAD + (i / Math.max(1, xs.length - 1)) * (W - 2 * PAD);
  const py = (v) => H - PAD - ((v - minY) / span) * (H - 2 * PAD);
  const points = data.map((d, i) => `${px(i)},${py(d.est1rm)}`).join(' ');

  return (
    <View style={s.chartWrap}>
      <Svg width={W} height={H}>
        <Line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        <Line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        <SvgText x={4} y={py(maxY) + 4} fill={COLORS.textMuted} fontSize={9}>{Math.round(maxY)}</SvgText>
        <SvgText x={4} y={py(minY) + 4} fill={COLORS.textMuted} fontSize={9}>{Math.round(minY)}</SvgText>
        <Polyline points={points} fill="none" stroke={COLORS.secondary || '#7C3AED'} strokeWidth={2.5} />
        {data.map((d, i) => (
          <Circle key={i} cx={px(i)} cy={py(d.est1rm)} r={3} fill={COLORS.secondary || '#7C3AED'} />
        ))}
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { color: COLORS.white, fontSize: 18, fontFamily: KF.bodyBold, flex: 1, textAlign: 'center' },
  sub: { color: COLORS.textSecondary || '#D4C1CF', fontSize: 13, marginBottom: 12 },
  chartWrap: { alignItems: 'center', backgroundColor: KC.card, borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: KC.border },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  legendVal: { color: COLORS.white, fontSize: 14, fontFamily: KF.bodyBold },
  emptyTxt: { color: COLORS.white, fontSize: 16, fontFamily: KF.bodyBold, marginTop: 8 },
  emptySub: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
});
