import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import {
  currentUser,
  membership,
  buildCoins,
  announcements,
  trainers,
} from '../../constants/dummyData';

const { width } = Dimensions.get('window');

const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const today = new Date();

export default function HomeScreen({ navigation }) {
  const [expandedAnnouncement, setExpandedAnnouncement] = useState(null);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getMembershipColor = () => {
    if (membership.status === 'ACTIVE') return COLORS.success;
    if (membership.status === 'EXPIRING') return COLORS.warning;
    return COLORS.error;
  };

  const getAnnouncementColor = (type) => {
    if (type === 'alert') return COLORS.error;
    if (type === 'event') return COLORS.secondary;
    return '#2196F3';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── HEADER ──────────────────────────────────────── */}
        <LinearGradient
          colors={['#1A0800', '#0D0D0D']}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>{currentUser.name.split(' ')[0]} 💪</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
                <View style={styles.notifDot} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.avatarBtn}
                onPress={() => navigation.navigate('Profile')}
              >
                <LinearGradient
                  colors={[COLORS.secondary, COLORS.secondaryDark]}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarText}>
                    {currentUser.name.charAt(0)}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── MEMBERSHIP CARD ─────────────────────────── */}
          <View style={styles.membershipCard}>
            <LinearGradient
              colors={['#1E0A00', '#2A1200', '#1A0800']}
              style={styles.membershipCardInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Top row */}
              <View style={styles.memRow1}>
                <View>
                  <Text style={styles.memLabel}>MEMBERSHIP TYPE</Text>
                  <View style={styles.memTypeRow}>
                    <Text style={styles.memType}>{membership.type}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${getMembershipColor()}22` }]}>
                      <View style={[styles.statusDot, { backgroundColor: getMembershipColor() }]} />
                      <Text style={[styles.statusText, { color: getMembershipColor() }]}>
                        {membership.status}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.memLogoMark}>
                  <Text style={styles.memLogoMarkText}>B</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.memDivider} />

              {/* Dates */}
              <View style={styles.memRow2}>
                <View>
                  <Text style={styles.memLabel}>VALID TILL</Text>
                  <Text style={styles.memDate}>
                    {new Date(membership.validTill).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.memDaysBox}>
                  <Text style={styles.memDaysNum}>{membership.daysLeft}</Text>
                  <Text style={styles.memDaysLabel}>days left</Text>
                </View>
              </View>

              {/* Contact buttons */}
              <View style={styles.contactRow}>
                <TouchableOpacity style={styles.contactBtn}>
                  <Ionicons name="call-outline" size={14} color={COLORS.white} />
                  <Text style={styles.contactBtnText}>Call Reception</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.contactBtn, styles.waBtn]}>
                  <Ionicons name="logo-whatsapp" size={14} color={COLORS.white} />
                  <Text style={styles.contactBtnText}>WhatsApp</Text>
                </TouchableOpacity>
              </View>

              {/* Decorative dots */}
              <View style={styles.cardDots}>
                {[...Array(5)].map((_, i) => (
                  <View key={i} style={styles.cardDot} />
                ))}
              </View>
            </LinearGradient>
          </View>
        </LinearGradient>

        {/* ── BUILD COINS STRIP ───────────────────────────── */}
        <TouchableOpacity
          style={styles.coinsStrip}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.secondaryGlow, 'transparent']}
            style={styles.coinsBg}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
          />
          <View style={styles.coinsLeft}>
            <View style={styles.coinIconWrap}>
              <MaterialCommunityIcons name="bitcoin" size={22} color={COLORS.secondary} />
            </View>
            <View>
              <Text style={styles.coinsLabel}>BUILD COINS BALANCE</Text>
              <Text style={styles.coinsValue}>
                {buildCoins.balance.toLocaleString('en-IN')}
                <Text style={styles.coinsUnit}> coins</Text>
              </Text>
            </View>
          </View>
          <View style={styles.coinsRight}>
            <TouchableOpacity style={styles.coinsAddBtn}>
              <Ionicons name="add" size={16} color={COLORS.secondary} />
              <Text style={styles.coinsAddText}>Add</Text>
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </View>
        </TouchableOpacity>

        {/* ── ANNOUNCEMENTS ───────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Announcements</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{announcements.length}</Text>
            </View>
          </View>

          {announcements.map((ann) => (
            <TouchableOpacity
              key={ann.id}
              style={[
                styles.announcementCard,
                ann.urgent && styles.announcementCardUrgent,
              ]}
              onPress={() =>
                setExpandedAnnouncement(expandedAnnouncement === ann.id ? null : ann.id)
              }
              activeOpacity={0.8}
            >
              <View style={[styles.annAccent, { backgroundColor: getAnnouncementColor(ann.type) }]} />
              <View style={styles.annContent}>
                <Text style={styles.annTitle}>{ann.title}</Text>
                <Text style={styles.annSubtitle} numberOfLines={expandedAnnouncement === ann.id ? undefined : 1}>
                  {ann.subtitle}
                </Text>
                <Text style={styles.annDate}>{ann.date}</Text>
              </View>
              <Ionicons
                name={expandedAnnouncement === ann.id ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── TRAINERS ─────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Our Trainers</Text>
            <Text style={styles.sectionSeeAll}>
              {trainers.length} trainers
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trainersScroll}
          >
            {trainers.map((trainer) => (
              <TouchableOpacity
                key={trainer.id}
                style={styles.trainerCard}
                onPress={() => navigation.navigate('TrainerDetail', { trainer })}
                activeOpacity={0.85}
              >
                {/* Avatar */}
                <View style={styles.trainerAvatarWrap}>
                  <LinearGradient
                    colors={['#2A1200', COLORS.secondaryDark]}
                    style={styles.trainerAvatar}
                  >
                    <Text style={styles.trainerAvatarText}>
                      {trainer.name.charAt(0)}
                    </Text>
                  </LinearGradient>
                  <View
                    style={[
                      styles.trainerAvailDot,
                      { backgroundColor: trainer.available ? COLORS.success : COLORS.textMuted },
                    ]}
                  />
                </View>

                <Text style={styles.trainerName} numberOfLines={1}>
                  {trainer.name}
                </Text>
                <Text style={styles.trainerSpec} numberOfLines={2}>
                  {trainer.specialisation}
                </Text>
                <Text style={styles.trainerExp}>{trainer.experience}</Text>

                {/* Rating */}
                <View style={styles.trainerRatingRow}>
                  <Ionicons name="star" size={12} color={COLORS.secondary} />
                  <Text style={styles.trainerRating}>{trainer.rating}</Text>
                </View>

                {/* Tags */}
                <View style={styles.trainerTags}>
                  {trainer.tags.slice(0, 2).map((tag) => (
                    <View key={tag} style={styles.trainerTag}>
                      <Text style={styles.trainerTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── QUICK STATS ──────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="flame-outline" size={28} color={COLORS.secondary} />
              <Text style={styles.statNum}>5</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="calendar-outline" size={28} color="#2196F3" />
              <Text style={[styles.statNum, { color: '#2196F3' }]}>18</Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="trophy-outline" size={28} color="#9C27B0" />
              <Text style={[styles.statNum, { color: '#9C27B0' }]}>Rank 3</Text>
              <Text style={styles.statLabel}>Leaderboard</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 20 },

  // Header
  headerGradient: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 28 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  userName: { fontSize: 24, fontWeight: '900', color: COLORS.white },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  notifDot: {
    position: 'absolute', top: 9, right: 9, width: 8, height: 8,
    borderRadius: 4, backgroundColor: COLORS.error, borderWidth: 1.5, borderColor: COLORS.background,
  },
  avatarBtn: { borderRadius: 14, overflow: 'hidden' },
  avatarGradient: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '900', color: COLORS.white },

  // Membership card
  membershipCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#3A1A00' },
  membershipCardInner: { padding: 20 },
  memRow1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  memLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2, marginBottom: 4 },
  memTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  memType: { fontSize: 26, fontWeight: '900', color: COLORS.white, letterSpacing: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, gap: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  memLogoMark: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,107,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  memLogoMarkText: { fontSize: 22, fontWeight: '900', color: COLORS.secondary },
  memDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 16 },
  memRow2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 },
  memDate: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  memDaysBox: { alignItems: 'flex-end' },
  memDaysNum: { fontSize: 32, fontWeight: '900', color: COLORS.secondary, lineHeight: 34 },
  memDaysLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 1 },
  contactRow: { flexDirection: 'row', gap: 10 },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 6,
  },
  waBtn: { backgroundColor: 'rgba(37,211,102,0.12)', borderColor: 'rgba(37,211,102,0.25)' },
  contactBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.white },
  cardDots: {
    position: 'absolute', right: 20, top: '50%',
    flexDirection: 'column', gap: 5,
  },
  cardDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,107,0,0.2)' },

  // Coins strip
  coinsStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginTop: 16, borderRadius: 16,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.secondaryBorder,
    paddingHorizontal: 16, paddingVertical: 14, overflow: 'hidden',
  },
  coinsBg: { ...StyleSheet.absoluteFillObject },
  coinsLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coinIconWrap: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.secondaryGlow,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.secondaryBorder,
  },
  coinsLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2, marginBottom: 2 },
  coinsValue: { fontSize: 20, fontWeight: '900', color: COLORS.white },
  coinsUnit: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  coinsRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coinsAddBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.secondaryBorder,
    backgroundColor: COLORS.secondaryGlow, gap: 4,
  },
  coinsAddText: { fontSize: 13, fontWeight: '700', color: COLORS.secondary },

  // Section
  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white, flex: 1 },
  sectionBadge: {
    backgroundColor: COLORS.secondary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
    minWidth: 22, alignItems: 'center',
  },
  sectionBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.white },
  sectionSeeAll: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },

  // Announcements
  announcementCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden', padding: 14,
  },
  announcementCardUrgent: {
    borderColor: `${COLORS.error}44`, backgroundColor: `${COLORS.error}08`,
  },
  annAccent: { width: 3, height: '100%', borderRadius: 2, marginRight: 12, minHeight: 40, alignSelf: 'stretch' },
  annContent: { flex: 1 },
  annTitle: { fontSize: 14, fontWeight: '700', color: COLORS.white, marginBottom: 3 },
  annSubtitle: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 4 },
  annDate: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },

  // Trainers
  trainersScroll: { paddingRight: 20, gap: 14 },
  trainerCard: {
    width: 160, backgroundColor: COLORS.surface, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border, padding: 16,
  },
  trainerAvatarWrap: { position: 'relative', marginBottom: 12, alignSelf: 'flex-start' },
  trainerAvatar: {
    width: 54, height: 54, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  trainerAvatarText: { fontSize: 24, fontWeight: '900', color: COLORS.white },
  trainerAvailDot: {
    position: 'absolute', bottom: 2, right: 2, width: 12, height: 12,
    borderRadius: 6, borderWidth: 2, borderColor: COLORS.surface,
  },
  trainerName: { fontSize: 15, fontWeight: '800', color: COLORS.white, marginBottom: 4 },
  trainerSpec: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16, marginBottom: 6 },
  trainerExp: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginBottom: 8 },
  trainerRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  trainerRating: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  trainerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  trainerTag: {
    backgroundColor: COLORS.secondaryGlow, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: COLORS.secondaryBorder,
  },
  trainerTagText: { fontSize: 9, fontWeight: '700', color: COLORS.secondary, letterSpacing: 0.5 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.border, padding: 16, alignItems: 'center', gap: 6,
  },
  statNum: { fontSize: 22, fontWeight: '900', color: COLORS.secondary },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textAlign: 'center' },
});
