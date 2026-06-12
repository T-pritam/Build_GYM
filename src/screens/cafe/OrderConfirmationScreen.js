/**
 * OrderConfirmationScreen
 * ─────────────────────────────────────────────────────────────
 * Cafe order success result. Restyled to the "Holographic Noir" success
 * aesthetic (animated SVG tick + glass cards) to match PaymentSuccessScreen,
 * while keeping the cafe-specific delivery PIN + Track Order flow.
 *
 * Route params: { order: { orderId|id, deliveryPin, totalAmount, items, orderSource } }
 * Navigation behaviour is unchanged (close/Back → MainTabs, Track → OrderTracking).
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { COLORS, FONTS, GRADIENTS } from '../../theme';
import SafeBottomBar from '../../components/SafeBottomBar';

const GREEN = COLORS.success; // #4CAF50

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath   = Animated.createAnimatedComponent(Path);

export default function OrderConfirmationScreen({ navigation, route }) {
  const order = route?.params?.order;
  const orderId = order?.orderId || order?.id;
  const deliveryPin = order?.deliveryPin;
  const itemCount = order?.items?.reduce((s, i) => s + (i.qty ?? i.quantity ?? 0), 0) ?? 0;

  // Drawing animations: circle stroke (≈240) then checkmark (≈50) + content fade.
  const circleDash = useRef(new Animated.Value(240)).current;
  const checkDash  = useRef(new Animated.Value(50)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(circleDash, { toValue: 0, duration: 800, useNativeDriver: false }),
      Animated.parallel([
        Animated.timing(checkDash, { toValue: 0, duration: 500, useNativeDriver: false }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const goHome = () => navigation.replace('MainTabs');

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      {/* Subtle green success glow */}
      <LinearGradient
        colors={['rgba(76,175,80,0.16)', 'transparent']}
        style={styles.glowTop}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={goHome}>
          <Ionicons name="close" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>
        <Text style={styles.brandLabel}>Build Gym</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Animated tick + title */}
        <View style={styles.headerBlock}>
          <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
            <AnimatedCircle
              cx={40} cy={40} r={38}
              stroke={GREEN} strokeWidth={4} strokeLinecap="round"
              strokeDasharray={240} strokeDashoffset={circleDash}
            />
            <AnimatedPath
              d="M25 40L35 50L55 30"
              stroke={GREEN} strokeWidth={4}
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={50} strokeDashoffset={checkDash}
            />
          </Svg>
          <Text style={styles.title}>Order Placed! 🎉</Text>
          <Text style={styles.subtitle}>
            Your order is being prepared.{'\n'}The captain will deliver it to you.
          </Text>
        </View>

        <Animated.View style={{ opacity: contentOpacity, width: '100%', alignItems: 'center' }}>
          {/* Delivery PIN — share with captain at delivery */}
          {deliveryPin ? (
            <View style={styles.pinCard}>
              <Text style={styles.pinLabel}>DELIVERY PIN</Text>
              <Text style={styles.pinValue}>{deliveryPin}</Text>
              <Text style={styles.pinHint}>Share this 6-digit PIN with the captain when they arrive.</Text>
            </View>
          ) : null}

          {/* Summary card */}
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>
                {orderId ? `#${String(orderId).slice(-6).toUpperCase()}` : 'Order'}
              </Text>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>CONFIRMED</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Items ordered</Text>
              <Text style={styles.rowValue}>{itemCount}</Text>
            </View>
            {order?.totalAmount != null ? (
              <>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Paid</Text>
                  <Text style={[styles.rowValue, { color: GREEN }]}>₹{order.totalAmount}</Text>
                </View>
              </>
            ) : null}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.trackBtn}
          onPress={() => navigation.navigate('OrderTracking', { orderId, order })}
          activeOpacity={0.85}
        >
          <Ionicons name="location-outline" size={18} color={COLORS.cyan} />
          <Text style={styles.trackBtnText}>Track Order</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.9} onPress={goHome} style={styles.primaryWrap}>
          <LinearGradient
            colors={GRADIENTS.violetCyan}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryText}>BACK TO HOME</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeBottomBar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  glowTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 340 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 52, paddingBottom: 4,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  brandLabel: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.white, letterSpacing: 3 },

  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },

  headerBlock: { alignItems: 'center', marginBottom: 24 },
  title: {
    fontFamily: FONTS.headline, fontSize: 26, color: COLORS.white,
    textAlign: 'center', marginTop: 16, letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 22, marginTop: 8,
  },

  // Delivery PIN card
  pinCard: {
    width: '92%',
    backgroundColor: COLORS.glass,
    borderWidth: 1, borderColor: COLORS.primaryBorder,
    borderRadius: 18, padding: 20, alignItems: 'center', gap: 6,
    marginBottom: 14,
  },
  pinLabel: { fontFamily: FONTS.label, fontSize: 11, color: COLORS.primaryLight, letterSpacing: 3 },
  pinValue: {
    fontFamily: FONTS.headline, fontSize: 38, color: COLORS.white,
    letterSpacing: 10, fontVariant: ['tabular-nums'],
  },
  pinHint: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },

  // Summary card
  card: {
    width: '92%',
    backgroundColor: COLORS.glass,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 18, padding: 6, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  rowLabel: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary },
  rowValue: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white },
  activeBadge: {
    backgroundColor: 'rgba(76,175,80,0.15)', borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)', paddingHorizontal: 10, paddingVertical: 3,
  },
  activeBadgeText: { fontFamily: FONTS.label, fontSize: 9, color: GREEN, letterSpacing: 1.5 },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },

  // Footer
  actions: { paddingHorizontal: 24, paddingTop: 12, gap: 8 },
  trackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.primaryBorder, backgroundColor: COLORS.primarySoft,
  },
  trackBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.cyan },
  primaryWrap: { borderRadius: 14, overflow: 'hidden' },
  primaryBtn: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white, letterSpacing: 1.5 },
});
