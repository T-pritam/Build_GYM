import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function TrainerDetailScreen({ navigation, route }) {
  const { trainer } = route.params || {};

  if (!trainer) return null;

  const stats = [
    { label: 'Experience', value: trainer.experience, icon: 'time-outline', color: COLORS.secondary },
    { label: 'Clients', value: `${trainer.clients}+`, icon: 'people-outline', color: '#2196F3' },
    { label: 'Rating', value: trainer.rating, icon: 'star-outline', color: '#FFB400' },
    { label: 'Status', value: trainer.available ? 'Available' : 'Occupied', icon: 'checkmark-circle-outline', color: trainer.available ? COLORS.success : COLORS.error },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Hero */}
      <LinearGradient
        colors={['#2A1200', '#1A0800', '#0D0D0D']}
        style={styles.hero}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>

        {/* Avatar */}
        <LinearGradient
          colors={[COLORS.secondary, COLORS.secondaryDark]}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{trainer.name.charAt(0)}</Text>
        </LinearGradient>

        <Text style={styles.trainerName}>{trainer.name}</Text>
        <Text style={styles.trainerSpec}>{trainer.specialisation}</Text>

        {/* Rating row */}
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Ionicons
              key={s}
              name={s <= Math.round(trainer.rating) ? 'star' : 'star-outline'}
              size={16}
              color={COLORS.secondary}
            />
          ))}
          <Text style={styles.ratingNum}>{trainer.rating}</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${s.color}18` }]}>
                <Ionicons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Bio */}
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bio}>{trainer.bio}</Text>

        {/* Specialisations */}
        <Text style={styles.sectionTitle}>Expertise</Text>
        <View style={styles.tagsWrap}>
          {trainer.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Ionicons name="checkmark" size={13} color={COLORS.secondary} />
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        {/* What to expect */}
        <Text style={styles.sectionTitle}>What to Expect</Text>
        {[
          'Personalised workout programming based on your goals.',
          'Regular progress tracking and form correction.',
          'Nutritional guidance aligned to your training phase.',
          'Flexible scheduling – morning and evening slots available.',
        ].map((point, i) => (
          <View key={i} style={styles.pointRow}>
            <View style={styles.pointDot} />
            <Text style={styles.pointText}>{point}</Text>
          </View>
        ))}

        {/* Availability */}
        <View style={[
          styles.availBanner,
          trainer.available ? styles.availActive : styles.availInactive
        ]}>
          <Ionicons
            name={trainer.available ? 'checkmark-circle-outline' : 'time-outline'}
            size={18}
            color={trainer.available ? COLORS.success : COLORS.warning}
          />
          <Text style={[styles.availText, { color: trainer.available ? COLORS.success : COLORS.warning }]}>
            {trainer.available
              ? 'Currently accepting new clients'
              : 'At full capacity – contact reception for waitlist'}
          </Text>
        </View>

        {/* Contact reception note */}
        <View style={styles.contactNote}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.secondary} />
          <Text style={styles.contactNoteText}>
            Trainer assignment is handled by the gym admin. To request this trainer, contact reception desk.
          </Text>
        </View>

        <View style={styles.contactBtnsRow}>
          <TouchableOpacity style={styles.callBtn}>
            <Ionicons name="call-outline" size={17} color={COLORS.white} />
            <Text style={styles.callBtnText}>Call Reception</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.waBtn}>
            <Ionicons name="logo-whatsapp" size={17} color={COLORS.white} />
            <Text style={styles.waBtnText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  hero: {
    paddingTop: 52, paddingHorizontal: 24, paddingBottom: 32,
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute', top: 52, left: 20, width: 42, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  avatar: {
    width: 88, height: 88, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { fontSize: 40, fontWeight: '900', color: COLORS.white },
  trainerName: { fontSize: 26, fontWeight: '900', color: COLORS.white, marginBottom: 4 },
  trainerSpec: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingNum: { fontSize: 14, fontWeight: '800', color: COLORS.white, marginLeft: 4 },

  // Content
  scroll: { padding: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    width: '47%', backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 14, alignItems: 'center', gap: 8,
  },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.white, marginBottom: 10 },
  bio: {
    fontSize: 14, color: COLORS.textSecondary, lineHeight: 22,
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.border, padding: 16, marginBottom: 22,
  },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: COLORS.secondaryGlow, borderRadius: 10, borderWidth: 1, borderColor: COLORS.secondaryBorder,
  },
  tagText: { fontSize: 13, fontWeight: '700', color: COLORS.secondary },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  pointDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.secondary,
    marginTop: 7, flexShrink: 0,
  },
  pointText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  availBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12,
    borderWidth: 1, marginTop: 16, marginBottom: 16,
  },
  availActive: { backgroundColor: COLORS.successLight, borderColor: `${COLORS.success}44` },
  availInactive: { backgroundColor: COLORS.warningLight, borderColor: `${COLORS.warning}44` },
  availText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  contactNote: {
    flexDirection: 'row', gap: 8, backgroundColor: COLORS.secondaryGlow,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.secondaryBorder,
    padding: 12, marginBottom: 14, alignItems: 'flex-start',
  },
  contactNoteText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  contactBtnsRow: { flexDirection: 'row', gap: 12 },
  callBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, paddingVertical: 13, gap: 8,
  },
  callBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  waBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(37,211,102,0.1)', borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(37,211,102,0.25)', paddingVertical: 13, gap: 8,
  },
  waBtnText: { fontSize: 13, fontWeight: '700', color: '#25D366' },
});
