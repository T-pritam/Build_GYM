import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { currentOrder } from '../../constants/dummyData';

const STEPS = [
  {
    key: 'placed',
    label: 'Order Placed',
    sub: 'Completed at 12:05 PM',
    status: 'done',   // done | active | pending
  },
  {
    key: 'preparing',
    label: 'Preparing',
    sub: 'Estimated ~15 mins',
    status: 'active',
  },
  {
    key: 'pickup',
    label: 'Ready for Pickup',
    sub: 'Waiting for preparation',
    status: 'pending',
  },
];

export default function OrderTrackingScreen({ navigation, route }) {
  const { orderId, cart = [], totalCoins = 0 } = route?.params || {};
  const otp = currentOrder?.pickupOTP || '482715';
  const orderNumber = orderId || currentOrder?.id || 1042;

  const firstItem = cart[0] || { name: 'Whey Protein Shake', qty: 1, price: 120 };

  const StepIcon = ({ status }) => {
    if (status === 'done') {
      return (
        <View style={styles.stepIconDone}>
          <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
        </View>
      );
    }
    if (status === 'active') {
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
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Amber glow */}
      <View style={styles.ambientGlow} pointerEvents="none" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{orderNumber}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Progress stepper */}
        <View style={styles.stepperContainer}>
          {STEPS.map((step, index) => (
            <View key={step.key} style={styles.stepRow}>
              <View style={styles.stepLeft}>
                <StepIcon status={step.status} />
                {index < STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      step.status === 'done' && styles.stepLineDone,
                    ]}
                  />
                )}
              </View>
              <View style={styles.stepContent}>
                <Text
                  style={[
                    styles.stepLabel,
                    step.status === 'done' && styles.stepLabelDone,
                    step.status === 'active' && styles.stepLabelActive,
                  ]}
                >
                  {step.label}
                </Text>
                <Text
                  style={[
                    styles.stepSub,
                    step.status === 'active' && styles.stepSubActive,
                  ]}
                >
                  {step.sub}
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
        <View style={styles.detailsCard}>
          <View style={styles.detailsRow}>
            <Text style={styles.detailsItemName} numberOfLines={1}>
              {firstItem.name} × {firstItem.qty || 1}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name="logo-bitcoin" size={16} color={COLORS.secondary} />
              <Text style={styles.detailsCoins}>{totalCoins || firstItem.price}</Text>
            </View>
          </View>

          <View style={styles.detailsDivider} />

          <View style={styles.detailsMeta}>
            <View style={styles.detailsMetaRow}>
              <Text style={styles.detailsMetaLabel}>Order time:</Text>
              <Text style={styles.detailsMetaValue}>12:05 PM</Text>
            </View>
            <View style={styles.detailsMetaRow}>
              <Text style={styles.detailsMetaLabel}>Estimated ready:</Text>
              <Text style={styles.detailsMetaValue}>~12:20 PM</Text>
            </View>
          </View>
        </View>

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
  stepSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  stepSubActive: { color: COLORS.secondary + 'BB' },

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
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  detailsItemName: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.white, marginRight: 8 },
  detailsCoins: { fontSize: 15, fontWeight: '800', color: COLORS.white },
  detailsDivider: { height: 1, backgroundColor: COLORS.border, marginBottom: 12 },
  detailsMeta: { gap: 8 },
  detailsMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailsMetaLabel: { fontSize: 13, color: COLORS.textMuted },
  detailsMetaValue: { fontSize: 13, color: COLORS.textSecondary },

  // Notification hint
  notifHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8,
  },
  notifHintText: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' },
});
