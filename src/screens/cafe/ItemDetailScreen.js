import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Image, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const NUTRI_ICONS = [
  { label: 'Calories', key: 'calories', icon: 'flame-outline', color: '#F97316' },
  { label: 'Protein', key: 'protein', icon: 'barbell-outline', color: '#22C55E' },
  { label: 'Carbs', key: 'carbs', icon: 'leaf-outline', color: '#3B82F6' },
  { label: 'Fat', key: 'fat', icon: 'water-outline', color: '#A855F7' },
];

export default function ItemDetailScreen({ navigation, route }) {
  const { item, onAddToCart } = route.params || {};
  const [qty, setQty] = useState(1);

  if (!item) return null;

  const incQty = () => setQty((q) => q + 1);
  const decQty = () => setQty((q) => Math.max(1, q - 1));

  const handleAddToCart = () => {
    if (onAddToCart) {
      for (let i = 0; i < qty; i++) onAddToCart(item);
    }
    navigation.goBack();
  };

  const handleShare = () => {
    Share.share({ message: `Check out ${item.name} at Build Cafe - only B${item.price}!` });
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
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.heroImg} resizeMode="cover" />
            ) : (
              <View style={styles.heroImgEmpty}>
                <Text style={{ fontSize: 80 }}>{item.emoji || '🥗'}</Text>
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
            <Text style={styles.priceCoins}>B {item.price}</Text>
            <Text style={styles.priceSub}> Build Coins</Text>
          </View>

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

          {item.available ? (
            <View style={styles.availBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
              <Text style={styles.availText}>Available at the cafe counter</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky bottom */}
      <View style={styles.stickyBottom}>
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
          style={[styles.addCartBtn, !item.available && styles.addCartBtnDisabled]}
          onPress={handleAddToCart}
          disabled={!item.available}
          activeOpacity={0.85}
        >
          <Ionicons name="cart-outline" size={20} color={COLORS.white} />
          <Text style={styles.addCartText}>ADD TO CART  B {item.price * qty}</Text>
        </TouchableOpacity>
      </View>
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
  availBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#0A2A1A', borderRadius: 12, padding: 14,
  },
  availText: { fontSize: 14, fontWeight: '600', color: '#22C55E' },
  stickyBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 34,
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
