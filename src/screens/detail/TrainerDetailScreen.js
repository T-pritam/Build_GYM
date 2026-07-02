import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Image, Linking, Alert, ActivityIndicator, Animated, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS as THEME, FONTS } from '../../theme';
import SafeBottomBar from '../../components/SafeBottomBar';
import { fetchTrainers, fetchMyTrainer } from '../../services/trainerService';
import { useAuthStore } from '../../store/authStore';

// Theme-compat: legacy colour keys → new "Holographic Noir" palette.
const COLORS = {
  background: '#0B0B14', surface: '#1A1A2E', surface2: '#2A2A42',
  secondary: THEME.primaryLight, secondaryBorder: THEME.primaryBorder, primary: THEME.primary, primaryBright: THEME.primaryBright, cyan: THEME.cyan,
  textPrimary: THEME.textPrimary, textSecondary: THEME.textSecondary, textMuted: THEME.textMuted,
  border: 'rgba(255,255,255,0.10)', glass: 'rgba(255,255,255,0.04)', glassBorder: 'rgba(255,255,255,0.08)',
  white: THEME.white,
};

const GOLD_GRADIENT = ['#FFD700', '#FFC200'];
const RECEPTION_PHONE = '+919876543210';

const WHAT_TO_EXPECT = [
  { title: 'Custom Workout Plans:', body: 'Tailored specifically to your current fitness level and end goals.' },
  { title: 'Form Analysis:', body: 'Detailed breakdown of your major lifts to ensure safety and maximum mechanical tension.' },
  { title: 'Weekly Check-ins:', body: 'Constant monitoring of progress and diet adjustments as your body adapts.' },
];

// Rotating accent palette for the specialisation pills.
const PILL_STYLES = [
  { bg: 'rgba(127,41,130,0.20)', color: COLORS.primaryBright, border: 'rgba(124,58,237,0.35)' },
  { bg: 'rgba(6,182,212,0.12)', color: COLORS.cyan, border: 'rgba(6,182,212,0.30)' },
  { bg: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary, border: 'rgba(255,255,255,0.12)' },
];

export default function TrainerDetailScreen({ navigation, route }) {
  const [list, setList] = useState(route.params?.trainerList?.length ? route.params.trainerList : []);
  const [currentIndex, setCurrentIndex] = useState(route.params?.index ?? 0);
  const [assignedTrainerId, setAssignedTrainerId] = useState(null);

  const listRef = useRef(list);
  const fade = useRef(new Animated.Value(1)).current;

  const current = list[currentIndex] || null;
  const user = useAuthStore((st) => st.user);

  // ── Book Trial → WhatsApp the front desk with a prefilled message (§3.2). ──
  // Substitutes real member (name + code) + trainer name; falls back to a
  // number + Copy sheet if WhatsApp / dialer is unavailable (E1).
  const bookTrialViaWhatsApp = useCallback(() => {
    const memberName = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'a member';
    const memberCode = user?.displayId || '—';
    const trainerName = current?.name || 'your coach';
    const msg = `Hi! I'm ${memberName} (Member ID: ${memberCode}). I'd like to book a free trial session with Coach ${trainerName}. Please share available slots. — sent from the BuildGym app`;
    const waUrl = `whatsapp://send?phone=${RECEPTION_PHONE}&text=${encodeURIComponent(msg)}`;
    Linking.openURL(waUrl).catch(() => {
      Alert.alert(
        'WhatsApp not found',
        `Call or message the front desk at ${RECEPTION_PHONE}`,
        [
          { text: 'Call', onPress: () => Linking.openURL(`tel:${RECEPTION_PHONE}`).catch(() => {}) },
          { text: 'OK', style: 'cancel' },
        ],
      );
    });
  }, [user, current]);

  // ── Resolve the trainer list + starting index (params or fetch / deeplink) ──
  useEffect(() => {
    let mounted = true;
    (async () => {
      let l = route.params?.trainerList;
      if (!l || l.length === 0) {
        try { l = await fetchTrainers(); } catch { l = []; }
      }
      if ((!l || !l.length) && route.params?.trainer) l = [route.params.trainer];
      l = l || [];

      let idx = route.params?.index;
      if (idx == null) {
        const tid = route.params?.trainer?.id ?? route.params?.trainerId;
        let found = l.findIndex((t) => t.id === tid);
        // The member's own assigned trainer is excluded from /customer/trainers,
        // so a deeplink to it (TRAINER_ASSIGNED/CHANGED → buildfitness://trainers/<id>)
        // isn't in the list. Pull the target in so we show the right coach instead
        // of silently falling back to the first trainer.
        if (found < 0 && tid) {
          let target = null;
          try { const mine = await fetchMyTrainer(); if (mine?.id === tid) target = mine; } catch {}
          if (!target && route.params?.trainer?.id === tid) target = route.params.trainer;
          if (target) { l = [target, ...l]; found = 0; }
        }
        idx = found >= 0 ? found : 0;
      }
      if (mounted) {
        listRef.current = l;
        setList(l);
        setCurrentIndex(idx);
      }
    })();

    fetchMyTrainer()
      .then((t) => mounted && setAssignedTrainerId(t?.id ?? null))
      .catch(() => {});

    return () => { mounted = false; };
  }, []);

  useEffect(() => { listRef.current = list; }, [list]);

  // ── Swipe / arrow navigation with fade transition ──────────────────────────
  const go = useCallback((dir) => {
    const n = listRef.current.length;
    if (n < 2) return;
    Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setCurrentIndex((i) => (i + dir + n) % n);
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  }, [fade]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 12,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) go(1);
        else if (g.dx > 50) go(-1);
      },
    }),
  ).current;

  if (!current) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  const initials = (current.name || 'T').charAt(0).toUpperCase();
  const isCurrentAssigned = !!assignedTrainerId && current.id === assignedTrainerId;
  const pills = current.specialisations?.length ? current.specialisations : (current.tags || []);

  const stats = [
    { label: 'Experience', value: current.experience || (current.yearsOfExperience ? `${current.yearsOfExperience} years` : '—'), icon: 'time-outline', color: COLORS.secondary, bg: 'rgba(167,139,250,0.15)' },
    { label: 'Clients', value: current.clients > 0 ? `${current.clients}+` : '0+', icon: 'people-outline', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
    { label: 'Rating', value: String(current.rating ?? 4.8), icon: 'star-outline', color: '#EAB308', bg: 'rgba(234,179,8,0.15)' },
    { label: 'Status', value: current.available ? 'Available' : 'Full', icon: current.available ? 'checkmark-circle-outline' : 'time-outline', color: current.available ? '#22C55E' : '#94A3B8', bg: current.available ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)' },
  ];

  const certLines = current.certificationsText
    ? current.certificationsText.split('\n').map((l) => l.trim()).filter(Boolean)
    : [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Sticky top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')}>
          <Ionicons name="arrow-back" size={22} color={COLORS.cyan} />
        </TouchableOpacity>
        {list.length > 1 && (
          <Text style={styles.counter}>{currentIndex + 1} / {list.length}</Text>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Swipeable hero card ──────────────────────────────────── */}
        <Animated.View style={[styles.heroCard, { opacity: fade }]} {...pan.panHandlers}>
          <View style={styles.heroImageWrap}>
            {current.profilePhotoUrl ? (
              <Image source={{ uri: current.profilePhotoUrl }} style={styles.heroImage} />
            ) : (
              <LinearGradient colors={['rgba(127,41,130,0.5)', COLORS.surface]} style={styles.heroImage}>
                <Text style={styles.heroInitial}>{initials}</Text>
              </LinearGradient>
            )}
            <LinearGradient colors={['transparent', 'rgba(26,26,46,0.6)', COLORS.surface]} style={styles.heroFade} />

            {/* Arrows */}
            {list.length > 1 && (
              <>
                <TouchableOpacity style={[styles.arrowBtn, styles.arrowLeft]} onPress={() => go(-1)} hitSlop={8}>
                  <Ionicons name="chevron-back" size={22} color={COLORS.white} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.arrowBtn, styles.arrowRight]} onPress={() => go(1)} hitSlop={8}>
                  <Ionicons name="chevron-forward" size={22} color={COLORS.white} />
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.heroInfo}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName} numberOfLines={1}>{(current.name || '').toUpperCase()}</Text>
              <View style={styles.heroRating}>
                <Ionicons name="star" size={14} color="#FF9E00" />
                <Text style={styles.heroRatingText}>{current.rating ?? 4.8}{current.experience ? ` · ${current.experience}` : ''}</Text>
              </View>
            </View>

            {pills.length > 0 && (
              <View style={styles.pillRow}>
                {pills.slice(0, 3).map((p, i) => {
                  const ps = PILL_STYLES[i % PILL_STYLES.length];
                  return (
                    <View key={p} style={[styles.pill, { backgroundColor: ps.bg, borderColor: ps.border }]}>
                      <Text style={[styles.pillText, { color: ps.color }]}>{p}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {!!current.bio && (
              <Text style={styles.heroBio} numberOfLines={3}>"{current.bio}"</Text>
            )}
          </View>
        </Animated.View>

        {/* Swipe hint */}
        {list.length > 1 && (
          <Text style={styles.swipeHint}>Swipe to browse trainers</Text>
        )}

        {/* ── Availability banner ─────────────────────────────────── */}
        {current.available ? (
          <View style={styles.availBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
            <Text style={styles.availText}>Currently accepting new clients</Text>
          </View>
        ) : (
          <View style={[styles.availBanner, styles.availBannerFull]}>
            <Ionicons name="time-outline" size={20} color="#94A3B8" />
            <Text style={[styles.availText, { color: '#94A3B8' }]}>At full capacity — contact reception for waitlist</Text>
          </View>
        )}

        {/* ── Stats grid ─────────────────────────────────────────── */}
        <View style={styles.statsGrid}>
          {stats.map((st) => (
            <View key={st.label} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: st.bg }]}>
                <Ionicons name={st.icon} size={20} color={st.color} />
              </View>
              <Text style={[styles.statValue, { color: st.color }]}>{st.value}</Text>
              <Text style={styles.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* ── About ──────────────────────────────────────────────── */}
        {!!current.bio && (
          <Section title="ABOUT">
            <View style={styles.card}><Text style={styles.cardBody}>{current.bio}</Text></View>
          </Section>
        )}

        {/* ── Training Philosophy ────────────────────────────────── */}
        {!!current.trainingPhilosophy && (
          <Section title="TRAINING PHILOSOPHY">
            <View style={styles.card}><Text style={styles.cardBody}>{current.trainingPhilosophy}</Text></View>
          </Section>
        )}

        {/* ── Certifications ─────────────────────────────────────── */}
        {certLines.length > 0 && (
          <Section title="CERTIFICATIONS">
            <View style={styles.card}>
              {certLines.map((cert, i) => (
                <View key={i} style={[styles.certRow, i > 0 && { marginTop: 10 }]}>
                  <Ionicons name="shield-checkmark" size={16} color={COLORS.secondary} style={{ marginTop: 1 }} />
                  <Text style={styles.certText}>{cert}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* ── Expertise chips ────────────────────────────────────── */}
        {(current.specialisations?.length > 0 || current.tags?.length > 0) && (
          <Section title="EXPERTISE">
            <View style={styles.chipRow}>
              {(current.specialisations || current.tags || []).map((tag) => (
                <View key={tag} style={styles.expertiseChip}>
                  <Ionicons name="checkmark" size={13} color={COLORS.secondary} />
                  <Text style={styles.expertiseChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* ── Languages ──────────────────────────────────────────── */}
        {current.languages?.length > 0 && (
          <Section title="LANGUAGES">
            <View style={styles.chipRow}>
              {current.languages.map((lang) => (
                <View key={lang} style={styles.langChip}>
                  <Text style={styles.langChipText}>{lang}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* ── What to Expect ─────────────────────────────────────── */}
        <Section title="WHAT TO EXPECT">
          {WHAT_TO_EXPECT.map((pt, i) => (
            <View key={i} style={styles.pointRow}>
              <View style={styles.pointDot} />
              <Text style={styles.pointText}>
                <Text style={styles.pointBold}>{pt.title} </Text>
                <Text style={styles.pointMuted}>{pt.body}</Text>
              </Text>
            </View>
          ))}
        </Section>

        {/* ── Info banner ────────────────────────────────────────── */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.secondary} style={{ flexShrink: 0 }} />
          <Text style={styles.infoBannerText}>
            Trainer assignment is handled by the gym admin. To request this trainer, contact the reception desk.
          </Text>
        </View>

        {/* ── Call + WhatsApp (below the details) ─────────────────── */}
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${RECEPTION_PHONE}`)} activeOpacity={0.85}>
            <Ionicons name="call-outline" size={18} color={COLORS.white} />
            <Text style={styles.callBtnText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.waBtn} onPress={() => Linking.openURL(`whatsapp://send?phone=${RECEPTION_PHONE}`)} activeOpacity={0.85}>
            <Ionicons name="logo-whatsapp" size={18} color="#22C55E" />
            <Text style={styles.waBtnText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Sticky Book Trial (only for trainers NOT assigned to the user) ── */}
      {!isCurrentAssigned && (
        <SafeBottomBar style={styles.footer} minPadding={16}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={bookTrialViaWhatsApp}
            style={styles.trialWrap}
          >
            <LinearGradient
              colors={GOLD_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.trialBtn}
            >
              <Text style={styles.trialBtnText}>Book Trial Session</Text>
            </LinearGradient>
          </TouchableOpacity>
        </SafeBottomBar>
      )}
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: COLORS.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  counter: {
    fontFamily: FONTS.label, fontSize: 11, color: COLORS.white, letterSpacing: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    overflow: 'hidden',
  },

  scroll: { paddingTop: 100, paddingHorizontal: 16, paddingBottom: 24 },

  // Hero card
  heroCard: {
    backgroundColor: COLORS.surface, borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.glassBorder, marginBottom: 6,
  },
  heroImageWrap: { height: 300, position: 'relative' },
  heroImage: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  heroInitial: { fontFamily: FONTS.display, fontSize: 72, color: COLORS.white },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 },
  arrowBtn: {
    position: 'absolute', top: '45%', width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  arrowLeft: { left: 12 },
  arrowRight: { right: 12 },

  heroInfo: { padding: 18 },
  heroNameRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 },
  heroName: { flex: 1, fontFamily: FONTS.display, fontSize: 22, color: COLORS.white, letterSpacing: 1 },
  heroRating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 8 },
  heroRatingText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: '#FF9E00' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, borderWidth: 1 },
  pillText: { fontFamily: FONTS.label, fontSize: 11 },
  heroBio: { fontFamily: FONTS.body, fontStyle: 'italic', fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  swipeHint: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted, textAlign: 'center', letterSpacing: 1, marginBottom: 16, marginTop: 6 },

  // Availability banner
  availBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(34,197,94,0.10)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)',
    paddingVertical: 12, paddingHorizontal: 16, marginBottom: 16,
  },
  availBannerFull: { backgroundColor: 'rgba(148,163,184,0.08)', borderColor: 'rgba(148,163,184,0.2)' },
  availText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: '#22C55E' },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    width: '47%', backgroundColor: COLORS.glass, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.glassBorder, padding: 14, gap: 8,
  },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: FONTS.headline, fontSize: 18 },
  statLabel: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted },

  // Sections
  section: { marginBottom: 22 },
  sectionTitle: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.secondary, letterSpacing: 2, marginBottom: 10 },
  card: { backgroundColor: COLORS.glass, borderRadius: 14, borderWidth: 1, borderColor: COLORS.glassBorder, padding: 16 },
  cardBody: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  certRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  certText: { flex: 1, fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  expertiseChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, borderColor: COLORS.secondaryBorder ?? 'rgba(127,41,130,0.40)',
    backgroundColor: 'rgba(167,139,250,0.08)',
  },
  expertiseChipText: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: COLORS.white },
  langChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder },
  langChipText: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary },

  pointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  pointDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.secondary, marginTop: 6, flexShrink: 0 },
  pointText: { flex: 1, fontSize: 13, lineHeight: 20 },
  pointBold: { fontFamily: FONTS.bodyBold, color: COLORS.white },
  pointMuted: { fontFamily: FONTS.body, color: COLORS.textSecondary },

  infoBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: 'rgba(127,41,130,0.08)', borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.secondaryBorder ?? 'rgba(127,41,130,0.40)',
    padding: 14, marginTop: 4, marginBottom: 20,
  },
  infoBannerText: { flex: 1, fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  // Call + WhatsApp (below details)
  contactRow: { flexDirection: 'row', gap: 12 },
  callBtn: {
    flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, backgroundColor: COLORS.glass, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  callBtnText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.white },
  waBtn: {
    flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, backgroundColor: COLORS.glass, borderWidth: 1, borderColor: 'rgba(34,197,94,0.5)',
  },
  waBtnText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: '#22C55E' },

  // Sticky footer
  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: 'rgba(11,11,20,0.95)', borderTopWidth: 1, borderTopColor: COLORS.glassBorder,
  },
  trialWrap: { borderRadius: 16, overflow: 'hidden' },
  trialBtn: { height: 52, alignItems: 'center', justifyContent: 'center' },
  trialBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#1A1206', letterSpacing: 1.5, textTransform: 'uppercase' },
});
