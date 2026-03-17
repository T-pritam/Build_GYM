import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { placeOrder } from '../../services/api';
import { useUser } from '../../context/UserContext';

const ITEM_EMOJI = { Shakes: '🥤', Meals: '🍽️', Snacks: '🍫', Supps: '💊' };

export default function CartScreen({ navigation, route }) {
  const { userId, wallet, refreshWallet } = useUser();
  const initialCart = route?.params?.cart || [];
  const [cart, setCart] = useState(initialCart);
  const [placing, setPlacing] = useState(false);

  const addQty = (id) => setCart((prev) =>
    prev.map((c) => c.id === id ? { ...c, qty: c.qty + 1 } : c));

  const removeQty = (id) => setCart((prev) => {
    const item = prev.find((c) => c.id === id);
    if (item?.qty === 1) return prev.filter((c) => c.id !== id);
    return prev.map((c) => c.id === id ? { ...c, qty: c.qty - 1 } : c);
  });

  const totalCoins = cart.reduce((sum, c) => sum + (c.priceCoins ?? c.price ?? 0) * c.qty, 0);
  const balance = wallet?.balance ?? 0;
  const afterOrder = balance - totalCoins;

  const handlePlaceOrder = async () => {
    if (placing) return;
    setPlacing(true);
    try {
      const apiItems = cart.map((c) => ({ itemId: c.id, qty: c.qty }));
      const order = await placeOrder(userId, apiItems);
      refreshWallet();
      navigation.replace('OrderConfirmation', {
        cart,
        totalCoins,
        balance,
        afterOrder,
        order,
      });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to place order. Please try again.';
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
          <Text style={styles.headerSub}>{cart.reduce((s, c) => s + c.qty, 0)} items</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Coins summary card */}
        <View style={styles.coinsCard}>
          <View style={styles.coinCol}>
            <Text style={styles.coinColLabel}>Your Balance</Text>
            <Text style={styles.coinColValue}>B {balance.toLocaleString()}</Text>
          </View>
          <View style={styles.coinDivider} />
          <View style={styles.coinCol}>
            <Text style={styles.coinColLabel}>Order Total</Text>
            <Text style={[styles.coinColValue, { color: COLORS.secondary }]}>B {totalCoins}</Text>
          </View>
          <View style={styles.coinDivider} />
          <View style={styles.coinCol}>
            <Text style={styles.coinColLabel}>After Order</Text>
            <Text style={[styles.coinColValue, { color: '#22C55E' }]}>B {afterOrder.toLocaleString()}</Text>
          </View>
        </View>

        {/* Order items */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ORDER ITEMS</Text>
          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Ionicons name="cart-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Your cart is empty</Text>
            </View>
          ) : (
            cart.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <View style={styles.cartItemEmoji}>
                  <Text style={{ fontSize: 32 }}>{ITEM_EMOJI[item.category] || '🥗'}</Text>
                </View>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemPrice}>
                    B {item.price} x {item.qty} = <Text style={{ color: COLORS.secondary }}>B {item.price * item.qty}</Text>
                  </Text>
                </View>
                <View style={styles.qtyControls}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => removeQty(item.id)}>
                    <Ionicons name="remove" size={16} color={COLORS.secondary} />
                  </TouchableOpacity>
                  <Text style={styles.qtyNum}>{item.qty}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => addQty(item.id)}>
                    <Ionicons name="add" size={16} color={COLORS.secondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.secondary} />
          <Text style={styles.infoText}>
            Orders cannot be cancelled once placed. Collect your order at the cafe counter.
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer */}
      {cart.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerTotal}>
            <Text style={styles.footerTotalLabel}>Total:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="logo-bitcoin" size={18} color={COLORS.secondary} />
              <Text style={styles.footerTotalValue}>{totalCoins} coins</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.placeOrderBtn, afterOrder < 0 && styles.placeOrderBtnDisabled]}
            onPress={handlePlaceOrder}
            disabled={afterOrder < 0 || cart.length === 0}
            activeOpacity={0.85}
          >
            <Text style={styles.placeOrderText}>PLACE ORDER</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
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
  headerSub: { fontSize: 13, color: COLORS.textMuted, fontWeight: '400' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, gap: 16 },

  // Coins card
  coinsCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: 16,
  },
  coinCol: { flex: 1, alignItems: 'center', gap: 4 },
  coinColLabel: { fontSize: 9, fontWeight: '700', color: COLORS.secondary, letterSpacing: 1.5, textAlign: 'center' },
  coinColValue: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  coinDivider: { width: 1, height: 40, backgroundColor: COLORS.border },

  // Section
  section: { gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: COLORS.secondary, letterSpacing: 2 },

  // Cart item
  cartItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: 14,
  },
  cartItemEmoji: {
    width: 60, height: 60, borderRadius: 10, backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  cartItemInfo: { flex: 1, gap: 4 },
  cartItemName: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  cartItemPrice: { fontSize: 13, color: COLORS.textMuted },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1, borderColor: COLORS.secondaryBorder, alignItems: 'center', justifyContent: 'center',
  },
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
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 34,
    borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background, gap: 12,
  },
  footerTotal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  footerTotalLabel: { fontSize: 14, fontWeight: '500', color: COLORS.textMuted },
  footerTotalValue: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  placeOrderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.secondary, borderRadius: 14, paddingVertical: 16,
  },
  placeOrderBtnDisabled: { backgroundColor: COLORS.textMuted },
  placeOrderText: { fontSize: 15, fontWeight: '900', color: COLORS.white, letterSpacing: 2 },
});
