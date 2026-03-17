import React, { useState } from 'react';
import { useAnnouncementStore } from '../../store/announcementStore';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { currentUser, membership, buildCoins, trainers, announcements, gymServices } from '../../constants/dummyData';

const RECEPTION_PHONE = '+919876543210';

const ANNOUNCEMENT_COLORS = ['#EF4444', '#3B82F6', '#EF4444', '#22C55E', '#A855F7'];

const SERVICE_COLORS = [
  { bg: COLORS.secondaryGlow, icon: COLORS.secondary },
  { bg: 'rgba(59,130,246,0.15)', icon: '#3B82F6' },
  { bg: 'rgba(34,197,94,0.15)', icon: '#22C55E' },
  { bg: 'rgba(168,85,247,0.15)', icon: '#A855F7' },
  { bg: 'rgba(245,158,11,0.15)', icon: '#F59E0B' },
];

const SERVICE_ICONS = ['barbell-outline', 'people-outline', 'nutrition-outline', 'water-outline', 'lock-closed-outline'];

const DUMMY_ANNOUNCEMENTS = [
  { id: 'a1', date: '23 Feb 2026', title: '🏆 Build Games — March Edition', body: 'Internal fitness competition. Register before 28 Feb.' },
  { id: 'a2', date: '21 Feb 2026', title: '⚡ New Equipment Arrived', body: 'Our new Hammer Strength racks are now ready in the strength zone.' },
  { id: 'a3', date: '20 Feb 2026', title: '🚨 Holiday Timings — Holi', body: 'Gym will be open from 6 AM to 12 PM only on March 14.' },
];

export default function HomeScreen({ navigation }) {
  const unreadCount = useAnnouncementStore((s) => s.unreadCount);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning,';
    if (h < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  const firstName = currentUser?.name?.split(' ')[0] || 'Arjun';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Radial glow */}
      <View style={styles.glowTop} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── TOP BAR ──────────────────────────────── */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{firstName} 💪</Text>
          </View>
          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.topBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => navigation.navigate('Profile')}
            >
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>{firstName.charAt(0)}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── MEMBERSHIP CARD ──────────────────────── */}
        <View style={styles.section}>
          <View style={styles.membershipCard}>
            <LinearGradient
              colors={['#1C1C1E', 'rgba(233,99,22,0.05)']}
              style={styles.membershipInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Row 1 */}
              <View style={styles.memRow1}>
                <View>
                  <Text style={styles.memLabel}>MEMBERSHIP TYPE</Text>
                  <View style={styles.memTypeRow}>
                    <Text style={styles.memType}>{membership?.type || 'ELITE'}</Text>
                    <View style={styles.activeBadge}>
                      <View style={styles.activeDot} />
                      <Text style={styles.activeText}>ACTIVE</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.memLogoBox}>
                  <Text style={styles.memLogoText}>B</Text>
                </View>
              </View>

              <View style={styles.memDivider} />

              {/* Row 2 */}
              <View style={styles.memRow2}>
                <View>
                  <Text style={styles.memLabel}>VALID TILL</Text>
                  <Text style={styles.memDate}>{membership?.validTill || '1 Jul 2026'}</Text>
                </View>
                <View style={styles.memDaysBox}>
                  <Text style={styles.memDaysNum}>{membership?.daysLeft || 128}</Text>
                  <Text style={styles.memDaysLabel}>days left</Text>
                </View>
              </View>

              {/* Action buttons */}
              <View style={styles.contactRow}>
                <TouchableOpacity
                  style={styles.contactBtn}
                  onPress={() => Linking.openURL(`tel:${RECEPTION_PHONE}`)}
                >
                  <Ionicons name="call-outline" size={16} color={COLORS.white} />
                  <Text style={styles.contactBtnText}>Call Reception</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contactBtn, styles.waBtn]}
                  onPress={() => Linking.openURL(`whatsapp://send?phone=${RECEPTION_PHONE}`)}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                  <Text style={[styles.contactBtnText, { color: '#25D366' }]}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* ── BUILD COINS BANNER ───────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.coinsStrip}
            onPress={() => navigation.navigate('BuildCoinTransactions')}
            activeOpacity={0.85}
          >
            <View style={styles.coinsLeft}>
              <View style={styles.coinIconWrap}>
                <Ionicons name="logo-bitcoin" size={20} color={COLORS.secondary} />
              </View>
              <View>
                <Text style={styles.coinsLabel}>BUILD COINS BALANCE</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={styles.coinsValue}>{(buildCoins?.balance || 2450).toLocaleString()}</Text>
                  <Text style={styles.coinsUnit}>coins</Text>
                </View>
              </View>
            </View>
            <View style={styles.coinsRight}>
              <TouchableOpacity style={styles.coinsAddBtn}>
                <Text style={styles.coinsAddText}>+ Add</Text>
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── STATS GRID ───────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('Activity')}
              activeOpacity={0.8}
            >
              <Ionicons name="flash-outline" size={26} color={COLORS.secondary} />
              <View style={{ marginTop: 'auto' }}>
                <Text style={styles.statLabel}>DAILY STREAK</Text>
                <Text style={styles.statValue}>12 Days</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('Activity')}
              activeOpacity={0.8}
            >
              <Ionicons name="barbell-outline" size={26} color={COLORS.secondary} />
              <View style={{ marginTop: 'auto' }}>
                <Text style={styles.statLabel}>WORKOUT</Text>
                <Text style={styles.statValue}>Chest Day</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── ANNOUNCEMENTS ─────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Announcements</Text>
            <View style={styles.announceBadge}>
              <Text style={styles.announceBadgeText}>{(announcements || []).length || 3}</Text>
            </View>
          </View>
          {(announcements || DUMMY_ANNOUNCEMENTS).map((a, i) => (
            <View key={a.id || i} style={styles.announceCard}>
              <View style={[styles.announceBorder, { backgroundColor: ANNOUNCEMENT_COLORS[i % ANNOUNCEMENT_COLORS.length] }]} />
              <View style={styles.announceContent}>
                <Text style={styles.announceDate}>{a.date}</Text>
                <Text style={styles.announceTitle}>{a.title}</Text>
                <Text style={styles.announceBody} numberOfLines={2}>{a.subtitle || a.body}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </View>
          ))}
        </View>

        {/* ── THIS WEEK ────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>This Week</Text>
          <View style={styles.weekGrid}>
            <TouchableOpacity style={styles.weekCard} onPress={() => navigation.navigate('Activity')}>
              <View style={[styles.weekIconWrap, { backgroundColor: COLORS.secondaryGlow }]}>
                <Ionicons name="flame-outline" size={22} color={COLORS.secondary} />
              </View>
              <Text style={[styles.weekValue, { color: COLORS.secondary }]}>5</Text>
              <Text style={styles.weekLabel}>Streak</Text>
              <Text style={styles.weekLink}>View details →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.weekCard} onPress={() => navigation.navigate('Activity')}>
              <View style={[styles.weekIconWrap, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                <Ionicons name="calendar-outline" size={22} color="#3B82F6" />
              </View>
              <Text style={[styles.weekValue, { color: '#3B82F6' }]}>18</Text>
              <Text style={styles.weekLabel}>This Month</Text>
              <Text style={styles.weekLink}>View details →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.weekCard} onPress={() => navigation.navigate('Leaderboard')}>
              <View style={[styles.weekIconWrap, { backgroundColor: 'rgba(168,85,247,0.15)' }]}>
                <Ionicons name="trophy-outline" size={22} color="#A855F7" />
              </View>
              <Text style={[styles.weekValue, { color: '#A855F7', fontSize: 18 }]}>Rank 3</Text>
              <Text style={styles.weekLabel}>Leaderboard</Text>
              <Text style={styles.weekLink}>View all →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── TRAINERS ─────────────────────────────── (UNCHANGED) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Our Trainers</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Trainers')} activeOpacity={0.7}>
              <Text style={styles.sectionSeeAll}>{trainers.length} trainers →</Text>
            </TouchableOpacity>
          </View>

          {trainers.slice(0, 3).map((trainer) => (
            <TouchableOpacity
              key={trainer.id}
              style={styles.trainerCard}
              onPress={() => navigation.navigate('TrainerDetail', { trainer })}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#2A1200', COLORS.secondaryDark, '#1A0800']}
                style={styles.trainerAvatarPanel}
              >
                <Text style={styles.trainerAvatarText}>{trainer.name.charAt(0)}</Text>
                <View style={[
                  styles.trainerAvailBadge,
                  { backgroundColor: trainer.available ? COLORS.success : COLORS.textMuted },
                ]}>
                  <Text style={styles.trainerAvailBadgeText}>
                    {trainer.available ? 'Available' : 'Full'}
                  </Text>
                </View>
              </LinearGradient>

              <View style={styles.trainerInfo}>
                <Text style={styles.trainerName} numberOfLines={1}>{trainer.name}</Text>
                <Text style={styles.trainerSpec} numberOfLines={1}>{trainer.specialisation}</Text>
                <View style={styles.trainerMetaRow}>
                  <View style={styles.trainerRatingRow}>
                    <Ionicons name="star" size={11} color={COLORS.secondary} />
                    <Text style={styles.trainerRating}>{trainer.rating}</Text>
                  </View>
                  <View style={styles.trainerDividerDot} />
                  <Text style={styles.trainerExp}>{trainer.experience}</Text>
                  <View style={styles.trainerDividerDot} />
                  <Text style={styles.trainerExp}>{trainer.clients} clients</Text>
                </View>
                <View style={styles.trainerTags}>
                  {trainer.tags.slice(0, 3).map((tag) => (
                    <View key={tag} style={styles.trainerTag}>
                      <Text style={styles.trainerTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── GYM SERVICES ─────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gym Services</Text>
            <Text style={styles.tapHint}>Tap for details</Text>
          </View>
          {(gymServices || []).map((svc, i) => (
            <TouchableOpacity
              key={svc.id}
              style={styles.serviceRow}
              onPress={() => {}}
              activeOpacity={0.75}
            >
              <View style={[styles.serviceIconWrap, { backgroundColor: SERVICE_COLORS[i % SERVICE_COLORS.length].bg }]}>
                <Ionicons name={SERVICE_ICONS[i % SERVICE_ICONS.length]} size={22} color={SERVICE_COLORS[i % SERVICE_COLORS.length].icon} />
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceTitle}>{svc.title}</Text>
                <Text style={styles.serviceDesc} numberOfLines={1}>{svc.shortDesc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#555" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 20 },

  // Announcements
  announceCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10,
    overflow: 'hidden',
  },
  announceBorder: { width: 3, alignSelf: 'stretch' },
  announceContent: { flex: 1, padding: 14, paddingLeft: 12 },
  announceDate: { fontSize: 9, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  announceTitle: { fontSize: 14, fontWeight: '800', color: COLORS.white, marginBottom: 3 },
  announceBody: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  announceBadge: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  announceBadgeText: { fontSize: 11, fontWeight: '900', color: '#fff' },

  // This Week
  weekGrid: { flexDirection: 'row', gap: 10 },
  weekCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.border, padding: 14, alignItems: 'center',
  },
  weekIconWrap: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  weekValue: { fontSize: 24, fontWeight: '900', lineHeight: 28, marginBottom: 4 },
  weekLabel: { fontSize: 9, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  weekLink: { fontSize: 10, color: COLORS.secondary, fontWeight: '600' },

  // Gym Services
  tapHint: { fontSize: 11, color: COLORS.textMuted },
  serviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.border, padding: 16, marginBottom: 8,
  },
  serviceIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  serviceInfo: { flex: 1 },
  serviceTitle: { fontSize: 14, fontWeight: '800', color: COLORS.white, marginBottom: 2 },
  serviceDesc: { fontSize: 11, color: COLORS.textMuted },

  glowTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 260,
    backgroundColor: 'transparent',
    // Simulated with a very faint overlay
  },

  // Top bar
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 24,
  },
  greeting: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  userName: { fontSize: 24, fontWeight: '900', color: COLORS.white },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topBtn: { position: 'relative', padding: 8 },
  notifBadge: {
    position: 'absolute', top: 4, right: 4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1.5, borderColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff' },
  avatarBtn: {},
  avatarBox: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: COLORS.white },

  // Section
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white, flex: 1 },
  sectionSeeAll: { fontSize: 13, color: COLORS.secondary, fontWeight: '700' },

  // Membership
  membershipCard: {
    borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border,
  },
  membershipInner: { padding: 20 },
  memRow1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  memLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2, marginBottom: 4 },
  memTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memType: { fontSize: 30, fontWeight: '900', color: COLORS.white, letterSpacing: 1 },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  activeText: { fontSize: 9, fontWeight: '900', color: '#22C55E', letterSpacing: 1.5 },
  memLogoBox: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  memLogoText: { fontSize: 20, fontWeight: '900', color: COLORS.white },
  memDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 16 },
  memRow2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 },
  memDate: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  memDaysBox: { alignItems: 'flex-end' },
  memDaysNum: { fontSize: 28, fontWeight: '900', color: COLORS.secondary, lineHeight: 32 },
  memDaysLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 1 },
  contactRow: { flexDirection: 'row', gap: 10 },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(112,112,112,0.4)',
    backgroundColor: 'rgba(255,255,255,0.04)', gap: 6,
  },
  waBtn: { borderColor: 'rgba(37,211,102,0.35)', backgroundColor: 'rgba(37,211,102,0.06)' },
  contactBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.white },

  // Coins
  coinsStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.secondaryBorder, paddingHorizontal: 16, paddingVertical: 14,
  },
  coinsLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coinIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.secondaryGlow,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.secondaryBorder,
  },
  coinsLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2, marginBottom: 2 },
  coinsValue: { fontSize: 20, fontWeight: '900', color: COLORS.white },
  coinsUnit: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  coinsRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coinsAddBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.secondary, backgroundColor: 'transparent',
  },
  coinsAddText: { fontSize: 13, fontWeight: '700', color: COLORS.secondary },

  // Stats grid
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: 'rgba(28,28,30,0.5)', borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.border, padding: 16, height: 128,
  },
  statLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.white },

  // Trainers (UNCHANGED)
  trainerCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 18, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 10, overflow: 'hidden',
  },
  trainerAvatarPanel: {
    width: 110, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 8,
  },
  trainerAvatarText: { fontSize: 32, fontWeight: '900', color: COLORS.white },
  trainerAvailBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  trainerAvailBadgeText: { fontSize: 8, fontWeight: '800', color: COLORS.white, letterSpacing: 0.5 },
  trainerInfo: { flex: 1, padding: 14 },
  trainerName: { fontSize: 14, fontWeight: '800', color: COLORS.white, marginBottom: 2 },
  trainerSpec: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16, marginBottom: 8 },
  trainerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  trainerRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trainerRating: { fontSize: 11, fontWeight: '700', color: COLORS.white },
  trainerDividerDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.textMuted },
  trainerExp: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  trainerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  trainerTag: {
    backgroundColor: COLORS.secondaryGlow, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
    borderWidth: 1, borderColor: COLORS.secondaryBorder,
  },
  trainerTagText: { fontSize: 8, fontWeight: '700', color: COLORS.secondary, letterSpacing: 0.5 },
});
