import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';
import { fetchMyBookings } from '../../services/activityService';
import { fetchMyTrials, TRIAL_STATUS_META } from '../../services/trialService';
import SafeBottomBar from '../../components/SafeBottomBar';

const TABS = ['All', 'Upcoming', 'Past', 'Cancelled'];

// Display badge from booking status + bucket (upcoming list vs past list).
function statusMeta(status, bucket) {
  if (status === 'cancelled') return { label: 'CANCELLED', color: '#F44336', bg: 'rgba(244,67,54,0.12)', border: 'rgba(244,67,54,0.3)' };
  if (bucket === 'upcoming')  return { label: 'UPCOMING',  color: '#A78BFA', bg: 'rgba(124,58,237,0.2)', border: 'rgba(124,58,237,0.4)' };
  if (status === 'completed') return { label: 'COMPLETED', color: '#4CAF50', bg: 'rgba(76,175,80,0.15)', border: 'rgba(76,175,80,0.3)' };
  if (status === 'no_show')   return { label: 'NO SHOW',   color: '#F5B041', bg: 'rgba(245,176,65,0.12)', border: 'rgba(245,176,65,0.4)' };
  return { label: String(status).toUpperCase(), color: COLORS.textMuted, bg: 'rgba(255,255,255,0.06)', border: COLORS.border };
}

export default function MyBookingsScreen({ navigation }) {
  const [tab, setTab] = useState('All');
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBookings = useCallback(async () => {
    try {
      const [upRes, pastRes, trialUpRes, trialPastRes] = await Promise.all([
        fetchMyBookings({ status: 'upcoming', limit: 50 }),
        fetchMyBookings({ status: 'past', limit: 50 }),
        fetchMyTrials('upcoming').catch(() => null),
        fetchMyTrials('past').catch(() => null),
      ]);
      setUpcoming(upRes.data?.data || []);
      setPast(pastRes.data?.data || []);
      setTrials([
        ...((trialUpRes?.data?.data || []).map((t) => ({ ...t, _bucket: 'upcoming', _isTrial: true }))),
        ...((trialPastRes?.data?.data || []).map((t) => ({ ...t, _bucket: 'past', _isTrial: true }))),
      ]);
    } catch (err) {
      console.warn('Failed to load bookings:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  // Reload when screen comes into focus (e.g. after a cancellation)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => loadBookings());
    return unsubscribe;
  }, [navigation, loadBookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBookings();
  }, [loadBookings]);

  // Tag each row with its bucket, then filter by tab. Trials ride alongside bookings.
  const isTrialCancelled = (r) => r._isTrial && (r.status === 'cancelled_by_member' || r.status === 'cancelled_by_admin');
  const tagged = [
    ...upcoming.map((r) => ({ ...r, _bucket: 'upcoming' })),
    ...trials.filter((r) => r._bucket === 'upcoming'),
    ...past.map((r) => ({ ...r, _bucket: 'past' })),
    ...trials.filter((r) => r._bucket === 'past'),
  ];
  const rows = tagged.filter((r) => {
    if (tab === 'All') return true;
    if (tab === 'Upcoming') return r._bucket === 'upcoming';
    if (tab === 'Cancelled') return r._isTrial ? isTrialCancelled(r) : r.booking?.status === 'cancelled';
    if (tab === 'Past') return r._bucket === 'past';
    return true;
  });

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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color="#9D7BFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} style={styles.tab} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            {tab === t && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} />}
      >
        {rows.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={56} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No {tab !== 'All' ? tab.toLowerCase() : ''} bookings</Text>
            <Text style={styles.emptySub}>Book a session from the Activities tab</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Activities')}>
              <Text style={styles.emptyBtnText}>Browse Activities</Text>
            </TouchableOpacity>
          </View>
        ) : (
          rows.map((row) => {
            // ── Trial row ──
            if (row._isTrial) {
              const meta = TRIAL_STATUS_META[row.status] || TRIAL_STATUS_META.scheduled;
              const cancelled = isTrialCancelled(row);
              const when = new Date(row.scheduledAt);
              return (
                <TouchableOpacity
                  key={`trial-${row.id}`}
                  style={[styles.card, cancelled && styles.cardDim]}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('TrialDetail', { trialId: row.id })}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardLeft}>
                      <Text style={[styles.cardTitle, cancelled && { color: COLORS.textMuted }]} numberOfLines={1}>
                        Trial · Coach {row.trainerName}
                      </Text>
                      <Text style={[styles.cardDate, cancelled && { color: COLORS.textDim }]}>
                        {when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {when.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                      <Text style={[styles.badgeText, { color: meta.color }]}>TRIAL</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }
            // ── Activity booking row ──
            const b = row.booking;
            const meta = statusMeta(b.status, row._bucket);
            const cancelled = b.status === 'cancelled';
            return (
              <TouchableOpacity
                key={b.id}
                style={[styles.card, cancelled && styles.cardDim]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('BookingDetail', { row })}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <Text style={[styles.cardTitle, cancelled && { color: COLORS.textMuted }]}>
                      {row.activityName}
                    </Text>
                    <Text style={[styles.cardDate, cancelled && { color: COLORS.textDim }]}>
                      {row.slotDate} · {row.slotStartTime}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                    <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
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

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: FONTS.headline, fontSize: 18, color: COLORS.white, letterSpacing: 0.5 },

  // Full-width evenly-distributed tabs with a purple active underline.
  tabsRow: {
    flexDirection: 'row', paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', marginBottom: 12,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: 'rgba(212,193,207,0.7)' },
  tabTextActive: { fontFamily: FONTS.bodyBold, color: COLORS.white },
  tabUnderline: {
    position: 'absolute', bottom: -1, left: 0, right: 0, height: 2,
    backgroundColor: '#7C3AED',
  },

  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  // Stitch .glass-card — #1A1A2E @ 0.9, hairline white border, 12px radius.
  card: {
    backgroundColor: 'rgba(26,26,46,0.9)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    padding: 16, marginBottom: 8,
  },
  cardDim: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1, gap: 4, paddingRight: 10 },
  cardTitle: { fontFamily: FONTS.bodyMedium, fontSize: 16, color: COLORS.white },
  badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontFamily: FONTS.bodyBold, fontSize: 10, letterSpacing: 1 },
  cardDate: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary },

  emptyState: { alignItems: 'center', paddingVertical: 70, gap: 12 },
  emptyTitle: { fontFamily: FONTS.headline, fontSize: 18, color: COLORS.white, textTransform: 'capitalize' },
  emptySub: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted },
  emptyBtn: {
    marginTop: 8, borderWidth: 1, borderColor: COLORS.primaryBorder,
    borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10,
  },
  emptyBtnText: { fontFamily: FONTS.label, fontSize: 12, color: COLORS.primaryLight, letterSpacing: 1 },
});
