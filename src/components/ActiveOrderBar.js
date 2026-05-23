import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useActiveOrderStore } from '../store/activeOrderStore';
import {
  subscribeOrderById,
  subscribeOrderCustomer,
} from '../services/cafeSupabase';
import { fetchActiveOrder } from '../services/cafeService';
import { mapCafeStatus, isTerminalCafeStatus } from '../utils/cafeStatus';
import { COLORS } from '../constants/colors';

// Statuses that should still surface the bar. Mirrors the plan's ACTIVE set;
// DELIVERED is intentionally excluded here to match the gym app's existing
// convention in cafeStatus.isTerminalCafeStatus (the auto-complete cron will
// move DELIVERED → COMPLETED within 10 minutes anyway).
const ACTIVE_STATUSES = [
  'KOT_GENERATED', 'NEW', 'PREPARING', 'READY',
  'PICKUP_CLAIMED', 'OUT_FOR_DELIVERY',
];

function shortRef(order) {
  if (order?.shortRef) return order.shortRef;
  const id = order?.id || order?.orderId;
  return id ? String(id).slice(-6).toUpperCase() : '';
}

export default function ActiveOrderBar({ navigation }) {
  const activeOrder = useActiveOrderStore(s => s.activeOrder);
  const customerId  = useActiveOrderStore(s => s.customerId);
  const setActiveOrder   = useActiveOrderStore(s => s.setActiveOrder);
  const updateOrderStatus = useActiveOrderStore(s => s.updateOrderStatus);
  const clearActiveOrder  = useActiveOrderStore(s => s.clearActiveOrder);
  const setCustomerId     = useActiveOrderStore(s => s.setCustomerId);

  // Reconcile against the server on mount (and whenever the store hydrates).
  // - server has active order → adopt it (covers cross-device discovery + status drift)
  // - server has no active order → clear any stale local entry
  // - server returns customerId → cache it for the discovery channel
  // - network error → keep whatever we have locally (don't clear on failure)
  useEffect(() => {
    const reconcile = async () => {
      try {
        const { data } = await fetchActiveOrder();
        if (data?.customerId) setCustomerId(data.customerId);

        const server = data?.order ?? null;
        const local  = useActiveOrderStore.getState().activeOrder;

        if (server) {
          const localId = local?.id || local?.orderId;
          if (!local || localId !== server.id) {
            setActiveOrder(server);
          } else if (local.status !== server.status) {
            updateOrderStatus(server.status);
          }
        } else if (local) {
          clearActiveOrder();
        }
      } catch (_) { /* offline — keep local */ }
    };

    if (useActiveOrderStore.persist.hasHydrated()) {
      reconcile();
    } else {
      const unsub = useActiveOrderStore.persist.onFinishHydration(reconcile);
      return () => unsub?.();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-order Realtime subscription — precise and the primary signal once we
  // know the orderId. Tears down + re-subscribes whenever the active order
  // identity changes.
  const orderKey = activeOrder?.id || activeOrder?.orderId || null;
  useEffect(() => {
    if (!orderKey) return undefined;
    const unsub = subscribeOrderById(orderKey, ({ status, cancelled }) => {
      if (!status) return;
      if (cancelled || isTerminalCafeStatus(status)) {
        clearActiveOrder();
      } else {
        updateOrderStatus(status);
      }
    });
    return () => unsub?.();
  }, [orderKey]);

  // Per-customer discovery channel — only active when we DON'T have a local
  // order. Once a status event arrives, hydrate via the API which will fill in
  // the active order; the effect above then takes over.
  // Use a ref to refetch only once per discovery event burst.
  const discoveryFetching = useRef(false);
  useEffect(() => {
    if (orderKey || !customerId) return undefined;
    const unsub = subscribeOrderCustomer(customerId, async ({ status }) => {
      if (!status || isTerminalCafeStatus(status)) return;
      if (discoveryFetching.current) return;
      discoveryFetching.current = true;
      try {
        const { data } = await fetchActiveOrder();
        if (data?.order) setActiveOrder(data.order);
      } catch (_) { /* ignore */ }
      finally { discoveryFetching.current = false; }
    });
    return () => unsub?.();
  }, [orderKey, customerId]);

  // ── Render gate ───────────────────────────────────────────────────────────
  if (!activeOrder) return null;
  const status = activeOrder.status;
  if (!status || !ACTIVE_STATUSES.includes(status)) return null;

  const isReady = status === 'READY';
  const { label } = mapCafeStatus(status);

  return (
    <TouchableOpacity
      style={[styles.bar, isReady && styles.barReady]}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('OrderTracking', {
        orderId: activeOrder.id || activeOrder.orderId,
        order:   activeOrder,
      })}
    >
      <Ionicons
        name="restaurant-outline"
        size={15}
        color={isReady ? '#22C55E' : COLORS.secondary}
      />
      <Text style={styles.ref}>#{shortRef(activeOrder)}</Text>
      <Text style={[styles.status, isReady && styles.statusReady]}>
        {label}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={15}
        color={isReady ? '#22C55E' : COLORS.secondary}
        style={styles.chevron}
      />
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
