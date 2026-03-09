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
import { leaderboard, activityData } from '../../constants/dummyData';

const MEDAL_COLORS = ['#FFB400', '#B0B0B0', '#CD7F32'];

export default function LeaderboardScreen({ navigation }) {
  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const myEntry = leaderboard.find((e) => e.isMe);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <LinearGradient colors={['#1A0800', '#0D0D0D']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <Text style={styles.headerSub}>February 2026 · Monthly Visits</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* My rank strip */}
        {myEntry && (
          <LinearGradient
            colors={[COLORS.secondaryGlow, 'transparent']}
            style={styles.myRankStrip}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
          >
            <View style={styles.myRankBadge}>
              <Text style={styles.myRankNum}>#{myEntry.rank}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.myRankLabel}>YOUR RANKING</Text>
              <Text style={styles.myRankName}>{myEntry.name}</Text>
            </View>
            <View style={styles.myRankStats}>
              <Text style={styles.myRankVisits}>{myEntry.visits} visits</Text>
              <Text style={styles.myRankCoins}>{myEntry.coins.toLocaleString('en-IN')} coins</Text>
            </View>
          </LinearGradient>
        )}

        {/* Top 3 podium */}
        <View style={styles.podiumRow}>
          {/* 2nd place */}
          <PodiumCard entry={topThree[1]} height={90} medalColor={MEDAL_COLORS[1]} />
          {/* 1st place */}
          <PodiumCard entry={topThree[0]} height={120} medalColor={MEDAL_COLORS[0]} highlight />
          {/* 3rd place */}
          <PodiumCard entry={topThree[2]} height={70} medalColor={MEDAL_COLORS[2]} />
        </View>

        {/* Rest of leaderboard */}
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>Full Rankings</Text>
          {rest.map((entry) => (
            <View
              key={entry.rank}
              style={[styles.rankRow, entry.isMe && styles.rankRowMe]}
            >
              <Text style={[styles.rankNum, entry.isMe && { color: COLORS.secondary }]}>
                #{entry.rank}
              </Text>
              <View style={styles.rankAvatar}>
                <Text style={styles.rankAvatarText}>{entry.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rankName, entry.isMe && { color: COLORS.secondary }]}>
                  {entry.name}{entry.isMe ? ' (You)' : ''}
                </Text>
                <Text style={styles.rankDetail}>{entry.visits} visits · {entry.streak}-day streak</Text>
              </View>
              <Text style={styles.rankCoins}>
                {entry.coins.toLocaleString('en-IN')}{' '}
                <Text style={styles.rankCoinsUnit}>coins</Text>
              </Text>
            </View>
          ))}
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.secondary} />
          <Text style={styles.infoText}>
            Rankings are based on total visits this calendar month. Ties are broken by Build Coins balance.
            Rankings reset on the 1st of every month.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function PodiumCard({ entry, height, medalColor, highlight }) {
  return (
    <View style={[styles.podiumCard, highlight && styles.podiumCardHighlight]}>
      <View style={[styles.podiumAvatar, { borderColor: medalColor }]}>
        <Text style={styles.podiumAvatarText}>{entry.name.charAt(0)}</Text>
      </View>
      {entry.badge ? <Text style={styles.podiumBadge}>{entry.badge}</Text> : null}
      <Text style={styles.podiumRank} numberOfLines={1}>{entry.name.split(' ')[0]}</Text>
      <Text style={[styles.podiumMedal, { color: medalColor }]}>#{entry.rank}</Text>
      <View style={[styles.podiumBar, { height, backgroundColor: `${medalColor}22`, borderColor: `${medalColor}55` }]}>
        <Text style={[styles.podiumVisits, { color: medalColor }]}>{entry.visits}</Text>
        <Text style={styles.podiumVisitsLabel}>visits</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

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
  },
  podiumAvatarText: { fontSize: 20, fontWeight: '900', color: COLORS.white },
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
  },
  rankAvatarText: { fontSize: 15, fontWeight: '900', color: COLORS.white },
  rankName: { fontSize: 13, fontWeight: '700', color: COLORS.white, marginBottom: 2 },
  rankDetail: { fontSize: 10, color: COLORS.textMuted },
  rankCoins: { fontSize: 13, fontWeight: '800', color: COLORS.white },
  rankCoinsUnit: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },

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
  },
  infoText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
});
