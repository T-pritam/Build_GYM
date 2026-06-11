import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';
import SafeBottomBar from '../../components/SafeBottomBar';
import { fetchActivities } from '../../services/activityService';
import { useWalletStore } from '../../store/walletStore';

// Fallback colors/emojis for activities without cover images
const FALLBACK_STYLE = {
  'Yoga':           { emoji: '🧘', color: ['#7C3AED', '#4C1D95'] },
  'Boxing':         { emoji: '🥊', color: ['#DC2626', '#7F1D1D'] },
  'Pickleball':     { emoji: '🏓', color: ['#16A34A', '#14532D'] },
  'HIIT':           { emoji: '⚡', color: ['#D97706', '#78350F'] },
  'Sauna & Steam':  { emoji: '♨️', color: ['#B45309', '#451A03'] },
  'Cycling':        { emoji: '🚴', color: ['#2563EB', '#1E3A8A'] },
};
const DEFAULT_STYLE = { emoji: '🏋️', color: ['#6B7280', '#374151'] };

// Slot availability summary — only present if the list API provides it.
const slotInfo = (act) => {
  const count = act.availableSlots ?? act.slotsAvailable ?? act.remainingSlots ?? null;
  const next  = act.nextSlotTime ?? act.nextSlot ?? null;
  if (count == null && next == null) return null;
  return { count, next };
};

export default function ActivitiesScreen({ navigation }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCat, setActiveCat] = useState('All');

  const balance = useWalletStore((s) => s.balance);
  const fetchBalance = useWalletStore((s) => s.fetchBalance);

  const loadActivities = useCallback(async () => {
    try {
      const res = await fetchActivities();
      setActivities(res.data?.data || []);
    } catch (err) {
      console.warn('Failed to load activities:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadActivities(); fetchBalance(); }, [loadActivities]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadActivities();
    fetchBalance();
  }, [loadActivities]);

  const getStyle = (name) => FALLBACK_STYLE[name] || DEFAULT_STYLE;

  // Derive category pills from data if present, else just "All".
  const categories = ['All', ...Array.from(new Set(
    activities.map((a) => a.category || a.type).filter(Boolean),
  ))];
  const visible = activeCat === 'All'
    ? activities
    : activities.filter((a) => (a.category || a.type) === activeCat);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
      </View>
    );
  }

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header — row 1: title + balance */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>ACTIVITIES</Text>
        <View style={styles.balanceChip}>
          <Text style={styles.balanceCoin}>₿</Text>
          <Text style={styles.balanceText}>{Number(balance).toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Header — row 2: my bookings */}
      <View style={styles.headerRow2}>
        <Text style={styles.subtitle}>Book sessions with Build Coins</Text>
        <TouchableOpacity
          style={styles.bookingsBtn}
          onPress={() => navigation.navigate('MyBookings')}
        >
          <Ionicons name="calendar-outline" size={14} color={COLORS.primaryLight} />
          <Text style={styles.bookingsBtnText}>MY BOOKINGS</Text>
        </TouchableOpacity>
      </View>

      {/* Category pills (only meaningful if data has categories) */}
      {categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          {categories.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.pill, activeCat === c && styles.pillActive]}
              onPress={() => setActiveCat(c)}
            >
              <Text style={[styles.pillText, activeCat === c && styles.pillTextActive]}>
                {String(c).toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} />}
      >
        {visible.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No activities available</Text>
          </View>
        ) : (
          visible.map((act) => {
            const style = getStyle(act.name);
            const info = slotInfo(act);
            const full = info?.count === 0;
            return (
              <TouchableOpacity
                key={act.id}
                style={[styles.card, full && styles.cardFull]}
                onPress={() => navigation.navigate('ActivityDetail', { activity: act, fallbackStyle: style })}
                activeOpacity={0.9}
              >
                {/* Cover */}
                <View style={styles.cover}>
                  {act.coverImageUrl ? (
                    <Image source={{ uri: act.coverImageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={[style.color[0], style.color[1]]} style={StyleSheet.absoluteFill}>
                      <Text style={styles.coverEmoji}>{style.emoji}</Text>
                    </LinearGradient>
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(8,6,8,0.92)']}
                    style={StyleSheet.absoluteFill}
                  />

                  {/* Slot badge — only when data provides it */}
                  {info && info.count != null && (
                    <View style={[
                      styles.slotBadge,
                      full ? styles.slotBadgeFull : info.count <= 2 ? styles.slotBadgeLow : styles.slotBadgeOk,
                    ]}>
                      <Text style={styles.slotBadgeText}>
                        {full ? 'NO SLOTS' : `${info.count} SLOT${info.count === 1 ? '' : 'S'}`}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.coverName}>{act.name}</Text>
                </View>

                {/* Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.metaRow}>
                    {info?.next && <Text style={styles.metaNext}>Next {info.next}</Text>}
                    <Text style={styles.metaItem}>{act.durationMinutes} min</Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={styles.metaCost}>₿ {act.coinPrice}</Text>
                  </View>
                  <Text style={styles.bookNow}>BOOK NOW →</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeBottomBar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 4,
  },
  headerTitle: { fontFamily: FONTS.headline, fontSize: 22, color: COLORS.white, letterSpacing: 2 },
  balanceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primarySoft, borderWidth: 1, borderColor: COLORS.primaryBorder,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  balanceCoin: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.primaryLight },
  balanceText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.primaryLight },

  headerRow2: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8,
  },
  subtitle: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted },
  bookingsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.primaryBorder, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  bookingsBtnText: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.primaryLight, letterSpacing: 1 },

  pillsRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 8 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted, letterSpacing: 1 },
  pillTextActive: { color: COLORS.white },

  scroll: { paddingHorizontal: 16, paddingTop: 10 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 14,
  },
  cardFull: { opacity: 0.6 },
  cover: { height: 150, justifyContent: 'flex-end', padding: 14 },
  coverEmoji: { fontSize: 52, position: 'absolute', top: '26%', alignSelf: 'center' },
  coverName: { fontFamily: FONTS.display, fontSize: 26, color: COLORS.white, letterSpacing: 1 },
  slotBadge: {
    position: 'absolute', top: 12, right: 12,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  slotBadgeOk: { backgroundColor: 'rgba(45,212,191,0.9)' },
  slotBadgeLow: { backgroundColor: 'rgba(245,176,65,0.95)' },
  slotBadgeFull: { backgroundColor: 'rgba(244,67,54,0.95)' },
  slotBadgeText: { fontFamily: FONTS.label, fontSize: 9, color: '#0D0D0F', letterSpacing: 1 },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaNext: { fontFamily: FONTS.bodyMedium, fontSize: 11, color: COLORS.textSecondary, marginRight: 4 },
  metaItem: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: COLORS.textMuted },
  metaDot: { color: COLORS.textMuted },
  metaCost: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.primaryLight },
  bookNow: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.primaryLight, letterSpacing: 1 },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontFamily: FONTS.body, fontSize: 16, color: COLORS.textMuted },
});
