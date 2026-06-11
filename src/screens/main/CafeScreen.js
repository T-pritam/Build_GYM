import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, TextInput, Image, ActivityIndicator, RefreshControl, AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';
import { fetchMenu } from '../../services/cafeService';
import { subscribeMenuAvailability, subscribeCafeStatus } from '../../services/cafeSupabase';
import { fetchCafeStatus } from '../../services/cafeApiService';
import { useCartStore, cartQty, cartTotal } from '../../store/cartStore';
import AddonPickerModal from '../../components/AddonPickerModal';

export default function CafeScreen({ navigation }) {
  const [menuItems,       setMenuItems]       = useState([]);
  const [categories,      setCategories]      = useState(['All']);
  const [activeCategory,  setActiveCategory]  = useState('All');
  const [search,          setSearch]          = useState('');
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [addonTarget,     setAddonTarget]     = useState(null);
  const [cafeIsOpen,      setCafeIsOpen]      = useState(true);


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
  // We flatten to a single array with `category` denormalized onto each item.
  const loadMenu = useCallback(async ({ isRefresh = false } = {}) => {
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
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMenu({ isRefresh: true });
    fetchCafeStatus().then((data) => {
      if (typeof data?.isOpen === 'boolean') setCafeIsOpen(data.isOpen);
    });
  }, [loadMenu]);

  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        fetchCafeStatus().then((d) => {
          if (typeof d?.isOpen === 'boolean') setCafeIsOpen(d.isOpen);
        });
        loadMenu();
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [loadMenu]);

  useEffect(() => {
    loadMenu();

    // Fetch and subscribe to cafe open/close status
    fetchCafeStatus().then((data) => {
      if (typeof data?.isOpen === 'boolean') setCafeIsOpen(data.isOpen);
    });
    const unsubCafeStatus = subscribeCafeStatus(({ isOpen }) => setCafeIsOpen(isOpen));

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

    return () => { unsubscribe?.(); unsubCafeStatus?.(); };
  }, [loadMenu]);

  const getQty = (itemId) => cartItems.find((c) => c.id === itemId)?.qty || 0;
  const totalItems = cartQty(cartItems);
  const totalRupees = cartTotal(cartItems);

  const filteredItems = menuItems.filter((item) => {
    const matchCat    = activeCategory === 'All' || item.category === activeCategory;
    const q = search.trim().replace(/\s+/g, ' ').toLowerCase();
    const matchSearch = q === '' || item.name.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const handleAddToCart = useCallback((item) => {
    const currentQty = cartItems.find((c) => c.id === item.id)?.qty ?? 0;
    if (currentQty > 0) {
      // Already in cart — just increment without re-asking for add-ons
      addItem({
        id: item.id, menuItemId: item.id, name: item.name,
        category: item.category, imageUrl: item.imageUrl,
        price: Number(item.price ?? 0), isAvailable: item.isAvailable,
        modifiers: [], maxOrderQty: item.maxOrderQty,
      });
      return;
    }
    const availableMods = (item.modifiers ?? []).filter((m) => m.isAvailable !== false);
    if (availableMods.length > 0) {
      setAddonTarget(item);
    } else {
      addItem({
        id: item.id, menuItemId: item.id, name: item.name,
        category: item.category, imageUrl: item.imageUrl,
        price: Number(item.price ?? 0), isAvailable: item.isAvailable,
        modifiers: [], maxOrderQty: item.maxOrderQty,
      });
    }
  }, [addItem, cartItems]);

  const handleAddonConfirm = useCallback((selectedAddons) => {
    const item = addonTarget;
    setAddonTarget(null);
    addItem({
      id:          item.id,
      menuItemId:  item.id,
      name:        item.name,
      category:    item.category,
      imageUrl:    item.imageUrl,
      price:       Number(item.price ?? 0),
      isAvailable: item.isAvailable,
      modifiers:   selectedAddons.map((a) => ({ name: a.name, price: a.price })),
      maxOrderQty: item.maxOrderQty,
    });
  }, [addonTarget, addItem]);

  const handleRemoveFromCart = useCallback((itemId) => {
    removeItem(itemId);
  }, [removeItem]);

  const renderItem = ({ item }) => {
    const qty    = getQty(item.id);
    const maxQty = Math.min(10, item.maxOrderQty ?? 10);

    return (
      <TouchableOpacity
        style={[styles.row, !item.isAvailable && styles.rowUnavailable]}
        onPress={() => navigation.navigate('ItemDetail', { item })}
        activeOpacity={0.88}
      >
        {/* Left: text block */}
        <View style={styles.rowBody}>
          {!!item.category && (
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>{String(item.category).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          {!!item.description && (
            <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
          )}

          <View style={styles.priceCtaRow}>
            <Text style={styles.priceText}>₹{Number(item.price ?? 0)}</Text>

            {item.isAvailable ? (
              qty === 0 ? (
                <TouchableOpacity
                  style={[styles.addBtn, !cafeIsOpen && { opacity: 0.35 }]}
                  onPress={() => cafeIsOpen ? handleAddToCart(item) : null}
                  activeOpacity={0.85}
                  disabled={!cafeIsOpen}
                >
                  <Ionicons name="add" size={15} color={COLORS.white} />
                  <Text style={styles.addBtnText}>ADD</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.qtyRow}>
                  <TouchableOpacity style={styles.qtyMinus} onPress={() => handleRemoveFromCart(item.id)}>
                    <Ionicons name="remove" size={15} color={COLORS.primaryLight} />
                  </TouchableOpacity>
                  <Text style={styles.qtyNum}>{qty}</Text>
                  <TouchableOpacity
                    style={[styles.qtyPlus, qty >= maxQty && styles.qtyPlusDisabled]}
                    onPress={() => handleAddToCart(item)}
                    disabled={qty >= maxQty}
                  >
                    <Ionicons name="add" size={15} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              )
            ) : (
              <Text style={styles.naText}>UNAVAILABLE</Text>
            )}
          </View>
        </View>

        {/* Right: image */}
        <View style={styles.imgBox}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" />
          ) : (
            <LinearGradient colors={['#2A1640', '#0F2A2A']} style={styles.imgFallback}>
              <Text style={styles.imgLetter}>{item.name.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          )}
          {!item.isAvailable && (
            <View style={styles.unavailOverlay}>
              <Text style={styles.unavailText}>UNAVAILABLE</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        {/* Row 1: back · BUILD Café · cart */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.brand}>
            <Text style={styles.brandBold}>BUILD</Text>
            <Text style={styles.brandItalic}>  Café</Text>
          </Text>

          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Cart')}>
            <Ionicons name="bag-outline" size={20} color={COLORS.textPrimary} />
            {totalItems > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalItems}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Row 2: search */}
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
      </View>

      {/* Cafe closed banner */}
      {!cafeIsOpen && (
        <View style={styles.cafeClosedBanner}>
          <MaterialCommunityIcons name="store-off" size={16} color="#fff" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.cafeClosedTitle}>Cafe is Currently Closed</Text>
            <Text style={styles.cafeClosedSub}>Orders are not being accepted right now. Please check back later.</Text>
          </View>
        </View>
      )}

      {/* Item list */}
      <FlatList
        style={{ flex: 1 }}
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} />
        }
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
                  <Text style={[styles.tabText, activeCategory === cat && styles.tabTextActive]}>
                    {String(cat).toUpperCase()}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <Text style={styles.resultCount}>
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
              {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
            </Text>
          </>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={44} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No items found</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: totalItems > 0 ? 90 : 20 }} />}
      />

      {/* Floating cart bar */}
      {totalItems > 0 && cafeIsOpen && (
        <View style={styles.cartBar}>
          <Text style={styles.cartBarQty}>{totalItems} item{totalItems !== 1 ? 's' : ''}</Text>
          <TouchableOpacity style={styles.cartBarBtn} onPress={() => navigation.navigate('Cart')}>
            <Text style={styles.cartBarBtnText}>VIEW CART · ₹{totalRupees}</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}

      <AddonPickerModal
        visible={addonTarget !== null}
        itemName={addonTarget?.name ?? ''}
        basePrice={Number(addonTarget?.price ?? 0)}
        addons={(addonTarget?.modifiers ?? [])
          .filter((m) => m.isAvailable !== false)
          .map((m) => ({ id: m.id ?? m.name, name: m.name, price: Number(m.price ?? 0) }))}
        onConfirm={handleAddonConfirm}
        onDismiss={() => setAddonTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },

  // Header
  header: { paddingTop: 52, paddingHorizontal: 18, paddingBottom: 12 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  iconBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  brand: { textAlign: 'center' },
  brandBold: { fontFamily: FONTS.headline, fontSize: 20, color: COLORS.white, letterSpacing: 1 },
  brandItalic: { fontFamily: FONTS.taglineItalic, fontSize: 20, color: COLORS.textSecondary, fontStyle: 'italic' },
  cartBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 9, color: COLORS.white },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, height: 46,
  },
  searchInput: { flex: 1, fontFamily: FONTS.body, color: COLORS.textPrimary, fontSize: 14, paddingHorizontal: 10 },

  // Tabs (text-only pills)
  tabsScroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, gap: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontFamily: FONTS.label, fontSize: 11, color: COLORS.textMuted, letterSpacing: 1 },
  tabTextActive: { color: COLORS.white },
  resultCount: {
    paddingHorizontal: 18, paddingTop: 10, paddingBottom: 6,
    fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted,
  },

  // List
  listContent: { paddingHorizontal: 16, gap: 12 },

  // Row card
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 12,
  },
  rowUnavailable: { opacity: 0.55 },
  rowBody: { flex: 1, gap: 6 },
  tagPill: {
    alignSelf: 'flex-start', backgroundColor: COLORS.primarySoft,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  tagText: { fontFamily: FONTS.label, fontSize: 8, color: COLORS.primaryLight, letterSpacing: 1.5 },
  itemName: { fontFamily: FONTS.headline, fontSize: 17, color: COLORS.white },
  itemDesc: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },

  priceCtaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  priceText: { fontFamily: FONTS.bodyBold, fontSize: 18, color: COLORS.white },

  // ADD pill
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  addBtnText: { fontFamily: FONTS.label, fontSize: 12, color: COLORS.white, letterSpacing: 1 },

  // Qty stepper
  qtyRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface2, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.primaryBorder, overflow: 'hidden',
  },
  qtyMinus: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  qtyNum: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white, minWidth: 18, textAlign: 'center' },
  qtyPlus: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  qtyPlusDisabled: { opacity: 0.35 },
  naText: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted, letterSpacing: 1 },

  // Image
  imgBox: { width: 96, height: 96, borderRadius: 14, overflow: 'hidden', backgroundColor: COLORS.surface2 },
  itemImage: { width: '100%', height: '100%' },
  imgFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  imgLetter: { fontFamily: FONTS.display, fontSize: 36, color: COLORS.primaryLight },
  unavailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  unavailText: { fontFamily: FONTS.label, fontSize: 9, color: COLORS.white, letterSpacing: 1 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontFamily: FONTS.body, fontSize: 15, color: COLORS.textMuted },

  // Floating cart bar
  cartBar: {
    position: 'absolute', bottom: 30, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.primaryBorder, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  cartBarQty: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.textSecondary },
  cartBarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11,
  },
  cartBarBtnText: { fontFamily: FONTS.label, fontSize: 12, color: COLORS.white, letterSpacing: 1 },

  cafeClosedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#7f1d1d',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cafeClosedTitle: { fontFamily: FONTS.bodyBold, fontSize: 13, color: '#fff' },
  cafeClosedSub: { fontFamily: FONTS.body, fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
});
