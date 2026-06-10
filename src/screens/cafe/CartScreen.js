import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Image, Alert, ActivityIndicator,
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import SafeBottomBar from '../../components/SafeBottomBar';
import { useCartStore, cartTotal, hasUnavailableItems } from '../../store/cartStore';
import { placeOrder, fetchRewardBalance } from '../../services/cafeService';
import { subscribeMenuAvailability } from '../../services/cafeSupabase';
import { useActiveOrderStore } from '../../store/activeOrderStore';
import { useAuthStore } from '../../store/authStore';
import { logEvent } from '../../services/analyticsService';

const fmtPrice = (v) => { const n = Number(v) || 0; return n % 1 === 0 ? String(n) : n.toFixed(2); };

export default function CartScreen({ navigation }) {
  const { items, addItem, removeItem, clearCart } = useCartStore();
  const markUnavailable = useCartStore(s => s.markUnavailable);
  const markAvailable   = useCartStore(s => s.markAvailable);
  const [placing, setPlacing] = useState(false);
  const setActiveOrder = useActiveOrderStore(s => s.setActiveOrder);
  const user = useAuthStore(s => s.user);

  const [rewardBalance, setRewardBalance]   = useState(0);
  const [pointValue, setPointValue]         = useState(1);
  const [redeemPercent, setRedeemPercent]   = useState(20);
  const [gstRate, setGstRate]               = useState(0);
  const [rewardPointsApplied, setRewardPointsApplied] = useState(0);

  const totalRupees = cartTotal(items);
  const anyUnavailable = hasUnavailableItems(items);
  const totalQty = items.reduce((s, c) => s + c.qty, 0);

  const gstAmount   = Math.round(totalRupees * gstRate * 100) / 100;
  const billWithGst = totalRupees + gstAmount;
  const maxRedeemablePoints = Math.floor((billWithGst * redeemPercent / 100) / pointValue);
  const rewardDiscount = Math.min(rewardPointsApplied * pointValue, billWithGst);
  const payableTotal   = Math.max(0, billWithGst - rewardDiscount);

  // cafe_order_started on entry (cart has items) + cafe_cart_abandoned on leave w/o order.
  const orderPlacedRef = useRef(false);
  useEffect(() => {
    const startItems = useCartStore.getState().items;
    if (startItems.length > 0) {
      logEvent('cafe_order_started', {
        item_count: startItems.reduce((s, c) => s + c.qty, 0),
        cart_value_inr: cartTotal(startItems),
      }).catch(() => {});
    }
    return () => {
      const leftItems = useCartStore.getState().items;
      if (!orderPlacedRef.current && leftItems.length > 0) {
        logEvent('cafe_cart_abandoned', {
          item_count: leftItems.reduce((s, c) => s + c.qty, 0),
          cart_value_inr: cartTotal(leftItems),
        }).catch(() => {});
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep cart in sync with live availability while on this screen
  useEffect(() => {
    const unsub = subscribeMenuAvailability((evt) => {
      if (evt.type === 'REFRESH') return;
      const ids = evt.itemIds ?? (evt.itemId ? [evt.itemId] : []);
      ids.forEach(id => evt.type === 'UNAVAILABLE' ? markUnavailable(id) : markAvailable(id));
    });
    return () => unsub?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the customer's reward balance + active reward config
  useEffect(() => {
    fetchRewardBalance()
      .then((res) => {
        const d = res.data || {};
        setRewardBalance(d.points ?? 0);
        setPointValue(d.pointValue || 1);
        setRedeemPercent(d.redeemPercent ?? 20);
        setGstRate(d.gstRate ?? 0);
      })
      .catch(() => {});
  }, []);

  const finalizeAndNavigate = (orderPayload) => {
    setActiveOrder(orderPayload);
    clearCart();
    navigation.replace('OrderConfirmation', { order: orderPayload });
  };

  const handlePlaceOrder = async () => {
    if (anyUnavailable) {
      Alert.alert(
        'Unavailable Items',
        'Some items in your cart are no longer available. Please remove them before placing your order.',
      );
      return;
    }
    if (items.length === 0) return;

    setPlacing(true);
    try {
      const orderItems = items.map((i) => ({
        menuItemId:  i.menuItemId || i.id,
        quantity:    i.qty,
        unitPrice:   Number(i.price ?? 0),
        modifiers:   Array.isArray(i.modifiers) ? i.modifiers : [],
        specialNote: i.specialInstructions || undefined,
      }));

      const res = await placeOrder({ items: orderItems, rewardPointsToRedeem: rewardPointsApplied });
      const data = res.data || {};
      const {
        orderId,
        razorpayOrderId,
        amountPaise,
        keyId,
        deliveryPin,
        orderSource,
      } = data;

      logEvent('cafe_order_placed', {
        order_id: orderId,
        item_count: totalQty,
        order_value_inr: payableTotal,
      }).catch(() => {});

      // Cafe backend always creates Razorpay order for INR > 0 GYM_APP flow.
      if (!razorpayOrderId || !keyId) {
        // Should never happen for gym-source orders, but fall back gracefully.
        orderPlacedRef.current = true;
        finalizeAndNavigate({ orderId, deliveryPin, orderSource, totalAmount: payableTotal });
        return;
      }

      const checkoutOpts = {
        key:         keyId,
        order_id:    razorpayOrderId,
        amount:      amountPaise,
        currency:    'INR',
        name:        'Build Cafe',
        description: `Order ${orderId.slice(-6).toUpperCase()}`,
        prefill: {
          contact: (user?.phone || '').replace(/^\+91/, ''),
          email:   user?.email || '',
          name:    user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' '),
        },
        theme: { color: '#E96316' },
      };

      try {
        await RazorpayCheckout.open(checkoutOpts);
        logEvent('cafe_payment_completed', {
          order_id: orderId,
          amount_inr: Number(amountPaise) / 100,
        }).catch(() => {});
        orderPlacedRef.current = true;
        finalizeAndNavigate({ orderId, deliveryPin, orderSource, totalAmount: payableTotal });
      } catch (rzpErr) {
        // User dismissed or payment failed — order is in PAYMENT_PENDING and can
        // be retried from OrderTracking. Surface gentle message, keep the cart.
        const msg = rzpErr?.description || rzpErr?.message || 'Payment was cancelled.';
        logEvent('cafe_payment_failed', {
          error_reason: msg,
          order_value_inr: payableTotal,
        }).catch(() => {});
        Alert.alert('Payment not completed', msg + ' You can retry from Order History.');
        // Persist the pending order so tracking screen can show retry option
        setActiveOrder({ orderId, deliveryPin, orderSource, status: 'PAYMENT_PENDING', totalAmount: payableTotal });
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || 'Failed to place order. Please try again.';
      Alert.alert('Order Failed', msg);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Glow */}
      <View style={styles.glow} pointerEvents="none" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Your Cart</Text>
          <Text style={styles.headerSub}>{totalQty} item{totalQty !== 1 ? 's' : ''}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary Card — order subtotal in INR */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceCol}>
          <Text style={styles.balanceLabel}>Items</Text>
          <Text style={styles.balanceValue}>{totalQty}</Text>
        </View>
        <View style={styles.balanceDivider} />
        <View style={styles.balanceCol}>
          <Text style={styles.balanceLabel}>Subtotal</Text>
          <Text style={[styles.balanceValue, { color: COLORS.secondary }]}>₹{fmtPrice(totalRupees)}</Text>
        </View>
        <View style={styles.balanceDivider} />
        <View style={styles.balanceCol}>
          <Text style={styles.balanceLabel}>Pay via</Text>
          <Text style={styles.balanceValue}>Razorpay</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Unavailable warning */}
        {anyUnavailable && (
          <View style={styles.warnBanner}>
            <Ionicons name="warning-outline" size={18} color="#EAB308" />
            <Text style={styles.warnText}>
              Some items are no longer available. Remove them to place your order.
            </Text>
          </View>
        )}

        {/* Order items */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ORDER ITEMS</Text>
          {items.length === 0 ? (
            <View style={styles.emptyCart}>
              <Ionicons name="cart-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Your cart is empty</Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} style={[styles.cartItem, !item.isAvailable && styles.cartItemUnavailable]}>
                {/* Image or letter */}
                <View style={styles.cartItemImg}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.cartItemPhoto} />
                  ) : (
                    <Text style={styles.cartItemLetter}>{item.name.charAt(0).toUpperCase()}</Text>
                  )}
                </View>

                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  {item.variationName ? (
                    <Text style={styles.cartItemVariation}>{item.variationName}</Text>
                  ) : null}
                  {item.modifiers?.length > 0 ? item.modifiers.map((a, idx) => (
                    <Text key={idx} style={styles.cartItemAddons}>
                      {a.name}{a.price > 0 ? ` +₹${fmtPrice(a.price)}` : ''}
                    </Text>
                  )) : null}
                  <Text style={styles.cartItemPrice}>
                    ₹{Number(item.price ?? 0)} × {item.qty} ={' '}
                    <Text style={{ color: COLORS.secondary }}>₹{Number(item.price ?? 0) * item.qty}</Text>
                  </Text>
                  {!item.isAvailable && (
                    <View style={styles.unavailBadge}>
                      <Text style={styles.unavailBadgeText}>UNAVAILABLE</Text>
                    </View>
                  )}
                </View>

                <View style={styles.qtyControls}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => removeItem(item.id)}>
                    <Ionicons name="remove" size={16} color={COLORS.secondary} />
                  </TouchableOpacity>
                  <Text style={styles.qtyNum}>{item.qty}</Text>
                  <TouchableOpacity
                    style={[styles.qtyBtn, !item.isAvailable && styles.qtyBtnDisabled]}
                    onPress={() => item.isAvailable && addItem(item)}
                    disabled={!item.isAvailable}
                  >
                    <Ionicons name="add" size={16} color={item.isAvailable ? COLORS.secondary : COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Reward points redemption */}
        {items.length > 0 && rewardBalance > 0 && (
          <View style={styles.rewardCard}>
            <View style={styles.rewardHeader}>
              <Ionicons name="star" size={18} color={COLORS.secondary} />
              <Text style={styles.rewardTitle}>{rewardBalance} reward points available</Text>
            </View>
            {rewardPointsApplied === 0 ? (
              <TouchableOpacity
                style={[styles.rewardBtn, maxRedeemablePoints <= 0 && styles.rewardBtnDisabled]}
                onPress={() => setRewardPointsApplied(Math.min(rewardBalance, maxRedeemablePoints))}
                disabled={maxRedeemablePoints <= 0}
                activeOpacity={0.85}
              >
                <Text style={styles.rewardBtnText}>
                  {maxRedeemablePoints > 0
                    ? `Apply — save ₹${(Math.min(rewardBalance, maxRedeemablePoints) * pointValue).toFixed(0)}`
                    : 'Not enough to redeem on this order'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.rewardBtn, styles.rewardBtnRemove]}
                onPress={() => setRewardPointsApplied(0)}
                activeOpacity={0.85}
              >
                <Text style={[styles.rewardBtnText, { color: COLORS.secondary }]}>
                  Remove — −₹{rewardDiscount.toFixed(0)} ({rewardPointsApplied} pts)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.secondary} />
          <Text style={styles.infoText}>
            Orders cannot be cancelled after payment. You'll get a 6-digit PIN — share it with the captain at the time of delivery.
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer */}
      {items.length > 0 && (
        <SafeBottomBar style={styles.footer}>
          <View style={styles.footerTotal}>
            <Text style={styles.footerTotalLabel}>
              {rewardPointsApplied > 0 ? `Total (−₹${rewardDiscount.toFixed(0)} rewards)` : 'Total:'}
            </Text>
            <Text style={styles.footerTotalValue}>₹{payableTotal}</Text>
          </View>
          <TouchableOpacity
            style={[styles.placeOrderBtn, (anyUnavailable || placing) && styles.placeOrderBtnDisabled]}
            onPress={handlePlaceOrder}
            disabled={anyUnavailable || placing}
            activeOpacity={0.85}
          >
            {placing ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.placeOrderText}>PAY & PLACE ORDER</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
              </>
            )}
          </TouchableOpacity>
        </SafeBottomBar>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  glow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 260,
    backgroundColor: 'rgba(233,99,22,0.05)',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  headerSub: { fontSize: 13, color: COLORS.textMuted },
  balanceCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  balanceCol: { flex: 1, alignItems: 'center', gap: 4 },
  balanceDivider: { width: 1, height: 36, backgroundColor: COLORS.border },
  balanceLabel: { fontSize: 9, fontWeight: '800', color: COLORS.secondary, letterSpacing: 1.5, textTransform: 'uppercase' },
  balanceValue: { fontSize: 17, fontWeight: '800', color: COLORS.white },

  scrollContent: { paddingHorizontal: 16, paddingTop: 12, gap: 16 },

  // Warning banner
  warnBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: 'rgba(234,179,8,0.1)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.3)',
    borderRadius: 10, padding: 12,
  },
  warnText: { flex: 1, fontSize: 12, color: '#EAB308', lineHeight: 18 },

  // Reward card
  rewardCard: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.secondaryBorder, padding: 14, gap: 12,
  },
  rewardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rewardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  rewardBtn: {
    backgroundColor: COLORS.secondary, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center',
  },
  rewardBtnRemove: {
    backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.secondaryBorder,
  },
  rewardBtnDisabled: { backgroundColor: COLORS.textMuted },
  rewardBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.white },

  // Section
  section: { gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: COLORS.secondary, letterSpacing: 2 },

  // Cart item
  cartItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: 14,
  },
  cartItemUnavailable: { opacity: 0.65, borderColor: 'rgba(234,179,8,0.3)' },
  cartItemImg: {
    width: 56, height: 56, borderRadius: 10, backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  cartItemPhoto: { width: '100%', height: '100%', borderRadius: 10 },
  cartItemLetter: { fontSize: 24, fontWeight: '900', color: COLORS.secondary },
  cartItemInfo: { flex: 1, gap: 4 },
  cartItemName: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  cartItemVariation: { fontSize: 12, color: COLORS.textSecondary },
  cartItemAddons: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' },
  cartItemPrice: { fontSize: 13, color: COLORS.textMuted },
  unavailBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(234,179,8,0.15)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(234,179,8,0.4)',
    marginTop: 2,
  },
  unavailBadgeText: { fontSize: 9, fontWeight: '900', color: '#EAB308', letterSpacing: 1 },

  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1, borderColor: COLORS.secondaryBorder, alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnDisabled: { borderColor: COLORS.border, opacity: 0.5 },
  qtyNum: { fontSize: 16, fontWeight: '800', color: COLORS.white, minWidth: 16, textAlign: 'center' },

  // Info banner
  infoBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#2A1A0A', borderWidth: 1, borderColor: COLORS.secondaryBorder,
    borderRadius: 10, padding: 12,
  },
  infoText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },

  // Empty
  emptyCart: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 15, color: COLORS.textMuted },

  // Footer
  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background, gap: 12,
  },
  footerTotal: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4,
  },
  footerTotalLabel: { fontSize: 14, fontWeight: '500', color: COLORS.textMuted },
  footerTotalValue: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  placeOrderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.secondary, borderRadius: 14, paddingVertical: 16,
  },
  placeOrderBtnDisabled: { backgroundColor: COLORS.textMuted },
  placeOrderText: { fontSize: 15, fontWeight: '900', color: COLORS.white, letterSpacing: 2 },
});
