import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchOrderById } from '../../services/cafeService';
import { useActiveOrderStore } from '../../store/activeOrderStore';
import { getSocket } from '../../services/socketService';

const STATUS_STEPS = ['placed', 'accepted', 'preparing', 'ready', 'complete'];
const STEP_LABELS = {
  placed:    'Order Placed',
  accepted:  'Accepted',
  preparing: 'Preparing',
  ready:     'Ready for Pickup',
  complete:  'Completed',
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
  const { orderId, order: initialOrder } = route?.params || {};
  const [order, setOrder] = useState(initialOrder ?? null);
  const storedActive = useActiveOrderStore(s => s.activeOrder);
  const { updateOrderStatus, clearActiveOrder } = useActiveOrderStore();

  // Fetch order from API when navigating from history/transactions (no initialOrder)
  useEffect(() => {
    if (!initialOrder && orderId) {
      fetchOrderById(orderId)
        .then(res => setOrder(res.data.data))
        .catch(() => {});
    }
  }, [orderId]);

  // Socket: use the singleton so we're guaranteed to be in the room before
  // any status update fires (no race with a fresh socket connecting late).
  useEffect(() => {
    if (!orderId) return;

    const socket = getSocket();

    const joinRoom = () => socket.emit('join:order', orderId);

    // Join immediately if already connected, else wait for connect event
    if (socket.connected) {
      joinRoom();
    }
    socket.on('connect', joinRoom);

    const handleStatusUpdate = ({ orderId: id, status }) => {
      if (id !== orderId) return;
      setOrder((prev) => prev ? { ...prev, status } : prev);
      // Keep store in sync so HOC reflects the latest status
      if (status === 'complete' || status === 'done' || status === 'cancelled') {
        clearActiveOrder();
      } else {
        updateOrderStatus(status);
      }
    };

    socket.on('order:status_updated', handleStatusUpdate);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('order:status_updated', handleStatusUpdate);
      // Do NOT disconnect — singleton is shared across the app
    };
  }, [orderId]);

  // Cancelled state — show dedicated banner
  if (order?.status === 'cancelled') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.ambientGlow} pointerEvents="none" />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{order?.ref ?? 'Order'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.cancelledContainer}>
          <View style={styles.cancelledCard}>
            <Ionicons name="close-circle" size={56} color="#EF4444" />
            <Text style={styles.cancelledTitle}>Order Cancelled</Text>
            <Text style={styles.cancelledSub}>
              Your order {order.ref} was cancelled.
            </Text>
            {order.cancelledAt ? (
              <Text style={styles.cancelledTime}>{fmtTs(order.cancelledAt)}</Text>
            ) : null}
            {order.cancelNote ? (
              <View style={styles.cancelNoteBox}>
                <Ionicons name="chatbubble-outline" size={14} color="#888" />
                <Text style={styles.cancelNoteText}>"{order.cancelNote}"</Text>
              </View>
            ) : null}
            <Text style={styles.cancelledRefund}>
              {order.totalCoins} Build Coins have been refunded to your wallet.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const currentStatusIdx = STATUS_STEPS.indexOf(order?.status ?? 'placed');

  // Per-status timestamps
  const timestamps = {
    placed:    order?.createdAt,
    accepted:  order?.acceptedAt,
    preparing: order?.preparingAt,
    ready:     order?.readyAt,
    complete:  order?.completedAt,
  };

  // Build step states relative to current status
  const steps = STATUS_STEPS.map((key, i) => {
    let stepStatus;
    if (i < currentStatusIdx)       stepStatus = 'done';
    else if (i === currentStatusIdx) stepStatus = 'active';
    else                             stepStatus = 'pending';
    return { key, label: STEP_LABELS[key], stepStatus, ts: timestamps[key] };
  });

  const otp =
    order?.pickupOtp ??
    (storedActive?.id === order?.id ? storedActive?.pickupOtp : null) ??
    '------';

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
        <Text style={styles.headerTitle}>{order?.ref ?? 'Order'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

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

        {/* OTP card — only show when order is not complete */}
        {order?.status !== 'complete' && order?.status !== 'done' && (
          <View style={styles.otpCard}>
            <Text style={styles.otpLabel}>YOUR PICKUP OTP</Text>
            <View style={styles.otpDigits}>
              {otp.split('').map((digit, i) => (
                <View key={i} style={styles.otpDigitBox}>
                  <Text style={styles.otpDigitText}>{digit}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.otpHint}>Show this code to the café staff</Text>
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
              <View style={styles.detailsMetaRow}>
                <Text style={styles.detailsMetaLabel}>Total:</Text>
                <Text style={[styles.detailsMetaValue, { color: COLORS.secondary }]}>
                  {order.totalCoins} coins
                </Text>
              </View>
            </View>

            {/* Items list with images */}
            {order.items?.length > 0 && (
              <View style={styles.itemsList}>
                {order.items.map((item, i) => (
                  <View key={item.id ?? i} style={[styles.itemRow, i < order.items.length - 1 && styles.itemRowBorder]}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.itemThumb} />
                    ) : (
                      <View style={[styles.itemThumb, styles.itemThumbPlaceholder]}>
                        <Ionicons name="fast-food-outline" size={18} color="#555" />
                      </View>
                    )}
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.itemName}</Text>
                      <Text style={styles.itemQty}>×{item.qty}</Text>
                    </View>
                    <Text style={styles.itemPrice}>{item.itemPriceCoins * item.qty} coins</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Notification hint */}
        {order?.status !== 'complete' && order?.status !== 'done' && (
          <View style={styles.notifHint}>
            <Ionicons name="notifications-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.notifHintText}>You'll be notified when your order is ready.</Text>
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

  // Cancelled state
  cancelledContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  cancelledCard: {
    backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: '#EF444433',
    padding: 32, alignItems: 'center', gap: 10,
  },
  cancelledTitle: { fontSize: 22, fontWeight: '900', color: '#EF4444' },
  cancelledSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  cancelledTime: { fontSize: 12, color: '#888' },
  cancelNoteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: 8 },
  cancelNoteText: { fontSize: 13, color: '#888', fontStyle: 'italic', flex: 1, textAlign: 'center' },
  cancelledRefund: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },

  // Stepper
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

  // OTP card
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
  otpHint: { fontSize: 13, color: COLORS.textMuted },

  // Details card
  detailsCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  detailsMeta: { gap: 10, padding: 20, paddingBottom: 12 },
  detailsMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailsMetaLabel: { fontSize: 13, color: COLORS.textMuted },
  detailsMetaValue: { fontSize: 13, color: COLORS.textSecondary, flex: 1, textAlign: 'right', marginLeft: 8 },

  // Items list
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

  // Notification hint
  notifHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8,
  },
  notifHintText: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' },
});
