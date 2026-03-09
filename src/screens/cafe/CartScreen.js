import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { buildCoins } from '../../constants/dummyData';

export default function CartScreen({ navigation, route }) {
  const { cart: initialCart = [], totalCoins: initialTotal = 0 } = route.params || {};
  const [cart, setCart] = useState(initialCart);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const totalCoins = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);
  const remaining = buildCoins.balance - totalCoins;

  const addItem = (id) => setCart((prev) =>
    prev.map((c) => c.id === id ? { ...c, qty: c.qty + 1 } : c)
  );
  const removeItem = (id) => setCart((prev) => {
    const item = prev.find((c) => c.id === id);
    if (item?.qty === 1) return prev.filter((c) => c.id !== id);
    return prev.map((c) => c.id === id ? { ...c, qty: c.qty - 1 } : c);
  });

  const placeOrder = () => {
    if (remaining < 0) {
      Alert.alert('Insufficient Coins', `You need ${Math.abs(remaining)} more Build Coins to place this order.`);
      return;
    }
    setOrderPlaced(true);
  };

  if (orderPlaced) {
    return (
      <View style={styles.successContainer}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#0D2B00', '#0D0D0D']} style={StyleSheet.absoluteFill} />
        <View style={styles.successIconWrap}>
          <LinearGradient colors={[COLORS.success, '#2E7D32']} style={styles.successIcon}>
            <Ionicons name="checkmark" size={52} color={COLORS.white} />
          </LinearGradient>
        </View>
        <Text style={styles.successTitle}>Order Placed! 🎉</Text>
        <Text style={styles.successSub}>
          Your order is being prepared.{'\n'}Pick it up at the café counter.
        </Text>
        <View style={styles.successDetails}>
          <View style={styles.successRow}>
            <Text style={styles.successLabel}>Items ordered</Text>
            <Text style={styles.successValue}>{totalItems}</Text>
          </View>
          <View style={styles.successRow}>
            <Text style={styles.successLabel}>Coins deducted</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialCommunityIcons name="bitcoin" size={14} color={COLORS.secondary} />
              <Text style={[styles.successValue, { color: COLORS.secondary }]}>{totalCoins}</Text>
            </View>
          </View>
          <View style={styles.successRow}>
            <Text style={styles.successLabel}>Remaining balance</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialCommunityIcons name="bitcoin" size={14} color={COLORS.textSecondary} />
              <Text style={styles.successValue}>{remaining}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.navigate('MainTabs')}
        >
          <LinearGradient
            colors={[COLORS.secondary, COLORS.secondaryDark]}
            style={styles.doneBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.doneBtnText}>BACK TO HOME</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  if (cart.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <StatusBar barStyle="light-content" />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Ionicons name="bag-outline" size={64} color={COLORS.textDim} style={{ marginBottom: 16 }} />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptyText}>Add some items from the café menu!</Text>
        <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.browseBtnText}>Browse Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <LinearGradient colors={['#1A0800', '#0D0D0D']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Your Cart</Text>
          <Text style={styles.headerSub}>{totalItems} items</Text>
        </View>
        <View style={{ width: 42 }} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Coins balance banner */}
        <View style={styles.coinsHeader}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>YOUR BALANCE</Text>
            <View style={styles.coinRow}>
              <MaterialCommunityIcons name="bitcoin" size={16} color={COLORS.secondary} />
              <Text style={styles.balanceValue}>{buildCoins.balance.toLocaleString()}</Text>
            </View>
          </View>
          <Ionicons name="remove-outline" size={20} color={COLORS.border} style={{ transform: [{ rotate: '90deg' }] }} />
          <View style={[styles.balanceItem, { alignItems: 'center' }]}>
            <Text style={styles.balanceLabel}>ORDER TOTAL</Text>
            <View style={styles.coinRow}>
              <MaterialCommunityIcons name="bitcoin" size={16} color={COLORS.warning} />
              <Text style={[styles.balanceValue, { color: COLORS.warning }]}>{totalCoins}</Text>
            </View>
          </View>
          <Ionicons name="remove-outline" size={20} color={COLORS.border} style={{ transform: [{ rotate: '90deg' }] }} />
          <View style={[styles.balanceItem, { alignItems: 'flex-end' }]}>
            <Text style={styles.balanceLabel}>AFTER ORDER</Text>
            <View style={styles.coinRow}>
              <MaterialCommunityIcons name="bitcoin" size={16} color={remaining >= 0 ? COLORS.success : COLORS.error} />
              <Text style={[styles.balanceValue, { color: remaining >= 0 ? COLORS.success : COLORS.error }]}>
                {remaining}
              </Text>
            </View>
          </View>
        </View>

        {/* Cart items */}
        <Text style={styles.sectionTitle}>Order Items</Text>
        {cart.map((item) => (
          <View key={item.id} style={styles.cartItem}>
            <View style={styles.cartItemImg}>
              <Text style={styles.cartItemEmoji}>
                {item.category === 'Shakes' ? '🥤' :
                 item.category === 'Meals' ? '🍽️' :
                 item.category === 'Snacks' ? '🍫' : '💊'}
              </Text>
            </View>
            <View style={styles.cartItemInfo}>
              <Text style={styles.cartItemName}>{item.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name="bitcoin" size={12} color={COLORS.secondary} />
                <Text style={styles.cartItemPrice}>{item.price} × {item.qty} = {item.price * item.qty}</Text>
              </View>
            </View>
            <View style={styles.cartItemQty}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => removeItem(item.id)}>
                <Ionicons name="remove" size={14} color={COLORS.secondary} />
              </TouchableOpacity>
              <Text style={styles.qtyNum}>{item.qty}</Text>
              <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnAdd]} onPress={() => addItem(item.id)}>
                <Ionicons name="add" size={14} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Order notes */}
        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.secondary} />
          <Text style={styles.noteText}>
            Orders cannot be cancelled once placed. Collect your order at the café counter.
          </Text>
        </View>

        {/* Insufficient warning */}
        {remaining < 0 && (
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={16} color={COLORS.error} />
            <Text style={styles.warningText}>
              Insufficient coins. You need {Math.abs(remaining)} more Build Coins.
            </Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Checkout bar */}
      <View style={styles.checkoutBar}>
        <View style={styles.checkoutTotal}>
          <Text style={styles.checkoutTotalLabel}>Total</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MaterialCommunityIcons name="bitcoin" size={18} color={COLORS.secondary} />
            <Text style={styles.checkoutTotalValue}>{totalCoins} coins</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.placeOrderBtn, remaining < 0 && styles.placeOrderBtnDisabled]}
          onPress={placeOrder}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={remaining >= 0 ? [COLORS.secondary, COLORS.secondaryDark] : ['#333', '#222']}
            style={styles.placeOrderGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[styles.placeOrderText, remaining < 0 && { color: COLORS.textMuted }]}>
              PLACE ORDER
            </Text>
            <Ionicons name="arrow-forward" size={18} color={remaining >= 0 ? COLORS.white : COLORS.textMuted} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', paddingTop: 52,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  headerSub: { fontSize: 12, color: COLORS.textMuted },

  // Scroll
  scrollContent: { padding: 20 },

  // Coins header
  coinsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.border, padding: 16, marginBottom: 24,
  },
  balanceItem: {},
  balanceLabel: { fontSize: 8, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 4 },
  coinRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceValue: { fontSize: 18, fontWeight: '900', color: COLORS.white },

  // Section
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 12, letterSpacing: 1 },

  // Cart items
  cartItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: 12, marginBottom: 10, gap: 12,
  },
  cartItemImg: {
    width: 50, height: 50, borderRadius: 12, backgroundColor: COLORS.secondaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  cartItemEmoji: { fontSize: 28 },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 14, fontWeight: '700', color: COLORS.white, marginBottom: 4 },
  cartItemPrice: { fontSize: 12, color: COLORS.textSecondary },
  cartItemQty: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2,
    borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border,
  },
  qtyBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  qtyBtnAdd: { backgroundColor: COLORS.secondary },
  qtyNum: { fontSize: 13, fontWeight: '800', color: COLORS.white, paddingHorizontal: 10 },

  // Notes
  noteBox: {
    flexDirection: 'row', gap: 8, backgroundColor: COLORS.secondaryGlow,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.secondaryBorder, padding: 12, marginTop: 16,
  },
  noteText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  warningBox: {
    flexDirection: 'row', gap: 8, backgroundColor: COLORS.errorLight,
    borderRadius: 10, borderWidth: 1, borderColor: `${COLORS.error}44`, padding: 12, marginTop: 10,
  },
  warningText: { flex: 1, fontSize: 12, color: COLORS.error, lineHeight: 18 },

  // Checkout bar
  checkoutBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingBottom: 34, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.background, gap: 14,
  },
  checkoutTotal: { flex: 0.45 },
  checkoutTotalLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 1 },
  checkoutTotalValue: { fontSize: 18, fontWeight: '900', color: COLORS.white },
  placeOrderBtn: { flex: 0.55, borderRadius: 14, overflow: 'hidden' },
  placeOrderBtnDisabled: { opacity: 0.5 },
  placeOrderGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 8,
  },
  placeOrderText: { fontSize: 14, fontWeight: '800', color: COLORS.white, letterSpacing: 1 },

  // Success state
  successContainer: {
    flex: 1, backgroundColor: COLORS.background, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 32,
  },
  successIconWrap: { marginBottom: 28 },
  successIcon: { width: 100, height: 100, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 30, fontWeight: '900', color: COLORS.white, marginBottom: 12, textAlign: 'center' },
  successSub: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  successDetails: {
    width: '100%', backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 20, marginBottom: 32,
  },
  successRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  successLabel: { fontSize: 13, color: COLORS.textSecondary },
  successValue: { fontSize: 15, fontWeight: '800', color: COLORS.white },
  doneBtn: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  doneBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  doneBtnText: { fontSize: 15, fontWeight: '800', color: COLORS.white, letterSpacing: 2 },

  // Empty
  emptyContainer: {
    flex: 1, backgroundColor: COLORS.background, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.white, marginBottom: 8 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 28 },
  browseBtn: {
    paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12,
    backgroundColor: COLORS.secondaryGlow, borderWidth: 1, borderColor: COLORS.secondaryBorder,
  },
  browseBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.secondary },
});
