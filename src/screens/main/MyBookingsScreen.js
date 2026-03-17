import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchMemberBookings, cancelBooking } from '../../services/api';
import { useUser } from '../../context/UserContext';

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour < 12 ? 'AM' : 'PM'}`;
}

const TYPE_COLOR = {
  yoga: '#7C3AED', boxing: '#DC2626', pickleball: '#16A34A',
  hiit: '#D97706', sauna: '#B45309', cycling: '#2563EB', other: COLORS.secondary,
};

export default function MyBookingsScreen({ navigation }) {
  const { userId, refreshWallet } = useUser();
  const [tab, setTab] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    fetchMemberBookings(userId)
      .then((data) => setBookings(data || []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const today = new Date();
  const upcoming = bookings.filter((b) => {
    if (b.status === 'cancelled') return false;
    const sessionDate = b.session?.sessionDate ? new Date(b.session.sessionDate) : null;
    return !sessionDate || sessionDate >= new Date(today.toDateString());
  });
  const past = bookings.filter((b) => {
    if (b.status === 'cancelled') return true;
    const sessionDate = b.session?.sessionDate ? new Date(b.session.sessionDate) : null;
    return sessionDate && sessionDate < new Date(today.toDateString());
  });

  const handleCancel = (booking) => {
    Alert.alert(
      'Cancel Booking',
      `Cancel your ${booking.session?.title || 'session'} booking? Coins will be refunded.`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel', style: 'destructive',
          onPress: async () => {
            try {
              await cancelBooking(booking.id);
              await refreshWallet();
              load();
            } catch {
              Alert.alert('Error', 'Failed to cancel booking.');
            }
          },
        },
      ]
    );
  };

  const renderBooking = (b, isPast) => {
    const session = b.session || {};
    const accentColor = TYPE_COLOR[session.type] || COLORS.secondary;
    return (
      <View key={b.id} style={[styles.bookingCard, isPast && styles.bookingCardPast]}>
        {!isPast && <View style={[styles.accentBar, { backgroundColor: accentColor }]} />}
        <View style={styles.bookingContent}>
          <View style={styles.bookingTopRow}>
            <Text style={styles.bookingTitle}>{session.title || '—'}</Text>
            {!isPast ? (
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: '#22C55E44' }]}>
                <Text style={[styles.statusText, { color: '#22C55E' }]}>CONFIRMED</Text>
              </View>
            ) : (
              <Text style={styles.pastStatusText}>{b.status === 'cancelled' ? 'Cancelled' : 'Completed'}</Text>
            )}
          </View>
          <Text style={styles.bookingDateTime}>
            {fmtDate(session.sessionDate)} · {fmtTime(session.sessionTime)}
          </Text>
          <Text style={styles.coinText}>₿ {b.coinDeducted ?? session.coinCost ?? 0} coins</Text>
          {!isPast && (
            <View style={styles.bookingActions}>
              <TouchableOpacity onPress={() => handleCancel(b)}>
                <Text style={styles.cancelText}>Cancel Booking</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.glowTop} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'upcoming' && styles.tabActive]}
          onPress={() => setTab('upcoming')}
        >
          <Text style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}>
            Upcoming {upcoming.length > 0 ? `(${upcoming.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'past' && styles.tabActive]}
          onPress={() => setTab('past')}
        >
          <Text style={[styles.tabText, tab === 'past' && styles.tabTextActive]}>
            Past {past.length > 0 ? `(${past.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {tab === 'upcoming' ? (
            upcoming.length > 0
              ? upcoming.map((b) => renderBooking(b, false))
              : (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={56} color="#444" />
                  <Text style={styles.emptyTitle}>No Upcoming Bookings</Text>
                  <Text style={styles.emptySub}>Book a session from the Activities tab</Text>
                  <TouchableOpacity
                    style={styles.emptyBtn}
                    onPress={() => navigation.navigate('Activities')}
                  >
                    <Text style={styles.emptyBtnText}>Browse Activities</Text>
                  </TouchableOpacity>
                </View>
              )
          ) : (
            past.length > 0
              ? past.map((b) => renderBooking(b, true))
              : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No past bookings</Text>
                </View>
              )
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  glowTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, backgroundColor: 'rgba(233,99,22,0.07)' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  tabsRow: {
    flexDirection: 'row', paddingHorizontal: 24, borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)', gap: 28, marginBottom: 4,
  },
  tab: { paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.secondary },
  tabText: { fontSize: 14, fontWeight: '700', color: '#666' },
  tabTextActive: { color: COLORS.secondary },
  scroll: { padding: 20 },
  bookingCard: {
    flexDirection: 'row', backgroundColor: '#1C1C1E', borderRadius: 18,
    borderWidth: 1, borderColor: '#333', marginBottom: 14, overflow: 'hidden',
  },
  bookingCardPast: { opacity: 0.75 },
  accentBar: { width: 5, borderRadius: 0 },
  bookingContent: { flex: 1, padding: 16, paddingLeft: 14 },
  bookingTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  bookingTitle: { fontSize: 17, fontWeight: '800', color: '#fff', flex: 1 },
  statusBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  bookingDateTime: { fontSize: 13, fontWeight: '600', color: '#aaa', marginBottom: 3 },
  coinText: { fontSize: 12, color: COLORS.secondary, fontWeight: '700', marginBottom: 10 },
  bookingActions: { alignItems: 'flex-end' },
  cancelText: { fontSize: 13, fontWeight: '700', color: '#EF4444' },
  pastStatusText: { fontSize: 12, color: '#555', fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  emptySub: { fontSize: 13, color: '#666' },
  emptyBtn: { marginTop: 8, borderWidth: 1, borderColor: COLORS.secondary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.secondary },
});
