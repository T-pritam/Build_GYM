import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  ActivityIndicator, RefreshControl, Image, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS as THEME, FONTS } from '../../theme';
import {
  getLeaderboard, getHallOfFame, getMemberStatSheet, setLeaderboardConsent,
} from '../../services/leaderboardService';
import { logEvent } from '../../services/analyticsService';

const COLORS = { ...THEME, surface: THEME.surfaceLow };
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function shortName(n) { return n || 'Member'; }

export default function LeaderboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('board'); // board | fame
  const [hof, setHof] = useState([]);
  const [statSheet, setStatSheet] = useState(null);
  const [explainer, setExplainer] = useState(false);
  const [joining, setJoining] = useState(false);
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
  useEffect(() => { if (tab === 'fame' && hof.length === 0) getHallOfFame(0).then(setHof).catch(() => {}); }, [tab]);

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

  const top10 = data?.top10 || [];
  const podium = top10.slice(0, 3);
  const rest = top10.slice(3, 10);
  const waitingSlots = Math.max(0, 3 - podium.length);

  // "resets in X days"
  const daysLeft = data ? new Date(data.year, data.month, 0).getDate() - new Date().getDate() : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Leaderboard</Text>
          <Text style={styles.subtitle}>
            {MONTHS[data?.month]} {data?.year} · resets in {daysLeft} day{daysLeft === 1 ? '' : 's'}
          </Text>
          {!!data?.updatedAgo && <Text style={styles.updatedAgo}>Updated {data.updatedAgo}</Text>}
        </View>
        <TouchableOpacity onPress={() => setExplainer(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="information-circle-outline" size={24} color={COLORS.primaryLight} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {[['board', 'This Month'], ['fame', 'Hall of Fame']].map(([k, label]) => (
          <TouchableOpacity key={k} style={[styles.tabBtn, tab === k && styles.tabBtnOn]} onPress={() => setTab(k)}>
            <Text style={[styles.tabTxt, tab === k && styles.tabTxtOn]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} />}
      >
        {error && <Text style={styles.errorText}>{error}</Text>}

        {tab === 'board' ? (
          <>
            {/* Excluded banner */}
            {data?.excluded && (
              <View style={styles.banner}>
                <Ionicons name="alert-circle-outline" size={18} color={COLORS.warning} />
                <Text style={styles.bannerTxt}>You're currently not eligible for the leaderboard — please contact the front desk.</Text>
              </View>
            )}

            {/* Podium */}
            <View style={styles.podium}>
              {/* order: #2 left, #1 center, #3 right */}
              {[podium[1], podium[0], podium[2]].map((p, i) => {
                const place = i === 1 ? 0 : i === 0 ? 1 : 2; // map to rank index
                if (!p) return <View key={i} style={[styles.podCard, styles.podPlaceholder, place === 0 && styles.podCenter]}>
                  <Ionicons name="person-outline" size={20} color={COLORS.textDim} />
                  <Text style={styles.waitTxt}>This spot is{'\n'}waiting for you</Text>
                </View>;
                return (
                  <TouchableOpacity key={p.memberId} style={[styles.podCard, place === 0 && styles.podCenter]} onPress={() => openStatSheet(p.memberId)}>
                    <View style={[styles.podRing, { borderColor: MEDAL_COLORS[place] }]}>
                      {p.avatarUrl ? <Image source={{ uri: p.avatarUrl }} style={styles.podAvatar} /> : <Text style={styles.podInitial}>{(p.name || '?')[0]}</Text>}
                      {place === 0 && <Text style={styles.crown}>👑</Text>}
                    </View>
                    <Text style={styles.podName} numberOfLines={1}>{shortName(p.name)}</Text>
                    <Text style={styles.podPts}>{p.points} pts</Text>
                    <Text style={styles.podStreak}>🔥 {p.currentStreak}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Ranks 4–10 */}
            {rest.map((p) => {
              const mine = p.memberId === data?.myRank?.memberId;
              return (
                <TouchableOpacity key={p.memberId} style={[styles.row, mine && styles.rowMine]} onPress={() => openStatSheet(p.memberId)}>
                  <Text style={styles.rowRank}>#{p.rank}</Text>
                  <View style={styles.rowAvatar}>
                    {p.avatarUrl ? <Image source={{ uri: p.avatarUrl }} style={styles.rowAvatarImg} /> : <Text style={styles.rowInitial}>{(p.name || '?')[0]}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{shortName(p.name)}</Text>
                    <Text style={styles.rowMeta}>🔥 {p.currentStreak} · {p.checkinDays} check-ins</Text>
                  </View>
                  <Text style={styles.rowPts}>{p.points}</Text>
                </TouchableOpacity>
              );
            })}

            {/* Waiting placeholders to fill out the list for a new gym */}
            {top10.length < 10 && Array.from({ length: Math.min(3, 10 - top10.length) }).map((_, i) => (
              <View key={`w${i}`} style={[styles.row, styles.rowWaiting]}>
                <Text style={styles.rowRank}>#{top10.length + i + 1}</Text>
                <View style={styles.rowAvatar}><Ionicons name="person-outline" size={16} color={COLORS.textDim} /></View>
                <Text style={[styles.rowName, { color: COLORS.textDim, flex: 1 }]}>This spot is waiting for you</Text>
              </View>
            ))}
          </>
        ) : (
          // Hall of Fame
          <View style={{ paddingHorizontal: 16 }}>
            {hof.length === 0 ? (
              <Text style={styles.emptyTxt}>No past champions yet.</Text>
            ) : hof.map((m) => (
              <View key={`${m.month}-${m.year}`} style={styles.hofCard}>
                <Text style={styles.hofMonth}>{MONTHS[m.month]} {m.year}</Text>
                <View style={styles.hofRow}>
                  {(m.winners || []).map((w) => (
                    <View key={w.id} style={styles.hofWinner}>
                      <Text style={styles.hofMedal}>{['🥇', '🥈', '🥉'][w.rank - 1]}</Text>
                      {w.profileSnapshot?.avatarUrl
                        ? <Image source={{ uri: w.profileSnapshot.avatarUrl }} style={styles.hofAvatar} />
                        : <View style={styles.hofAvatar}><Text style={styles.rowInitial}>{(w.profileSnapshot?.name || '?')[0]}</Text></View>}
                      <Text style={styles.hofName} numberOfLines={1}>{shortName(w.profileSnapshot?.name)}</Text>
                      <Text style={styles.hofPts}>{w.score} pts</Text>
                      {!!w.profileSnapshot?.perk && <Text style={styles.hofPerk}>Won: {w.profileSnapshot.perk}</Text>}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Pinned own-rank / Join banner */}
      {tab === 'board' && (
        <View style={styles.pinned}>
          {!data?.optedIn ? (
            <View style={styles.joinCard}>
              <Text style={styles.joinTxt}>Join the leaderboard to see your rank and win monthly rewards</Text>
              <TouchableOpacity style={styles.joinBtn} onPress={join} disabled={joining}>
                {joining ? <ActivityIndicator color="#fff" /> : <Text style={styles.joinBtnTxt}>Join 💪</Text>}
              </TouchableOpacity>
            </View>
          ) : data?.myRank && data.myRank.rank > 10 ? (
            <View style={styles.myCard}>
              <Text style={styles.myRankTxt}>Your rank: #{data.myRank.rank} of {data.totalParticipants}</Text>
              <Text style={styles.myPtsTxt}>
                {data.myRank.points} pts{data.ptsToTop10 != null ? ` · ${data.ptsToTop10} pts to break into the Top 10` : ''}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Stat-sheet drawer */}
      <Modal visible={!!statSheet} transparent animationType="slide" onRequestClose={() => setStatSheet(null)}>
        <TouchableOpacity style={styles.drawerOverlay} activeOpacity={1} onPress={() => setStatSheet(null)}>
          <View style={styles.drawer}>
            <View style={styles.drawerHandle} />
            <Text style={styles.drawerName}>{shortName(statSheet?.name)}</Text>
            <Text style={styles.drawerRank}>Rank #{statSheet?.rank} · {statSheet?.points} pts</Text>
            <View style={styles.drawerStats}>
              <Stat label="Check-ins" value={statSheet?.checkinDays} />
              <Stat label="Workouts" value={statSheet?.workoutDays} />
              <Stat label="Streak" value={`${statSheet?.currentStreak}🔥`} />
              <Stat label="Longest" value={statSheet?.longestStreak} />
            </View>
            {statSheet?.breakdown && (
              <Text style={styles.breakdown}>
                Check-ins {statSheet.breakdown.checkins} · Workouts {statSheet.breakdown.workouts} · Streak {statSheet.breakdown.streak} · Bonuses {statSheet.breakdown.bonuses}
              </Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.textMuted, fontFamily: FONTS?.body },
  comingSoon: { color: COLORS.textSecondary, fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800' },
  subtitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  updatedAgo: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  tabBtnOn: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primaryBorder },
  tabTxt: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
  tabTxtOn: { color: COLORS.primaryLight },
  errorText: { color: COLORS.errorBright, textAlign: 'center', margin: 16 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: COLORS.warningSoft },
  bannerTxt: { color: COLORS.warning, fontSize: 12, flex: 1 },
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  podCard: { flex: 1, alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 16, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border },
  podCenter: { paddingVertical: 22, borderColor: COLORS.primaryBorder, backgroundColor: COLORS.primarySoft },
  podPlaceholder: { opacity: 0.5 },
  podRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  podAvatar: { width: 50, height: 50, borderRadius: 25 },
  podInitial: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800' },
  crown: { position: 'absolute', top: -18, fontSize: 18 },
  podName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', marginTop: 8 },
  podPts: { color: COLORS.primaryLight, fontSize: 12, fontWeight: '700', marginTop: 2 },
  podStreak: { color: COLORS.textMuted, fontSize: 11 },
  waitTxt: { color: COLORS.textDim, fontSize: 10, textAlign: 'center', marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  rowMine: { borderColor: COLORS.primaryNeon, borderWidth: 1.5 },
  rowWaiting: { opacity: 0.5 },
  rowRank: { color: COLORS.textMuted, fontWeight: '800', width: 30 },
  rowAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  rowAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  rowInitial: { color: COLORS.textPrimary, fontWeight: '800' },
  rowName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  rowMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  rowPts: { color: COLORS.primaryLight, fontSize: 16, fontWeight: '900' },
  emptyTxt: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
  hofCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  hofMonth: { color: COLORS.textPrimary, fontWeight: '800', marginBottom: 10 },
  hofRow: { flexDirection: 'row', gap: 10 },
  hofWinner: { flex: 1, alignItems: 'center' },
  hofMedal: { fontSize: 18 },
  hofAvatar: { width: 40, height: 40, borderRadius: 20, marginVertical: 4, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  hofName: { color: COLORS.textPrimary, fontSize: 11, fontWeight: '700' },
  hofPts: { color: COLORS.primaryLight, fontSize: 11 },
  hofPerk: { color: COLORS.textMuted, fontSize: 9, textAlign: 'center', marginTop: 2 },
  pinned: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 },
  joinCard: { backgroundColor: COLORS.surface2, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.primaryBorder },
  joinTxt: { color: COLORS.textPrimary, fontSize: 13, marginBottom: 10 },
  joinBtn: { backgroundColor: COLORS.primaryBright, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  joinBtnTxt: { color: '#fff', fontWeight: '800' },
  myCard: { backgroundColor: COLORS.surface2, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.primaryBorder },
  myRankTxt: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },
  myPtsTxt: { color: COLORS.primaryLight, fontSize: 12, marginTop: 2 },
  drawerOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  drawer: { backgroundColor: COLORS.surfaceLow, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  drawerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.textDim, alignSelf: 'center', marginBottom: 16 },
  drawerName: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800' },
  drawerRank: { color: COLORS.primaryLight, fontSize: 13, marginTop: 4, marginBottom: 16 },
  drawerStats: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, backgroundColor: COLORS.surface2, borderRadius: 12, padding: 12, alignItems: 'center' },
  statVal: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900' },
  statLbl: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  breakdown: { color: COLORS.textSecondary, fontSize: 12, marginTop: 16, textAlign: 'center' },
  explainLine: { color: COLORS.textSecondary, fontSize: 13, marginTop: 8 },
});
