import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS as THEME, FONTS } from '../../theme';

// Theme-compat: legacy colour keys -> new "Holographic Noir" palette.
const COLORS = {
  secondary: THEME.primaryLight, secondaryDeep: THEME.primary,
  secondaryGlow: THEME.primarySoft, secondaryBorder: THEME.primaryBorder,
  background: THEME.background, surface: '#1B191E', surface2: THEME.surface2,
  white: THEME.white, textPrimary: THEME.textPrimary, textSecondary: THEME.textSecondary,
  textMuted: THEME.textMuted, border: THEME.border, primarySoft: THEME.primarySoft,
};
import { fetchRewardBalance, fetchRewardTransactions } from '../../services/cafeService';
import SafeBottomBar from '../../components/SafeBottomBar';

const FIRST_BATCH = 50;
const PAGE_SIZE = 15;

const REASON_META = {
  EARNED:           { label: 'Earned',     icon: 'star' },
  REDEEMED:         { label: 'Redeemed',   icon: 'star-half' },
  ADMIN_ADJUSTMENT: { label: 'Adjustment', icon: 'construct' },
  EXPIRY:           { label: 'Expired',    icon: 'time' },
};

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function TxnRow({ txn, onPress }) {
  const meta = REASON_META[txn.reason] ?? { label: txn.reason, icon: 'star' };
  const positive = txn.delta >= 0;
  const orderRef = txn.order ? `#${String(txn.order.id).slice(-6).toUpperCase()}` : null;
  const Wrapper = txn.order ? TouchableOpacity : View;

  return (
    <Wrapper style={styles.txnRow} onPress={txn.order ? onPress : undefined} activeOpacity={0.75}>
      <View
        style={[
          styles.txnIcon,
          { backgroundColor: positive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' },
        ]}
      >
        <Ionicons name={meta.icon} size={16} color={positive ? '#22C55E' : '#EF4444'} />
      </View>
      <View style={styles.txnInfo}>
        <Text style={styles.txnLabel}>{meta.label}</Text>
        <Text style={styles.txnSub}>
          {orderRef ? `Order ${orderRef} · ` : ''}
          {fmtDate(txn.createdAt)}
        </Text>
        {txn.note ? <Text style={styles.txnNote}>{txn.note}</Text> : null}
      </View>
      <View style={styles.txnRight}>
        <Text style={[styles.txnDelta, { color: positive ? '#22C55E' : '#EF4444' }]}>
          {positive ? '+' : ''}
          {txn.delta} pts
        </Text>
        {txn.rate != null && <Text style={styles.txnRate}>₹{Number(txn.rate).toFixed(0)}/pt</Text>}
      </View>
      {txn.order && <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />}
    </Wrapper>
  );
}

export default function RewardsScreen({ navigation }) {
  const [balance, setBalance]         = useState(0);
  const [worth, setWorth]             = useState(0);
  const [txns, setTxns]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(false);
  const offsetRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const loadAll = useCallback(async () => {
    try {
      const [balRes, txnRes] = await Promise.all([
        fetchRewardBalance(),
        fetchRewardTransactions({ limit: FIRST_BATCH, offset: 0 }),
      ]);
      setBalance(balRes.data?.points ?? 0);
      setWorth(balRes.data?.worthInRupees ?? 0);
      const list = txnRes.data?.transactions ?? [];
      setTxns(list);
      offsetRef.current = list.length;
      setHasMore(txnRes.data?.hasMore ?? false);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const onEndReached = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetchRewardTransactions({ limit: PAGE_SIZE, offset: offsetRef.current });
      const more = res.data?.transactions ?? [];
      setTxns(prev => [...prev, ...more]);
      offsetRef.current += more.length;
      setHasMore(res.data?.hasMore ?? false);
    } catch {
      // silently fail
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore]);

  const renderFooter = () => {
    if (loadingMore) return <ActivityIndicator color={COLORS.secondary} style={{ marginVertical: 16 }} />;
    if (!hasMore && txns.length > 0) return <Text style={styles.endText}>— End of history —</Text>;
    return null;
  };

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.glow} pointerEvents="none" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Rewards</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Balance */}
      <View style={styles.balanceCard}>
        <Ionicons name="star" size={26} color={COLORS.secondary} />
        <Text style={styles.balanceValue}>{balance}</Text>
        <Text style={styles.balanceLabel}>Available points</Text>
        <Text style={styles.balanceWorth}>worth ₹{Number(worth).toFixed(0)}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.secondary} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={txns}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TxnRow
              txn={item}
              onPress={() =>
                item.order && navigation.navigate('OrderTracking', { orderId: item.order.id })
              }
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="star-outline" size={48} color="#333" />
              <Text style={styles.emptyText}>No reward activity yet</Text>
              <Text style={styles.emptySubText}>Earn points on every café order</Text>
            </View>
          }
        />
      )}
    </SafeBottomBar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 260, backgroundColor: 'rgba(127,41,130,0.10)' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  headerTitle: { fontFamily: FONTS.headline, fontSize: 16, color: COLORS.textPrimary, letterSpacing: 3 },

  balanceCard: {
    alignItems: 'center', marginHorizontal: 16, marginBottom: 8,
    backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.secondaryBorder, paddingVertical: 22,
  },
  balanceValue: { fontFamily: FONTS.display, fontSize: 40, color: COLORS.white, marginTop: 6 },
  balanceLabel: {
    fontFamily: FONTS.label, fontSize: 10, color: COLORS.secondary,
    letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2,
  },
  balanceWorth: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: COLORS.textMuted, marginTop: 4 },

  list: { paddingHorizontal: 16, paddingBottom: 40 },

  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  txnIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  txnInfo: { flex: 1, gap: 2 },
  txnLabel: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white },
  txnSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },
  txnNote: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' },
  txnRight: { alignItems: 'flex-end' },
  txnDelta: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  txnRate: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.textMuted },
  separator: { height: 1, backgroundColor: COLORS.border },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontFamily: FONTS.bodyBold, color: COLORS.textSecondary, fontSize: 16 },
  emptySubText: { fontFamily: FONTS.body, color: COLORS.textMuted, fontSize: 13 },
  endText: { fontFamily: FONTS.body, color: COLORS.textMuted, fontSize: 11, textAlign: 'center', marginVertical: 16 },
});
