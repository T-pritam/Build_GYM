import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function ItemDetailScreen({ navigation, route }) {
  const { item, onAddToCart } = route.params || {};
  const [qty, setQty] = useState(1);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  if (!item) return null;

  const handleAdd = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start(() => {
      // Add item qty times to cart
      if (onAddToCart) {
        for (let i = 0; i < qty; i++) onAddToCart(item);
      }
      navigation.goBack();
    });
  };

  const totalCoins = item.price * qty;

  const macros = [
    { label: 'Calories', value: `${item.calories} kcal`, icon: 'flame-outline', color: '#FF6B00' },
    { label: 'Protein', value: item.protein, icon: 'barbell-outline', color: '#4CAF50' },
    { label: 'Carbs', value: item.carbs, icon: 'leaf-outline', color: '#2196F3' },
    { label: 'Fat', value: item.fat, icon: 'water-outline', color: '#9C27B0' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Hero area */}
      <LinearGradient
        colors={['#2A1200', '#1A0800', '#0D0D0D']}
        style={styles.hero}
      >
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>

        {/* Hero image */}
        <View style={styles.heroImgWrap}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <Text style={styles.heroEmoji}>
              {item.category === 'Shakes' ? '🥤' :
               item.category === 'Meals' ? '🍽️' :
               item.category === 'Snacks' ? '🍫' : '💊'}
            </Text>
          )}
        </View>

        {/* Tag */}
        {item.tag && (
          <View style={styles.heroTag}>
            <Text style={styles.heroTagText}>{item.tag}</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category chip */}
        <View style={styles.catChip}>
          <Text style={styles.catChipText}>{item.category}</Text>
        </View>

        {/* Name & Price */}
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={styles.priceRow}>
          <MaterialCommunityIcons name="bitcoin" size={20} color={COLORS.secondary} />
          <Text style={styles.priceNum}>{item.price}</Text>
          <Text style={styles.priceLabel}> Build Coins</Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>{item.description}</Text>

        {/* Suitable for */}
        <View style={styles.suitableBox}>
          <Ionicons name="fitness-outline" size={16} color={COLORS.secondary} />
          <Text style={styles.suitableText}>
            Best for: <Text style={styles.suitableHL}>{item.suitableFor}</Text>
          </Text>
        </View>

        {/* Macros */}
        <Text style={styles.sectionTitle}>Nutritional Info</Text>
        <View style={styles.macrosGrid}>
          {macros.map((m) => (
            <View key={m.label} style={styles.macroCard}>
              <View style={[styles.macroIcon, { backgroundColor: `${m.color}18` }]}>
                <Ionicons name={m.icon} size={20} color={m.color} />
              </View>
              <Text style={styles.macroValue}>{m.value}</Text>
              <Text style={styles.macroLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Availability */}
        <View style={[styles.availRow, { backgroundColor: item.available ? COLORS.successLight : COLORS.errorLight }]}>
          <Ionicons
            name={item.available ? 'checkmark-circle-outline' : 'close-circle-outline'}
            size={18}
            color={item.available ? COLORS.success : COLORS.error}
          />
          <Text style={[styles.availText, { color: item.available ? COLORS.success : COLORS.error }]}>
            {item.available ? 'Available at the café counter' : 'Currently unavailable'}
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      {item.available && (
        <View style={styles.bottomBar}>
          {/* Qty selector */}
          <View style={styles.qtyWrap}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQty((q) => Math.max(1, q - 1))}
            >
              <Ionicons name="remove" size={18} color={COLORS.secondary} />
            </TouchableOpacity>
            <Text style={styles.qtyNum}>{qty}</Text>
            <TouchableOpacity
              style={[styles.qtyBtn, styles.qtyBtnAdd]}
              onPress={() => setQty((q) => q + 1)}
            >
              <Ionicons name="add" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Add to cart button */}
          <Animated.View style={[styles.addBtnWrap, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.85}>
              <LinearGradient
                colors={[COLORS.secondary, COLORS.secondaryDark]}
                style={styles.addBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="bag-add-outline" size={18} color={COLORS.white} />
                <Text style={styles.addBtnText}>ADD TO CART</Text>
                <View style={styles.addBtnPricePill}>
                  <MaterialCommunityIcons name="bitcoin" size={11} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.addBtnPrice}>{totalCoins}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Hero
  hero: { height: 260, paddingTop: 52, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  backBtn: {
    position: 'absolute', top: 52, left: 20, width: 42, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  heroImgWrap: {
    width: 140, height: 140, borderRadius: 24,
    backgroundColor: 'rgba(255,107,0,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,107,0,0.2)',
    overflow: 'hidden',
  },
  heroImage: { width: '100%', height: '100%' },
  heroEmoji: { fontSize: 64 },
  heroTag: {
    position: 'absolute', bottom: 20, right: 20,
    backgroundColor: COLORS.secondary, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  heroTagText: { fontSize: 10, fontWeight: '800', color: COLORS.white, letterSpacing: 1 },

  // Content
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  catChip: {
    alignSelf: 'flex-start', backgroundColor: COLORS.secondaryGlow,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.secondaryBorder, marginBottom: 10,
  },
  catChipText: { fontSize: 10, fontWeight: '800', color: COLORS.secondary, letterSpacing: 1 },
  itemName: { fontSize: 28, fontWeight: '900', color: COLORS.white, lineHeight: 32, marginBottom: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  priceNum: { fontSize: 26, fontWeight: '900', color: COLORS.secondary },
  priceLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  description: {
    fontSize: 14, color: COLORS.textSecondary, lineHeight: 22,
    marginBottom: 16, padding: 14, backgroundColor: COLORS.surface,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  suitableBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.secondaryGlow, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.secondaryBorder, padding: 12, marginBottom: 24,
  },
  suitableText: { fontSize: 13, color: COLORS.textSecondary },
  suitableHL: { color: COLORS.secondary, fontWeight: '700' },

  // Section
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.white, marginBottom: 12 },

  // Macros
  macrosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  macroCard: {
    flex: 1, minWidth: '44%', backgroundColor: COLORS.surface,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, alignItems: 'center', gap: 6,
  },
  macroIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  macroValue: { fontSize: 18, fontWeight: '900', color: COLORS.white },
  macroLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },

  // Availability
  availRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginBottom: 8,
  },
  availText: { fontSize: 13, fontWeight: '600' },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingBottom: 34, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.background, gap: 12,
  },
  qtyWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  qtyBtn: {
    width: 40, height: 50, alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnAdd: { backgroundColor: COLORS.secondary },
  qtyNum: { fontSize: 16, fontWeight: '800', color: COLORS.white, paddingHorizontal: 16 },
  addBtnWrap: { flex: 1 },
  addBtn: { borderRadius: 14, overflow: 'hidden' },
  addBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, gap: 8,
  },
  addBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.white, letterSpacing: 1 },
  addBtnPricePill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 2,
  },
  addBtnPrice: { fontSize: 12, fontWeight: '800', color: COLORS.white },
});
