import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import { BASE_API_URL } from '@env';
import { COLORS } from '../../constants/colors';

// Derive socket URL — strip /api suffix
const SOCKET_URL = BASE_API_URL.replace(/\/api\/?$/, '');

const STATUS_STEPS = ['received', 'preparing', 'ready', 'done'];
const STEP_LABELS = {
  received:  'Order Placed',
  preparing: 'Preparing',
  ready:     'Ready for Pickup',
  done:      'Completed',
};

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
  const [order, setOrder] = useState(initialOrder);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!orderId) return;

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.emit('join:order', orderId);

    socket.on('order:status_updated', ({ orderId: id, status }) => {
      if (id === orderId) {
        setOrder((prev) => prev ? { ...prev, status } : prev);
      }
    });

    return () => socket.disconnect();
  }, [orderId]);

  const currentStatusIdx = STATUS_STEPS.indexOf(order?.status ?? 'received');

  // Build step states relative to current status
  const steps = STATUS_STEPS.slice(0, 3).map((key, i) => {
    let stepStatus;
    if (i < currentStatusIdx)       stepStatus = 'done';
    else if (i === currentStatusIdx) stepStatus = 'active';
    else                             stepStatus = 'pending';
    return { key, label: STEP_LABELS[key], stepStatus };
  });

  const otp = order?.pickupOtp ?? '------';

  function timeStr(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

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
              </View>
            </View>
          ))}
        </View>

        {/* OTP card */}
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

        {/* Order details */}
        {order && (
          <View style={styles.detailsCard}>
            <View style={styles.detailsMeta}>
              <View style={styles.detailsMetaRow}>
                <Text style={styles.detailsMetaLabel}>Order time:</Text>
                <Text style={styles.detailsMetaValue}>{timeStr(order.createdAt)}</Text>
              </View>
              <View style={styles.detailsMetaRow}>
                <Text style={styles.detailsMetaLabel}>Total:</Text>
                <Text style={[styles.detailsMetaValue, { color: COLORS.secondary }]}>
                  {order.totalCoins} coins
                </Text>
              </View>
              <View style={styles.detailsMetaRow}>
                <Text style={styles.detailsMetaLabel}>Items:</Text>
                <Text style={styles.detailsMetaValue}>
                  {order.items?.map((i) => `${i.itemName} ×${i.qty}`).join(', ')}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Notification hint */}
        <View style={styles.notifHint}>
          <Ionicons name="notifications-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.notifHintText}>You'll be notified when your order is ready.</Text>
        </View>
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
  stepLine: { width: 2, height: 40, backgroundColor: COLORS.border, marginVertical: 2 },
  stepLineDone: { backgroundColor: '#22C55E' },
  stepContent: { paddingTop: 2, paddingBottom: 16, flex: 1 },
  stepLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted },
  stepLabelDone: { color: '#22C55E' },
  stepLabelActive: { color: COLORS.secondary },

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
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 20,
  },
  detailsMeta: { gap: 10 },
  detailsMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailsMetaLabel: { fontSize: 13, color: COLORS.textMuted },
  detailsMetaValue: { fontSize: 13, color: COLORS.textSecondary, flex: 1, textAlign: 'right', marginLeft: 8 },

  // Notification hint
  notifHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8,
  },
  notifHintText: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' },
});
