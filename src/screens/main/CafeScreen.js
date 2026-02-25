import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { cafeCategories, cafeItems, buildCoins } from '../../constants/dummyData';

const { width } = Dimensions.get('window');
const HORIZONTAL_PAD = 14;
const COLUMN_GAP = 12;
const CARD_WIDTH = (width - HORIZONTAL_PAD * 2 - COLUMN_GAP) / 2;

const CATEGORY_ICONS = {
  All: 'grid-outline',
  Shakes: 'water-outline',
  Meals: 'restaurant-outline',
  Snacks: 'pizza-outline',
  Supplements: 'flask-outline',
};

const ITEM_EMOJI = {
  Shakes: '🥤',
  Meals: '🍽️',
  Snacks: '🍫',
  Supplements: '💊',
};

export default function CafeScreen({ navigation }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);

  const filteredItems = cafeItems.filter((item) => {
    const matchCat = activeCategory === 'All' || item.category === activeCategory;
    const matchSearch =
      search.trim() === '' ||
      item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const addToCart = useCallback((item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((itemId) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === itemId);
      if (existing?.qty === 1) return prev.filter((c) => c.id !== itemId);
      return prev.map((c) => c.id === itemId ? { ...c, qty: c.qty - 1 } : c);
    });
  }, []);

  const getQty = (itemId) => cart.find((c) => c.id === itemId)?.qty || 0;
  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);
  const totalCoins = cart.reduce((sum, c) => sum + c.price * c.qty, 0);

  const renderItem = ({ item }) => {
    const qty = getQty(item.id);
    const emoji = ITEM_EMOJI[item.category] || '🥗';

    return (
      <TouchableOpacity
        style={[styles.card, !item.available && styles.cardUnavailable]}
        onPress={() => navigation.navigate('ItemDetail', { item, cart, onAddToCart: addToCart })}
        activeOpacity={0.88}
      >
        {/* Image area */}
        <LinearGradient colors={['#2A1200', '#160800']} style={styles.imgBox}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
          ) : (
            <Text style={styles.emoji}>{emoji}</Text>
          )}
          {item.tag && (
            <View style={styles.tagBadge}>
              <Text style={styles.tagText}>{item.tag}</Text>
            </View>
          )}
          {!item.available && (
            <View style={styles.unavailOverlay}>
              <Text style={styles.unavailText}>N/A</Text>
            </View>
          )}
        </LinearGradient>

        {/* Info area */}
        <View style={styles.cardBody}>
          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>

          {/* Macros: protein + calories only */}
          <View style={styles.macrosRow}>
            <View style={styles.macroChip}>
              <Text style={styles.macroVal}>{item.protein}</Text>
              <Text style={styles.macroLbl}>P</Text>
            </View>
            <View style={[styles.macroChip, { backgroundColor: 'rgba(255,107,0,0.08)' }]}>
              <Text style={[styles.macroVal, { color: COLORS.secondary }]}>{item.calories}</Text>
              <Text style={styles.macroLbl}>cal</Text>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <MaterialCommunityIcons name="bitcoin" size={11} color={COLORS.secondary} />
            <Text style={styles.priceText}>{item.price}</Text>
          </View>

          {/* ADD button or qty stepper */}
          {item.available ? (
            qty === 0 ? (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => addToCart(item)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[COLORS.secondary, COLORS.secondaryDark]}
                  style={styles.addBtnGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="add" size={15} color={COLORS.white} />
                  <Text style={styles.addBtnText}>ADD</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyMinus} onPress={() => removeFromCart(item.id)}>
                  <Ionicons name="remove" size={14} color={COLORS.secondary} />
                </TouchableOpacity>
                <Text style={styles.qtyNum}>{qty}</Text>
                <TouchableOpacity style={styles.qtyPlus} onPress={() => addToCart(item)}>
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <LinearGradient colors={['#1A0800', '#0D0D0D']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Build Café</Text>
            <Text style={styles.headerSub}>Order with Build Coins</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.coinsPill}>
              <MaterialCommunityIcons name="bitcoin" size={13} color={COLORS.secondary} />
              <Text style={styles.coinsPillText}>{buildCoins.balance.toLocaleString()}</Text>
            </View>
            <TouchableOpacity
              style={styles.cartBtn}
              onPress={() => navigation.navigate('Cart', { cart, totalCoins })}
            >
              <Ionicons name="bag-outline" size={22} color={COLORS.white} />
              {totalItems > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{totalItems}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
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
        data={filteredItems}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        renderItem={renderItem}
        ListHeaderComponent={() => (
          <>
            {/* Category tabs */}
            <FlatList
              horizontal
              data={cafeCategories}
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
                  <Text style={[styles.tabText, activeCategory === cat && styles.tabTextActive]}>
                    {cat}
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
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={44} color={COLORS.textDim} />
            <Text style={styles.emptyText}>No items found</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 110 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: { paddingTop: 52, paddingHorizontal: 18, paddingBottom: 14 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.white },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coinsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.secondaryGlow, borderWidth: 1,
    borderColor: COLORS.secondaryBorder, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  coinsPillText: { fontSize: 13, fontWeight: '800', color: COLORS.secondary },
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

  // Result count
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardUnavailable: { opacity: 0.55 },

  // Image box
  imgBox: {
    width: '100%',
    height: CARD_WIDTH * 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  emoji: { fontSize: 52 },
  tagBadge: {
    position: 'absolute', top: 7, left: 7,
    backgroundColor: COLORS.secondary, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  tagText: { fontSize: 10, fontWeight: '900', color: COLORS.white },
  unavailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  unavailText: { fontSize: 12, fontWeight: '700', color: COLORS.white },

  // Card body
  cardBody: { padding: 12, gap: 6 },
  itemName: {
    fontSize: 14, fontWeight: '800', color: COLORS.white,
    lineHeight: 19, minHeight: 25,
  },

  // Macros
  macrosRow: { flexDirection: 'row', gap: 6 },
  macroChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.surface2, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 4,
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
    backgroundColor: COLORS.surface2,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.secondaryBorder,
    marginTop: 2, overflow: 'hidden',
  },
  qtyMinus: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  qtyNum: { fontSize: 14, fontWeight: '900', color: COLORS.white },
  qtyPlus: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.secondary,
  },

  naText: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 2 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 15, color: COLORS.textMuted },
});
