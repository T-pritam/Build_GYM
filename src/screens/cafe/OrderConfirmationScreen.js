import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function OrderConfirmationScreen({ navigation, route }) {
  const { cart = [], totalCoins = 0, balance = 0, afterOrder = 0, order } = route?.params || {};

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  const itemCount = cart.reduce((s, c) => s + c.qty, 0);
  const orderId = order?.id;
  const orderRef = order?.orderRef || `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Green radial glow */}
      <View style={styles.greenGlow} pointerEvents="none" />
      <View style={styles.orangeGlow} pointerEvents="none" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.replace('MainTabs')}>
          <Ionicons name="close" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>
        <Text style={styles.brandLabel}>Build Gym</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main content */}
      <Animated.View
        style={[styles.mainContent, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
      >
        {/* Checkmark icon */}
        <View style={styles.checkIconWrap}>
          <Ionicons name="checkmark" size={56} color={COLORS.white} />
        </View>

        <Text style={styles.heading}>Order Placed! 🎉</Text>
        <Text style={styles.subheading}>
          Your order is being prepared.{'\n'}Pick it up at the café counter.
        </Text>
      </Animated.View>

      {/* Summary card */}
      <Animated.View style={[styles.summaryCard, { opacity: opacityAnim }]}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{orderRef}</Text>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>CONFIRMED</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Items ordered</Text>
          <Text style={styles.summaryValue}>{itemCount}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Coins deducted</Text>
          <Text style={[styles.summaryValue, { color: COLORS.secondary }]}>₿ {totalCoins}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Remaining balance</Text>
          <Text style={styles.summaryValue}>₿ {afterOrder.toLocaleString()}</Text>
        </View>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.trackBtn}
          onPress={() => navigation.navigate('OrderTracking', { orderId, orderRef, cart, totalCoins })}
          activeOpacity={0.85}
        >
          <Ionicons name="location-outline" size={18} color={COLORS.secondary} />
          <Text style={styles.trackBtnText}>Track Order</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.replace('MainTabs')}
          activeOpacity={0.85}
        >
          <Text style={styles.homeBtnText}>BACK TO HOME</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  greenGlow: {
    position: 'absolute', top: '20%', left: '20%', right: '20%', height: 300,
    backgroundColor: '#22C55E', opacity: 0.05, borderRadius: 200,
  },
  orangeGlow: {
    position: 'absolute', bottom: '20%', right: '20%', width: 200, height: 200,
    backgroundColor: COLORS.secondary, opacity: 0.04, borderRadius: 100,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 56, paddingBottom: 12,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  brandLabel: { fontSize: 13, fontWeight: '800', color: COLORS.white, letterSpacing: 3 },
  mainContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  checkIconWrap: {
    width: 96, height: 96, borderRadius: 24, backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
    shadowColor: '#22C55E', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 30, elevation: 12,
  },
  heading: { fontSize: 28, fontWeight: '800', color: COLORS.white, textAlign: 'center', marginBottom: 10 },
  subheading: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  summaryCard: {
    marginHorizontal: 24, marginBottom: 20,
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  summaryLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '800', color: COLORS.white },
  activeBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)', paddingHorizontal: 10, paddingVertical: 3,
  },
  activeBadgeText: { fontSize: 9, fontWeight: '900', color: '#22C55E', letterSpacing: 1.5 },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 20 },
  footer: { paddingHorizontal: 24, paddingBottom: 40, gap: 10 },
  trackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.secondaryBorder,
    backgroundColor: COLORS.secondaryGlow,
  },
  trackBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.secondary },
  homeBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 14, backgroundColor: COLORS.secondary,
  },
  homeBtnText: { fontSize: 15, fontWeight: '900', color: COLORS.white, letterSpacing: 2 },
});
