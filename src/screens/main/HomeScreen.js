import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAnnouncementStore } from '../../store/announcementStore';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Linking, ActivityIndicator, Image, RefreshControl, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { gymServices } from '../../constants/dummyData';
import { useAuthStore } from '../../store/authStore';
import { useWalletStore } from '../../store/walletStore';
import { fetchAnnouncements } from '../../services/announcementService';
import { fetchTrainers, fetchMyTrainer, fetchTrialSessions, confirmTrialSession, rejectTrialSession } from '../../services/trainerService';
import { getSocket } from '../../services/socketService';
import { fetchMyMembership, resumeMembershipPause } from '../../services/membershipService';
import { fetchGymPresence } from '../../services/gymService';
import { fetchTodaysPlan, fetchStreak } from '../../services/workoutService';
import { getMyLeaderboardStats } from '../../services/leaderboardService';

// Fallback poll interval for gym presence count (socket is the primary update path).
const OCCUPANCY_POLL_MS = 60 * 1000; // 60 seconds

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

export default function HomeScreen({ navigation }) {
  const unreadCount = useAnnouncementStore((s) => s.unreadCount);
  const user = useAuthStore((s) => s.user);
  const { balance, fetchBalance, setBalance, transactions, fetchTransactions, isTxnLoading } = useWalletStore();

  const [announcements, setAnnouncements] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [myTrainer, setMyTrainer] = useState(null);
  const [trialSessions, setTrialSessions] = useState([]);
  const [trialActionId, setTrialActionId] = useState(null);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [loadingTrainers, setLoadingTrainers] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [membershipData, setMembershipData] = useState(null);
  const [todaysPlan, setTodaysPlan] = useState(null);
  const [streakData, setStreakData] = useState(null);
  const [leaderboardStats, setLeaderboardStats] = useState(null);
  const [occupancy, setOccupancy] = useState(null);
  const [resumingPause, setResumingPause] = useState(false);
  const occupancyTimer = useRef(null);

  useEffect(() => {
    // Load wallet balance + recent transactions on mount
    fetchBalance();
    fetchTransactions();

    // Subscribe to real-time wallet updates
    if (user?.id) {
      const socket = getSocket();
      socket.emit('join:wallet', user.id);
      socket.on('wallet:balance_updated', ({ balance: newBalance }) => {
        setBalance(newBalance);
        fetchTransactions(); // refresh recent list on any balance change
      });
      return () => {
        socket.off('wallet:balance_updated');
      };
    }
  }, [user?.id]);

  const loadContent = useCallback(async () => {
    await Promise.all([
      fetchAnnouncements({ limit: 3 })
        .then((res) => setAnnouncements(res.data || []))
        .catch(() => setAnnouncements([]))
        .finally(() => setLoadingAnnouncements(false)),
      fetchTrainers()
        .then((data) => setTrainers(data || []))
        .catch(() => setTrainers([]))
        .finally(() => setLoadingTrainers(false)),
      fetchMyTrainer()
        .then((data) => setMyTrainer(data || null))
        .catch(() => setMyTrainer(null)),
      fetchTrialSessions()
        .then((data) => setTrialSessions(data || []))
        .catch(() => setTrialSessions([])),
      fetchMyMembership()
        .then((data) => setMembershipData(data || null))
        .catch(() => setMembershipData(null)),
      fetchTodaysPlan()
        .then((data) => setTodaysPlan(data || null))
        .catch(() => setTodaysPlan(null)),
      fetchStreak()
        .then((data) => setStreakData(data || null))
        .catch(() => setStreakData(null)),
      getMyLeaderboardStats()
        .then((data) => setLeaderboardStats(data || null))
        .catch(() => setLeaderboardStats(null)),
      fetchGymPresence()
        .then((data) => setOccupancy(data || null))
        .catch(() => setOccupancy(null)),
    ]);
  }, []);

  useEffect(() => { loadContent(); }, [loadContent]);

  // Real-time gym presence updates via socket; poll every 60s as fallback.
  useEffect(() => {
    const socket = getSocket();
    const handler = ({ count }) => setOccupancy((prev) => ({ ...prev, count }));
    socket.on('gym:presence_updated', handler);

    occupancyTimer.current = setInterval(() => {
      fetchGymPresence()
        .then((data) => setOccupancy(data || null))
        .catch(() => {});
    }, OCCUPANCY_POLL_MS);

    return () => {
      socket.off('gym:presence_updated', handler);
      if (occupancyTimer.current) clearInterval(occupancyTimer.current);
    };
  }, []);

  const handleResumePause = useCallback(async (pauseId) => {
    if (!pauseId) return;
    setResumingPause(true);
    try {
      await resumeMembershipPause(pauseId);
      await loadContent();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to resume membership.');
    } finally {
      setResumingPause(false);
    }
  }, [loadContent]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchBalance(),
      fetchTransactions(),
      loadContent(),
    ]);
    setRefreshing(false);
  }, [fetchBalance, fetchTransactions, loadContent]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning,';
    if (h < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  const firstName = user?.firstName || user?.fullName?.split(' ')[0] || 'Athlete';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Radial glow */}
      <View style={styles.glowTop} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.secondary}
            colors={[COLORS.secondary]}
          />
        }
      >
        {/* ── TOP BAR ──────────────────────────────── */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{firstName}</Text>
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
              {user?.profilePhotoUrl ? (
                <Image source={{ uri: user.profilePhotoUrl }} style={styles.avatarBox} />
              ) : (
                <View style={styles.avatarBox}>
                  <Text style={styles.avatarText}>{firstName.charAt(0)}</Text>
                </View>
              )}
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
              {membershipData ? (() => {
                const { membership: mem, plan, totalDays, daysLeft, pause } = membershipData;
                const tierLabel  = plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1);
                const tierColors = { basic: '#6B7280', pro: '#3B82F6', elite: COLORS.secondary };
                const tierColor  = tierColors[plan.tier] ?? COLORS.secondary;
                const dayColor   = daysLeft > 30 ? '#22C55E' : daysLeft > 7 ? '#F59E0B' : '#EF4444';
                const progress   = Math.max(0.03, Math.min(1, daysLeft / totalDays));
                const validTill  = new Date(mem.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const isPaused     = !!pause?.isPaused;
                const currentPause = pause?.currentPause ?? null;
                const fmtShort = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                return (
                  <>
                    {/* Row 1 */}
                    <View style={styles.memRow1}>
                      <View>
                        <Text style={styles.memLabel}>MEMBERSHIP TYPE</Text>
                        <View style={styles.memTypeRow}>
                          <Text style={[styles.memType, { color: tierColor }]}>{tierLabel.toUpperCase()}</Text>
                          <View style={isPaused ? styles.pausedBadge : styles.activeBadge}>
                            <View style={[styles.activeDot, isPaused && styles.pausedDot]} />
                            <Text style={isPaused ? styles.pausedText : styles.activeText}>
                              {isPaused ? 'PAUSED' : 'ACTIVE'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={[styles.memLogoBox, { borderColor: tierColor + '40' }]}>
                        <Text style={[styles.memLogoText, { color: tierColor }]}>B</Text>
                      </View>
                    </View>

                    <View style={styles.memDivider} />

                    {/* Row 2 */}
                    <View style={styles.memRow2}>
                      <View>
                        <Text style={styles.memLabel}>VALID TILL</Text>
                        <Text style={styles.memDate}>{validTill}</Text>
                      </View>
                      <View style={styles.memDaysBox}>
                        <Text style={[styles.memDaysNum, { color: dayColor }]}>{daysLeft}</Text>
                        <Text style={styles.memDaysLabel}>days left</Text>
                      </View>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.memProgressBg}>
                      <View style={[styles.memProgressFill, { width: `${progress * 100}%`, backgroundColor: dayColor }]} />
                    </View>

                    {/* Paused banner + Resume */}
                    {isPaused && currentPause && (
                      <View style={styles.pausedBanner}>
                        <Ionicons name="pause-circle" size={22} color="#F59E0B" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pausedBannerTitle}>Membership Paused</Text>
                          <Text style={styles.pausedBannerSub}>
                            {fmtShort(currentPause.startDate)} → {fmtShort(currentPause.endDate)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.resumeBtn, resumingPause && { opacity: 0.6 }]}
                          onPress={() => handleResumePause(currentPause.id)}
                          disabled={resumingPause}
                        >
                          {resumingPause
                            ? <ActivityIndicator size="small" color="#000" />
                            : <Text style={styles.resumeBtnText}>Resume</Text>}
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                );
              })() : (
                /* No membership state */
                <TouchableOpacity
                  style={styles.noMemRow}
                  onPress={() => navigation.navigate('MembershipPlans')}
                >
                  <View>
                    <Text style={styles.memLabel}>MEMBERSHIP</Text>
                    <Text style={styles.memType}>No Active Plan</Text>
                    <Text style={styles.noMemSub}>Tap to view plans →</Text>
                  </View>
                  <View style={styles.memLogoBox}>
                    <Text style={styles.memLogoText}>B</Text>
                  </View>
                </TouchableOpacity>
              )}

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

        {/* ── LIVE GYM OCCUPANCY ───────────────────── */}
        {occupancy && (
          <View style={styles.section}>
            <View style={styles.occupancyCard}>
              <View style={styles.occupancyIconWrap}>
                <Ionicons name="people" size={22} color={COLORS.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.occupancyLabelRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.occupancyLabel}>IN THE GYM NOW</Text>
                </View>
                <View style={styles.occupancyValueRow}>
                  <Text style={styles.occupancyValue}>{occupancy.count}</Text>
                  <Text style={styles.occupancyUnit}>
                    {occupancy.capacity ? `of ${occupancy.capacity} capacity` : 'members'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── BUILD COINS CARD ─────────────────────── */}
        <View style={styles.section}>
          <View style={styles.coinsCard}>
            {/* Header row */}
            <TouchableOpacity
              style={styles.coinsCardHeader}
              onPress={() => navigation.navigate('BuildCoinTransactions')}
              activeOpacity={0.85}
            >
              <View style={styles.coinsLeft}>
                <View style={styles.coinIconWrap}>
                  <Ionicons name="logo-bitcoin" size={20} color={COLORS.secondary} />
                </View>
                <View>
                  <Text style={styles.coinsLabel}>BUILD COINS</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text style={styles.coinsValue}>{balance.toLocaleString()}</Text>
                    <Text style={styles.coinsUnit}>coins</Text>
                  </View>
                </View>
              </View>
              <View style={styles.coinsRight}>
                <TouchableOpacity
                  style={styles.coinsAddBtn}
                  onPress={() => navigation.navigate('BuildCoinTransactions')}
                >
                  <Text style={styles.coinsAddText}>+ Add</Text>
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </View>
            </TouchableOpacity>

            {/* Recent transactions */}
            {isTxnLoading && transactions.length === 0 ? (
              <View style={styles.coinsTxnLoading}>
                <ActivityIndicator size="small" color={COLORS.secondary} />
                <Text style={styles.coinsTxnLoadingText}>Loading transactions…</Text>
              </View>
            ) : transactions.length === 0 ? null : (
              <>
                <View style={styles.coinsDivider} />
                <View style={styles.coinsTxnHeader}>
                  <Text style={styles.coinsTxnTitle}>Recent Activity</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('BuildCoinTransactions')}>
                    <Text style={styles.coinsTxnSeeAll}>See all →</Text>
                  </TouchableOpacity>
                </View>
                {transactions.slice(0, 3).map((txn) => {
                  const isCredit = txn.transactionType === 'CREDIT' || txn.transactionType === 'REFUND';
                  const date = txn.createdAt
                    ? new Date(txn.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                    : '';
                  return (
                    <View key={txn.id} style={styles.coinsTxnRow}>
                      <View style={[styles.coinsTxnIcon, { backgroundColor: isCredit ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                        <Ionicons
                          name={isCredit ? 'add-circle-outline' : 'remove-circle-outline'}
                          size={18}
                          color={isCredit ? '#22C55E' : '#EF4444'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.coinsTxnName} numberOfLines={1}>{txn.itemName}</Text>
                        <Text style={styles.coinsTxnDate}>{date}</Text>
                      </View>
                      <Text style={[styles.coinsTxnAmount, { color: isCredit ? '#22C55E' : '#EF4444' }]}>
                        {isCredit ? '+' : '−'}{txn.coinAmount?.toLocaleString()} 🪙
                      </Text>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        </View>

        {/* ── YOUR TRAINER ─────────────────────────── */}
        {myTrainer && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Trainer</Text>
            </View>
            <TouchableOpacity
              style={styles.myTrainerCard}
              onPress={() => navigation.navigate('TrainerDetail', { trainer: myTrainer, isMyTrainer: true })}
              activeOpacity={0.85}
            >
              {/* Avatar */}
              {myTrainer.profilePhotoUrl ? (
                <Image
                  source={{ uri: myTrainer.profilePhotoUrl }}
                  style={styles.myTrainerAvatar}
                />
              ) : (
                <View style={[styles.myTrainerAvatar, styles.myTrainerAvatarFallback]}>
                  <Text style={styles.myTrainerAvatarLetter}>
                    {(myTrainer.name || 'T').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              {/* Info */}
              <View style={{ flex: 1 }}>
                <Text style={styles.trainerName}>{myTrainer.name}</Text>
                <Text style={styles.trainerSpec}>{myTrainer.specialisation}</Text>
                <Text style={styles.trainerRating}>★ {myTrainer.rating?.toFixed(1) ?? '4.8'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── UPCOMING TRIAL SESSION ───────────────── */}
        {trialSessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trial Session</Text>
            </View>
            {trialSessions.map((session) => {
              const isAccepted  = session.status === 'accepted';
              const isConfirmed = session.status === 'member_confirmed';
              const isActioning = trialActionId === session.id;
              return (
                <View key={session.id} style={[styles.trialCard, { marginBottom: 10 }]}>
                  <View style={styles.trialCardInner}>
                    <View style={styles.trialLeft}>
                      <Text style={styles.trialLabel}>TRAINER</Text>
                      <Text style={styles.trialTrainer}>{session.trainerName}</Text>
                      {!!session.trainerSpecialisation && (
                        <Text style={styles.trialSpec}>{session.trainerSpecialisation}</Text>
                      )}
                      {!!session.acceptedByName && (
                        <Text style={styles.trialBookedBy}>Booked by {session.acceptedByName}</Text>
                      )}
                    </View>
                    <View style={styles.trialRight}>
                      <Text style={styles.trialLabel}>SCHEDULED</Text>
                      <Text style={styles.trialDate}>
                        {new Date(session.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </Text>
                      <Text style={styles.trialTime}>
                        {new Date(session.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {isAccepted && (
                        <View style={[styles.trialStatusBadge, { backgroundColor: 'rgba(234,179,8,0.12)' }]}>
                          <Text style={[styles.trialStatusText, { color: '#EAB308' }]}>PENDING</Text>
                        </View>
                      )}
                      {isConfirmed && (
                        <View style={[styles.trialStatusBadge, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                          <Text style={[styles.trialStatusText, { color: '#22C55E' }]}>CONFIRMED</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {isAccepted && (
                    <View style={styles.trialActions}>
                      <TouchableOpacity
                        style={[styles.trialConfirmBtn, isActioning && { opacity: 0.6 }]}
                        disabled={isActioning}
                        onPress={async () => {
                          setTrialActionId(session.id);
                          try {
                            await confirmTrialSession(session.id);
                            const updated = await fetchTrialSessions();
                            setTrialSessions(updated);
                          } catch (err) {
                            Alert.alert('Error', err?.response?.data?.message ?? 'Failed to confirm.');
                          } finally { setTrialActionId(null); }
                        }}
                      >
                        {isActioning
                          ? <ActivityIndicator color="#000" size="small" />
                          : <Text style={styles.trialConfirmBtnText}>Confirm</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.trialRejectBtn, isActioning && { opacity: 0.6 }]}
                        disabled={isActioning}
                        onPress={async () => {
                          setTrialActionId(session.id);
                          try {
                            await rejectTrialSession(session.id);
                            setTrialSessions(prev => prev.filter(s => s.id !== session.id));
                          } catch (err) {
                            Alert.alert('Error', err?.response?.data?.message ?? 'Failed to reject.');
                          } finally { setTrialActionId(null); }
                        }}
                      >
                        <Text style={styles.trialRejectBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ── STATS GRID ───────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.statsGrid}>
            {/* Left — Daily Streak (live data, navigates to StreakDetail) */}
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('StreakDetail')}
              activeOpacity={0.8}
            >
              <Ionicons name="flame" size={26} color={COLORS.secondary} />
              <View style={{ marginTop: 'auto' }}>
                <Text style={styles.statLabel}>DAILY STREAK</Text>
                <Text style={styles.statValue}>
                  {streakData ? `${streakData.currentStreak} Days` : '— Days'}
                </Text>
                {streakData?.nextMilestone && (
                  <Text style={styles.statHint}>
                    {streakData.nextMilestone.daysRemaining}d to {streakData.nextMilestone.label}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
            {/* Right — Today's Workout (live plan name, navigates to WorkoutHome) */}
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('WorkoutHome')}
              activeOpacity={0.8}
            >
              <Ionicons name="barbell-outline" size={26} color={COLORS.secondary} />
              <View style={{ marginTop: 'auto' }}>
                <Text style={styles.statLabel}>TODAY'S WORKOUT</Text>
                <Text style={styles.statValue} numberOfLines={2}>
                  {todaysPlan ? todaysPlan.name : 'Rest Day'}
                </Text>
                {todaysPlan && (
                  <Text style={styles.statHint}>
                    {todaysPlan.exercises?.length ?? 0} exercises
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── ANNOUNCEMENTS — hidden when empty ─────── */}
        {(loadingAnnouncements || announcements.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Announcements</Text>
              <View style={styles.announceBadge}>
                <Text style={styles.announceBadgeText}>{announcements.length}</Text>
              </View>
            </View>
            {loadingAnnouncements ? (
              <ActivityIndicator color={COLORS.secondary} style={{ marginVertical: 20 }} />
            ) : (
              announcements.map((a, i) => (
                <View key={a.id || i} style={styles.announceCard}>
                  <View style={[styles.announceBorder, { backgroundColor: ANNOUNCEMENT_COLORS[i % ANNOUNCEMENT_COLORS.length] }]} />
                  <View style={styles.announceContent}>
                    <Text style={styles.announceDate}>{a.date || (a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')}</Text>
                    <Text style={styles.announceTitle}>{a.title}</Text>
                    <Text style={styles.announceBody} numberOfLines={2}>{a.subtitle || a.body}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </View>
              ))
            )}
          </View>
        )}

        {/* ── THIS WEEK ────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>This Week</Text>
          <View style={styles.weekGrid}>
            <TouchableOpacity style={styles.weekCard} onPress={() => navigation.navigate('StreakDetail')}>
              <View style={[styles.weekIconWrap, { backgroundColor: COLORS.secondaryGlow }]}>
                <Ionicons name="flame-outline" size={22} color={COLORS.secondary} />
              </View>
              <Text style={[styles.weekValue, { color: COLORS.secondary }]}>
                {streakData?.currentStreak ?? '—'}
              </Text>
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
              <Text style={[styles.weekValue, { color: '#A855F7', fontSize: 18 }]}>
                {leaderboardStats?.rank ? `Rank ${leaderboardStats.rank}` : leaderboardStats?.optedIn === false ? 'Opt In' : '—'}
              </Text>
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
              <Text style={styles.sectionSeeAll}>{trainers.length > 0 ? `${trainers.length} trainers →` : 'See all →'}</Text>
            </TouchableOpacity>
          </View>

          {loadingTrainers ? (
            <ActivityIndicator color={COLORS.secondary} style={{ marginVertical: 20 }} />
          ) : trainers.length === 0 ? (
            <Text style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>No trainers available yet.</Text>
          ) : null}

          {trainers.slice(0, 3).map((trainer) => (
            <TouchableOpacity
              key={trainer.id}
              style={styles.trainerCard}
              onPress={() => navigation.navigate('TrainerDetail', { trainer })}
              activeOpacity={0.85}
            >
              {trainer.profilePhotoUrl ? (
                <View style={[styles.trainerAvatarPanel, { paddingVertical: 0 }]}>
                  <Image
                    source={{ uri: trainer.profilePhotoUrl }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, resizeMode: 'cover' }}
                  />
                  <View style={[
                    styles.trainerAvailBadge,
                    { position: 'absolute', bottom: 8, backgroundColor: trainer.available ? COLORS.success : COLORS.textMuted },
                  ]}>
                    <Text style={styles.trainerAvailBadgeText}>
                      {trainer.available ? 'Available' : 'Full'}
                    </Text>
                  </View>
                </View>
              ) : (
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
              )}

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
        {/* <View style={styles.section}>
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
        </View> */}

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
  memDaysLabel:    { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 1 },
  memProgressBg:   { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 },
  memProgressFill: { height: '100%', borderRadius: 3 },
  noMemRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  noMemSub:  { fontSize: 12, color: COLORS.secondary, marginTop: 4 },
  contactRow: { flexDirection: 'row', gap: 10 },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(112,112,112,0.4)',
    backgroundColor: 'rgba(255,255,255,0.04)', gap: 6,
  },
  waBtn: { borderColor: 'rgba(37,211,102,0.35)', backgroundColor: 'rgba(37,211,102,0.06)' },
  contactBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.white },

  // Paused state
  pausedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  pausedDot: { backgroundColor: '#F59E0B' },
  pausedText: { fontSize: 9, fontWeight: '900', color: '#F59E0B', letterSpacing: 1.5 },
  pausedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(245,158,11,0.08)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
    borderRadius: 12, padding: 12, marginBottom: 16,
  },
  pausedBannerTitle: { fontSize: 13, fontWeight: '800', color: COLORS.white },
  pausedBannerSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  resumeBtn: {
    minWidth: 78, height: 34, borderRadius: 8, backgroundColor: '#F59E0B',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12,
  },
  resumeBtnText: { fontSize: 12, fontWeight: '800', color: '#000' },

  // Live gym occupancy
  occupancyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.secondaryBorder, padding: 16,
  },
  occupancyIconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.secondaryGlow,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.secondaryBorder,
  },
  occupancyLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#22C55E' },
  occupancyLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2 },
  occupancyValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  occupancyValue: { fontSize: 24, fontWeight: '900', color: COLORS.white },
  occupancyUnit: { fontSize: 12, fontWeight: '500', color: COLORS.textSecondary },

  // Coins card
  coinsCard: {
    backgroundColor: COLORS.surface, borderRadius: 18, borderWidth: 1,
    borderColor: COLORS.secondaryBorder, overflow: 'hidden',
  },
  coinsCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
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
  coinsDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 0 },
  coinsTxnHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
  },
  coinsTxnTitle:  { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  coinsTxnSeeAll: { fontSize: 12, fontWeight: '700', color: COLORS.secondary },
  coinsTxnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  coinsTxnIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  coinsTxnName: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  coinsTxnDate: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  coinsTxnAmount: { fontSize: 13, fontWeight: '800' },
  coinsTxnLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, paddingTop: 0 },
  coinsTxnLoadingText: { fontSize: 12, color: COLORS.textMuted },

  // Stats grid
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: 'rgba(28,28,30,0.5)', borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.border, padding: 16, height: 128,
  },
  statLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  statHint: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

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

  // Assigned trainer (Your Trainer section)
  myTrainerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surface, borderRadius: 18, borderWidth: 1,
    borderColor: COLORS.secondaryBorder, padding: 16,
  },
  myTrainerAvatar: { width: 56, height: 56, borderRadius: 14 },
  myTrainerAvatarFallback: {
    backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center',
  },
  myTrainerAvatarLetter: { fontSize: 24, fontWeight: '900', color: '#fff' },

  // Trial session card
  trialCard: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.secondaryBorder,
    borderRadius: 16, overflow: 'hidden',
  },
  trialCardInner: { flexDirection: 'row', gap: 12, padding: 16 },
  trialLeft: { flex: 1 },
  trialRight: { alignItems: 'flex-end', gap: 4 },
  trialLabel: {
    color: COLORS.textMuted, fontSize: 9, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2,
  },
  trialTrainer: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  trialSpec: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  trialBookedBy: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  trialDate: { color: COLORS.secondary, fontSize: 15, fontWeight: '800' },
  trialTime: { color: COLORS.textSecondary, fontSize: 12 },
  trialStatusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 4 },
  trialStatusText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  trialActions: {
    flexDirection: 'row', gap: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  trialConfirmBtn: {
    flex: 1, height: 38, borderRadius: 8, backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  trialConfirmBtnText: { fontSize: 12, fontWeight: '800', color: '#000' },
  trialRejectBtn: {
    flex: 1, height: 38, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  trialRejectBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },

  // Workout quick access
  workoutQuickCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    marginHorizontal: 16, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(233,99,22,0.3)',
  },
  workoutQuickLeft: { flexDirection: 'row', alignItems: 'center' },
  workoutQuickTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  workoutQuickSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  workoutTodayBadge: {
    backgroundColor: COLORS.secondary, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3, marginLeft: 8,
  },
  workoutTodayBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});
