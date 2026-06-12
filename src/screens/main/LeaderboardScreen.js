import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS as THEME, FONTS } from '../../theme';
import { getLeaderboard } from '../../services/leaderboardService';
import { logEvent } from '../../services/analyticsService';

// ── Theme-compat remap (keeps legacy key names readable in styles) ───────────
const COLORS = {
  ...THEME,
  secondary: THEME.primaryLight,
  secondaryGlow: THEME.primarySoft,
  secondaryBorder: THEME.primaryBorder,
  surface: THEME.surfaceLow,
};

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']; // gold / silver / bronze
const PERIODS = ['This Week', 'This Month', 'All Time'];

export default function LeaderboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const viewLogged = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const lb = await getLeaderboard();
      setData(lb);
      if (!viewLogged.current) {
        viewLogged.current = true;
        logEvent('leaderboard_viewed', {
          period: 'monthly',
          member_rank: lb?.myRank?.rank ?? null,
        }).catch(() => {});
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
        <Text style={styles.loadingText}>Loading rankings…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.primaryLight} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const top10 = data?.top10 || [];
  const topThree = top10.slice(0, 3);
  const rest = top10.slice(3);
  const myRank = data?.myRank;
  const totalParticipants = data?.totalParticipants || 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={22} color={COLORS.cyan} />
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} />
        }
      >
        {/* Header */}
        <View style={styles.headerWrap}>
          <Text style={styles.headerTitle}>RANKINGS</Text>
          <Text style={styles.headerSub}>CONNECT AND COMPETE</Text>

          {/* Period toggle — only "This Month" active (backend is monthly-only) */}
          <View style={styles.toggleRow}>
            {PERIODS.map((p) => {
              const active = p === 'This Month';
              return (
                <View key={p} style={[styles.toggleItem, active && styles.toggleItemActive]}>
                  <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{p}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Podium */}
        {topThree.length >= 3 && (
          <View style={styles.podiumSection}>
            <View style={styles.podiumGlow} pointerEvents="none" />
            <View style={styles.podiumRow}>
              <PodiumCard entry={topThree[1]} height={104} place={2} medalColor={MEDAL_COLORS[1]} myId={myRank?.memberId} />
              <PodiumCard entry={topThree[0]} height={150} place={1} medalColor={MEDAL_COLORS[0]} highlight myId={myRank?.memberId} />
              <PodiumCard entry={topThree[2]} height={80} place={3} medalColor={MEDAL_COLORS[2]} myId={myRank?.memberId} />
            </View>
          </View>
        )}

        {/* Not-ranked hint */}
        {!myRank && (
          <View style={styles.notRankedStrip}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.textMuted} />
            <Text style={styles.notRankedText}>
              You're not on the leaderboard. Opt in from Settings → Preferences to participate!
            </Text>
          </View>
        )}

        {myRank && myRank.rank > 10 && (
          <View style={styles.outsideTop10}>
            <Text style={styles.outsideTop10Text}>
              Your rank: #{myRank.rank} out of {totalParticipants} members
            </Text>
          </View>
        )}

        {/* Leaderboard list (rank 4+) */}
        {rest.length > 0 && (
          <View style={styles.listSection}>
            {rest.map((entry) => {
              const isMe = myRank && entry.memberId === myRank.memberId;
              return (
                <View key={entry.rank} style={[styles.rankRow, isMe && styles.rankRowMe]}>
                  {isMe && (
                    <LinearGradient
                      colors={[COLORS.primarySoft, 'transparent']}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={StyleSheet.absoluteFill}
                      pointerEvents="none"
                    />
                  )}
                  <Text style={[styles.rankNum, isMe && { color: COLORS.primaryLight }]}>#{entry.rank}</Text>
                  <View style={[styles.rankAvatar, isMe && styles.rankAvatarMe]}>
                    {entry.avatarUrl ? (
                      <Image source={{ uri: entry.avatarUrl }} style={styles.rankAvatarImg} />
                    ) : (
                      <Text style={styles.rankAvatarText}>{(entry.name || '?').charAt(0)}</Text>
                    )}
                  </View>
                  <View style={styles.rankNameWrap}>
                    <Text style={[styles.rankName, isMe && { color: COLORS.textPrimary }]} numberOfLines={1}>
                      {entry.name}
                    </Text>
                    {isMe && (
                      <View style={styles.youChip}>
                        <Text style={styles.youChipText}>YOU</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.rankScore, isMe && { color: COLORS.primaryLight }]}>
                    {entry.score} <Text style={styles.rankScoreUnit}>pts</Text>
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Scoring info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.primaryLight} />
          <Text style={styles.infoText}>
            Score = (Attendance × 0.4) + (Streak × 0.35) + (Volume × 0.25).
            Streak capped at 30 for scoring. Rankings reset on the 1st of every month.
          </Text>
        </View>

        <View style={{ height: myRank ? 110 : 40 }} />
      </ScrollView>

      {/* Sticky "Your Rank" bar */}
      {myRank && (
        <View style={styles.stickyBar}>
          <View style={styles.stickyInner}>
            <Text style={styles.stickyRank}>
              YOUR RANK: <Text style={styles.stickyRankNum}>#{myRank.rank}</Text>
            </Text>
            <Text style={styles.stickyDivider}>|</Text>
            <Text style={styles.stickyPts}>{myRank.score} pts</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function PodiumCard({ entry, height, place, medalColor, highlight, myId }) {
  if (!entry) return null;
  const isMe = myId && entry.memberId === myId;
  return (
    <View style={[styles.podiumCard, highlight && styles.podiumCardHighlight]}>
      <View style={[styles.podiumAvatar, { borderColor: medalColor, shadowColor: medalColor }]}>
        {entry.avatarUrl ? (
          <Image source={{ uri: entry.avatarUrl }} style={styles.podiumAvatarImg} />
        ) : (
          <Text style={styles.podiumAvatarText}>{(entry.name || '?').charAt(0)}</Text>
        )}
        <View style={[styles.podiumBadge, { borderColor: medalColor }]}>
          <Text style={[styles.podiumBadgeText, { color: medalColor }]}>{place}</Text>
        </View>
      </View>
      <Text
        style={[styles.podiumName, highlight && styles.podiumNameFirst]}
        numberOfLines={1}
      >
        {entry.name?.split(' ')[0]}{isMe ? ' (You)' : ''}
      </Text>
      <Text style={[styles.podiumPts, highlight && { color: COLORS.primaryLight }]}>
        {entry.score} pts
      </Text>
      <LinearGradient
        colors={[`${medalColor}33`, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.podiumBar, { height, borderTopColor: medalColor }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center', gap: 12 },

  loadingText: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted, marginTop: 8 },
  errorText: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryText: { fontFamily: FONTS.bodyBold, color: COLORS.white, fontSize: 14 },

  // Back
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    zIndex: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  scroll: { paddingHorizontal: 20, paddingTop: 64 },

  // Header
  headerWrap: { alignItems: 'center', marginBottom: 8 },
  headerTitle: {
    fontFamily: FONTS.display,
    fontSize: 34,
    color: COLORS.textPrimary,
    letterSpacing: 6,
    textShadowColor: COLORS.primaryGlow,
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 0 },
  },
  headerSub: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.textSecondary,
    letterSpacing: 3,
    marginTop: 6,
  },

  // Toggle
  toggleRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 18 },
  toggleItem: { paddingBottom: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  toggleItemActive: { borderBottomColor: COLORS.primaryLight },
  toggleText: { fontFamily: FONTS.label, fontSize: 11, color: COLORS.textMuted, letterSpacing: 1.5 },
  toggleTextActive: { color: COLORS.primaryLight },

  // Podium
  podiumSection: {
    marginTop: 24,
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  podiumGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: COLORS.primarySoft,
    top: -10,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  podiumCard: { flex: 1, alignItems: 'center' },
  podiumCardHighlight: { marginBottom: 18 },
  podiumAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'visible',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    marginBottom: 10,
  },
  podiumAvatarText: { fontFamily: FONTS.display, fontSize: 24, color: COLORS.textPrimary },
  podiumAvatarImg: { width: '100%', height: '100%', borderRadius: 32 },
  podiumBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  podiumBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 11 },
  podiumName: { fontFamily: FONTS.label, fontSize: 11, color: COLORS.textPrimary, letterSpacing: 0.5, marginBottom: 3 },
  podiumNameFirst: {
    color: COLORS.primaryLight,
    textShadowColor: COLORS.primaryGlow,
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  podiumPts: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted, marginBottom: 12 },
  podiumBar: {
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderTopWidth: 2,
  },

  // Not ranked / outside top 10
  notRankedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.glass,
    marginBottom: 20,
  },
  notRankedText: { flex: 1, fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
  outsideTop10: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  outsideTop10Text: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.primaryLight },

  // List
  listSection: { gap: 8, marginBottom: 18 },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    overflow: 'hidden',
  },
  rankRowMe: {
    borderColor: COLORS.primaryBorder,
    backgroundColor: COLORS.surface3,
  },
  rankNum: { fontFamily: FONTS.label, fontSize: 12, color: COLORS.textMuted, width: 30, textAlign: 'right' },
  rankAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  rankAvatarMe: { borderColor: COLORS.primaryBorder },
  rankAvatarText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.textPrimary },
  rankAvatarImg: { width: '100%', height: '100%', borderRadius: 20 },
  rankNameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rankName: { fontFamily: FONTS.label, fontSize: 13, color: COLORS.textPrimary, letterSpacing: 0.5 },
  youChip: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  youChipText: { fontFamily: FONTS.label, fontSize: 9, color: COLORS.primaryLight, letterSpacing: 2 },
  rankScore: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.textPrimary },
  rankScoreUnit: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.textMuted },

  // Info box
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: COLORS.glass,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoText: { flex: 1, fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },

  // Sticky bar
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.surface3,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 14,
    paddingBottom: 26,
    paddingHorizontal: 20,
  },
  stickyInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  stickyRank: { fontFamily: FONTS.label, fontSize: 12, color: COLORS.textPrimary, letterSpacing: 1.5 },
  stickyRankNum: { color: COLORS.primaryLight },
  stickyDivider: { color: COLORS.textMuted, opacity: 0.5 },
  stickyPts: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary },
});
