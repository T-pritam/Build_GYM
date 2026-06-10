import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Image, Linking, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import SafeBottomBar from '../../components/SafeBottomBar';
import { requestTrialSession, checkTrainerTrialStatus, fetchTrainers } from '../../services/trainerService';
import { logEvent } from '../../services/analyticsService';

const RECEPTION_PHONE = '+919876543210';

const WHAT_TO_EXPECT = [
  { title: 'Custom Workout Plans:', body: 'Tailored specifically to your current fitness level and end goals.' },
  { title: 'Form Analysis:', body: 'Detailed breakdown of your major lifts to ensure safety and maximum mechanical tension.' },
  { title: 'Weekly Check-ins:', body: 'Constant monitoring of progress and diet adjustments as your body adapts.' },
];

export default function TrainerDetailScreen({ navigation, route }) {
  const { trainer, isMyTrainer = false } = route.params || {};
  const [requesting, setRequesting] = useState(false);
  // null = no active trial | 'pending' | 'accepted' | 'member_confirmed'
  const [trialStatus, setTrialStatus] = useState(null);
  const [fetchedTrainer, setFetchedTrainer] = useState(null);

  const resolvedTrainer = trainer || fetchedTrainer;

  // Deeplink support: fetch by ID when navigated without a full trainer object
  useEffect(() => {
    const trainerId = route.params?.trainerId;
    if (!trainer && trainerId) {
      fetchTrainers()
        .then(list => {
          const found = list.find(t => t.id === trainerId);
          if (found) setFetchedTrainer(found);
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!resolvedTrainer?.id) return;
    checkTrainerTrialStatus(resolvedTrainer.id)
      .then(d => setTrialStatus(d.hasActive ? d.status : null))
      .catch(() => { });
  }, [resolvedTrainer?.id]);

  if (!resolvedTrainer) return null;

  const initials = (resolvedTrainer.name || 'T').charAt(0).toUpperCase();

  async function handleTrialRequest() {
    setRequesting(true);
    try {
      await requestTrialSession(resolvedTrainer.id);
      logEvent('trial_session_requested', { trainer_id: resolvedTrainer.id }).catch(() => {});
      setTrialStatus('pending');
      Alert.alert('Request Sent', "Your trial session request has been submitted. You'll receive a notification once it's confirmed by the admin.");
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Failed to send request.');
    } finally {
      setRequesting(false);
    }
  }

  const trialBtnLabel =
    trialStatus === 'pending' ? 'Request Sent ✓' :
      trialStatus === 'accepted' ? 'Session Scheduled' :
        trialStatus === 'member_confirmed' ? 'Session Confirmed ✓' :
          'Request Trial';

  const stats = [
    {
      label: 'Experience',
      value: resolvedTrainer.experience || (resolvedTrainer.yearsOfExperience ? `${resolvedTrainer.yearsOfExperience} years` : '—'),
      icon: 'time-outline',
      color: COLORS.secondary,
      bg: `${COLORS.secondary}25`,
    },
    {
      label: 'Clients',
      value: resolvedTrainer.clients > 0 ? `${resolvedTrainer.clients}+` : '0+',
      icon: 'people-outline',
      color: '#3B82F6',
      bg: 'rgba(59,130,246,0.15)',
    },
    {
      label: 'Rating',
      value: String(resolvedTrainer.rating ?? 4.8),
      icon: 'star-outline',
      color: '#EAB308',
      bg: 'rgba(234,179,8,0.15)',
    },
    {
      label: 'Status',
      value: resolvedTrainer.available ? 'Available' : 'Full',
      icon: resolvedTrainer.available ? 'checkmark-circle-outline' : 'time-outline',
      color: resolvedTrainer.available ? '#22C55E' : '#94A3B8',
      bg: resolvedTrainer.available ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)',
    },
  ];

  // Parse certifications text into lines (filter blanks)
  const certLines = resolvedTrainer.certificationsText
    ? resolvedTrainer.certificationsText.split('\n').map((l) => l.trim()).filter(Boolean)
    : [];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Sticky top bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {/* ── Profile header ─────────────────────────────────────── */}
        <View style={s.profileHeader}>
          {resolvedTrainer.profilePhotoUrl ? (
            <Image source={{ uri: resolvedTrainer.profilePhotoUrl }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
          )}
          <Text style={s.trainerName}>{resolvedTrainer.name}</Text>
          <Text style={s.trainerSpec}>{resolvedTrainer.specialisation}</Text>

          {/* Stars + rating */}
          <View style={s.ratingRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons
                key={i}
                name={i <= Math.round(resolvedTrainer.rating ?? 4.8) ? 'star' : 'star-outline'}
                size={17}
                color={COLORS.secondary}
              />
            ))}
            <Text style={s.ratingNum}>{resolvedTrainer.rating ?? 4.8}</Text>
          </View>
        </View>

        {/* ── Availability banner ─────────────────────────────────── */}
        {resolvedTrainer.available ? (
          <View style={s.availBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
            <Text style={s.availText}>Currently accepting new clients</Text>
          </View>
        ) : (
          <View style={[s.availBanner, s.availBannerFull]}>
            <Ionicons name="time-outline" size={20} color="#94A3B8" />
            <Text style={[s.availText, { color: '#94A3B8' }]}>At full capacity — contact reception for waitlist</Text>
          </View>
        )}

        {/* ── Stats grid ─────────────────────────────────────────── */}
        <View style={s.statsGrid}>
          {stats.map((st) => (
            <View key={st.label} style={s.statCard}>
              <View style={[s.statIcon, { backgroundColor: st.bg }]}>
                <Ionicons name={st.icon} size={20} color={st.color} />
              </View>
              <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* ── About ──────────────────────────────────────────────── */}
        {!!resolvedTrainer.bio && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>ABOUT</Text>
            <View style={s.card}>
              <Text style={s.cardBody}>{resolvedTrainer.bio}</Text>
            </View>
          </View>
        )}

        {/* ── Training Philosophy ────────────────────────────────── */}
        {!!resolvedTrainer.trainingPhilosophy && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>TRAINING PHILOSOPHY</Text>
            <View style={s.card}>
              <Text style={s.cardBody}>{resolvedTrainer.trainingPhilosophy}</Text>
            </View>
          </View>
        )}

        {/* ── Certifications ─────────────────────────────────────── */}
        {certLines.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>CERTIFICATIONS</Text>
            <View style={s.card}>
              {certLines.map((cert, i) => (
                <View key={i} style={[s.certRow, i > 0 && { marginTop: 10 }]}>
                  <Ionicons name="shield-checkmark" size={16} color={COLORS.secondary} style={{ marginTop: 1 }} />
                  <Text style={s.certText}>{cert}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Expertise chips ────────────────────────────────────── */}
        {(resolvedTrainer.specialisations?.length > 0 || resolvedTrainer.tags?.length > 0) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>EXPERTISE</Text>
            <View style={s.chipRow}>
              {(resolvedTrainer.specialisations || resolvedTrainer.tags || []).map((tag) => (
                <View key={tag} style={s.expertiseChip}>
                  <Ionicons name="checkmark" size={13} color={COLORS.secondary} />
                  <Text style={s.expertiseChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Languages ──────────────────────────────────────────── */}
        {resolvedTrainer.languages?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>LANGUAGES</Text>
            <View style={s.chipRow}>
              {resolvedTrainer.languages.map((lang) => (
                <View key={lang} style={s.langChip}>
                  <Text style={s.langChipText}>{lang}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── What to Expect ─────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>WHAT TO EXPECT</Text>
          {WHAT_TO_EXPECT.map((pt, i) => (
            <View key={i} style={s.pointRow}>
              <View style={s.pointDot} />
              <Text style={s.pointText}>
                <Text style={s.pointBold}>{pt.title} </Text>
                <Text style={s.pointMuted}>{pt.body}</Text>
              </Text>
            </View>
          ))}
        </View>

        {/* ── Info banner ────────────────────────────────────────── */}
        <View style={s.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.secondary} style={{ flexShrink: 0 }} />
          <Text style={s.infoBannerText}>
            Trainer assignment is handled by the gym admin. To request this trainer, contact the reception desk.
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Sticky footer ──────────────────────────────────────────── */}
      <SafeBottomBar style={s.footer} minPadding={16}>
        <TouchableOpacity
          style={s.callBtn}
          onPress={() => Linking.openURL(`tel:${RECEPTION_PHONE}`)}
          activeOpacity={0.8}
        >
          <Ionicons name="call-outline" size={18} color="#fff" />
          <Text style={s.callBtnText}>Call</Text>
        </TouchableOpacity>
        {/* {!isMyTrainer && (
          <TouchableOpacity
            style={[s.trialBtn, (requesting || trialStatus !== null) && { opacity: 0.6 }]}
            onPress={handleTrialRequest}
            disabled={requesting || trialStatus !== null}
            activeOpacity={0.8}
          >
            {requesting ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={s.trialBtnText}>{trialBtnLabel}</Text>
            )}
          </TouchableOpacity>
        )} */}
        <TouchableOpacity
          style={s.waBtn}
          onPress={() => Linking.openURL(`whatsapp://send?phone=${RECEPTION_PHONE}`)}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#22C55E" />
          <Text style={s.waBtnText}>WhatsApp</Text>
        </TouchableOpacity>
      </SafeBottomBar>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center',
  },

  // Scroll
  scroll: { paddingTop: 108, paddingHorizontal: 16, paddingBottom: 24 },

  // Profile header
  profileHeader: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 96, height: 96, borderRadius: 20, marginBottom: 14 },
  avatarFallback: { backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 44, fontWeight: '900', color: '#fff' },
  trainerName: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  trainerSpec: { fontSize: 14, color: '#9A9A9A', marginBottom: 10, fontWeight: '400' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingNum: { fontSize: 14, fontWeight: '700', color: '#9A9A9A', marginLeft: 4 },

  // Availability banner
  availBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(10,42,26,0.9)', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 16, marginBottom: 16,
  },
  availBannerFull: { backgroundColor: 'rgba(30,30,35,0.9)' },
  availText: { fontSize: 13, fontWeight: '600', color: '#22C55E' },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    width: '47%', backgroundColor: '#1C1C1E', borderRadius: 14,
    borderWidth: 1, borderColor: '#333', padding: 14, gap: 8,
  },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#9A9A9A', fontWeight: '500' },

  // Sections
  section: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 10, fontWeight: '800', color: COLORS.secondary,
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10,
  },
  card: {
    backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1,
    borderColor: '#333', padding: 16,
  },
  cardBody: { fontSize: 13, color: '#9A9A9A', lineHeight: 20 },

  // Certifications
  certRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  certText: { flex: 1, fontSize: 13, color: '#9A9A9A', lineHeight: 20 },

  // Expertise chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  expertiseChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1, borderColor: `${COLORS.secondary}66`,
    backgroundColor: `${COLORS.secondary}0D`,
  },
  expertiseChipText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  // Language chips
  langChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#333',
  },
  langChipText: { fontSize: 12, fontWeight: '500', color: '#9A9A9A' },

  // What to Expect
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  pointDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.secondary,
    marginTop: 6, flexShrink: 0,
  },
  pointText: { flex: 1, fontSize: 13, lineHeight: 20 },
  pointBold: { fontWeight: '700', color: '#fff' },
  pointMuted: { color: '#9A9A9A' },

  // Info banner
  infoBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: 'rgba(42,26,10,0.8)', borderRadius: 12,
    borderWidth: 1, borderColor: `${COLORS.secondary}44`,
    padding: 14, marginTop: 4,
  },
  infoBannerText: { flex: 1, fontSize: 13, color: '#9A9A9A', lineHeight: 18 },

  // Sticky footer
  footer: {
    flexDirection: 'row', gap: 12, padding: 16,
    backgroundColor: 'rgba(0,0,0,0.92)', borderTopWidth: 1, borderTopColor: '#333',
  },
  callBtn: {
    flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 10, backgroundColor: '#1C1C1E',
    borderWidth: 1, borderColor: '#fff',
  },
  callBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  trialBtn: {
    flex: 1, height: 48, borderRadius: 10, backgroundColor: COLORS.secondary,
    justifyContent: 'center', alignItems: 'center',
  },
  trialBtnText: { fontSize: 12, fontWeight: '800', color: '#000' },
  waBtn: {
    flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 10, backgroundColor: '#1C1C1E',
    borderWidth: 1, borderColor: '#22C55E',
  },
  waBtnText: { fontSize: 13, fontWeight: '700', color: '#22C55E' },
});
