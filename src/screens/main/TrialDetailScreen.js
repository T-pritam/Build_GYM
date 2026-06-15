/**
 * TrialDetailScreen (member) — track an upcoming/past trial session.
 * Shows trainer mini-profile (tap → full profile), date/time/duration, status,
 * location, what-to-bring, and the 2-hour cancel cutoff / call-front-desk fallback.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Image,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS } from '../../theme';
import { fetchTrialDetail, cancelMyTrial, TRIAL_STATUS_META } from '../../services/trialService';

const RECEPTION_PHONE = '+919876543210';

function fmtWhen(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function TrialDetailScreen({ navigation, route }) {
  const trialId = route.params?.trialId;
  const [trial, setTrial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await fetchTrialDetail(trialId); setTrial(res.data.data); }
    catch { setTrial(null); }
    finally { setLoading(false); }
  }, [trialId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onCancel() {
    Alert.alert(
      'Cancel trial?',
      `Cancel your free trial with Coach ${trial?.trainer?.name || ''}? You can rebook via the front desk.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel trial', style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try { await cancelMyTrial(trialId); load(); }
            catch (e) { Alert.alert('Could not cancel', e?.response?.data?.message || 'Please try again.'); }
            finally { setBusy(false); }
          },
        },
      ],
    );
  }

  if (loading) return <View style={[s.root, s.center]}><ActivityIndicator color={COLORS.cyan} size="large" /></View>;
  if (!trial) return <View style={[s.root, s.center]}><Text style={s.muted}>Trial not found</Text></View>;

  const meta = TRIAL_STATUS_META[trial.status] || TRIAL_STATUS_META.scheduled;
  const t = trial.trainer || {};

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={COLORS.white} /></TouchableOpacity>
        <Text style={s.headerTitle}>Trial Session</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Trainer mini-profile */}
        <TouchableOpacity style={s.trainerCard} activeOpacity={0.85}
          onPress={() => navigation.navigate('TrainerDetail', { trainerId: t.id, trainer: { id: t.id, name: t.name, profilePhotoUrl: t.profilePhotoUrl } })}>
          {t.profilePhotoUrl ? (
            <Image source={{ uri: t.profilePhotoUrl }} style={s.trainerPhoto} />
          ) : (
            <View style={[s.trainerPhoto, s.trainerPhotoFallback]}><Text style={s.trainerInitials}>{(t.name || 'C').slice(0, 2).toUpperCase()}</Text></View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.trainerName}>Coach {t.name}</Text>
            {Array.isArray(t.specialisations) && t.specialisations.length ? <Text style={s.trainerSpec}>{t.specialisations[0]}</Text> : null}
          </View>
          <View style={[s.badge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
            <Text style={[s.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </TouchableOpacity>

        {/* Details */}
        <View style={s.card}>
          <Row icon="calendar-outline" label="When" value={fmtWhen(trial.scheduledAt)} />
          <Row icon="time-outline" label="Duration" value={`${trial.durationMinutes} minutes`} />
          <Row icon="location-outline" label="Location" value={trial.location || 'BuildGym main floor'} />
          <Row icon="pricetag-outline" label="Price" value="Free trial" />
        </View>

        {/* What to bring */}
        <View style={s.card}>
          <Text style={s.cardTitle}>What to bring</Text>
          <Text style={s.bullet}>• A towel & water bottle 💧</Text>
          <Text style={s.bullet}>• Comfortable workout clothes & shoes</Text>
          <Text style={s.bullet}>• Arrive 10 minutes early to check in</Text>
        </View>

        {/* Cancel / front-desk */}
        {trial.canCancel ? (
          <TouchableOpacity style={s.cancelBtn} disabled={busy} onPress={onCancel}>
            <Text style={s.cancelText}>CANCEL TRIAL</Text>
          </TouchableOpacity>
        ) : (['scheduled', 'confirmed'].includes(trial.status) ? (
          <TouchableOpacity style={s.frontDeskBtn} onPress={() => Linking.openURL(`tel:${RECEPTION_PHONE}`).catch(() => {})}>
            <Ionicons name="call-outline" size={16} color={COLORS.cyan} />
            <Text style={s.frontDeskText}>Need to change this? Call the front desk</Text>
          </TouchableOpacity>
        ) : null)}
      </ScrollView>
    </View>
  );
}

function Row({ icon, label, value }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon} size={16} color={COLORS.textMuted} />
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  muted: { color: COLORS.textMuted },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 17, fontFamily: FONTS.bodyBold },
  scroll: { padding: 16, gap: 14 },
  trainerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface2, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  trainerPhoto: { width: 52, height: 52, borderRadius: 26 },
  trainerPhotoFallback: { backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  trainerInitials: { color: COLORS.primaryLight, fontFamily: FONTS.bodyBold, fontSize: 18 },
  trainerName: { color: COLORS.white, fontSize: 15, fontFamily: FONTS.bodyBold },
  trainerSpec: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontFamily: FONTS.bodyBold },
  card: { backgroundColor: COLORS.surface2, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cardTitle: { color: COLORS.white, fontSize: 14, fontFamily: FONTS.bodyBold, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { color: COLORS.textMuted, fontSize: 13, width: 70 },
  rowValue: { color: COLORS.textPrimary, fontSize: 13, flex: 1, textAlign: 'right', fontFamily: FONTS.bodyBold },
  bullet: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  cancelBtn: { backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  cancelText: { color: '#EF4444', fontSize: 13, fontFamily: FONTS.bodyBold, letterSpacing: 1 },
  frontDeskBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: 14, paddingVertical: 15, marginTop: 6 },
  frontDeskText: { color: COLORS.cyan, fontSize: 13, fontFamily: FONTS.bodyBold },
});
