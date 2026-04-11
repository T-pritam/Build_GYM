import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useActiveOrderStore } from '../store/activeOrderStore';
import { getSocket } from '../services/socketService';
import { fetchMyOrders } from '../services/cafeService';
import { COLORS } from '../constants/colors';

const STATUS_LABELS = {
  received:  'Order Placed',
  preparing: 'Preparing your order...',
  ready:     'Ready for Pickup!',
};

const ACTIVE_STATUSES = ['received', 'preparing', 'ready'];

export default function ActiveOrderBar({ navigation }) {
  const { activeOrder, setActiveOrder, updateOrderStatus, clearActiveOrder } = useActiveOrderStore();

  // On mount (after store hydration): fetch latest orders from API.
  // - If an active order exists → sync status.
  // - If nothing active → clear any stale persisted order (e.g. from a previous day).
  useEffect(() => {
    const checkApi = async () => {
      try {
        const res = await fetchMyOrders({ limit: 5 });
        const active = (res.data.data ?? []).find(o =>
          ['received', 'preparing', 'ready'].includes(o.status)
        );
        if (active) {
          const stored = useActiveOrderStore.getState().activeOrder;
          if (stored?.id === active.id) {
            updateOrderStatus(active.status);
          } else {
            setActiveOrder(active);
          }
        } else {
          // No active order on server — clear any stale persisted order
          clearActiveOrder();
        }
      } catch {}
    };

    if (useActiveOrderStore.persist.hasHydrated()) {
      checkApi();
    } else {
      const unsub = useActiveOrderStore.persist.onFinishHydration(checkApi);
      return () => unsub?.();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Join the order room on the singleton socket whenever activeOrder changes.
  // Re-join on reconnect so we never miss events after a network drop.
  useEffect(() => {
    if (!activeOrder?.id) return;
    const socket = getSocket();

    const joinRoom = () => socket.emit('join:order', activeOrder.id);

    if (socket.connected) joinRoom();
    socket.on('connect', joinRoom);

    const handler = ({ orderId, status }) => {
      if (orderId !== activeOrder.id) return;
      if (status === 'done' || status === 'cancelled') {
        clearActiveOrder();
      } else {
        updateOrderStatus(status);
      }
    };

    socket.on('order:status_updated', handler);
    return () => {
      socket.off('connect', joinRoom);
      socket.off('order:status_updated', handler);
    };
  }, [activeOrder?.id]);

  // Hide bar if no active order, terminal status, or order was placed before today
  if (!activeOrder || !ACTIVE_STATUSES.includes(activeOrder.status)) return null;
  const today = new Date().toDateString();
  if (activeOrder.createdAt && new Date(activeOrder.createdAt).toDateString() !== today) {
    clearActiveOrder();
    return null;
  }

  const isReady = activeOrder.status === 'ready';

  return (
    <TouchableOpacity
      style={[styles.bar, isReady && styles.barReady]}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('OrderTracking', { orderId: activeOrder.id, order: activeOrder })}
    >
      <Ionicons name="restaurant-outline" size={15} color={isReady ? '#22C55E' : COLORS.secondary} />
      <Text style={styles.ref}>{activeOrder.ref}</Text>
      <Text style={[styles.status, isReady && styles.statusReady]}>
        {STATUS_LABELS[activeOrder.status]}
      </Text>
      <Ionicons name="chevron-forward" size={15} color={isReady ? '#22C55E' : COLORS.secondary} style={styles.chevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1A1A1A', borderTopWidth: 1, borderTopColor: COLORS.secondaryBorder,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  barReady: {
    borderTopColor: '#22C55E55', backgroundColor: '#0D1F0D',
  },
  ref: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'monospace' },
  status: { color: COLORS.secondary, fontSize: 13, fontWeight: '700', flex: 1 },
  statusReady: { color: '#22C55E' },
  chevron: { marginLeft: 'auto' },
});
