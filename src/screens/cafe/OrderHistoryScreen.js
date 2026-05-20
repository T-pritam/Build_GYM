import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchMyOrders } from '../../services/cafeService';
import { useActiveOrderStore } from '../../store/activeOrderStore';
import SafeBottomBar from '../../components/SafeBottomBar';
import { mapCafeStatus, STATUS_COLOR } from '../../utils/cafeStatus';

const STATUS_LABELS = {
  placed:    'Placed',
  accepted:  'Accepted',
  preparing: 'Preparing',
  ready:     'Ready',
  complete:  'Delivered',
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
  const mapped = mapCafeStatus(order.status);
  const statusColor = STATUS_COLOR[mapped.step] ?? '#555';
  const itemsText = order.items?.map(i => `${i.name ?? i.itemName} ×${i.quantity ?? i.qty}`).join(', ') ?? '—';
  const ref = order.id ? `#${String(order.id).slice(-6).toUpperCase()}` : (order.ref || '');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardTop}>
        <Text style={styles.cardRef}>{ref}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {STATUS_LABELS[mapped.step] ?? mapped.label}
          </Text>
        </View>
      </View>
      <Text style={styles.cardItems} numberOfLines={1}>{itemsText}</Text>
      <View style={styles.cardBottom}>
        <Text style={styles.coinsText}>₹{order.totalAmount ?? order.totalCoins ?? 0}</Text>
        <Text style={styles.timeText}>{timeAgo(order.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const PAGE_SIZE = 15;

export default function OrderHistoryScreen({ navigation }) {
  const activeOrder = useActiveOrderStore(s => s.activeOrder);
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]       = useState(false);
  const offsetRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetchMyOrders({ limit: PAGE_SIZE, offset: 0 });
      const list = res.data?.orders ?? [];
      setOrders(list);
      offsetRef.current = list.length;
      setHasMore(res.data?.hasMore ?? false);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadOrders().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }, [loadOrders]);

  const onEndReached = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetchMyOrders({ limit: PAGE_SIZE, offset: offsetRef.current });
      const more = res.data?.orders ?? [];
      setOrders(prev => [...prev, ...more]);
      offsetRef.current += more.length;
      setHasMore(res.data?.hasMore ?? false);
    } catch {
      // silently fail
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore]);

  const handlePress = (order) => {
    // If this is the active order in the store, carry over the PIN (the list
    // projection only exposes it via deliveryPin on the server for the owner).
    const activeOrderId = activeOrder?.orderId ?? activeOrder?.id;
    const enriched =
      activeOrderId === order.id && activeOrder?.deliveryPin && !order.deliveryPin
        ? { ...order, deliveryPin: activeOrder.deliveryPin, orderSource: activeOrder.orderSource }
        : order;
    navigation.navigate('OrderTracking', { orderId: order.id, order: enriched });
  };

  const renderFooter = () => {
    if (loadingMore) return <ActivityIndicator color={COLORS.secondary} style={{ marginVertical: 16 }} />;
    if (!hasMore && orders.length > 0) return <Text style={styles.endText}>— All orders loaded —</Text>;
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
    </SafeBottomBar>
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
