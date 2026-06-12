import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Image, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';
import { useAnnouncementStore } from '../../store/announcementStore';
import { useAuthStore } from '../../store/authStore';
import { useWalletStore } from '../../store/walletStore';
import { fetchAnnouncements } from '../../services/announcementService';
import { getSocket } from '../../services/socketService';
import { fetchTodaysPlan, fetchStreak } from '../../services/workoutService';
import { getMyLeaderboardStats } from '../../services/leaderboardService';
import ActiveOrderBar from '../../components/ActiveOrderBar';

// Mockup accent palette (kept as literals — multi-colour KPI / quick-access tiles).
const AMBER = '#F59E0B';
const GOLD  = '#FFD700';
const CYAN  = '#00CED1';
const SILVER = '#C8C6C8';
const GREEN = '#4ADE80';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Quick-access tiles → real routes.
const QUICK = [
  { label: 'ACTIVITIES', icon: 'barbell-outline',    color: '#00BCD4', route: 'Activities' },
  { label: 'CAFE',       icon: 'cafe-outline',        color: '#FFA000', route: 'Cafe' },
  { label: 'RANKING',    icon: 'podium-outline',      color: GOLD,      route: 'Leaderboard' },
  { label: 'COMMUNITY',  icon: 'chatbubbles-outline', color: '#9C27B0', route: 'Community' },
  { label: 'TRAINERS',   icon: 'body-outline',        color: '#4CAF50', route: 'Trainers' },
  { label: 'BLOGS',      icon: 'book-outline',        color: '#4A90D9', route: 'BlogList' },
];

// Dummy 7-day calorie bar heights (no calories service yet).
const CAL_BARS = [
  { h: 0.60, c: 'purple' },
  { h: 0.40, c: 'purple' },
  { h: 0.85, c: 'mix' },
  { h: 0.75, c: 'mix' },
  { h: 0.35, c: 'dim' },
  { h: 0.25, c: 'dim' },
  { h: 0.15, c: 'dim' },
];

export default function HomeScreen({ navigation }) {
  const unreadCount = useAnnouncementStore((s) => s.unreadCount);
  const user = useAuthStore((s) => s.user);
  const { balance, fetchBalance, setBalance } = useWalletStore();

  const [announcement, setAnnouncement] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [todaysPlan, setTodaysPlan] = useState(null);
  const [streakData, setStreakData] = useState(null);
  const [leaderboardStats, setLeaderboardStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Live wallet balance (fetch + socket).
  useEffect(() => {
    fetchBalance();
    if (user?.id) {
      const socket = getSocket();
      socket.emit('join:wallet', user.id);
      socket.on('wallet:balance_updated', ({ balance: newBalance }) => setBalance(newBalance));
      return () => { socket.off('wallet:balance_updated'); };
    }
  }, [user?.id]);

  const loadContent = useCallback(async () => {
    await Promise.all([
      fetchAnnouncements({ limit: 1 })
        .then((res) => setAnnouncement(res.data?.[0] || null))
        .catch(() => setAnnouncement(null)),
      fetchTodaysPlan()
        .then((data) => setTodaysPlan(data || null))
        .catch(() => setTodaysPlan(null)),
      fetchStreak()
        .then((data) => setStreakData(data || null))
        .catch(() => setStreakData(null)),
      getMyLeaderboardStats()
        .then((data) => setLeaderboardStats(data || null))
        .catch(() => setLeaderboardStats(null)),
    ]);
  }, []);

  useEffect(() => { loadContent(); }, [loadContent]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchBalance(), loadContent()]);
    setRefreshing(false);
  }, [fetchBalance, loadContent]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'GOOD MORNING';
    if (h < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  const firstName = user?.firstName || user?.fullName?.split(' ')[0] || 'Athlete';

  // ── Derived display values ────────────────────────────────────────────────
  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayDow = (now.getDay() + 6) % 7; // Mon=0 … Sun=6
  const monday = new Date(now);
  monday.setDate(now.getDate() - todayDow);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { date: d.getDate(), isToday: i === todayDow, attended: i < todayDow }; // attended = dummy/visual
  });

  const currentStreak = streakData?.currentStreak ?? 14;
  const longestStreak = streakData?.longestStreak ?? 21;
  const clubRank = leaderboardStats?.rank ? `#${leaderboardStats.rank}` : '#42';

  const planName = todaysPlan?.name || 'Rest Day';
  const planCoach = todaysPlan?.assignedByName || todaysPlan?.coachName || 'Coach Kaito';
  const planExercises = (todaysPlan?.exercises || [])
    .slice(0, 3)
    .map((e) => e.name || e.exerciseName)
    .filter(Boolean)
    .join(' × ') || 'Deadlift × Weighted Pull-ups × Barbell Rows';

  const showBanner = announcement && !bannerDismissed;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Radial purple glow at top */}
      <LinearGradient
        colors={['rgba(127,41,130,0.15)', 'transparent']}
        style={styles.glow}
        pointerEvents="none"
      />

      {/* ── TOP APP BAR ─────────────────────────── */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{firstName}</Text>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.topBtn} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.textSecondary} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')}>
            {user?.profilePhotoUrl ? (
              <Image source={{ uri: user.profilePhotoUrl }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarImg, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{firstName.charAt(0)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} />
        }
      >
        {/* ── ANNOUNCEMENT BANNER ─────────────────── */}
        {showBanner && (
          <View style={styles.banner}>
            <View style={styles.bannerLeft}>
              <Ionicons name="megaphone" size={18} color="#000" />
              <Text style={styles.bannerText} numberOfLines={2}>
                {announcement.title || announcement.subtitle || announcement.body}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setBannerDismissed(true)} hitSlop={8}>
              <Ionicons name="close" size={18} color="#000" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── WEEKLY OVERVIEW STRIP ────────────────── */}
        <View style={styles.weekCard}>
          <View style={styles.weekHeader}>
            <View>
              <Text style={styles.eyebrow}>WEEKLY OVERVIEW</Text>
              <Text style={styles.weekMonth}>{monthLabel}</Text>
            </View>
            <View style={styles.streakChip}>
              <Text style={styles.streakChipText}>🔥 {currentStreak} DAY STREAK</Text>
            </View>
          </View>
          <View style={styles.weekRow}>
            {weekDays.map((d, i) => (
              <View key={i} style={styles.weekDay}>
                <Text style={[styles.weekDow, d.isToday && { color: COLORS.primaryLight }]}>{DOW[i]}</Text>
                {d.isToday ? (
                  <View style={styles.weekToday}>
                    <Ionicons name="flame" size={16} color="#000" />
                  </View>
                ) : d.attended ? (
                  <View style={styles.weekAttended}>
                    <Text style={styles.weekAttendedNum}>{String(d.date).padStart(2, '0')}</Text>
                  </View>
                ) : (
                  <View style={styles.weekFuture}>
                    <Text style={styles.weekFutureNum}>{d.date}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* ── KPI GRID ─────────────────────────────── */}
        <View style={styles.kpiGrid}>
          <KpiCard label="LONGEST STREAK" value={`${longestStreak} Days`} icon="flame" color={COLORS.primaryLight} />
          <KpiCard label="THIS MONTH" value="8 Visits" icon="calendar" color={CYAN} />
          <KpiCard label="CLUB RANK" value={clubRank} icon="trophy" color={GOLD} />
          <KpiCard label="POINTS" value="1,240" icon="diamond" color={SILVER} />
        </View>

        {/* ── CALORIES BURNED (dummy) ──────────────── */}
        <View style={styles.calCard}>
          <View style={styles.calHeader}>
            <View>
              <Text style={styles.eyebrow}>CALORIES BURNED</Text>
              <Text style={styles.calValue}>2,840 <Text style={styles.calUnit}>kcal</Text></Text>
            </View>
            <Text style={styles.calDelta}>+12% vs last week</Text>
          </View>
          <View style={styles.calChart}>
            {CAL_BARS.map((b, i) => {
              const colors = b.c === 'purple'
                ? ['rgba(167,139,250,0.4)', 'rgba(167,139,250,0.85)']
                : b.c === 'mix'
                  ? ['rgba(167,139,250,0.4)', CYAN]
                  : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.12)'];
              return (
                <View key={i} style={styles.calBarSlot}>
                  <LinearGradient
                    colors={colors}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 0, y: 0 }}
                    style={[styles.calBar, { height: `${b.h * 100}%` }]}
                  />
                </View>
              );
            })}
          </View>
          <View style={styles.calLabels}>
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d, i) => (
              <Text key={d} style={[styles.calLabel, i === 3 && { color: COLORS.white }]}>{d}</Text>
            ))}
          </View>
        </View>

        {/* ── BUILD COINS CARD ─────────────────────── */}
        <TouchableOpacity
          style={styles.coinsCard}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('BuildCoinTransactions')}
        >
          <View style={styles.coinsLeft}>
            <View style={styles.coinsIcon}>
              <Ionicons name="ellipse" size={22} color={GOLD} />
            </View>
            <View>
              <Text style={styles.coinsLabel}>BUILD COINS</Text>
              <Text style={styles.coinsValue}>{(balance ?? 0).toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.coinsRight}>
            <Text style={styles.coinsHint}>Tap to view transactions</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </View>
        </TouchableOpacity>

        {/* ── QUICK ACCESS GRID ────────────────────── */}
        <View style={styles.quickGrid}>
          {QUICK.map((q) => (
            <TouchableOpacity
              key={q.label}
              style={styles.quickTile}
              activeOpacity={0.85}
              onPress={() => navigation.navigate(q.route)}
            >
              <Ionicons name={q.icon} size={26} color={q.color} />
              <Text style={styles.quickLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── TODAY'S WORKOUT ──────────────────────── */}
        <TouchableOpacity
          style={styles.workoutCard}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('WorkoutHome')}
        >
          <View>
            <Text style={styles.workoutEyebrow}>TODAY'S WORKOUT</Text>
            <Text style={styles.workoutCoach}>Assigned by {planCoach}</Text>
          </View>
          <View style={{ marginTop: 8 }}>
            <Text style={styles.workoutTitle}>{planName}</Text>
            <Text style={styles.workoutMeta}>55 min / High Intensity</Text>
          </View>
          <View style={styles.workoutFooter}>
            <Text style={styles.workoutExercises} numberOfLines={1}>{planExercises}</Text>
            <View style={styles.workoutLink}>
              <Text style={styles.workoutLinkText}>VIEW WORKOUT</Text>
              <Ionicons name="arrow-forward" size={12} color={COLORS.primaryLight} />
            </View>
          </View>
        </TouchableOpacity>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Active café order strip (relocated from the old tab bar) */}
      <View style={styles.orderBarWrap} pointerEvents="box-none">
        <ActiveOrderBar navigation={navigation} />
      </View>

      {/* ── STICKY CHECK-IN FAB ──────────────────── */}
      <View style={styles.fabWrap} pointerEvents="box-none">
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Access')}>
          <LinearGradient
            colors={[COLORS.primary, '#923a93']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Ionicons name="qr-code-outline" size={30} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.fabLabel}>CHECK IN</Text>
      </View>
    </View>
  );
}

function KpiCard({ label, value, icon, color }) {
  return (
    <View style={[styles.kpiCard, { borderTopColor: color + '4D' }]}>
      <View style={styles.kpiHeader}>
        <Text style={styles.eyebrow}>{label}</Text>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },

  // Top app bar
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
  },
  greeting: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textSecondary, letterSpacing: 2 },
  userName: { fontFamily: FONTS.headline, fontSize: 24, color: COLORS.white, marginTop: 2 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  topBtn: { padding: 2 },
  notifBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.primaryNeon, borderWidth: 1.5, borderColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  notifBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 9, color: '#fff' },
  avatarBtn: {},
  avatarImg: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primaryBorder },
  avatarFallback: { backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: FONTS.headline, fontSize: 18, color: COLORS.white },

  eyebrow: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted, letterSpacing: 1.5 },

  // Announcement banner
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: AMBER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
  },
  bannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 10 },
  bannerText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: '#000', flex: 1 },

  // Weekly overview
  weekCard: {
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 18, borderWidth: 1, borderColor: COLORS.primaryBorder,
    padding: 16, marginBottom: 16, gap: 14,
  },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weekMonth: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white, marginTop: 2 },
  streakChip: {
    backgroundColor: COLORS.primarySoft, borderWidth: 1, borderColor: COLORS.primaryBorder,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
  },
  streakChipText: { fontFamily: FONTS.bodyBold, fontSize: 10, color: COLORS.primaryLight },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weekDay: { alignItems: 'center', gap: 8 },
  weekDow: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted },
  weekToday: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: AMBER,
    alignItems: 'center', justifyContent: 'center',
  },
  weekAttended: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: AMBER,
    alignItems: 'center', justifyContent: 'center',
  },
  weekAttendedNum: { fontFamily: FONTS.bodyBold, fontSize: 11, color: '#000' },
  weekFuture: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  weekFutureNum: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted },

  // KPI grid
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  kpiCard: {
    width: '47%', flexGrow: 1, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border, borderTopWidth: 2, padding: 16, gap: 10,
  },
  kpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiValue: { fontFamily: FONTS.headline, fontSize: 22 },

  // Calories
  calCard: {
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 18, borderWidth: 1, borderColor: COLORS.primaryBorder,
    padding: 18, marginBottom: 16, gap: 16,
  },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  calValue: { fontFamily: FONTS.headline, fontSize: 22, color: COLORS.white, marginTop: 2 },
  calUnit: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },
  calDelta: { fontFamily: FONTS.label, fontSize: 10, color: GREEN },
  calChart: { height: 120, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  calBarSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  calBar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  calLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  calLabel: { fontFamily: FONTS.label, fontSize: 8, color: COLORS.textMuted, flex: 1, textAlign: 'center' },

  // Build Coins
  coinsCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1C1917', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
    padding: 18, marginBottom: 16,
  },
  coinsLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  coinsIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  coinsLabel: { fontFamily: FONTS.label, fontSize: 10, color: 'rgba(255,215,0,0.6)', letterSpacing: 1.5 },
  coinsValue: { fontFamily: FONTS.headline, fontSize: 28, color: COLORS.white, marginTop: 2 },
  coinsRight: { alignItems: 'flex-end', gap: 2 },
  coinsHint: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.textMuted, opacity: 0.5 },

  // Quick access
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  quickTile: {
    width: '30%', flexGrow: 1, aspectRatio: 1.15, backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 18, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  quickLabel: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textSecondary, letterSpacing: 1 },

  // Today's workout
  workoutCard: {
    backgroundColor: '#1E1E2E', borderRadius: 18, borderLeftWidth: 2, borderLeftColor: '#00BCD4',
    padding: 18, gap: 14,
  },
  workoutEyebrow: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted, letterSpacing: 2 },
  workoutCoach: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted, opacity: 0.6, marginTop: 4 },
  workoutTitle: { fontFamily: FONTS.headline, fontSize: 22, color: COLORS.white },
  workoutMeta: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  workoutFooter: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12, gap: 10 },
  workoutExercises: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted, opacity: 0.6, letterSpacing: 0.5 },
  workoutLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  workoutLinkText: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.primaryLight, letterSpacing: 1 },

  // Active order bar (sits above the FAB)
  orderBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 96 },

  // Sticky Check-In FAB
  fabWrap: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center', gap: 8 },
  fab: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,159,251,0.5)',
  },
  fabLabel: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.white, opacity: 0.6, letterSpacing: 2 },
});
