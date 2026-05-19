import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, TextInput, Dimensions, Image, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchMenu } from '../../services/cafeService';
import { subscribeMenuAvailability } from '../../services/cafeSupabase';
import { useCartStore, cartQty, cartTotal } from '../../store/cartStore';

const { width } = Dimensions.get('window');
const HORIZONTAL_PAD = 14;
const COLUMN_GAP = 12;
const CARD_WIDTH = (width - HORIZONTAL_PAD * 2 - COLUMN_GAP) / 2;

const CATEGORY_ICONS = {
  All:           'grid-outline',
  Shakes:        'water-outline',
  Meals:         'restaurant-outline',
  Snacks:        'pizza-outline',
  Supplements:   'flask-outline',
  'Hot Beverages': 'cafe-outline',
};

export default function CafeScreen({ navigation }) {
  const [menuItems,       setMenuItems]       = useState([]);
  const [categories,      setCategories]      = useState(['All']);
  const [activeCategory,  setActiveCategory]  = useState('All');
  const [search,          setSearch]          = useState('');
  const [loading,         setLoading]         = useState(true);


  // Use stable individual selectors — prevents socket effect from re-running on cart changes
  const cartItems      = useCartStore(s => s.items);
  const addItem        = useCartStore(s => s.addItem);
  const removeItem     = useCartStore(s => s.removeItem);
  const markUnavailable = useCartStore(s => s.markUnavailable);
  const markAvailable   = useCartStore(s => s.markAvailable);

  // Keep latest cart-store callbacks in a ref so the realtime handler never
  // needs to be in the dependency array (avoids re-subscribing on cart updates)
  const cartActionsRef = useRef({ markUnavailable, markAvailable });
  useEffect(() => {
    cartActionsRef.current = { markUnavailable, markAvailable };
  });

  // Fetch menu from the Cafe backend. /menu returns { categories: [{ name, items: [...] }] }.
  // We flatten to a single array with `category` denormalized onto each item to keep
  // the existing 2-column grid UI unchanged.
  const loadMenu = useCallback(async () => {
    try {
      const res = await fetchMenu();
      const cats = res.data?.categories ?? [];
      const flat = cats.flatMap((c) =>
        (c.items ?? []).map((i) => ({
          id:          i.id,
          name:        i.name,
          description: i.description,
          imageUrl:    i.imageUrl,
          isVeg:       i.isVeg,
          isAvailable: i.isAvailable !== false,
          price:       Number(i.price ?? 0),
          modifiers:   Array.isArray(i.modifiers) ? i.modifiers : [],
          maxOrderQty: i.maxOrderQty,
          category:    c.name,
        })),
      );
      setMenuItems(flat);
      const catNames = ['All', ...cats.map((c) => c.name)];
      setCategories(catNames);
    } catch (err) {
      console.warn('cafe menu load failed:', err?.response?.data || err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();

    // Supabase realtime — mirrors the cafe customer app's `menu:availability` channel.
    const unsubscribe = subscribeMenuAvailability((evt) => {
      if (evt.type === 'REFRESH') {
        loadMenu();
        return;
      }
      const ids = evt.itemIds ?? (evt.itemId ? [evt.itemId] : []);
      if (!ids.length) return;
      const newAvail = evt.type === 'AVAILABLE';
      setMenuItems((prev) =>
        prev.map((item) => ids.includes(item.id) ? { ...item, isAvailable: newAvail } : item),
      );
      ids.forEach((id) => {
        if (newAvail) cartActionsRef.current.markAvailable(id);
        else          cartActionsRef.current.markUnavailable(id);
      });
    });

    return () => { unsubscribe?.(); };
  }, [loadMenu]);

  const getQty = (itemId) => cartItems.find((c) => c.id === itemId)?.qty || 0;
  const totalItems = cartQty(cartItems);
  const totalRupees = cartTotal(cartItems);

  const filteredItems = menuItems.filter((item) => {
    const matchCat    = activeCategory === 'All' || item.category === activeCategory;
    const matchSearch = search.trim() === '' || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleAddToCart = useCallback((item) => {
    addItem({
      id:          item.id,
      menuItemId:  item.id,
      name:        item.name,
      category:    item.category,
      imageUrl:    item.imageUrl,
      price:       Number(item.price ?? 0),
      isAvailable: item.isAvailable,
      modifiers:   [],
    });
  }, [addItem]);

  const handleRemoveFromCart = useCallback((itemId) => {
    removeItem(itemId);
  }, [removeItem]);

  const renderItem = ({ item }) => {
    const qty = getQty(item.id);

    return (
      <TouchableOpacity
        style={[styles.card, !item.isAvailable && styles.cardUnavailable]}
        onPress={() => navigation.navigate('ItemDetail', { item })}
        activeOpacity={0.88}
      >
        {/* Image area */}
        <LinearGradient colors={['#2A1200', '#160800']} style={styles.imgBox}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" />
          ) : (
            <Text style={styles.emoji}>{item.name.charAt(0).toUpperCase()}</Text>
          )}
          {!item.isAvailable && (
            <View style={styles.unavailOverlay}>
              <Text style={styles.unavailText}>Unavailable</Text>
            </View>
          )}
        </LinearGradient>

        {/* Info area */}
        <View style={styles.cardBody}>
          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>

          {/* Macros */}
          <View style={styles.macrosRow}>
            {item.protein != null && (
              <View style={styles.macroChip}>
                <Text style={styles.macroVal}>{item.protein}g</Text>
                <Text style={styles.macroLbl}>P</Text>
              </View>
            )}
            {item.calories != null && (
              <View style={[styles.macroChip, { backgroundColor: 'rgba(255,107,0,0.08)' }]}>
                <Text style={[styles.macroVal, { color: COLORS.secondary }]}>{item.calories}</Text>
                <Text style={styles.macroLbl}>cal</Text>
              </View>
            )}
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>₹{Number(item.price ?? 0)}</Text>
          </View>

          {/* ADD button or qty stepper */}
          {item.isAvailable ? (
            qty === 0 ? (
              <TouchableOpacity style={styles.addBtn} onPress={() => handleAddToCart(item)} activeOpacity={0.85}>
                <LinearGradient
                  colors={[COLORS.secondary, COLORS.secondaryDark]}
                  style={styles.addBtnGrad}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="add" size={15} color={COLORS.white} />
                  <Text style={styles.addBtnText}>ADD</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyMinus} onPress={() => handleRemoveFromCart(item.id)}>
                  <Ionicons name="remove" size={14} color={COLORS.secondary} />
                </TouchableOpacity>
                <Text style={styles.qtyNum}>{qty}</Text>
                <TouchableOpacity style={styles.qtyPlus} onPress={() => handleAddToCart(item)}>
                  <Ionicons name="add" size={14} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            )
          ) : (
            <Text style={styles.naText}>Unavailable</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <LinearGradient colors={['#1A0800', '#0D0D0D']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Build Café</Text>
            <Text style={styles.headerSub}>Order takeaway · pay with Razorpay</Text>
          </View>
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => navigation.navigate('Cart')}
          >
            <Ionicons name="bag-outline" size={22} color={COLORS.white} />
            {totalItems > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalItems}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color={COLORS.textMuted} style={{ marginLeft: 12 }} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search food & supplements..."
            placeholderTextColor={COLORS.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ marginRight: 10 }}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* 2-column item grid */}
      <FlatList
        style={{ flex: 1 }}
        data={filteredItems}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderItem}
        ListHeaderComponent={() => (
          <>
            {/* Category tabs */}
            <FlatList
              horizontal
              data={categories}
              keyExtractor={(c) => c}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScroll}
              renderItem={({ item: cat }) => (
                <TouchableOpacity
                  style={[styles.tab, activeCategory === cat && styles.tabActive]}
                  onPress={() => setActiveCategory(cat)}
                >
                  <Ionicons
                    name={CATEGORY_ICONS[cat] || 'grid-outline'}
                    size={13}
                    color={activeCategory === cat ? COLORS.secondary : COLORS.textMuted}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.tabText, activeCategory === cat && styles.tabTextActive]}>{cat}</Text>
                </TouchableOpacity>
              )}
            />
            <Text style={styles.resultCount}>
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
              {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
            </Text>
          </>
        )}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={44} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No items found</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: totalItems > 0 ? 80 : 20 }} />}
      />

      {/* Floating cart bar */}
      {totalItems > 0 && (
        <View style={styles.cartBar}>
          <Text style={styles.cartBarQty}>{totalItems} item{totalItems !== 1 ? 's' : ''}</Text>
          <TouchableOpacity style={styles.cartBarBtn} onPress={() => navigation.navigate('Cart')}>
            <Text style={styles.cartBarBtnText}>VIEW CART · ₹{totalRupees}</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },

  // Header
  header: { paddingTop: 52, paddingHorizontal: 18, paddingBottom: 14 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.white },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cartBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: COLORS.surface, borderWidth: 1,
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 17, height: 17, borderRadius: 9,
    backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { fontSize: 9, fontWeight: '900', color: COLORS.white },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, height: 44,
  },
  searchInput: { flex: 1, color: COLORS.white, fontSize: 14, paddingHorizontal: 10 },

  // Tabs
  tabsScroll: { paddingHorizontal: HORIZONTAL_PAD, paddingTop: 12, paddingBottom: 4, gap: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.secondaryGlow, borderColor: COLORS.secondary },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.secondary, fontWeight: '800' },
  resultCount: {
    paddingHorizontal: HORIZONTAL_PAD + 2,
    paddingTop: 8, paddingBottom: 6,
    fontSize: 11, color: COLORS.textMuted, fontWeight: '600',
  },

  // Grid layout
  gridContent: { paddingHorizontal: HORIZONTAL_PAD },
  columnWrapper: { gap: COLUMN_GAP, marginBottom: COLUMN_GAP },

  // Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  cardUnavailable: { opacity: 0.55 },
  imgBox: {
    width: '100%', height: CARD_WIDTH * 0.85,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  itemImage: { width: '100%', height: '100%' },
  emoji: { fontSize: 48, color: COLORS.secondary, fontWeight: '900' },
  unavailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  unavailText: { fontSize: 12, fontWeight: '700', color: COLORS.white },

  // Card body
  cardBody: { padding: 12, gap: 6 },
  itemName: { fontSize: 14, fontWeight: '800', color: COLORS.white, lineHeight: 19, minHeight: 25 },

  // Macros
  macrosRow: { flexDirection: 'row', gap: 6 },
  macroChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.surface2, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4,
  },
  macroVal: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  macroLbl: { fontSize: 10, color: COLORS.textMuted },

  // Price
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  priceText: { fontSize: 17, fontWeight: '900', color: COLORS.white },

  // ADD button
  addBtn: { borderRadius: 10, overflow: 'hidden', marginTop: 2 },
  addBtnGrad: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 10, gap: 4,
  },
  addBtnText: { fontSize: 13, fontWeight: '900', color: COLORS.white },

  // Qty stepper
  qtyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface2, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.secondaryBorder, marginTop: 2, overflow: 'hidden',
  },
  qtyMinus: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  qtyNum: { fontSize: 14, fontWeight: '900', color: COLORS.white },
  qtyPlus: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.secondary },

  naText: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 2 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 15, color: COLORS.textMuted },

  // Floating cart bar — sits just above the tab bar (screen area already excludes tab height)
  cartBar: {
    position: 'absolute', bottom: 30, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.secondaryBorder, padding: 14,
    // shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
  },
  cartBarQty: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  cartBarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.secondary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  cartBarBtnText: { fontSize: 13, fontWeight: '900', color: COLORS.white },
});
