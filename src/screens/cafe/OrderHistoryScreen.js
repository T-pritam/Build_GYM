import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchMyOrders } from '../../services/cafeService';
import { useActiveOrderStore } from '../../store/activeOrderStore';

const STATUS_COLORS = {
  received:  '#3B82F6',
  preparing: '#EAB308',
  ready:     '#22C55E',
  done:      '#555555',
  cancelled: '#EF4444',
};

const STATUS_LABELS = {
  received:  'Placed',
  preparing: 'Preparing',
  ready:     'Ready',
  done:      'Done',
  cancelled: 'Cancelled',
};

function timeAgo(createdAt) {
    const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    return new Date(createdAt).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

function OrderRow({ order, onPress }) {
  const statusColor = STATUS_COLORS[order.status] ?? '#555';
  const itemsText = order.items?.map(i => `${i.itemName} ×${i.qty}`).join(', ') ?? '—';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardTop}>
        <Text style={styles.cardRef}>{order.ref}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[order.status] ?? order.status}</Text>
        </View>
      </View>
      <Text style={styles.cardItems} numberOfLines={1}>{itemsText}</Text>
      <View style={styles.cardBottom}>
        <View style={styles.coinsRow}>
          <Ionicons name="logo-bitcoin" size={13} color={COLORS.secondary} />
          <Text style={styles.coinsText}>{order.totalCoins} coins</Text>
        </View>
        <Text style={styles.timeText}>{timeAgo(order.createdAt)}</Text>
      </View>
      {/* <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={styles.chevron} /> */}
    </TouchableOpacity>
  );
}

export default function OrderHistoryScreen({ navigation }) {
  const activeOrder = useActiveOrderStore(s => s.activeOrder);
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore]       = useState(false);

  const loadOrders = useCallback(async (cursor = null, replace = true) => {
    try {
      const res = await fetchMyOrders({ limit: 10, cursor });
      const { data = [], nextCursor: nc, hasMore: hm } = res.data;
      setOrders(prev => replace ? data : [...prev, ...data]);
      setNextCursor(nc ?? null);
      setHasMore(hm ?? false);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadOrders().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders(null, true);
    setRefreshing(false);
  }, [loadOrders]);

  const onEndReached = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursor) return;
    setLoadingMore(true);
    await loadOrders(nextCursor, false);
    setLoadingMore(false);
  }, [hasMore, loadingMore, nextCursor, loadOrders]);

  const handlePress = (order) => {
    // If this is the current active order, use the store version which has the OTP
    const enriched =
      activeOrder?.id === order.id && activeOrder?.pickupOtp
        ? { ...order, pickupOtp: activeOrder.pickupOtp }
        : order;
    navigation.navigate('OrderTracking', { orderId: order.id, order: enriched });
  };

  const renderFooter = () => {
    if (loadingMore) return <ActivityIndicator color={COLORS.secondary} style={{ marginVertical: 16 }} />;
    if (!hasMore && orders.length > 0) return <Text style={styles.endText}>— All orders loaded —</Text>;
    return null;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.glow} pointerEvents="none" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.secondary} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <OrderRow order={item} onPress={() => handlePress(item)} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color="#333" />
              <Text style={styles.emptyText}>No orders yet</Text>
              <Text style={styles.emptySubText}>Your café orders will appear here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 260, backgroundColor: 'rgba(233,99,22,0.07)' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#1C1C1E',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white },

  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: '#333',
    padding: 16, position: 'relative',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardRef: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'monospace' },
  statusBadge: {
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardItems: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 10 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  coinsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  coinsText: { color: COLORS.secondary, fontSize: 13, fontWeight: '700' },
  timeText: { color: COLORS.textMuted, fontSize: 11 },
  chevron: { position: 'absolute', right: 16, top: '50%' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '700' },
  emptySubText: { color: COLORS.textMuted, fontSize: 13 },
  endText: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center', marginVertical: 16 },
});
