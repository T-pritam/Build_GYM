import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import messaging from '@react-native-firebase/messaging';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { fetchOrderById } from '../../services/cafeService';
import { useActiveOrderStore } from '../../store/activeOrderStore';
import { mapCafeStatus, isTerminalCafeStatus, GYM_STEPS } from '../../utils/cafeStatus';

const STEP_LABELS = {
  placed:    'Order Placed',
  accepted:  'Accepted',
  preparing: 'Preparing',
  ready:     'Ready / Out for delivery',
  complete:  'Delivered',
};

function fmtTs(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function StepIcon({ stepStatus }) {
  if (stepStatus === 'done') {
    return (
      <View style={styles.stepIconDone}>
        <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
      </View>
    );
  }
  if (stepStatus === 'active') {
    return (
      <View style={styles.stepIconActive}>
        <View style={styles.stepActiveDot} />
      </View>
    );
  }
  return (
    <View style={styles.stepIconPending}>
      <View style={styles.stepPendingDot} />
    </View>
  );
}

export default function OrderTrackingScreen({ navigation, route }) {
  const { orderId: paramOrderId, order: initialOrder } = route?.params || {};
  const orderId = paramOrderId || initialOrder?.orderId || initialOrder?.id;
  const [order, setOrder] = useState(initialOrder ?? null);
  const storedActive = useActiveOrderStore(s => s.activeOrder);
  const { updateOrderStatus, clearActiveOrder } = useActiveOrderStore();
  const pollRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetchOrderById(orderId);
      const fresh = res.data || {};
      setOrder((prev) => ({ ...(prev || {}), ...fresh }));
      if (fresh.status) {
        if (isTerminalCafeStatus(fresh.status)) {
          if (storedActive?.orderId === orderId || storedActive?.id === orderId) {
            clearActiveOrder();
          }
        } else {
          updateOrderStatus(fresh.status);
        }
      }
    } catch (_) { /* keep last */ }
  }, [orderId, storedActive?.orderId, storedActive?.id]);

  useFocusEffect(useCallback(() => {
    refresh();
    pollRef.current = setInterval(refresh, 15000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [refresh]));

  // Refresh immediately on a foreground FCM matching this order
  useEffect(() => {
    if (!orderId) return;
    const unsub = messaging().onMessage((msg) => {
      const incomingId = msg?.data?.orderId;
      if (incomingId && incomingId === orderId) refresh();
    });
    return () => { try { unsub?.(); } catch (_) {} };
  }, [orderId, refresh]);

  const cafeStatus = order?.status;
  const mapped = mapCafeStatus(cafeStatus);
  const isCancelled = mapped.step === 'cancelled';

  // Cancelled state — show dedicated banner
  if (isCancelled) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.ambientGlow} pointerEvents="none" />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {orderId ? `#${String(orderId).slice(-6).toUpperCase()}` : 'Order'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.cancelledContainer}>
          <View style={styles.cancelledCard}>
            <Ionicons name="close-circle" size={56} color="#EF4444" />
            <Text style={styles.cancelledTitle}>Order Cancelled</Text>
            <Text style={styles.cancelledSub}>This order was cancelled.</Text>
            <Text style={styles.cancelledRefund}>
              If payment was captured, the refund will be processed by Razorpay within 5–7 business days.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const currentStatusIdx = GYM_STEPS.indexOf(mapped.step);

  // Per-status timestamps from the history array (oldest → newest)
  const history = order?.statusHistory ?? [];
  const ts = (cafeStatuses) => {
    for (const s of history) if (cafeStatuses.includes(s.status)) return s.createdAt;
    return null;
  };
  const timestamps = {
    placed:    ts(['KOT_GENERATED', 'PAYMENT_PENDING']) ?? order?.createdAt,
    accepted:  ts(['NEW']),
    preparing: ts(['PREPARING']),
    ready:     ts(['READY', 'PICKUP_CLAIMED', 'OUT_FOR_DELIVERY']),
    complete:  ts(['DELIVERED', 'COMPLETED']) ?? order?.completedAt,
  };

  const steps = GYM_STEPS.map((key, i) => {
    let stepStatus;
    if (i < currentStatusIdx)       stepStatus = 'done';
    else if (i === currentStatusIdx) stepStatus = 'active';
    else                             stepStatus = 'pending';
    return { key, label: STEP_LABELS[key], stepStatus, ts: timestamps[key] };
  });

  // PIN — only for GYM_APP source. Cafe backend returns deliveryPin on the
  // detail endpoint for the placing customer; fall back to the active-order
  // store if the polled detail call hasn't completed yet.
  const deliveryPin =
    order?.deliveryPin ??
    (storedActive?.orderId === orderId || storedActive?.id === orderId ? storedActive?.deliveryPin : null) ??
    null;
  const isGymOrder = (order?.orderSource ?? storedActive?.orderSource) === 'GYM_APP';
  const showPin = isGymOrder && !isTerminalCafeStatus(cafeStatus);
  const pinDigits = deliveryPin && String(deliveryPin).length === 6 ? String(deliveryPin) : '------';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Ambient glow */}
      <View style={styles.ambientGlow} pointerEvents="none" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {orderId ? `#${String(orderId).slice(-6).toUpperCase()}` : 'Order'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Status label */}
        <Text style={styles.statusLabel}>{mapped.label}</Text>

        {/* Progress stepper */}
        <View style={styles.stepperContainer}>
          {steps.map((step, index) => (
            <View key={step.key} style={styles.stepRow}>
              <View style={styles.stepLeft}>
                <StepIcon stepStatus={step.stepStatus} />
                {index < steps.length - 1 && (
                  <View style={[styles.stepLine, step.stepStatus === 'done' && styles.stepLineDone]} />
                )}
              </View>
              <View style={styles.stepContent}>
                <Text style={[
                  styles.stepLabel,
                  step.stepStatus === 'done'   && styles.stepLabelDone,
                  step.stepStatus === 'active' && styles.stepLabelActive,
                ]}>
                  {step.label}
                </Text>
                {step.ts ? (
                  <Text style={styles.stepTs}>{fmtTs(step.ts)}</Text>
                ) : step.stepStatus !== 'pending' ? null : (
                  <Text style={styles.stepTsPending}>—</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Delivery PIN — share with captain at delivery */}
        {showPin && (
          <View style={styles.otpCard}>
            <Text style={styles.otpLabel}>DELIVERY PIN</Text>
            <View style={styles.otpDigits}>
              {pinDigits.split('').map((digit, i) => (
                <View key={i} style={styles.otpDigitBox}>
                  <Text style={styles.otpDigitText}>{digit}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.otpHint}>Share this 6-digit PIN with the captain at delivery</Text>
          </View>
        )}

        {/* Order details */}
        {order && (
          <View style={styles.detailsCard}>
            <View style={styles.detailsMeta}>
              <View style={styles.detailsMetaRow}>
                <Text style={styles.detailsMetaLabel}>Order time:</Text>
                <Text style={styles.detailsMetaValue}>{fmtTs(order.createdAt) ?? '—'}</Text>
              </View>
              {order.totalAmount != null && (
                <View style={styles.detailsMetaRow}>
                  <Text style={styles.detailsMetaLabel}>Total:</Text>
                  <Text style={[styles.detailsMetaValue, { color: COLORS.secondary }]}>
                    ₹{order.totalAmount}
                  </Text>
                </View>
              )}
            </View>

            {order.items?.length > 0 && (
              <View style={styles.itemsList}>
                {order.items.map((item, i) => {
                  const qty = item.quantity ?? item.qty ?? 1;
                  const unit = Number(item.unitPrice ?? item.itemPriceCoins ?? 0);
                  return (
                    <View key={item.id ?? i} style={[styles.itemRow, i < order.items.length - 1 && styles.itemRowBorder]}>
                      {item.imageUrl ? (
                        <Image source={{ uri: item.imageUrl }} style={styles.itemThumb} />
                      ) : (
                        <View style={[styles.itemThumb, styles.itemThumbPlaceholder]}>
                          <Ionicons name="fast-food-outline" size={18} color="#555" />
                        </View>
                      )}
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name ?? item.itemName}</Text>
                        <Text style={styles.itemQty}>×{qty}</Text>
                      </View>
                      <Text style={styles.itemPrice}>₹{unit * qty}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {!isTerminalCafeStatus(cafeStatus) && (
          <View style={styles.notifHint}>
            <Ionicons name="notifications-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.notifHintText}>You'll be notified at each step.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  ambientGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 380,
    backgroundColor: 'rgba(233,99,22,0.07)',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#2C2C2E',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 60, gap: 16 },

  statusLabel: { fontSize: 16, fontWeight: '800', color: COLORS.secondary, textAlign: 'center', paddingVertical: 6 },

  cancelledContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  cancelledCard: {
    backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: '#EF444433',
    padding: 32, alignItems: 'center', gap: 10,
  },
  cancelledTitle: { fontSize: 22, fontWeight: '900', color: '#EF4444' },
  cancelledSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  cancelledRefund: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },

  stepperContainer: { paddingVertical: 8, gap: 0 },
  stepRow: { flexDirection: 'row', gap: 16 },
  stepLeft: { alignItems: 'center', width: 24 },
  stepIconDone: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  stepIconActive: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.secondaryGlow, borderWidth: 1, borderColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepActiveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.secondary },
  stepIconPending: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  stepPendingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.textMuted },
  stepLine: { width: 2, height: 44, backgroundColor: COLORS.border, marginVertical: 2 },
  stepLineDone: { backgroundColor: '#22C55E' },
  stepContent: { paddingTop: 2, paddingBottom: 16, flex: 1 },
  stepLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted },
  stepLabelDone: { color: '#22C55E' },
  stepLabelActive: { color: COLORS.secondary },
  stepTs: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  stepTsPending: { fontSize: 11, color: '#333', marginTop: 2 },

  otpCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.secondary,
    padding: 24, alignItems: 'center', gap: 16,
  },
  otpLabel: { fontSize: 11, fontWeight: '900', color: COLORS.secondary, letterSpacing: 3 },
  otpDigits: { flexDirection: 'row', gap: 8 },
  otpDigitBox: {
    width: 44, height: 54, borderRadius: 8,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.secondaryBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  otpDigitText: { fontSize: 24, fontWeight: '900', color: COLORS.secondary },
  otpHint: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },

  detailsCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  detailsMeta: { gap: 10, padding: 20, paddingBottom: 12 },
  detailsMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailsMetaLabel: { fontSize: 13, color: COLORS.textMuted },
  detailsMetaValue: { fontSize: 13, color: COLORS.textSecondary, flex: 1, textAlign: 'right', marginLeft: 8 },

  itemsList: { borderTopWidth: 1, borderTopColor: COLORS.border },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemThumb: { width: 48, height: 48, borderRadius: 10 },
  itemThumbPlaceholder: {
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  itemQty:  { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: COLORS.secondary },

  notifHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8,
  },
  notifHintText: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' },
});
