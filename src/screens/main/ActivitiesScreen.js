import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';
import SafeBottomBar from '../../components/SafeBottomBar';
import GradientIcon from '../../components/GradientIcon';
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

// Static filter pills (matches the Stitch design). Activities have no category
// field in the backend yet, so only "ALL" yields results — the rest are a
// visual shell.
const CATEGORIES = ['All', 'Cardio', 'Recovery', 'Sport'];

// "14:00" -> "2:00 PM"
const fmt12 = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const s = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${s}`;
};

// 5-step availability badge colour scale (open spots remaining today).
const badgeStyle = (n) => {
  if (n <= 0) return { bg: '#C62828', text: '#FFFFFF' };  // none
  if (n === 1) return { bg: '#FF6D00', text: '#FFFFFF' };  // critical
  if (n === 2) return { bg: '#FFA000', text: '#151215' };  // low
  if (n <= 4) return { bg: '#7C3AED', text: '#FFFFFF' };   // moderate
  return { bg: '#00BCD4', text: '#151215' };               // plenty
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

  // "All" shows everything; other pills filter by a category field that does
  // not exist yet (visual shell), so they fall through to an empty list.
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

      {/* Fixed corner controls — stay put while the rest of the page scrolls */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')}
        activeOpacity={0.75}
        hitSlop={10}
      >
        <GradientIcon name="arrow-back" set="ionicons" size={24} />
      </TouchableOpacity>
      <View style={styles.balanceWrap}>
        <Text style={styles.balanceText}>{Number(balance).toLocaleString('en-IN')}</Text>
        <MaterialIcons name="monetization-on" size={16} color="#F59E0B" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.cardsScroll}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} />}
      >
        {/* Header — row 1: centered title (scrolls; back + balance stay fixed) */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>ACTIVITIES</Text>
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

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillsScroll}
        contentContainerStyle={styles.pillsRow}
      >
        {CATEGORIES.map((c) => {
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
                  style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
                />
              )}
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {String(c).toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
        </ScrollView>

        <View style={styles.cardsWrap}>
        {visible.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No activities available</Text>
          </View>
        ) : (
          visible.map((act) => {
            const style = getStyle(act.name);
            const available = act.availableSlots ?? 0;
            const full = available <= 0;
            const badge = badgeStyle(available);
            const badgeLabel = full ? 'NO SLOTS' : `${available} SLOT${available === 1 ? '' : 'S'}`;
            const current = act.currentSlot;
            const next = act.nextSlot;
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

                  {/* Availability badge */}
                  <View style={[styles.slotBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.slotBadgeText, { color: badge.text }]}>{badgeLabel}</Text>
                  </View>

                  {/* Name + next slot overlaid on cover bottom */}
                  <View style={styles.coverBottom}>
                    <Text style={styles.coverName} numberOfLines={1}>{act.name}</Text>
                    {next?.startTime ? (
                      <Text style={styles.coverNext}>Next: {fmt12(next.startTime)}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Body */}
                <View style={styles.cardBody}>
                  {/* Today's slot timing */}
                  {current?.startTime ? (
                    <Text style={[styles.slotLine, current.isPast && styles.slotLinePast]}>
                      <Text style={styles.slotToday}>Today  </Text>
                      <Text style={styles.slotTime}>{fmt12(current.startTime)} — {fmt12(current.endTime)}</Text>
                    </Text>
                  ) : null}

                  <View style={styles.metaRow}>
                    <View style={styles.metaChip}>
                      <MaterialIcons name="schedule" size={15} color="#FFA9FA" />
                      <Text style={styles.metaItem}>{act.durationMinutes}m</Text>
                    </View>
                    <View style={styles.metaDot} />
                    <View style={styles.metaChip}>
                      <MaterialIcons name="monetization-on" size={15} color="#FFD700" />
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

                {/* Bottom purple glow line (Stitch .glass-card::after) */}
                <LinearGradient
                  colors={['transparent', 'rgba(127,41,130,0.5)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.cardGlowLine}
                  pointerEvents="none"
                />
              </TouchableOpacity>
            );
          })
        )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeBottomBar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // ── Header row 1 — back (left) · centered title · coin (right) ──
  headerRow: {
    justifyContent: 'center', alignItems: 'center',
    paddingTop: 54, paddingBottom: 6, paddingHorizontal: 20,
  },
  headerTitle: {
    fontFamily: FONTS.headline, fontSize: 18, color: COLORS.white,
    letterSpacing: 2, textTransform: 'uppercase',
  },
  backBtn: {
    position: 'absolute', left: 20, top: 52, zIndex: 20, elevation: 20,
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
  },
  balanceWrap: {
    position: 'absolute', right: 20, top: 54, zIndex: 20, elevation: 20,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  balanceText: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: COLORS.white },

  headerRow2: {
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10,
  },
  bookingsBtn: {
    borderWidth: 1, borderColor: '#7F2982', borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  bookingsBtnText: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.white, letterSpacing: 1.5 },

  pillsScroll: { flexGrow: 0, flexShrink: 0 },
  pillsRow: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, gap: 8 },
  pill: {
    height: 34, paddingHorizontal: 20, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  pillActive: { borderColor: 'transparent' },
  pillText: {
    fontFamily: FONTS.label, fontSize: 11, lineHeight: 16, color: '#D4C1CF',
    letterSpacing: 1.2, textAlignVertical: 'center', includeFontPadding: false,
  },
  pillTextActive: { color: '#0D0D0F', fontFamily: FONTS.bodyBold },

  cardsScroll: { flex: 1 },
  scroll: {},
  cardsWrap: { paddingHorizontal: 16, paddingTop: 10 },

  // Glass card: subtle light fill + hairline border, image cover on top, solid
  // #0D0D0F body below (matches Stitch .glass-card).
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.8,
    shadowRadius: 30, elevation: 8,
  },
  cardFull: { opacity: 0.8 },
  cardGlowLine: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, opacity: 0.5 },

  cover: { height: 192, position: 'relative' },
  coverImage: { opacity: 0.80 },
  coverIconWrap: { alignItems: 'center', justifyContent: 'center' },
  coverBottom: {
    position: 'absolute', left: 16, right: 16, bottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  coverName: {
    flex: 1, fontFamily: FONTS.display, fontSize: 30, color: COLORS.white,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  coverNext: {
    fontFamily: FONTS.label, fontSize: 10, color: '#D4C1CF',
    letterSpacing: 1, marginLeft: 8, marginBottom: 4, textTransform: 'uppercase',
  },

  slotBadge: {
    position: 'absolute', top: 16, right: 16,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4,
  },
  slotBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },

  cardBody: { backgroundColor: '#0D0D0F', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },

  // Today's current/next slot line
  slotLine: { marginBottom: 12, letterSpacing: 1.5 },
  slotLinePast: { textDecorationLine: 'line-through', opacity: 0.6 },
  slotToday: { fontFamily: FONTS.bodyBold, fontSize: 10, color: '#00BCD4', letterSpacing: 1.5, textTransform: 'uppercase' },
  slotTime: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.white, letterSpacing: 1.5, textTransform: 'uppercase' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaItem: { fontFamily: FONTS.label, fontSize: 11, color: COLORS.white, letterSpacing: 1, textTransform: 'uppercase' },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },
  metaCost: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#FFD700', letterSpacing: 0.5 },

  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 10,
  },
  bookBtnText: { fontFamily: FONTS.label, fontSize: 11, color: COLORS.white, letterSpacing: 2, textTransform: 'uppercase' },
  bookBtnFull: {
    height: 48, borderRadius: 10, backgroundColor: '#1f1f1f',
    alignItems: 'center', justifyContent: 'center',
  },
  bookBtnFullText: { fontFamily: FONTS.label, fontSize: 11, color: '#666666', letterSpacing: 2, textTransform: 'uppercase' },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontFamily: FONTS.body, fontSize: 16, color: COLORS.textMuted },
});
