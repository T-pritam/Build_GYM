/**
 * CafeOrderFailedScreen
 * ─────────────────────────────────────────────────────────────
 * Cafe order payment failure result. Modeled on PaymentFailedScreen
 * (animated SVG X + pulsing error circle, Holographic Noir).
 *
 * A failed/cancelled payment leaves the order in PAYMENT_PENDING on the cafe
 * backend, so TRY AGAIN resumes it in-place via retryPayment(orderId) →
 * reopens Razorpay → success screen. If the order was never created (no
 * orderId), TRY AGAIN simply returns to the cart.
 *
 * Route params: { orderId?, amountPaise?, totalAmount?, reason, deliveryPin?, orderSource? }
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import RazorpayCheckout from 'react-native-razorpay';
import Svg, { Path } from 'react-native-svg';
import { COLORS, FONTS } from '../../theme';
import SafeBottomBar from '../../components/SafeBottomBar';
import { retryPayment } from '../../services/cafeService';
import { useActiveOrderStore } from '../../store/activeOrderStore';
import { useAuthStore } from '../../store/authStore';
import { logEvent } from '../../services/analyticsService';

const ERROR = COLORS.errorBright; // #FFB4AB

const AnimatedPath = Animated.createAnimatedComponent(Path);

// True when the Razorpay error represents a user-initiated dismissal.
const isCancellation = (err) =>
  err?.code === 'PAYMENT_CANCELLED' ||
  err?.code === 0 ||
  (err?.description?.toLowerCase?.().includes('cancel') ?? false);

export default function CafeOrderFailedScreen({ navigation, route }) {
  const {
    orderId,
    amountPaise,
    totalAmount,
    reason = 'Payment could not be processed.',
    deliveryPin,
    orderSource,
  } = route?.params ?? {};

  const setActiveOrder = useActiveOrderStore((s) => s.setActiveOrder);
  const user = useAuthStore((s) => s.user);
  const [retrying, setRetrying] = useState(false);

  // X-mark draw-in (two arms ≈35) + looped pulse on the error circle.
  const arm1 = useRef(new Animated.Value(35)).current;
  const arm2 = useRef(new Animated.Value(35)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(arm1, { toValue: 0, duration: 250, useNativeDriver: false }),
      Animated.timing(arm2, { toValue: 0, duration: 250, useNativeDriver: false }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const goHome = () => navigation.replace('MainTabs');

  // ₹ amount preference: explicit total > paise conversion > 0.
  const amount = totalAmount != null
    ? Number(totalAmount)
    : (amountPaise != null ? Number(amountPaise) / 100 : 0);

  const handleTryAgain = async () => {
    if (retrying) return;
    // Order never created on the backend — nothing to resume; back to cart.
    if (!orderId) { navigation.goBack(); return; }

    setRetrying(true);
    try {
      const res = await retryPayment(orderId);
      const d = res?.data || {};
      const rzpOrderId = d.razorpayOrderId;
      const keyId      = d.keyId;
      const payAmount  = d.amountPaise ?? amountPaise;

      // Backend couldn't re-open a payment — send the user to Order History.
      if (!rzpOrderId || !keyId) {
        navigation.replace('OrderHistory');
        return;
      }

      await RazorpayCheckout.open({
        key:         keyId,
        order_id:    rzpOrderId,
        amount:      payAmount,
        currency:    'INR',
        name:        'Build Cafe',
        description: `Order ${String(orderId).slice(-6).toUpperCase()}`,
        prefill: {
          contact: (user?.phone || '').replace(/^\+91/, ''),
          email:   user?.email || '',
          name:    user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' '),
        },
        theme: { color: '#7F2982' },
      });

      // Paid successfully on retry.
      logEvent('cafe_payment_completed', {
        order_id: orderId,
        amount_inr: payAmount != null ? Number(payAmount) / 100 : amount,
      }).catch(() => {});

      const orderPayload = {
        orderId, deliveryPin, orderSource,
        status: 'CONFIRMED', totalAmount: amount,
      };
      setActiveOrder(orderPayload);
      navigation.replace('OrderConfirmation', { order: orderPayload });
    } catch (err) {
      // User dismissed again → stay on this screen; any other error → Order History.
      if (isCancellation(err)) {
        setRetrying(false);
        return;
      }
      navigation.replace('OrderHistory');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <LinearGradient
        colors={['rgba(147,0,10,0.18)', 'transparent']}
        style={styles.glowTop}
        pointerEvents="none"
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Animated X + headline */}
        <View style={styles.headerBlock}>
          <Animated.View style={[styles.errorCircle, { transform: [{ scale: pulse }] }]}>
            <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
              <AnimatedPath
                d="M10 10L30 30"
                stroke={ERROR} strokeWidth={4} strokeLinecap="round"
                strokeDasharray={35} strokeDashoffset={arm1}
              />
              <AnimatedPath
                d="M30 10L10 30"
                stroke={ERROR} strokeWidth={4} strokeLinecap="round"
                strokeDasharray={35} strokeDashoffset={arm2}
              />
            </Svg>
          </Animated.View>

          <Text style={styles.title}>Payment Failed</Text>
          <Text style={styles.subtitle}>Your order payment could not be processed.</Text>
          <Text style={styles.subtitleDim}>No amount has been deducted.</Text>
        </View>

        {/* Receipt card */}
        <View style={styles.card}>
          <View style={styles.amountBlock}>
            <Text style={styles.amount}>₹{amount.toLocaleString('en-IN')}</Text>
            <Text style={styles.amountSub}>BUILD CAFE ORDER</Text>
          </View>

          <View style={styles.detailBlock}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Status</Text>
              <Text style={styles.statusFailed}>FAILED</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Reason</Text>
              <Text style={styles.rowValue} numberOfLines={2}>{reason}</Text>
            </View>
            {orderId ? (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Order</Text>
                <Text style={styles.rowValueMono}>#{String(orderId).slice(-6).toUpperCase()}</Text>
              </View>
            ) : null}
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Date &amp; Time</Text>
              <Text style={styles.rowValue}>{formatNow()}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.actions}>
        <TouchableOpacity activeOpacity={0.9} onPress={handleTryAgain} disabled={retrying} style={styles.primaryWrap}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryBright]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.primaryBtn, retrying && styles.primaryDisabled]}
          >
            {retrying ? (
              <Animated.Text style={styles.primaryText}>PROCESSING…</Animated.Text>
            ) : (
              <Text style={styles.primaryText}>TRY AGAIN</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} onPress={goHome} style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>BACK TO HOME</Text>
        </TouchableOpacity>
      </View>
    </SafeBottomBar>
  );
}

function formatNow() {
  try {
    const now = new Date();
    const date = now.toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return `${date} · ${time}`;
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  glowTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },

  scroll: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20,
  },

  headerBlock: { alignItems: 'center', marginBottom: 28 },
  errorCircle: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, borderColor: ERROR,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  title: { fontFamily: FONTS.headline, fontSize: 26, color: COLORS.textPrimary, textAlign: 'center', letterSpacing: 0.5 },
  subtitle: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary, marginTop: 10, textAlign: 'center' },
  subtitleDim: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 4 },

  card: {
    width: '92%', backgroundColor: COLORS.glass,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 22,
  },
  amountBlock: {
    alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingBottom: 18, marginBottom: 6,
  },
  amount: { fontFamily: FONTS.display, fontSize: 44, color: COLORS.textPrimary },
  amountSub: { fontFamily: FONTS.label, fontSize: 11, color: COLORS.textSecondary, letterSpacing: 2, marginTop: 8 },

  detailBlock: { gap: 14, paddingTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary },
  rowValue: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.textPrimary, textAlign: 'right', maxWidth: '60%' },
  rowValueMono: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.textPrimary, letterSpacing: 1 },
  statusFailed: { fontFamily: FONTS.label, fontSize: 12, color: ERROR, letterSpacing: 2 },

  actions: { paddingHorizontal: 24, paddingTop: 12, gap: 6 },
  primaryWrap: { borderRadius: 14, overflow: 'hidden' },
  primaryBtn: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryDisabled: { opacity: 0.6 },
  primaryText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white, letterSpacing: 1.5 },
  secondaryBtn: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.textSecondary, letterSpacing: 1 },
});
