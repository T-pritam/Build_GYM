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
import { COLORS } from '../../constants/colors';
import { getLeaderboard, getHallOfFame } from '../../services/leaderboardService';
import { logEvent } from '../../services/analyticsService';

const MEDAL_COLORS = ['#FFB400', '#B0B0B0', '#CD7F32'];
const MEDAL_EMOJIS = ['🥇', '🥈', '🥉'];
const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function LeaderboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [hallOfFame, setHallOfFame] = useState([]);
  const [hofLoading, setHofLoading] = useState(false);

  const viewLogged = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [lb, hof] = await Promise.all([
        getLeaderboard(),
        getHallOfFame(0),
      ]);
      setData(lb);
      setHallOfFame(hof);
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
        <ActivityIndicator size="large" color={COLORS.secondary} />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.secondary} />
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
  const month = data?.month;
  const year = data?.year;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <LinearGradient colors={['#1A0800', '#0D0D0D']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <Text style={styles.headerSub}>
          {MONTH_NAMES[month]} {year} · Monthly Rankings
        </Text>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />}
      >

        {/* My rank strip — always shown */}
        {myRank ? (
          <LinearGradient
            colors={[COLORS.secondaryGlow, 'transparent']}
            style={styles.myRankStrip}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
          >
            <View style={styles.myRankBadge}>
              <Text style={styles.myRankNum}>#{myRank.rank}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.myRankLabel}>YOUR RANKING</Text>
              <Text style={styles.myRankName}>{myRank.name}</Text>
            </View>
            <View style={styles.myRankStats}>
              <Text style={styles.myRankVisits}>{myRank.attendance} visits</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="flame" size={12} color="#EF4444" />
                <Text style={styles.myRankCoins}>{myRank.streak}-day streak</Text>
              </View>
              <Text style={styles.myRankScore}>Score: {myRank.score}</Text>
            </View>
          </LinearGradient>
        ) : (
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

        {/* Top 3 podium */}
        {topThree.length >= 3 && (
          <View style={styles.podiumRow}>
            <PodiumCard entry={topThree[1]} height={90} medalColor={MEDAL_COLORS[1]} myId={myRank?.memberId} />
            <PodiumCard entry={topThree[0]} height={120} medalColor={MEDAL_COLORS[0]} highlight myId={myRank?.memberId} />
            <PodiumCard entry={topThree[2]} height={70} medalColor={MEDAL_COLORS[2]} myId={myRank?.memberId} />
          </View>
        )}

        {/* Rest of leaderboard (4-10) */}
        {rest.length > 0 && (
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>Full Rankings</Text>
            {rest.map((entry) => {
              const isMe = myRank && entry.memberId === myRank.memberId;
              return (
                <View
                  key={entry.rank}
                  style={[styles.rankRow, isMe && styles.rankRowMe]}
                >
                  <Text style={[styles.rankNum, isMe && { color: COLORS.secondary }]}>
                    #{entry.rank}
                  </Text>
                  <View style={styles.rankAvatar}>
                    {entry.avatarUrl ? (
                      <Image source={{ uri: entry.avatarUrl }} style={styles.rankAvatarImg} />
                    ) : (
                      <Text style={styles.rankAvatarText}>{(entry.name || '?').charAt(0)}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rankName, isMe && { color: COLORS.secondary }]}>
                      {entry.name}{isMe ? ' (You)' : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.rankDetail}>{entry.attendance} visits</Text>
                      <Ionicons name="flame" size={10} color="#EF4444" />
                      <Text style={styles.rankDetail}>{entry.streak}-day streak</Text>
                    </View>
                  </View>
                  <Text style={styles.rankScore}>
                    {entry.score}{' '}
                    <Text style={styles.rankScoreUnit}>pts</Text>
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.secondary} />
          <Text style={styles.infoText}>
            Score = (Attendance × 0.4) + (Streak × 0.35) + (Volume × 0.25).
            Streak capped at 30 for scoring. Rankings reset on the 1st of every month.
          </Text>
        </View>

        {/* Hall of Fame */}
        {hallOfFame.length > 0 && (
          <View style={styles.hofSection}>
            <Text style={styles.hofTitle}>🏛️ Hall of Fame</Text>
            {hallOfFame.map((monthData, idx) => (
              <View key={`${monthData.year}-${monthData.month}`} style={styles.hofCard}>
                <Text style={styles.hofMonth}>
                  {MONTH_NAMES[monthData.month]} {monthData.year}
                </Text>
                {monthData.winners.map((w, i) => (
                  <View key={w.id || i} style={styles.hofRow}>
                    <Text style={styles.hofEmoji}>{MEDAL_EMOJIS[w.rank - 1] || ''}</Text>
                    <Text style={styles.hofName}>
                      {w.profileSnapshot?.name || 'Unknown'}
                    </Text>
                    <Text style={styles.hofScore}>
                      {w.score} pts · {w.streakAtEnd}-day streak
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function PodiumCard({ entry, height, medalColor, highlight, myId }) {
  if (!entry) return null;
  const isMe = myId && entry.memberId === myId;
  return (
    <View style={[styles.podiumCard, highlight && styles.podiumCardHighlight]}>
      <View style={[styles.podiumAvatar, { borderColor: medalColor }]}>
        {entry.avatarUrl ? (
          <Image source={{ uri: entry.avatarUrl }} style={styles.podiumAvatarImg} />
        ) : (
          <Text style={styles.podiumAvatarText}>{(entry.name || '?').charAt(0)}</Text>
        )}
      </View>
      <Text style={[styles.podiumRank, isMe && { color: COLORS.secondary }]} numberOfLines={1}>
        {entry.name?.split(' ')[0]}{isMe ? ' (You)' : ''}
      </Text>
      <Text style={[styles.podiumMedal, { color: medalColor }]}>#{entry.rank}</Text>
      <View style={[styles.podiumBar, { height, backgroundColor: `${medalColor}22`, borderColor: `${medalColor}55` }]}>
        <Text style={[styles.podiumVisits, { color: medalColor }]}>{entry.score}</Text>
        <Text style={styles.podiumVisitsLabel}>pts</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
        <Ionicons name="flame" size={10} color="#EF4444" />
        <Text style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: '700' }}>{entry.streak}d</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center', gap: 12 },

  loadingText: { fontSize: 14, color: COLORS.textMuted, marginTop: 8 },
  errorText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
  retryBtn: { backgroundColor: COLORS.secondary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },

  // Header
  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: COLORS.white, marginBottom: 4 },
  headerSub: { fontSize: 13, color: COLORS.textSecondary },

  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  // My rank
  myRankStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.secondaryBorder,
    marginBottom: 24,
    overflow: 'hidden',
  },
  myRankBadge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myRankNum: { fontSize: 16, fontWeight: '900', color: COLORS.white },
  myRankLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 3 },
  myRankName: { fontSize: 15, fontWeight: '800', color: COLORS.white },
  myRankStats: { alignItems: 'flex-end' },
  myRankVisits: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  myRankCoins: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  myRankScore: { fontSize: 11, color: COLORS.secondary, fontWeight: '700', marginTop: 2 },

  notRankedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginBottom: 24,
  },
  notRankedText: { flex: 1, fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },

  outsideTop10: {
    backgroundColor: `${COLORS.secondary}15`,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  outsideTop10Text: { fontSize: 12, color: COLORS.secondary, fontWeight: '700' },

  // Podium
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
  },
  podiumCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  podiumCardHighlight: {},
  podiumAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  podiumAvatarText: { fontSize: 20, fontWeight: '900', color: COLORS.white },
  podiumAvatarImg: { width: 48, height: 48, borderRadius: 16 },
  podiumBadge: { fontSize: 16, marginBottom: 2 },
  podiumRank: { fontSize: 11, fontWeight: '800', color: COLORS.white, textAlign: 'center' },
  podiumMedal: { fontSize: 13, fontWeight: '900', marginBottom: 6 },
  podiumBar: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  podiumVisits: { fontSize: 18, fontWeight: '900' },
  podiumVisitsLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted },

  // List
  listSection: { gap: 8, marginBottom: 20 },
  listTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1, marginBottom: 4 },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  rankRowMe: {
    borderColor: `${COLORS.secondary}55`,
    backgroundColor: `${COLORS.secondary}08`,
  },
  rankNum: { fontSize: 13, fontWeight: '800', color: COLORS.textMuted, width: 28, textAlign: 'center' },
  rankAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  rankAvatarText: { fontSize: 15, fontWeight: '900', color: COLORS.white },
  rankAvatarImg: { width: 36, height: 36, borderRadius: 10 },
  rankName: { fontSize: 13, fontWeight: '700', color: COLORS.white, marginBottom: 2 },
  rankDetail: { fontSize: 10, color: COLORS.textMuted },
  rankScore: { fontSize: 13, fontWeight: '800', color: COLORS.white },
  rankScoreUnit: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },

  // Info box
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: COLORS.secondaryGlow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.secondaryBorder,
    padding: 14,
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  infoText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },

  // Hall of Fame
  hofSection: { marginBottom: 20 },
  hofTitle: { fontSize: 18, fontWeight: '900', color: COLORS.white, marginBottom: 16 },
  hofCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  hofMonth: { fontSize: 14, fontWeight: '800', color: COLORS.white, marginBottom: 10 },
  hofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  hofEmoji: { fontSize: 18 },
  hofName: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.white },
  hofScore: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
});
