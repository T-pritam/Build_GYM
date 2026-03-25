import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const UPCOMING = [
  {
    id: 'b1', title: 'Yoga', date: '25 Feb 2026', time: '07:00 AM',
    location: 'Studio 1', status: 'confirmed', statusColor: '#22C55E',
    statusBg: 'rgba(34,197,94,0.1)', accentColor: COLORS.secondary,
  },
  {
    id: 'b2', title: 'Personal Training', date: '26 Feb 2026', time: '06:00 PM',
    location: 'Functional Zone', status: 'pending', statusColor: '#F59E0B',
    statusBg: 'rgba(245,158,11,0.1)', accentColor: '#F59E0B',
  },
];

const PAST = [
  {
    id: 'p1', title: 'Boxing', date: '20 Feb 2026', time: '05:00 PM',
    location: 'Combat Zone', status: 'Completed', done: true,
  },
  {
    id: 'p2', title: 'HIIT', date: '18 Feb 2026', time: '06:00 AM',
    location: 'Main Floor', status: 'Completed', done: true,
  },
];

export default function MyBookingsScreen({ navigation }) {
  const [tab, setTab] = useState('upcoming');

  const handleCancel = (booking) => {
    Alert.alert(
      'Cancel Booking',
      `Cancel your ${booking.title} session on ${booking.date}?`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        { text: 'Cancel Booking', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.glowTop} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'upcoming' && styles.tabActive]}
          onPress={() => setTab('upcoming')}
        >
          <Text style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'past' && styles.tabActive]}
          onPress={() => setTab('past')}
        >
          <Text style={[styles.tabText, tab === 'past' && styles.tabTextActive]}>Past</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {tab === 'upcoming' ? (
          UPCOMING.length > 0 ? UPCOMING.map((b) => (
            <View key={b.id} style={styles.bookingCard}>
              <View style={[styles.accentBar, { backgroundColor: b.accentColor }]} />
              <View style={styles.bookingContent}>
                <View style={styles.bookingTopRow}>
                  <Text style={styles.bookingTitle}>{b.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: b.statusBg, borderColor: b.statusColor + '44' }]}>
                    <Text style={[styles.statusText, { color: b.statusColor }]}>
                      {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.bookingDateTime}>{b.date} · {b.time}</Text>
                <Text style={styles.bookingLocation}>{b.location}</Text>
                <View style={styles.bookingActions}>
                  <TouchableOpacity onPress={() => handleCancel(b)}>
                    <Text style={styles.cancelText}>Cancel Booking</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )) : (
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
          <>
            <Text style={styles.pastSectionLabel}>Recently Completed</Text>
            {PAST.map((b) => (
              <View key={b.id} style={[styles.bookingCard, styles.bookingCardPast]}>
                <View style={styles.bookingContent}>
                  <View style={styles.bookingTopRow}>
                    <Text style={styles.bookingTitle}>{b.title}</Text>
                    <Text style={styles.pastStatusText}>{b.status}</Text>
                  </View>
                  <Text style={styles.bookingDateTime}>{b.date} · {b.time}</Text>
                  <Text style={styles.bookingLocation}>{b.location}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
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
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#1C1C1E',
    alignItems: 'center', justifyContent: 'center',
  },
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
  bookingTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  statusBadge: {
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
  },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  bookingDateTime: { fontSize: 13, fontWeight: '600', color: '#aaa', marginBottom: 3 },
  bookingLocation: { fontSize: 12, color: '#666', marginBottom: 10 },
  bookingActions: { alignItems: 'flex-end' },
  cancelText: { fontSize: 13, fontWeight: '700', color: '#EF4444' },

  pastSectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#555', textTransform: 'uppercase',
    letterSpacing: 2, marginBottom: 12,
  },
  pastStatusText: { fontSize: 12, color: '#555', fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  emptySub: { fontSize: 13, color: '#666' },
  emptyBtn: {
    marginTop: 8, borderWidth: 1, borderColor: COLORS.secondary,
    borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.secondary },
});
