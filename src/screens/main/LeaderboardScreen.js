import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  ActivityIndicator, RefreshControl, Image, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { COLORS as THEME, FONTS } from '../../theme';
import {
  getLeaderboard, getMemberStatSheet, setLeaderboardConsent,
} from '../../services/leaderboardService';
import { useAuthStore } from '../../store/authStore';
import { logEvent } from '../../services/analyticsService';

const COLORS = { ...THEME, surface: THEME.surfaceLow };
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// Period toggle — only "month" is wired to data for now; the other two are
// presentational (no behaviour on tap) until weekly/all-time feeds exist.
const PERIODS = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
];
const ACTIVE_PERIOD = 'month';

function shortName(n) { return n || 'Member'; }

export default function LeaderboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [statSheet, setStatSheet] = useState(null);
  const [explainer, setExplainer] = useState(false);
  const [joining, setJoining] = useState(false);
  const user = useAuthStore((s) => s.user);
  const viewLogged = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const lb = await getLeaderboard();
      setData(lb);
      if (!viewLogged.current) {
        viewLogged.current = true;
        logEvent('leaderboard_viewed', { period: 'monthly', member_rank: lb?.myRank?.rank ?? null }).catch(() => {});
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load leaderboard');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  const openStatSheet = async (memberId) => {
    try { const sheet = await getMemberStatSheet(memberId); setStatSheet(sheet); } catch { /* not top-10 */ }
  };

  const join = async () => {
    setJoining(true);
    try { await setLeaderboardConsent(true); await fetchData(); } catch { /* ignore */ }
    setJoining(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
        <Text style={styles.loadingText}>Loading rankings…</Text>
      </View>
    );
  }

  // Feature off → coming soon
  if (data && data.enabled === false) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="trophy-outline" size={48} color={COLORS.textMuted} />
        <Text style={styles.comingSoon}>Leaderboard coming soon</Text>
      </View>
    );
  }

  // Top 5 board: podium (1–3) + two list rows (4–5).
  const TOP_N = 5;
  const top5 = (data?.top10 || []).slice(0, TOP_N);
  const podium = top5.slice(0, 3);
  const rest = top5.slice(3, TOP_N);

  // "resets in X days"
  const daysLeft = data ? new Date(data.year, data.month, 0).getDate() - new Date().getDate() : 0;

  // Own row appended below the list (after an ellipsis) when ranked outside Top 5.
  const myRank = data?.myRank;
  const inTop5 = !!myRank && myRank.rank <= TOP_N;
  const showMyRow = !!data?.optedIn && myRank && myRank.rank > TOP_N;
  const myName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'You';
  const myAvatar = user?.profilePhotoUrl || user?.profilePhoto || null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header — centered title + tagline */}
      <View style={styles.header}>
        <Text style={styles.title}>RANKINGS</Text>
        <Text style={styles.tagline}>CONNECT AND COMPETE</Text>

        {/* Period toggle */}
        <View style={styles.toggleRow}>
          {PERIODS.map((p) => {
            const on = p.key === ACTIVE_PERIOD;
            return (
              <TouchableOpacity
                key={p.key}
                activeOpacity={on ? 0.7 : 1}
                onPress={() => { /* week / all-time are presentational for now */ }}
                style={[styles.toggleBtn, on && styles.toggleBtnOn]}
              >
                <Text style={[styles.toggleTxt, on && styles.toggleTxtOn]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {!!data?.month && (
          <Text style={styles.resetTxt}>
            {MONTHS[data.month]} {data.year} · resets in {daysLeft} day{daysLeft === 1 ? '' : 's'}
            {data?.updatedAgo ? ` · updated ${data.updatedAgo}` : ''}
          </Text>
        )}

        {/* Info → explainer */}
        <TouchableOpacity
          style={styles.infoBtn}
          onPress={() => setExplainer(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="information-circle-outline" size={24} color={COLORS.primaryLight} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} />}
      >
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Excluded banner */}
        {data?.excluded && (
          <View style={styles.banner}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.warning} />
            <Text style={styles.bannerTxt}>You're currently not eligible for the leaderboard — please contact the front desk.</Text>
          </View>
        )}

        {/* Podium — #2 left, #1 center (raised), #3 right */}
        <View style={styles.podiumSection}>
          {/* Soft purple radial glow (fades to transparent — no hard circle) */}
          <View style={styles.podiumGlowWrap} pointerEvents="none">
            <Svg width={320} height={300}>
              <Defs>
                <RadialGradient id="podiumGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop offset="0%" stopColor={COLORS.primaryBright} stopOpacity={0.32} />
                  <Stop offset="55%" stopColor={COLORS.primary} stopOpacity={0.1} />
                  <Stop offset="100%" stopColor={COLORS.background} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect width={320} height={300} fill="url(#podiumGlow)" />
            </Svg>
          </View>
          <View style={styles.podiumRow}>
            <PodiumCard entry={podium[1]} height={120} place={2} medalColor={MEDAL_COLORS[1]} myId={myRank?.memberId} onPress={openStatSheet} />
            <PodiumCard entry={podium[0]} height={176} place={1} medalColor={MEDAL_COLORS[0]} highlight myId={myRank?.memberId} onPress={openStatSheet} />
            <PodiumCard entry={podium[2]} height={92} place={3} medalColor={MEDAL_COLORS[2]} myId={myRank?.memberId} onPress={openStatSheet} />
          </View>
        </View>

        {/* Ranks 4–5 */}
        <View style={styles.list}>
          {rest.map((p) => {
            const mine = p.memberId === myRank?.memberId;
            return (
              <TouchableOpacity key={p.memberId} style={[styles.row, mine && styles.rowMine]} onPress={() => openStatSheet(p.memberId)} activeOpacity={0.8}>
                {mine && <View style={styles.rowMineWash} pointerEvents="none" />}
                <Text style={[styles.rowRank, mine && styles.rowRankMine]}>#{p.rank}</Text>
                <View style={[styles.rowAvatar, mine && styles.rowAvatarMine]}>
                  {p.avatarUrl ? <Image source={{ uri: p.avatarUrl }} style={styles.rowAvatarImg} /> : <Text style={styles.rowInitial}>{(p.name || '?')[0]}</Text>}
                </View>
                <View style={styles.rowNameWrap}>
                  <Text style={styles.rowName}>{shortName(p.name)}</Text>
                  {mine && <Text style={styles.youPill}>YOU</Text>}
                </View>
                <Text style={[styles.rowPts, mine && styles.rowPtsMine]}>{p.points} pts</Text>
              </TouchableOpacity>
            );
          })}

          {/* Waiting placeholders to fill the Top 5 for a new gym (ranks 4–5) */}
          {Math.max(top5.length, 3) < TOP_N && Array.from({ length: TOP_N - Math.max(top5.length, 3) }).map((_, i) => {
            const rank = Math.max(top5.length, 3) + i + 1;
            return (
              <View key={`w${rank}`} style={[styles.row, styles.rowWaiting]}>
                <Text style={styles.rowRank}>#{rank}</Text>
                <View style={styles.rowAvatar}><Ionicons name="person-outline" size={16} color={COLORS.textDim} /></View>
                <Text style={[styles.rowName, { color: COLORS.textDim, flex: 1 }]}>This spot is waiting for you</Text>
              </View>
            );
          })}

          {/* Own rank (outside Top 5) — separated by an ellipsis */}
          {showMyRow && (
            <>
              <View style={styles.ellipsis}>
                <Ionicons name="ellipsis-vertical" size={18} color={COLORS.textMuted} />
              </View>
              <View style={[styles.row, styles.rowMine]}>
                <View style={styles.rowMineWash} pointerEvents="none" />
                <Text style={[styles.rowRank, styles.rowRankMine]}>#{myRank.rank}</Text>
                <View style={[styles.rowAvatar, styles.rowAvatarMine]}>
                  {myAvatar ? <Image source={{ uri: myAvatar }} style={styles.rowAvatarImg} /> : <Text style={styles.rowInitial}>{myName[0]}</Text>}
                </View>
                <View style={styles.rowNameWrap}>
                  <Text style={styles.rowName} numberOfLines={1}>{myName.split(' ')[0]}</Text>
                  <Text style={styles.youPill}>YOU</Text>
                </View>
                <Text style={[styles.rowPts, styles.rowPtsMine]}>{myRank.points} pts</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Sticky bottom — own rank summary / Join banner */}
      {!data?.optedIn ? (
        <View style={styles.pinned}>
          <View style={styles.joinCard}>
            <Text style={styles.joinTxt}>Join the leaderboard to see your rank and win monthly rewards</Text>
            <TouchableOpacity style={styles.joinBtn} onPress={join} disabled={joining}>
              {joining ? <ActivityIndicator color="#fff" /> : <Text style={styles.joinBtnTxt}>Join 💪</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : myRank ? (
        <View style={styles.stickyBar}>
          <View style={styles.stickyLeft}>
            <Text style={styles.stickyRank}>Your Rank: <Text style={styles.stickyRankNum}>#{myRank.rank}</Text></Text>
            <Text style={styles.stickyDivider}>|</Text>
            <Text style={styles.stickyPts}>{myRank.points} pts</Text>
          </View>
          {inTop5 ? (
            <View style={styles.stickyChipGood}>
              <Ionicons name="trophy" size={13} color={COLORS.success} />
              <Text style={styles.stickyChipGoodTxt}>TOP 5</Text>
            </View>
          ) : data?.ptsToTop10 != null ? (
            <View style={styles.stickyChip}>
              <Ionicons name="trending-up" size={13} color={COLORS.primaryLight} />
              <Text style={styles.stickyChipTxt}>{data.ptsToTop10} TO TOP 10</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Stat-sheet drawer */}
      <Modal visible={!!statSheet} transparent animationType="slide" onRequestClose={() => setStatSheet(null)}>
        <TouchableOpacity style={styles.drawerOverlay} activeOpacity={1} onPress={() => setStatSheet(null)}>
          <View style={styles.drawer}>
            <View style={styles.drawerHandle} />
            <Text style={styles.drawerName}>{shortName(statSheet?.name)}</Text>
            <Text style={styles.drawerRank}>Rank #{statSheet?.rank} · {statSheet?.points ?? 0} pts</Text>
            {/* Activity counts (days) — distinct from the points breakdown below */}
            <View style={styles.drawerStats}>
              <Stat label="Check-in days" value={statSheet?.checkinDays} />
              <Stat label="Workout days" value={statSheet?.workoutDays} />
              <Stat label="Day streak" value={`${statSheet?.currentStreak ?? 0}🔥`} />
              <Stat label="Best streak" value={statSheet?.longestStreak} />
            </View>
            {statSheet?.breakdown && (
              <View style={styles.bdCard}>
                <Text style={styles.bdTitle}>Points breakdown</Text>
                <BreakdownRow label="Check-ins" sub={`${statSheet.checkinDays ?? 0} days × 10`} pts={statSheet.breakdown.checkins} />
                <BreakdownRow label="Workouts" sub={`${statSheet.workoutDays ?? 0} days × 10`} pts={statSheet.breakdown.workouts} />
                <BreakdownRow label="Streak bonus" sub={`${Math.round((statSheet.breakdown.streak ?? 0) / 5)}-day streak × 5 (capped 30)`} pts={statSheet.breakdown.streak} />
                <BreakdownRow label="Other bonuses" sub="weekly + milestones" pts={statSheet.breakdown.bonuses} />
                <View style={styles.bdDivider} />
                <BreakdownRow label="Total" pts={statSheet?.points} total />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Explainer */}
      <Modal visible={explainer} transparent animationType="slide" onRequestClose={() => setExplainer(false)}>
        <TouchableOpacity style={styles.drawerOverlay} activeOpacity={1} onPress={() => setExplainer(false)}>
          <View style={styles.drawer}>
            <View style={styles.drawerHandle} />
            <Text style={styles.drawerName}>How ranking works</Text>
            <Text style={styles.explainLine}>• +10 points for each day you check in.</Text>
            <Text style={styles.explainLine}>• +10 points for each day you complete a workout.</Text>
            <Text style={styles.explainLine}>• Your streak adds live points (×5/day, up to 30 days).</Text>
            <Text style={styles.explainLine}>• Weekly bonus: +30 for 4+ check-in days (Mon–Sun).</Text>
            <Text style={styles.explainLine}>• Milestones: 7-day +50 · 14-day +100 · 30-day +250.</Text>
            <Text style={styles.explainLine}>• Board resets on the 1st. Top 10 win Build Coins & perks.</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statVal}>{value ?? 0}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

// One line of the points breakdown: label (+ optional sub) on the left, points on
// the right. `total` renders the reconciling total row.
function BreakdownRow({ label, sub, pts, total }) {
  return (
    <View style={styles.bdRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.bdLabel, total && styles.bdLabelTotal]}>{label}</Text>
        {sub ? <Text style={styles.bdSub}>{sub}</Text> : null}
      </View>
      <Text style={[styles.bdPts, total && styles.bdPtsTotal]}>
        {total ? `${pts ?? 0} pts` : `+${pts ?? 0}`}
      </Text>
    </View>
  );
}

function PodiumCard({ entry, height, place, medalColor, highlight, myId, onPress }) {
  // Empty podium slot (new gym / fewer than 3 ranked) — keep the column for layout.
  if (!entry) {
    return (
      <View style={[styles.podiumCard, highlight && styles.podiumCardHighlight]}>
        <View style={[styles.podiumAvatar, styles.podiumAvatarEmpty, highlight && styles.podiumAvatarFirst]}>
          <Ionicons name="person-outline" size={22} color={COLORS.textDim} />
        </View>
        <Text style={styles.podiumName} numberOfLines={1}>—</Text>
        <Text style={styles.podiumPts}>Open spot</Text>
        <LinearGradient
          colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={[styles.podiumBar, { height, borderTopColor: COLORS.border }]}
        />
      </View>
    );
  }
  const isMe = myId && entry.memberId === myId;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.podiumCard, highlight && styles.podiumCardHighlight]}
      onPress={() => onPress?.(entry.memberId)}
    >
      <View style={[styles.podiumAvatar, highlight && styles.podiumAvatarFirst, { borderColor: medalColor, shadowColor: medalColor }]}>
        {entry.avatarUrl
          ? <Image source={{ uri: entry.avatarUrl }} style={[styles.podiumAvatarImg, highlight && styles.podiumAvatarImgFirst]} />
          : <Text style={styles.podiumAvatarText}>{(entry.name || '?').charAt(0)}</Text>}
        <View style={[styles.podiumBadge, { borderColor: medalColor }]}>
          <Text style={[styles.podiumBadgeText, { color: medalColor }]}>{place}</Text>
        </View>
      </View>
      <Text style={[styles.podiumName, highlight && styles.podiumNameFirst]} numberOfLines={1}>
        {shortName(entry.name).split(' ')[0]}{isMe ? ' (You)' : ''}
      </Text>
      <Text style={[styles.podiumPts, highlight && styles.podiumPtsFirst]}>
        {entry.points} pts
      </Text>
      {/* Subtle medal-tint at the top fading (within hue) to the solid dark fill */}
      <LinearGradient
        colors={[`${medalColor}40`, `${medalColor}00`]}
        locations={[0, 0.85]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={[styles.podiumBar, { height, borderTopColor: medalColor }]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.textMuted, fontFamily: FONTS?.body },
  comingSoon: { color: COLORS.textSecondary, fontSize: 16 },

  // Header
  header: { alignItems: 'center', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16 },
  title: {
    fontFamily: FONTS.display, color: COLORS.textPrimary, fontSize: 30,
    letterSpacing: 4, textTransform: 'uppercase',
    textShadowColor: COLORS.primaryGlow, textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 },
  },
  tagline: { fontFamily: FONTS.label, color: COLORS.textMuted, fontSize: 11, letterSpacing: 3, marginTop: 6, textTransform: 'uppercase' },
  infoBtn: { position: 'absolute', right: 16, top: 56 },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 16 },
  toggleBtn: { paddingBottom: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  toggleBtnOn: { borderBottomColor: COLORS.primaryLight },
  toggleTxt: { fontFamily: FONTS.label, color: COLORS.textMuted, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' },
  toggleTxtOn: { color: COLORS.primaryLight },
  resetTxt: { color: COLORS.textDim, fontSize: 10, marginTop: 12, letterSpacing: 0.3 },

  errorText: { color: COLORS.errorBright, textAlign: 'center', margin: 16 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: COLORS.warningSoft },
  bannerTxt: { color: COLORS.warning, fontSize: 12, flex: 1 },

  // Podium (top-3 pedestal)
  podiumSection: { marginTop: 8, marginBottom: 28, alignItems: 'center', justifyContent: 'flex-end' },
  podiumGlowWrap: { position: 'absolute', top: -20, left: 0, right: 0, alignItems: 'center' },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 12, width: '100%', paddingHorizontal: 16 },
  podiumCard: { flex: 1, alignItems: 'center' },
  podiumCardHighlight: { marginBottom: 22 },
  podiumAvatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, overflow: 'visible',
    shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, marginBottom: 10,
  },
  podiumAvatarFirst: { width: 80, height: 80, borderRadius: 40 },
  podiumAvatarEmpty: { borderColor: COLORS.border, shadowOpacity: 0 },
  podiumAvatarText: { fontFamily: FONTS.display, fontSize: 24, color: COLORS.textPrimary },
  podiumAvatarImg: { width: '100%', height: '100%', borderRadius: 32 },
  podiumAvatarImgFirst: { borderRadius: 40 },
  podiumBadge: {
    position: 'absolute', bottom: -6, right: -6, width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  podiumBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 11 },
  podiumName: { fontFamily: FONTS.label, fontSize: 11, color: COLORS.textPrimary, letterSpacing: 0.5, marginBottom: 3, textTransform: 'uppercase' },
  podiumNameFirst: { color: COLORS.primaryLight, textShadowColor: COLORS.primaryGlow, textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } },
  podiumPts: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted, marginBottom: 12 },
  podiumPtsFirst: { color: COLORS.primaryLight, fontFamily: FONTS.bodyBold },
  // Solid dark fill (matches the stitch `from-background` #151215 = surface) so
  // the purple podium glow stays behind the pedestals instead of bleeding through.
  podiumBar: { width: '100%', borderTopLeftRadius: 10, borderTopRightRadius: 10, borderTopWidth: 2, borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },

  // List
  list: { paddingHorizontal: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.glass, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  rowMine: { borderColor: COLORS.primaryBorder, backgroundColor: COLORS.surface3, shadowColor: COLORS.primaryNeon, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  rowMineWash: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.primarySoft },
  rowWaiting: { opacity: 0.5 },
  rowRank: { color: COLORS.textMuted, fontFamily: FONTS.label, fontSize: 12, width: 30, textAlign: 'right' },
  rowRankMine: { color: COLORS.primaryLight },
  rowAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  rowAvatarMine: { borderColor: COLORS.primaryBorder },
  rowAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  rowInitial: { color: COLORS.textPrimary, fontFamily: FONTS.bodyBold },
  rowNameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName: { color: COLORS.textPrimary, fontFamily: FONTS.label, fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase' },
  rowPts: { color: COLORS.textSecondary, fontSize: 13, fontFamily: FONTS.bodyMedium },
  rowPtsMine: { color: COLORS.primaryLight, fontFamily: FONTS.bodyBold },
  youPill: { color: COLORS.primaryLight, fontFamily: FONTS.label, fontSize: 9, letterSpacing: 1.5, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: COLORS.primaryBorder, backgroundColor: COLORS.surface2, overflow: 'hidden' },
  ellipsis: { alignItems: 'center', paddingVertical: 2 },

  // Sticky bottom bar
  pinned: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 },
  stickyBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface3, borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingVertical: 14, paddingHorizontal: 20,
  },
  stickyLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stickyRank: { color: COLORS.textPrimary, fontFamily: FONTS.label, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  stickyRankNum: { color: COLORS.primaryLight },
  stickyDivider: { color: COLORS.textDim },
  stickyPts: { color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.body },
  stickyChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primarySoft, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  stickyChipTxt: { color: COLORS.primaryLight, fontFamily: FONTS.label, fontSize: 10, letterSpacing: 1 },
  stickyChipGood: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.successSoft, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  stickyChipGoodTxt: { color: COLORS.success, fontFamily: FONTS.label, fontSize: 10, letterSpacing: 1 },

  joinCard: { backgroundColor: COLORS.surface2, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.primaryBorder },
  joinTxt: { color: COLORS.textPrimary, fontSize: 13, marginBottom: 10 },
  joinBtn: { backgroundColor: COLORS.primaryBright, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  joinBtnTxt: { color: '#fff', fontWeight: '800' },

  // Drawers / modals
  drawerOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  drawer: { backgroundColor: COLORS.surfaceLow, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  drawerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.textDim, alignSelf: 'center', marginBottom: 16 },
  drawerName: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800' },
  drawerRank: { color: COLORS.primaryLight, fontSize: 13, marginTop: 4, marginBottom: 16 },
  drawerStats: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, backgroundColor: COLORS.surface2, borderRadius: 12, padding: 12, alignItems: 'center' },
  statVal: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900' },
  statLbl: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  bdCard: { backgroundColor: COLORS.surface2, borderRadius: 14, padding: 14, marginTop: 16, borderWidth: 1, borderColor: COLORS.border },
  bdTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
  bdRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
  bdLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  bdLabelTotal: { fontWeight: '900' },
  bdSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  bdPts: { color: COLORS.primaryLight, fontSize: 14, fontWeight: '800' },
  bdPtsTotal: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '900' },
  bdDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  explainLine: { color: COLORS.textSecondary, fontSize: 13, marginTop: 8 },
});
