import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchMyBookings, cancelBooking } from '../../services/activityService';

export default function MyBookingsScreen({ navigation }) {
  const [tab, setTab] = useState('upcoming');
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const loadBookings = useCallback(async () => {
    try {
      const [upRes, pastRes] = await Promise.all([
        fetchMyBookings({ status: 'upcoming', limit: 50 }),
        fetchMyBookings({ status: 'past', limit: 50 }),
      ]);
      setUpcoming(upRes.data?.data || []);
      setPast(pastRes.data?.data || []);
    } catch (err) {
      console.warn('Failed to load bookings:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  // Reload when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadBookings();
    });
    return unsubscribe;
  }, [navigation, loadBookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBookings();
  }, [loadBookings]);

  // Returns true if the booking can still be cancelled (> 2 hours before slot start)
  const canCancel = (row) => {
    try {
      const [h, m] = row.slotStartTime.split(':').map(Number);
      const slotDate = new Date(row.slotDate);
      slotDate.setHours(h, m, 0, 0);
      return slotDate - Date.now() > 2 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  };

  const handleCancel = (row) => {
    const bookingData = row.booking;
    Alert.alert(
      'Cancel Booking',
      `Cancel your ${row.activityName} session on ${row.slotDate} at ${row.slotStartTime}?\n\n₿ ${bookingData.coinsPaid} coins will be refunded to your wallet.\n\nCancellations must be made at least 2 hours before the session.`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(bookingData.id);
            try {
              await cancelBooking(bookingData.id);
              Alert.alert('Cancelled', `${bookingData.coinsPaid} coins have been refunded to your wallet.`);
              loadBookings();
            } catch (err) {
              const msg = err.response?.data?.message || err.message;
              Alert.alert('Cancel Failed', msg);
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'confirmed':
        return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: '#22C55E44' };
      case 'cancelled':
        return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: '#EF444444' };
      case 'completed':
        return { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', border: '#3B82F644' };
      case 'no_show':
        return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: '#F59E0B44' };
      default:
        return { color: '#888', bg: 'rgba(136,136,136,0.1)', border: '#88888844' };
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

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
          <Text style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}>
            Upcoming {upcoming.length > 0 ? `(${upcoming.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'past' && styles.tabActive]}
          onPress={() => setTab('past')}
        >
          <Text style={[styles.tabText, tab === 'past' && styles.tabTextActive]}>Past</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />}
      >
        {tab === 'upcoming' ? (
          upcoming.length > 0 ? upcoming.map((row) => {
            const b = row.booking;
            const ss = getStatusStyle(b.status);
            return (
              <View key={b.id} style={styles.bookingCard}>
                <View style={[styles.accentBar, { backgroundColor: COLORS.secondary }]} />
                <View style={styles.bookingContent}>
                  <View style={styles.bookingTopRow}>
                    <Text style={styles.bookingTitle}>{row.activityName}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: ss.bg, borderColor: ss.border }]}>
                      <Text style={[styles.statusText, { color: ss.color }]}>
                        {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.bookingDateTime}>{row.slotDate} · {row.slotStartTime} – {row.slotEndTime}</Text>
                  {row.trainers?.length > 0 && (
                    <Text style={styles.bookingTrainer}>
                      Instructor: {row.trainers.map(t => t.name).join(', ')}
                    </Text>
                  )}
                  <Text style={styles.bookingRef}>Ref: {b.ref} · ₿ {b.coinsPaid}</Text>

                  <View style={styles.bookingActions}>
                    <TouchableOpacity
                      style={styles.qrBtn}
                      onPress={() => navigation.navigate('BookingQR', {
                        booking: { ...b, slotDate: row.slotDate, slotTime: row.slotStartTime },
                        activityName: row.activityName,
                      })}
                    >
                      <Ionicons name="qr-code-outline" size={14} color={COLORS.secondary} />
                      <Text style={styles.qrBtnText}>QR</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.receiptBtn}
                      onPress={() => navigation.navigate('TransactionDetail', {
                        transaction: {
                          transactionType: b.status === 'cancelled' ? 'REFUND' : 'DEBIT',
                          itemCategory: 'SESSION',
                          itemName: row.activityName,
                          activityName: row.activityName,
                          coinAmount: b.coinsPaid,
                          referenceId: b.id,
                          createdAt: b.createdAt,
                          slotDate: row.slotDate,
                          slotStartTime: row.slotStartTime,
                          slotEndTime: row.slotEndTime,
                          bookingRef: b.ref,
                          bookingStatus: b.status,
                          qrCode: b.qrCode,
                          trainers: row.trainers,
                        },
                      })}
                    >
                      <Ionicons name="receipt-outline" size={14} color="#888" />
                    </TouchableOpacity>

                    {b.status === 'confirmed' && (
                      cancellingId === b.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : canCancel(row) ? (
                        <TouchableOpacity onPress={() => handleCancel(row)}>
                          <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.cancelDisabledText}>Cannot cancel{'\n'}within 2 hrs</Text>
                      )
                    )}
                  </View>
                </View>
              </View>
            );
          }) : (
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
          past.length > 0 ? (
            <>
              <Text style={styles.pastSectionLabel}>Recently Completed</Text>
              {past.map((row) => {
                const b = row.booking;
                const ss = getStatusStyle(b.status);
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.bookingCard, styles.bookingCardPast]}
                    activeOpacity={0.75}
                    onPress={() => navigation.navigate('TransactionDetail', {
                      transaction: {
                        transactionType: b.status === 'cancelled' ? 'REFUND' : 'DEBIT',
                        itemCategory: 'SESSION',
                        itemName: row.activityName,
                        activityName: row.activityName,
                        coinAmount: b.coinsPaid,
                        referenceId: b.id,
                        createdAt: b.createdAt,
                        slotDate: row.slotDate,
                        slotStartTime: row.slotStartTime,
                        slotEndTime: row.slotEndTime,
                        bookingRef: b.ref,
                        bookingStatus: b.status,
                        qrCode: b.qrCode,
                        trainers: row.trainers,
                      },
                    })}
                  >
                    <View style={styles.bookingContent}>
                      <View style={styles.bookingTopRow}>
                        <Text style={styles.bookingTitle}>{row.activityName}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={[styles.pastStatusText, { color: ss.color }]}>
                            {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                          </Text>
                          <Ionicons name="chevron-forward" size={14} color="#555" />
                        </View>
                      </View>
                      <Text style={styles.bookingDateTime}>{row.slotDate} · {row.slotStartTime}</Text>
                      <Text style={styles.bookingRef}>Ref: {b.ref} · ₿ {b.coinsPaid}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={56} color="#444" />
              <Text style={styles.emptyTitle}>No Past Bookings</Text>
              <Text style={styles.emptySub}>Your completed sessions will appear here</Text>
            </View>
          )
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
  bookingTrainer: { fontSize: 12, color: '#888', marginBottom: 3 },
  bookingRef: { fontSize: 11, color: '#666', marginBottom: 10 },
  bookingActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  qrBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: COLORS.secondary + '44', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  qrBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.secondary },

  cancelText: { fontSize: 13, fontWeight: '700', color: '#EF4444' },
  cancelDisabledText: { fontSize: 10, fontWeight: '600', color: '#555', textAlign: 'right', lineHeight: 14 },
  receiptBtn: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },

  pastSectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#555', textTransform: 'uppercase',
    letterSpacing: 2, marginBottom: 12,
  },
  pastStatusText: { fontSize: 12, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  emptySub: { fontSize: 13, color: '#666' },
  emptyBtn: {
    marginTop: 8, borderWidth: 1, borderColor: COLORS.secondary,
    borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.secondary },
});
