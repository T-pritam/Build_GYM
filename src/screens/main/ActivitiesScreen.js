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

// Fallback colors/icons for activities without cover images. `emoji` is kept
// for ActivityDetailScreen (which still reads fallbackStyle.emoji); this screen
// renders the Ionicons `icon` instead of an emoji.
const FALLBACK_STYLE = {
  'Yoga':           { icon: 'body-outline',       emoji: '🧘', color: ['#7C3AED', '#4C1D95'] },
  'Boxing':         { icon: 'fitness-outline',    emoji: '🥊', color: ['#DC2626', '#7F1D1D'] },
  'Pickleball':     { icon: 'tennisball-outline', emoji: '🏓', color: ['#16A34A', '#14532D'] },
  'HIIT':           { icon: 'flash-outline',      emoji: '⚡', color: ['#D97706', '#78350F'] },
  'Sauna & Steam':  { icon: 'flame-outline',      emoji: '♨️', color: ['#B45309', '#451A03'] },
  'Cycling':        { icon: 'bicycle-outline',    emoji: '🚴', color: ['#2563EB', '#1E3A8A'] },
};
const DEFAULT_STYLE = { icon: 'barbell-outline', emoji: '🏋️', color: ['#6B7280', '#374151'] };

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

      {/* Header — row 2: my bookings (right-aligned) */}
      <View style={styles.headerRow2}>
        <TouchableOpacity
          style={styles.bookingsBtn}
          onPress={() => navigation.navigate('MyBookings')}
          activeOpacity={0.75}
        >
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
          {categories.map((c) => {
            const active = activeCat === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setActiveCat(c)}
                activeOpacity={0.8}
              >
                {active && (
                  <LinearGradient
                    colors={['#7C3AED', '#00BCD4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {String(c).toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
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
                    <Image source={{ uri: act.coverImageUrl }} style={[StyleSheet.absoluteFill, styles.coverImage]} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={[style.color[0], style.color[1]]} style={[StyleSheet.absoluteFill, styles.coverIconWrap]}>
                      <Ionicons name={style.icon} size={54} color="rgba(255,255,255,0.28)" />
                    </LinearGradient>
                  )}
                  <LinearGradient
                    colors={['transparent', 'transparent', '#0D0D0F']}
                    style={StyleSheet.absoluteFill}
                  />

                  {/* Slot badge — only when data provides it */}
                  {info && info.count != null && (
                    <View style={[
                      styles.slotBadge,
                      full ? styles.slotBadgeFull : info.count <= 2 ? styles.slotBadgeLow : styles.slotBadgeOk,
                    ]}>
                      <Text style={[
                        styles.slotBadgeText,
                        full ? styles.slotBadgeTextLight : info.count <= 2 ? styles.slotBadgeTextDark : styles.slotBadgeTextDark,
                      ]}>
                        {full ? 'NO SLOTS' : `${info.count} SLOT${info.count === 1 ? '' : 'S'}`}
                      </Text>
                    </View>
                  )}

                  {/* Name + next slot overlaid on cover bottom */}
                  <View style={styles.coverBottom}>
                    <Text style={styles.coverName} numberOfLines={1}>{act.name}</Text>
                    {info?.next && <Text style={styles.coverNext}>Next: {info.next}</Text>}
                  </View>
                </View>

                {/* Body */}
                <View style={styles.cardBody}>
                  <View style={styles.metaRow}>
                    <View style={styles.metaChip}>
                      <Ionicons name="time-outline" size={14} color={COLORS.primaryLight} />
                      <Text style={styles.metaItem}>{act.durationMinutes}m</Text>
                    </View>
                    <View style={styles.metaDot} />
                    <View style={styles.metaChip}>
                      <Text style={styles.metaCoin}>₿</Text>
                      <Text style={styles.metaCost}>{act.coinPrice}</Text>
                    </View>
                  </View>

                  {full ? (
                    <View style={styles.bookBtnFull}>
                      <Text style={styles.bookBtnFullText}>FULLY BOOKED</Text>
                    </View>
                  ) : (
                    <LinearGradient
                      colors={['#7C3AED', '#00BCD4']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.bookBtn}
                    >
                      <Text style={styles.bookBtnText}>BOOK NOW</Text>
                      <Ionicons name="arrow-forward" size={15} color={COLORS.white} />
                    </LinearGradient>
                  )}
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
  headerTitle: { fontFamily: FONTS.headline, fontSize: 20, color: COLORS.white, letterSpacing: 2 },
  balanceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primarySoft, borderWidth: 1, borderColor: COLORS.primaryBorder,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  balanceCoin: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.primaryLight },
  balanceText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.primaryLight },

  headerRow2: {
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10,
  },
  bookingsBtn: {
    borderWidth: 1, borderColor: '#7F2982', borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  bookingsBtnText: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.white, letterSpacing: 1.5 },

  pillsRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 8 },
  pill: {
    paddingHorizontal: 22, paddingVertical: 8, borderRadius: 999, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  pillActive: { borderColor: 'transparent' },
  pillText: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textSecondary, letterSpacing: 1.5 },
  pillTextActive: { color: '#0D0D0F', fontFamily: FONTS.bodyBold },

  scroll: { paddingHorizontal: 16, paddingTop: 10 },

  // Glass card: subtle light fill + hairline border, image cover on top, solid
  // #0D0D0F body below (matches Stitch .glass-card).
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: 14,
  },
  cardFull: { opacity: 0.8 },

  cover: { height: 185, position: 'relative' },
  coverImage: { opacity: 0.85 },
  coverIconWrap: { alignItems: 'center', justifyContent: 'center' },
  coverBottom: {
    position: 'absolute', left: 16, right: 16, bottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  coverName: {
    flex: 1, fontFamily: FONTS.display, fontSize: 26, color: COLORS.white,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  coverNext: {
    fontFamily: FONTS.label, fontSize: 9.5, color: '#d4c1cf',
    letterSpacing: 1, marginLeft: 8, marginBottom: 3, textTransform: 'uppercase',
  },

  slotBadge: {
    position: 'absolute', top: 12, right: 12,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4,
  },
  slotBadgeOk: { backgroundColor: '#00BCD4' },
  slotBadgeLow: { backgroundColor: '#FFA000' },
  slotBadgeFull: { backgroundColor: '#C62828' },
  slotBadgeText: { fontFamily: FONTS.label, fontSize: 9.5, letterSpacing: 0.8, textTransform: 'uppercase' },
  slotBadgeTextDark: { color: '#151215' },
  slotBadgeTextLight: { color: '#FFFFFF' },

  cardBody: { backgroundColor: '#0D0D0F', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaItem: { fontFamily: FONTS.label, fontSize: 11, color: COLORS.white, letterSpacing: 1, textTransform: 'uppercase' },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },
  metaCoin: { fontFamily: FONTS.bodyBold, fontSize: 13, color: '#FFD700' },
  metaCost: { fontFamily: FONTS.bodyBold, fontSize: 13, color: '#FFD700', letterSpacing: 0.5 },

  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 46, borderRadius: 10,
  },
  bookBtnText: { fontFamily: FONTS.label, fontSize: 11, color: COLORS.white, letterSpacing: 2, textTransform: 'uppercase' },
  bookBtnFull: {
    height: 46, borderRadius: 10, backgroundColor: '#1f1f1f',
    alignItems: 'center', justifyContent: 'center',
  },
  bookBtnFullText: { fontFamily: FONTS.label, fontSize: 11, color: '#666666', letterSpacing: 2, textTransform: 'uppercase' },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontFamily: FONTS.body, fontSize: 16, color: COLORS.textMuted },
});
