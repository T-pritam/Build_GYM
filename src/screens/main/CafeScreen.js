import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, TextInput, Image, ActivityIndicator, RefreshControl, AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../../theme';
import GradientIcon from '../../components/GradientIcon';
import { fetchMenu } from '../../services/cafeService';
import { subscribeMenuAvailability, subscribeCafeStatus } from '../../services/cafeSupabase';
import { fetchCafeStatus } from '../../services/cafeApiService';
import { useCartStore, cartQty, cartTotal } from '../../store/cartStore';
import AddonPickerModal from '../../components/AddonPickerModal';

const ACCENT = '#7C3AED'; // Stitch café accent (ADD / stepper / tags)

export default function CafeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [menuItems,       setMenuItems]       = useState([]);
  const [categories,      setCategories]      = useState(['All']);
  const [activeCategory,  setActiveCategory]  = useState('All');
  const [search,          setSearch]          = useState('');
  const [searchActive,    setSearchActive]    = useState(false);
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
              <View style={styles.ctaSlot}>
                {qty === 0 ? (
                  <TouchableOpacity
                    style={[styles.addBtn, !cafeIsOpen && { opacity: 0.35 }]}
                    onPress={() => cafeIsOpen ? handleAddToCart(item) : null}
                    activeOpacity={0.85}
                    disabled={!cafeIsOpen}
                  >
                    <Text style={styles.addBtnText}>+ ADD</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.stepper}>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => handleRemoveFromCart(item.id)}>
                      <Ionicons name="remove" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.stepQty}>{qty}</Text>
                    <TouchableOpacity
                      style={[styles.stepBtn, qty >= maxQty && { opacity: 0.35 }]}
                      onPress={() => handleAddToCart(item)}
                      disabled={qty >= maxQty}
                    >
                      <Ionicons name="add" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.naPill}>
                <Text style={styles.naText}>UNAVAILABLE</Text>
              </View>
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

      {/* Header — back · BUILD Café · search (toggles search bar) */}
      <View style={styles.header}>
        {searchActive ? (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="rgba(255,169,250,0.6)" />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search menu..."
              placeholderTextColor={COLORS.textMuted}
              autoFocus
            />
            <TouchableOpacity onPress={() => { setSearch(''); setSearchActive(false); }} hitSlop={8}>
              <Text style={styles.searchCancel}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} activeOpacity={0.7}>
              <GradientIcon name="arrow-back" set="ionicons" size={24} />
            </TouchableOpacity>

            <Text style={styles.brand}>
              <Text style={styles.brandBold}>BUILD</Text>
              <Text style={styles.brandItalic}>  Café</Text>
            </Text>

            <TouchableOpacity onPress={() => setSearchActive(true)} hitSlop={10} activeOpacity={0.7}>
              <GradientIcon name="search" set="ionicons" size={23} />
            </TouchableOpacity>
          </View>
        )}
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
          // Category filter strip
          <FlatList
            horizontal
            data={categories}
            keyExtractor={(c) => c}
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScroll}
            contentContainerStyle={styles.tabsRow}
            renderItem={({ item: cat }) => {
              const active = activeCategory === cat;
              return (
                <TouchableOpacity
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setActiveCategory(cat)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {String(cat).toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={44} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No items found</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: totalItems > 0 ? 80 + insets.bottom : 20 }} />}
      />

      {/* Floating cart bar — full width: count · total · VIEW CART */}
      {totalItems > 0 && cafeIsOpen && (
        <View style={[styles.cartBar, { paddingBottom: 12 + insets.bottom }]}>
          <Text style={styles.cartBarQty}>{totalItems} item{totalItems !== 1 ? 's' : ''}</Text>
          <Text style={styles.cartBarTotal}>₹{totalRupees}</Text>
          <TouchableOpacity style={styles.cartBarBtn} onPress={() => navigation.navigate('Cart')} activeOpacity={0.85}>
            <Text style={styles.cartBarBtnText}>VIEW CART</Text>
            <Ionicons name="arrow-forward" size={14} color="#FF9FFB" />
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
  header: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 14, justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 40,
  },
  brand: { textAlign: 'center', flex: 1 },
  brandBold: { fontFamily: FONTS.bodyBold, fontSize: 20, color: COLORS.white, letterSpacing: 0.5 },
  brandItalic: { fontFamily: FONTS.taglineItalic, fontSize: 20, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic' },

  // Toggle search bar
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 40,
    backgroundColor: '#1A1A2E', borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,169,250,0.40)', paddingHorizontal: 16,
  },
  searchInput: { flex: 1, fontFamily: FONTS.body, color: COLORS.white, fontSize: 14, padding: 0 },
  searchCancel: { fontFamily: FONTS.label, fontSize: 12, color: 'rgba(0,188,212,0.85)', letterSpacing: 1 },

  // Category tabs
  tabsScroll: { flexGrow: 0 },
  tabsRow: { paddingLeft: 20, paddingTop: 4, paddingBottom: 14, gap: 12 },
  tab: {
    height: 34, paddingHorizontal: 22, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#373437', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  tabActive: { backgroundColor: '#FFA9FA', borderColor: 'transparent' },
  tabText: {
    fontFamily: FONTS.label, fontSize: 12, lineHeight: 16, color: COLORS.textSecondary,
    letterSpacing: 1.5, includeFontPadding: false, textAlignVertical: 'center',
  },
  tabTextActive: { color: '#37003B' },

  // List
  listContent: { paddingHorizontal: 20, paddingBottom: 8, gap: 12 },

  // Row card
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#1A1A2E', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5,
    shadowRadius: 16, elevation: 6,
  },
  rowUnavailable: { opacity: 0.5 },
  rowBody: { flex: 1 },
  tagPill: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(124,58,237,0.10)',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8,
  },
  tagText: { fontFamily: FONTS.label, fontSize: 10, color: ACCENT, letterSpacing: 1.5 },
  itemName: { fontFamily: FONTS.bodyBold, fontSize: 18, color: COLORS.white, marginBottom: 6 },
  itemDesc: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary, marginBottom: 10 },

  priceCtaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  priceText: { fontFamily: FONTS.bodyBold, fontSize: 18, color: COLORS.white },

  // ADD / stepper — both occupy an 84×36 slot
  ctaSlot: { width: 84, height: 36 },
  addBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: ACCENT, borderRadius: 999,
  },
  addBtnText: { fontFamily: FONTS.label, fontSize: 12, color: COLORS.white, letterSpacing: 1 },
  stepper: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: ACCENT, borderRadius: 999, paddingHorizontal: 6,
  },
  stepBtn: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepQty: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white, minWidth: 16, textAlign: 'center' },
  naPill: {
    backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  naText: { fontFamily: FONTS.label, fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 },

  // Image
  imgBox: { width: 96, height: 96, borderRadius: 10, overflow: 'hidden', backgroundColor: COLORS.backgroundAlt },
  itemImage: { width: '100%', height: '100%' },
  imgFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  imgLetter: { fontFamily: FONTS.display, fontSize: 36, color: COLORS.primaryLight },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontFamily: FONTS.body, fontSize: 15, color: COLORS.textMuted },

  // Floating cart bar (full-width, pinned to bottom)
  cartBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: 'rgba(127,41,130,0.20)',
    paddingHorizontal: 20, paddingTop: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.8, shadowRadius: 30, elevation: 16,
  },
  cartBarQty: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary },
  cartBarTotal: { fontFamily: FONTS.headline, fontSize: 18, color: COLORS.white },
  cartBarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8,
  },
  cartBarBtnText: { fontFamily: FONTS.label, fontSize: 12, color: '#FF9FFB', letterSpacing: 1 },

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
