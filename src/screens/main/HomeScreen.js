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
  Modal,
  Linking,
  Pressable,
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
  gymServices,
} from '../../constants/dummyData';

const RECEPTION_PHONE = '+919876543210'; // replace with actual number

const { width } = Dimensions.get('window');

const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const today = new Date();

export default function HomeScreen({ navigation }) {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

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
              onPress={() => setSelectedAnnouncement(ann)}
              activeOpacity={0.8}
            >
              <View style={[styles.annAccent, { backgroundColor: getAnnouncementColor(ann.type) }]} />
              <View style={styles.annContent}>
                <Text style={styles.annTitle}>{ann.title}</Text>
                <Text style={styles.annSubtitle}>
                  {ann.subtitle}
                </Text>
                <Text style={styles.annDate}>{ann.date}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
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

          {trainers.map((trainer) => (
            <TouchableOpacity
              key={trainer.id}
              style={styles.trainerCard}
              onPress={() => navigation.navigate('TrainerDetail', { trainer })}
              activeOpacity={0.85}
            >
              {/* Left gradient avatar panel */}
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

              {/* Right info */}
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

        {/* ── QUICK STATS ──────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('Activity')}
              activeOpacity={0.8}
            >
              <Ionicons name="flame-outline" size={28} color={COLORS.secondary} />
              <Text style={styles.statNum}>5</Text>
              <Text style={styles.statLabel}>Streak</Text>
              <Text style={styles.statTap}>View details →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('Activity')}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={28} color="#2196F3" />
              <Text style={[styles.statNum, { color: '#2196F3' }]}>18</Text>
              <Text style={styles.statLabel}>This Month</Text>
              <Text style={styles.statTap}>View details →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('Leaderboard')}
              activeOpacity={0.8}
            >
              <Ionicons name="trophy-outline" size={28} color="#9C27B0" />
              <Text style={[styles.statNum, { color: '#9C27B0' }]}>Rank 3</Text>
              <Text style={styles.statLabel}>Leaderboard</Text>
              <Text style={styles.statTap}>View all →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── GYM SERVICES ─────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gym Services</Text>
            <Text style={styles.sectionSeeAll}>Tap for details</Text>
          </View>

          {gymServices.map((svc) => (
            <TouchableOpacity
              key={svc.id}
              style={styles.serviceCard}
              onPress={() => setSelectedService(svc)}
              activeOpacity={0.8}
            >
              <View style={[styles.svcIcon, { backgroundColor: `${svc.color}18` }]}>
                <Ionicons name={svc.icon} size={22} color={svc.color} />
              </View>
              <View style={styles.svcContent}>
                <Text style={styles.svcTitle}>{svc.title}</Text>
                <Text style={styles.svcDesc}>{svc.shortDesc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── ANNOUNCEMENT MODAL ───────────────────────────── */}
      <Modal
        visible={!!selectedAnnouncement}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAnnouncement(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedAnnouncement(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            {selectedAnnouncement && (
              <>
                <View style={styles.modalHandle} />
                <View style={[
                  styles.modalAccentBar,
                  { backgroundColor: getAnnouncementColor(selectedAnnouncement.type) }
                ]} />
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalBadge}>{selectedAnnouncement.type.toUpperCase()}</Text>
                  <TouchableOpacity onPress={() => setSelectedAnnouncement(null)}>
                    <Ionicons name="close" size={22} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalTitle}>{selectedAnnouncement.title}</Text>
                <Text style={styles.modalDate}>{selectedAnnouncement.date}</Text>
                <Text style={styles.modalBody}>{selectedAnnouncement.subtitle}</Text>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── SERVICE MODAL ────────────────────────────────── */}
      <Modal
        visible={!!selectedService}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedService(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedService(null)}>
          <Pressable style={styles.modalSheetLarge} onPress={() => {}}>
            {selectedService && (
              <>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeaderRow}>
                  <View style={styles.modalServiceIconWrap}>
                    <View style={[styles.svcIcon, { backgroundColor: `${selectedService.color}22` }]}>
                      <Ionicons name={selectedService.icon} size={22} color={selectedService.color} />
                    </View>
                    <Text style={styles.modalTitle}>{selectedService.title}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedService(null)}>
                    <Ionicons name="close" size={22} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                  <Text style={styles.modalBody}>{selectedService.details}</Text>
                  <Text style={styles.modalContactLabel}>To enquire or book:</Text>
                  <View style={styles.modalContactRow}>
                    <TouchableOpacity
                      style={styles.modalCallBtn}
                      onPress={() => Linking.openURL(`tel:${RECEPTION_PHONE}`)}
                    >
                      <Ionicons name="call-outline" size={18} color={COLORS.white} />
                      <Text style={styles.modalCallBtnText}>Call Reception</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalWaBtn}
                      onPress={() =>
                        Linking.openURL(`whatsapp://send?phone=${RECEPTION_PHONE}`)
                      }
                    >
                      <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                      <Text style={styles.modalWaBtnText}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ height: 30 }} />
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  trainerCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 18, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 12, overflow: 'hidden',
  },
  trainerAvatarPanel: {
    width: 80, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, gap: 8,
  },
  trainerAvatarText: { fontSize: 28, fontWeight: '900', color: COLORS.white },
  trainerAvailBadge: {
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  trainerAvailBadgeText: { fontSize: 8, fontWeight: '800', color: COLORS.white, letterSpacing: 0.5 },
  trainerInfo: { flex: 1, padding: 14 },
  trainerName: { fontSize: 15, fontWeight: '800', color: COLORS.white, marginBottom: 3 },
  trainerSpec: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16, marginBottom: 8 },
  trainerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  trainerRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trainerRating: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  trainerDividerDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.textMuted },
  trainerExp: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  trainerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
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
  statTap: { fontSize: 9, color: COLORS.secondary, fontWeight: '700', marginTop: 2 },

  // Services
  serviceCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, gap: 12,
  },
  svcIcon: {
    width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  svcContent: { flex: 1 },
  svcTitle: { fontSize: 14, fontWeight: '700', color: COLORS.white, marginBottom: 3 },
  svcDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },

  // Modal shared
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end',
  },
  modalHandle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, marginBottom: 16,
  },
  modalSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, borderWidth: 1, borderColor: COLORS.border,
  },
  modalSheetLarge: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '80%', borderWidth: 1, borderColor: COLORS.border,
  },
  modalAccentBar: {
    height: 3, borderRadius: 2, marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  modalServiceIconWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  modalBadge: {
    fontSize: 10, fontWeight: '800', color: COLORS.secondary,
    backgroundColor: COLORS.secondaryGlow, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, borderColor: COLORS.secondaryBorder, letterSpacing: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.white, flex: 1 },
  modalDate: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 12 },
  modalBody: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 16 },
  modalScroll: { flexShrink: 1 },
  modalContactLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700', marginBottom: 10, letterSpacing: 0.5 },
  modalContactRow: { flexDirection: 'row', gap: 12 },
  modalCallBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 12, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  modalCallBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  modalWaBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 12,
    backgroundColor: 'rgba(37,211,102,0.1)', borderWidth: 1,
    borderColor: 'rgba(37,211,102,0.25)', gap: 8,
  },
  modalWaBtnText: { fontSize: 14, fontWeight: '700', color: '#25D366' },
});
