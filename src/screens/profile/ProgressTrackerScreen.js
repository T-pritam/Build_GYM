/**
 * ProgressTrackerScreen — B.2 body-weight log (chart + entries) and progress
 * photos (timeline + pick-two side-by-side compare). Member-owned.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image,
  ActivityIndicator, StatusBar, Alert, Modal, RefreshControl, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import dayjs from 'dayjs';
import { COLORS, FONTS } from '../../theme';
import {
  fetchWeightLog, logWeight, deleteWeight,
  fetchProgressPhotos, addProgressPhotos, deleteProgressPhoto,
} from '../../services/progressService';

const SURFACE = '#1A1A2E';
const BORDER = 'rgba(255,255,255,0.05)';

export default function ProgressTrackerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('weight');
  const [weights, setWeights] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState([]);      // photo ids for compare
  const [compareOpen, setCompareOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [w, p] = await Promise.allSettled([fetchWeightLog(), fetchProgressPhotos()]);
      setWeights(w.status === 'fulfilled' ? (w.value || []) : []);
      setPhotos(p.status === 'fulfilled' ? (p.value || []) : []);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onLogWeight = async () => {
    const w = parseFloat(newWeight);
    if (!Number.isFinite(w) || w < 20 || w > 500) return Alert.alert('Enter a weight between 20 and 500 kg');
    setSaving(true);
    try { await logWeight(w); setNewWeight(''); await load(); }
    catch (e) { Alert.alert('Error', e?.response?.data?.message || 'Failed to log'); }
    finally { setSaving(false); }
  };

  const onDeleteWeight = (item) => {
    Alert.alert('Delete entry', `Remove ${item.weightKg} kg on ${dayjs(item.date).format('DD MMM')}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteWeight(item.id); await load(); } },
    ]);
  };

  const onAddPhoto = async (fromCamera) => {
    setUploading(true);
    try {
      const created = await addProgressPhotos(fromCamera);
      if (created) await load();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const onDeletePhoto = (photo) => {
    Alert.alert('Delete photo', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteProgressPhoto(photo.id);
        setSelected((s) => s.filter((id) => id !== photo.id));
        await load();
      } },
    ]);
  };

  const toggleSelect = (id) => {
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 2) return [s[1], id];
      return [...s, id];
    });
  };

  const comparePhotos = photos.filter((p) => selected.includes(p.id));

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={s.title}>Progress</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.tabs}>
        {['weight', 'photos'].map((t) => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabOn]} onPress={() => setTab(t)}>
            <Text style={[s.tabTxt, tab === t && s.tabTxtOn]}>{t === 'weight' ? 'Body Weight' : 'Photos'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.cyan || COLORS.primaryBright} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.cyan} />}
        >
          {tab === 'weight' ? (
            <>
              <View style={s.addRow}>
                <TextInput
                  style={s.input} value={newWeight} onChangeText={setNewWeight}
                  keyboardType="decimal-pad" placeholder="Today's weight (kg)" placeholderTextColor={COLORS.textMuted}
                />
                <TouchableOpacity style={s.logBtn} onPress={onLogWeight} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.logBtnTxt}>Log</Text>}
                </TouchableOpacity>
              </View>

              {weights.length >= 2 ? (
                <View style={s.card}><WeightChart data={weights} /></View>
              ) : (
                <View style={[s.card, s.emptyBox]}>
                  <Ionicons name="scale-outline" size={40} color={COLORS.textMuted} />
                  <Text style={s.emptyTxt}>Log your weight over time to see the trend.</Text>
                </View>
              )}

              {weights.slice().reverse().map((item) => (
                <View key={item.id} style={s.entryRow}>
                  <Text style={s.entryDate}>{dayjs(item.date).format('ddd, DD MMM YYYY')}</Text>
                  <Text style={s.entryKg}>{item.weightKg} kg</Text>
                  <TouchableOpacity onPress={() => onDeleteWeight(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          ) : (
            <>
              <View style={s.photoActions}>
                <TouchableOpacity style={s.photoBtn} onPress={() => onAddPhoto(false)} disabled={uploading}>
                  <Ionicons name="images-outline" size={18} color="#fff" />
                  <Text style={s.photoBtnTxt}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.photoBtn} onPress={() => onAddPhoto(true)} disabled={uploading}>
                  <Ionicons name="camera-outline" size={18} color="#fff" />
                  <Text style={s.photoBtnTxt}>Camera</Text>
                </TouchableOpacity>
                {uploading && <ActivityIndicator color={COLORS.cyan} style={{ marginLeft: 8 }} />}
              </View>
              {selected.length === 2 && (
                <TouchableOpacity style={s.compareBtn} onPress={() => setCompareOpen(true)}>
                  <Ionicons name="git-compare-outline" size={18} color="#000" />
                  <Text style={s.compareTxt}>Compare selected</Text>
                </TouchableOpacity>
              )}

              {photos.length === 0 ? (
                <View style={[s.card, s.emptyBox]}>
                  <Ionicons name="camera-outline" size={40} color={COLORS.textMuted} />
                  <Text style={s.emptyTxt}>Add monthly progress photos to track visual change.</Text>
                </View>
              ) : (
                <View style={s.grid}>
                  {photos.map((p) => {
                    const isSel = selected.includes(p.id);
                    return (
                      <TouchableOpacity key={p.id} style={[s.photoCell, isSel && s.photoCellSel]} onPress={() => toggleSelect(p.id)} onLongPress={() => onDeletePhoto(p)}>
                        <Image source={{ uri: p.thumbnailUrl || p.url }} style={s.photoImg} />
                        <Text style={s.photoDate}>{dayjs(p.uploadedAt).format('DD MMM')}</Text>
                        {isSel && <View style={s.selBadge}><Ionicons name="checkmark" size={12} color="#000" /></View>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <Text style={s.hint}>Tap to select two for compare · long-press to delete</Text>
            </>
          )}
        </ScrollView>
      )}

      {/* Compare modal */}
      <Modal visible={compareOpen} transparent animationType="fade" onRequestClose={() => setCompareOpen(false)}>
        <View style={s.compareOverlay}>
          <View style={s.compareHead}>
            <Text style={s.compareTitle}>Compare</Text>
            <TouchableOpacity onPress={() => setCompareOpen(false)}><Ionicons name="close" size={26} color="#fff" /></TouchableOpacity>
          </View>
          <View style={s.compareRow}>
            {comparePhotos.map((p) => (
              <View key={p.id} style={s.compareCol}>
                <Image source={{ uri: p.url }} style={s.compareImg} resizeMode="contain" />
                <Text style={s.compareDate}>{dayjs(p.uploadedAt).format('DD MMM YYYY')}</Text>
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function WeightChart({ data }) {
  const W = Dimensions.get('window').width - 64, H = 180, PAD = 34;
  const ys = data.map((d) => d.weightKg);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = maxY - minY || 1;
  const px = (i) => PAD + (i / Math.max(1, data.length - 1)) * (W - 2 * PAD);
  const py = (v) => H - PAD - ((v - minY) / span) * (H - 2 * PAD);
  const points = data.map((d, i) => `${px(i)},${py(d.weightKg)}`).join(' ');
  return (
    <Svg width={W} height={H}>
      <Line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
      <SvgText x={2} y={py(maxY) + 4} fill={COLORS.textMuted} fontSize={9}>{maxY}</SvgText>
      <SvgText x={2} y={py(minY) + 4} fill={COLORS.textMuted} fontSize={9}>{minY}</SvgText>
      <Polyline points={points} fill="none" stroke={COLORS.cyan || '#06B6D4'} strokeWidth={2.5} />
      {data.map((d, i) => <Circle key={i} cx={px(i)} cy={py(d.weightKg)} r={3} fill={COLORS.cyan || '#06B6D4'} />)}
    </Svg>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { color: COLORS.textPrimary, fontSize: 18, fontFamily: FONTS?.bodyBold, fontWeight: '700' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: SURFACE, borderRadius: 12, padding: 4, marginBottom: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  tabOn: { backgroundColor: COLORS.primaryBright || '#7C3AED' },
  tabTxt: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
  tabTxtOn: { color: '#fff' },
  card: { backgroundColor: SURFACE, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  emptyBox: { paddingVertical: 30, gap: 8 },
  emptyTxt: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  input: { flex: 1, backgroundColor: SURFACE, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, borderWidth: 1, borderColor: BORDER, fontSize: 15 },
  logBtn: { backgroundColor: COLORS.primaryBright || '#7C3AED', borderRadius: 12, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', minWidth: 64 },
  logBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  entryDate: { flex: 1, color: COLORS.textSecondary, fontSize: 13 },
  entryKg: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  photoActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryBright || '#7C3AED', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  photoBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  compareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.cyan || '#06B6D4', borderRadius: 12, paddingVertical: 11, marginBottom: 12 },
  compareTxt: { color: '#000', fontWeight: '800', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoCell: { width: '31.5%', aspectRatio: 0.8, borderRadius: 12, overflow: 'hidden', backgroundColor: SURFACE, borderWidth: 2, borderColor: 'transparent' },
  photoCellSel: { borderColor: COLORS.cyan || '#06B6D4' },
  photoImg: { width: '100%', height: '100%' },
  photoDate: { position: 'absolute', bottom: 4, left: 6, color: '#fff', fontSize: 10, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 4 },
  selBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: COLORS.cyan || '#06B6D4', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  hint: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center', marginTop: 12 },
  compareOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', paddingTop: 60 },
  compareHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  compareTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  compareRow: { flex: 1, flexDirection: 'row', gap: 4, paddingHorizontal: 8, paddingBottom: 30 },
  compareCol: { flex: 1 },
  compareImg: { flex: 1, width: '100%' },
  compareDate: { color: '#fff', fontSize: 12, textAlign: 'center', paddingVertical: 8 },
});
