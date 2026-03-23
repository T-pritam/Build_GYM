import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Image, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useCartStore, cartTotal, hasUnavailableItems } from '../../store/cartStore';
import { placeOrder } from '../../services/cafeService';

export default function CartScreen({ navigation }) {
  const { items, addItem, removeItem, clearCart } = useCartStore();
  const [placing, setPlacing] = useState(false);

  const totalCoins = cartTotal(items);
  const anyUnavailable = hasUnavailableItems(items);
  const totalQty = items.reduce((s, c) => s + c.qty, 0);

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
        menuItemId:     i.id,
        itemName:       i.name,
        itemPriceCoins: i.priceCoins,
        qty:            i.qty,
      }));
      const res = await placeOrder({ items: orderItems });
      clearCart();
      navigation.replace('OrderConfirmation', { order: res.data.data });
    } catch (e) {
      const msg = e?.response?.data?.message ?? 'Failed to place order. Please try again.';
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
                  <Text style={styles.cartItemPrice}>
                    {item.priceCoins} × {item.qty} ={' '}
                    <Text style={{ color: COLORS.secondary }}>{item.priceCoins * item.qty} coins</Text>
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

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.secondary} />
          <Text style={styles.infoText}>
            Orders cannot be cancelled once placed. Collect your order at the café counter.
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer */}
      {items.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerTotal}>
            <Text style={styles.footerTotalLabel}>Total:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="logo-bitcoin" size={18} color={COLORS.secondary} />
              <Text style={styles.footerTotalValue}>{totalCoins} coins</Text>
            </View>
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
                <Text style={styles.placeOrderText}>PLACE ORDER</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
              </>
            )}
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
  headerSub: { fontSize: 13, color: COLORS.textMuted },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, gap: 16 },

  // Warning banner
  warnBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: 'rgba(234,179,8,0.1)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.3)',
    borderRadius: 10, padding: 12,
  },
  warnText: { flex: 1, fontSize: 12, color: '#EAB308', lineHeight: 18 },

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
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 34,
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
