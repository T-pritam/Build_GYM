import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Image, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import { BASE_API_URL } from '@env';
import { COLORS } from '../../constants/colors';
import SafeBottomBar from '../../components/SafeBottomBar';
import { useCartStore } from '../../store/cartStore';

const SOCKET_URL = BASE_API_URL.replace(/\/api\/?$/, '');

/** Check if the current time falls within an availability window. */
function isWithinTimeWindow(from, until) {
  if (!from || !until) return true;
  const now = new Date();
  const [fH, fM] = from.split(':').map(Number);
  const [uH, uM] = until.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= fH * 60 + fM && mins <= uH * 60 + uM;
}

/** Format a time string like "07:00" → "7:00 AM". */
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

const NUTRI_ICONS = [
  { label: 'Calories', key: 'calories', icon: 'flame-outline', color: '#F97316' },
  { label: 'Protein', key: 'protein', icon: 'barbell-outline', color: '#22C55E' },
  { label: 'Carbs', key: 'carbs', icon: 'leaf-outline', color: '#3B82F6' },
  { label: 'Fat', key: 'fat', icon: 'water-outline', color: '#A855F7' },
];

export default function ItemDetailScreen({ navigation, route }) {
  const { item } = route.params || {};
  const [qty, setQty]               = useState(1);
  // Live availability — starts from route param, updated by socket
  const [isAvailable, setIsAvailable] = useState(item?.isAvailable ?? true);
  const addItem        = useCartStore((s) => s.addItem);
  const markUnavailable = useCartStore((s) => s.markUnavailable);
  const markAvailable   = useCartStore((s) => s.markAvailable);
  const socketRef = useRef(null);

  // Variations & add-ons state
  const availableVariations = useMemo(
    () => (item?.variations ?? []).filter((v) => v.isAvailable !== false),
    [item?.variations],
  );
  const [selectedVariation, setSelectedVariation] = useState(
    availableVariations[0] ?? null,
  );
  const availableAddons = useMemo(
    () => (item?.addons ?? []).filter((a) => a.isAvailable !== false),
    [item?.addons],
  );
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);

  const selectedAddons = useMemo(
    () => availableAddons.filter((a) => selectedAddonIds.includes(a.id)),
    [availableAddons, selectedAddonIds],
  );

  // Compute total price: base + variation delta + addons
  const basePriceCoins = item?.priceCoins ?? item?.price ?? 0;
  const variationPrice = selectedVariation?.priceCoins ?? selectedVariation?.price ?? 0;
  const addonTotal = selectedAddons.reduce((s, a) => s + (a.priceCoins ?? a.price ?? 0), 0);
  const totalPriceCoins = (availableVariations.length > 0 ? variationPrice : basePriceCoins) + addonTotal;

  // Time-window availability
  const withinWindow = isWithinTimeWindow(item?.availableFrom, item?.availableUntil);
  const canAddToCart = isAvailable && withinWindow;

  const toggleAddon = (id) => {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  useEffect(() => {
    if (!item) return;

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('menu:item_updated', ({ id, isAvailable: avail }) => {
      if (id !== item.id) return;
      setIsAvailable(avail);
      // Keep cart store in sync for this item too
      if (!avail) markUnavailable(id);
      else        markAvailable(id);
    });

    return () => socket.disconnect();
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item) return null;

  const incQty = () => setQty((q) => q + 1);
  const decQty = () => setQty((q) => Math.max(1, q - 1));

  const handleAddToCart = () => {
    if (!canAddToCart) return;
    const addonKey = selectedAddonIds.length
      ? selectedAddonIds.slice().sort().join(',')
      : '';
    const compositeKey = `${item.id}_${selectedVariation?.id || 'base'}_${addonKey}`;
    for (let i = 0; i < qty; i++) {
      addItem({
        id:          compositeKey,
        menuItemId:  item.id,
        name:        item.name,
        category:    item.category,
        imageUrl:    item.imageUrl,
        priceCoins:  totalPriceCoins,
        protein:     item.protein,
        calories:    item.calories,
        isAvailable: true,
        variationId:   selectedVariation?.id || null,
        variationName: selectedVariation?.name || null,
        addons:        selectedAddons.map((a) => ({ id: a.id, name: a.name, priceCoins: a.priceCoins ?? a.price })),
        specialInstructions: null,
      });
    }
    navigation.goBack();
  };

  const handleShare = () => {
    Share.share({ message: `Check out ${item.name} at Build Cafe — only ${item.priceCoins} Build Coins!` });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Floating top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.topBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero section */}
        <View style={styles.heroSection}>
          <View style={styles.heroGlow} pointerEvents="none" />
          <View style={styles.heroImgOuter}>
            <View style={styles.heroCategoryBadge}>
              <Text style={styles.heroCategoryText}>{item.category?.toUpperCase() || 'CAFE'}</Text>
            </View>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.heroImg} resizeMode="cover" />
            ) : (
              <View style={styles.heroImgEmpty}>
                <Text style={styles.heroLetter}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>{item.category?.toUpperCase() || 'CAFE'}</Text>
          </View>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceCoins}>{totalPriceCoins}</Text>
            <Text style={styles.priceSub}> Build Coins</Text>
          </View>
          {item.prepTimeMinutes ? (
            <View style={styles.prepBadge}>
              <Text style={styles.prepBadgeText}>⏱ ~{item.prepTimeMinutes} min</Text>
            </View>
          ) : null}

          <View style={styles.descCard}>
            <Text style={styles.descText}>{item.description}</Text>
          </View>

          {item.suitableFor ? (
            <View style={styles.bestForBanner}>
              <Ionicons name="heart" size={18} color={COLORS.secondary} />
              <View>
                <Text style={styles.bestForLabel}>Best for:</Text>
                <Text style={styles.bestForValue}>{item.suitableFor}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.nutriSection}>
            <Text style={styles.nutriHeading}>NUTRITIONAL INFO</Text>
            <View style={styles.nutriGrid}>
              {NUTRI_ICONS.map(({ label, key, icon, color }) => (
                <View key={key} style={styles.nutriCard}>
                  <Ionicons name={icon} size={20} color={color} />
                  <View>
                    <Text style={styles.nutriValue}>
                      {item[key] ?? '--'}{key === 'calories' ? ' kcal' : ''}
                    </Text>
                    <Text style={styles.nutriLabel}>{label}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Variations selector */}
          {availableVariations.length > 0 && (
            <View style={styles.variationsSection}>
              <Text style={styles.sectionHeading}>VARIATIONS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.variationsRow}>
                {availableVariations.map((v) => {
                  const isSelected = selectedVariation?.id === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.variationChip, isSelected && styles.variationChipSelected]}
                      onPress={() => setSelectedVariation(v)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.variationChipText, isSelected && styles.variationChipTextSelected]}>
                        {v.name}
                      </Text>
                      <Text style={[styles.variationChipPrice, isSelected && styles.variationChipPriceSelected]}>
                        {v.priceCoins ?? v.price} coins
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Add-ons section */}
          {availableAddons.length > 0 && (
            <View style={styles.addonsSection}>
              <Text style={styles.sectionHeading}>ADD-ONS</Text>
              {availableAddons.map((a) => {
                const isChecked = selectedAddonIds.includes(a.id);
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.addonRow, isChecked && styles.addonRowSelected]}
                    onPress={() => toggleAddon(a.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isChecked ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={isChecked ? COLORS.secondary : COLORS.textMuted}
                    />
                    <Text style={styles.addonName}>{a.name}</Text>
                    <Text style={styles.addonPrice}>+{a.priceCoins ?? a.price} coins</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Time availability */}
          {item.availableFrom && item.availableUntil ? (
            <View style={[styles.timeBadge, !withinWindow && styles.timeBadgeInactive]}>
              <Ionicons name="time-outline" size={16} color={withinWindow ? COLORS.secondary : COLORS.textMuted} />
              <Text style={[styles.timeBadgeText, !withinWindow && { color: COLORS.textMuted }]}>
                {withinWindow
                  ? `Available ${fmtTime(item.availableFrom)}–${fmtTime(item.availableUntil)}`
                  : `Available from ${fmtTime(item.availableFrom)}`}
              </Text>
            </View>
          ) : null}

          {isAvailable ? (
            <View style={styles.availBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
              <Text style={styles.availText}>Available at the cafe counter</Text>
            </View>
          ) : (
            <View style={[styles.availBanner, { backgroundColor: '#2A1A0A' }]}>
              <Ionicons name="close-circle" size={18} color="#EAB308" />
              <Text style={[styles.availText, { color: '#EAB308' }]}>Currently unavailable</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky bottom */}
      <SafeBottomBar style={styles.stickyBottom}>
        <View style={styles.qtyPill}>
          <TouchableOpacity style={styles.qtyBtn} onPress={decQty}>
            <Ionicons name="remove" size={18} color={COLORS.secondary} />
          </TouchableOpacity>
          <Text style={styles.qtyNum}>{qty}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={incQty}>
            <Ionicons name="add" size={18} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.addCartBtn, !canAddToCart && styles.addCartBtnDisabled]}
          onPress={handleAddToCart}
          disabled={!canAddToCart}
          activeOpacity={0.85}
        >
          <Ionicons name="cart-outline" size={20} color={COLORS.white} />
          <Text style={styles.addCartText}>
            ADD TO CART
          </Text>
        </TouchableOpacity>
      </SafeBottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 8,
  },
  topBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  heroSection: {
    width: '100%', aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  heroGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(233,99,22,0.1)',
  },
  heroImgOuter: {
    width: '80%', height: '80%', borderRadius: 24, overflow: 'hidden',
    position: 'relative', backgroundColor: COLORS.surface,
    shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12, shadowRadius: 30, elevation: 8,
  },
  heroCategoryBadge: {
    position: 'absolute', top: 12, right: 12, zIndex: 5,
    backgroundColor: COLORS.secondary, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  heroCategoryText: { fontSize: 9, fontWeight: '900', color: COLORS.white, letterSpacing: 1 },
  heroImg: { width: '100%', height: '100%' },
  heroImgEmpty: {
    width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  heroLetter: { fontSize: 80, fontWeight: '900', color: COLORS.secondary },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 14 },
  categoryChip: {
    alignSelf: 'flex-start', backgroundColor: COLORS.secondaryGlow,
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
  },
  categoryChipText: { fontSize: 9, fontWeight: '900', color: COLORS.secondary, letterSpacing: 1.5 },
  itemName: { fontSize: 24, fontWeight: '900', color: COLORS.white, lineHeight: 30 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  priceCoins: { fontSize: 22, fontWeight: '800', color: COLORS.secondary },
  priceSub: { fontSize: 14, fontWeight: '500', color: COLORS.textMuted },
  descCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.border, padding: 16,
  },
  descText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  bestForBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#2A1A0A', borderRadius: 12, padding: 14,
  },
  bestForLabel: { fontSize: 10, fontWeight: '800', color: COLORS.secondary, letterSpacing: 1, marginBottom: 2 },
  bestForValue: { fontSize: 14, fontWeight: '500', color: COLORS.secondary + 'CC' },
  nutriSection: { gap: 12 },
  nutriHeading: { fontSize: 10, fontWeight: '900', color: COLORS.secondary, letterSpacing: 3 },
  nutriGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nutriCard: {
    flex: 1, minWidth: '45%', backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 16, gap: 8,
  },
  nutriValue: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  nutriLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },

  // Variations
  variationsSection: { gap: 10 },
  sectionHeading: { fontSize: 10, fontWeight: '900', color: COLORS.secondary, letterSpacing: 3 },
  variationsRow: { gap: 10 },
  variationChip: {
    backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center',
  },
  variationChipSelected: { backgroundColor: COLORS.secondaryGlow, borderColor: COLORS.secondary },
  variationChipText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  variationChipTextSelected: { color: COLORS.secondary },
  variationChipPrice: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  variationChipPriceSelected: { color: COLORS.secondary },

  // Add-ons
  addonsSection: { gap: 8 },
  addonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  addonRowSelected: { borderColor: COLORS.secondary, backgroundColor: COLORS.secondaryGlow },
  addonName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.white },
  addonPrice: { fontSize: 13, fontWeight: '700', color: COLORS.secondary },

  // Prep time badge
  prepBadge: {
    alignSelf: 'flex-start', backgroundColor: COLORS.surface, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.border,
  },
  prepBadgeText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },

  // Time availability
  timeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2A1A0A', borderRadius: 12, padding: 14,
  },
  timeBadgeInactive: { backgroundColor: COLORS.surface },
  timeBadgeText: { fontSize: 13, fontWeight: '600', color: COLORS.secondary },
  availBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#0A2A1A', borderRadius: 12, padding: 14,
  },
  availText: { fontSize: 14, fontWeight: '600', color: '#22C55E' },
  stickyBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: COLORS.background + 'EE',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  qtyPill: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 30, paddingHorizontal: 6, paddingVertical: 6,
  },
  qtyBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.secondaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyNum: { fontSize: 16, fontWeight: '900', color: COLORS.white, minWidth: 16, textAlign: 'center' },
  addCartBtn: {
    flex: 1, height: 52, borderRadius: 30,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.secondary,
    shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  addCartBtnDisabled: { backgroundColor: COLORS.textMuted },
  addCartText: { fontSize: 13, fontWeight: '900', color: COLORS.white, letterSpacing: 1.5 },
});
