import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { bookActivitySession } from '../../services/api';
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

const TYPE_DISPLAY = {
  yoga:       { emoji: '🧘', color: ['#7C3AED', '#4C1D95'] },
  boxing:     { emoji: '🥊', color: ['#DC2626', '#7F1D1D'] },
  pickleball: { emoji: '🏓', color: ['#16A34A', '#14532D'] },
  hiit:       { emoji: '⚡', color: ['#D97706', '#78350F'] },
  sauna:      { emoji: '♨️', color: ['#B45309', '#451A03'] },
  cycling:    { emoji: '🚴', color: ['#2563EB', '#1E3A8A'] },
  other:      { emoji: '🏋️', color: ['#374151', '#1F2937'] },
};

export default function ActivityDetailScreen({ navigation, route }) {
  const { session } = route?.params || {};
  const { userId, wallet, refreshWallet } = useUser();
  const [booking, setBooking] = useState(false);

  if (!session) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#fff' }}>Session not found.</Text>
      </View>
    );
  }

  const display = TYPE_DISPLAY[session.type] || TYPE_DISPLAY.other;
  const cost = session.coinCost ?? 0;
  const balance = wallet?.balance ?? 0;
  const spotsLeft = session.capacityMax - session.capacityBooked;
  const canBook = balance >= cost && spotsLeft > 0;

  const handleBook = async () => {
    if (!canBook) {
      if (balance < cost) {
        Alert.alert('Insufficient Coins', `You need ₿ ${cost} but have ₿ ${balance}.`);
      } else {
        Alert.alert('Session Full', 'No spots available for this session.');
      }
      return;
    }
    setBooking(true);
    try {
      await bookActivitySession(session.id, userId);
      await refreshWallet();
      Alert.alert(
        'Booking Confirmed!',
        `Your ${session.title} session on ${fmtDate(session.sessionDate)} at ${fmtTime(session.sessionTime)} has been booked. ₿ ${cost} deducted.`,
        [
          { text: 'My Bookings', onPress: () => navigation.navigate('MyBookings') },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to book session. Please try again.';
      Alert.alert('Booking Failed', msg);
    } finally {
      setBooking(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={display.color[1]} />

      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: display.color[1] }]}>
        <View style={[styles.heroOverlay, { backgroundColor: display.color[0] + '66' }]} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroBottom}>
          <Text style={styles.heroEmoji}>{display.emoji}</Text>
          <Text style={styles.heroTitle}>{session.title}</Text>
          <Text style={styles.heroMeta}>
            {fmtDate(session.sessionDate)} · {fmtTime(session.sessionTime)} · ₿ {cost}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Session Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={16} color="#888" />
            <Text style={styles.infoText}>{session.capacityBooked}/{session.capacityMax} booked · {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}</Text>
          </View>
          {session.description ? (
            <View style={[styles.infoRow, { marginTop: 8 }]}>
              <Ionicons name="information-circle-outline" size={16} color="#888" />
              <Text style={styles.infoText}>{session.description}</Text>
            </View>
          ) : null}
        </View>

        {/* Booking Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>BOOKING SUMMARY</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Activity</Text>
            <Text style={styles.summaryVal}>{session.title}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Date</Text>
            <Text style={styles.summaryVal}>{fmtDate(session.sessionDate)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Time</Text>
            <Text style={styles.summaryVal}>{fmtTime(session.sessionTime)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Cost</Text>
            <Text style={styles.summaryVal}>₿ {cost}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryFinalRow]}>
            <Text style={styles.summaryKey}>Balance after</Text>
            <Text style={[styles.summaryVal, { color: balance >= cost ? COLORS.secondary : '#EF4444', fontWeight: '900' }]}>
              ₿ {(balance - cost).toLocaleString()}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.confirmBtn, (!canBook || booking) && styles.confirmBtnDisabled]}
          onPress={handleBook}
          disabled={!canBook || booking}
        >
          {booking ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.confirmBtnText}>
                {spotsLeft === 0 ? 'SESSION FULL' : balance < cost ? 'INSUFFICIENT COINS' : 'CONFIRM BOOKING'}
              </Text>
              {canBook && <Text style={styles.confirmBtnCost}>· ₿ {cost}</Text>}
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  hero: { height: 260, justifyContent: 'flex-end', padding: 20 },
  heroOverlay: { position: 'absolute', inset: 0 },
  backBtn: {
    position: 'absolute', top: 52, left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  heroBottom: { gap: 6 },
  heroEmoji: { fontSize: 40 },
  heroTitle: { fontSize: 36, fontWeight: '900', color: '#fff' },
  heroMeta: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },

  infoCard: {
    backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1,
    borderColor: '#333', padding: 16, marginBottom: 20,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoText: { flex: 1, fontSize: 13, color: '#bbb', lineHeight: 19 },

  summaryCard: {
    backgroundColor: '#1C1C1E', borderRadius: 18, borderWidth: 1.5,
    borderColor: COLORS.secondary + '55', padding: 20, marginBottom: 20,
  },
  summaryLabel: { fontSize: 10, fontWeight: '800', color: COLORS.secondary, letterSpacing: 2, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  summaryFinalRow: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', marginTop: 8, paddingTop: 14 },
  summaryKey: { fontSize: 13, color: '#888' },
  summaryVal: { fontSize: 13, fontWeight: '600', color: '#fff' },

  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.secondary, borderRadius: 16, height: 56, gap: 6,
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },
  confirmBtnCost: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '700' },
});
