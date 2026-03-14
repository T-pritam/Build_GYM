import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { buildCoins } from '../../constants/dummyData';

const SLOTS = [
  { time: '07:00 AM', spots: 3, full: false },
  { time: '09:30 AM', spots: 12, full: false },
  { time: '11:00 AM', spots: 0, full: true },
  { time: '04:30 PM', spots: 5, full: false },
  { time: '06:00 PM', spots: 8, full: false },
  { time: '07:30 PM', spots: 0, full: true },
];

function buildDates() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      label: i === 0 ? 'Today' : `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`,
      key: d.toDateString(),
      isToday: i === 0,
    };
  });
}

export default function ActivityDetailScreen({ navigation, route }) {
  const { activity } = route?.params || {};
  const label    = activity?.label    || 'Yoga';
  const duration = activity?.duration || '45 min';
  const cost     = activity?.cost     || 80;
  const emoji    = activity?.emoji    || '🧘';
  const color    = activity?.color    || ['#7C3AED', '#4C1D95'];

  const DATES = buildDates();
  const [selectedDate, setSelectedDate] = useState(DATES[0].key);
  const [selectedSlot, setSelectedSlot] = useState(SLOTS[0].time);

  const balance   = buildCoins?.balance || 2450;
  const afterBal  = balance - cost;

  const handleBook = () => {
    Alert.alert(
      'Booking Confirmed!',
      `Your ${label} session at ${selectedSlot} has been booked for ₿ ${cost}.`,
      [
        {
          text: 'View My Bookings',
          onPress: () => navigation.navigate('MyBookings'),
        },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={color[1]} />

      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: color[1] }]}>
        <View style={[styles.heroOverlay, { backgroundColor: color[0] + '66' }]} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroBottom}>
          <Text style={styles.heroEmoji}>{emoji}</Text>
          <Text style={styles.heroTitle}>{label}</Text>
          <Text style={styles.heroMeta}>{duration} · ₿ {cost}  · Instructor: Anjali Nair</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Date selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll} contentContainerStyle={styles.dateScrollContent}>
          {DATES.map((d) => (
            <TouchableOpacity
              key={d.key}
              style={[styles.dateChip, selectedDate === d.key && styles.dateChipActive]}
              onPress={() => setSelectedDate(d.key)}
            >
              <Text style={[styles.dateChipText, selectedDate === d.key && styles.dateChipTextActive]}>
                {d.label}
              </Text>
              {selectedDate === d.key && <View style={styles.dateDot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Slots */}
        <Text style={styles.sectionLabel}>AVAILABLE SLOTS</Text>
        <View style={styles.slotsGrid}>
          {SLOTS.map((s) => (
            <TouchableOpacity
              key={s.time}
              style={[
                styles.slotCard,
                s.full && styles.slotCardFull,
                selectedSlot === s.time && !s.full && styles.slotCardSelected,
              ]}
              onPress={() => !s.full && setSelectedSlot(s.time)}
              activeOpacity={s.full ? 1 : 0.75}
            >
              <Text style={[styles.slotTime, s.full && styles.slotTimeFull]}>{s.time}</Text>
              <Text style={[styles.slotSpots, s.full && { color: '#EF4444' }]}>
                {s.full ? 'Full' : `${s.spots} spots left`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Booking Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>BOOKING SUMMARY</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Activity</Text>
            <Text style={styles.summaryVal}>{label}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Date</Text>
            <Text style={styles.summaryVal}>{DATES.find(d => d.key === selectedDate)?.label || 'Today'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Time</Text>
            <Text style={styles.summaryVal}>{selectedSlot}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Cost</Text>
            <Text style={styles.summaryVal}>₿ {cost}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryFinalRow]}>
            <Text style={styles.summaryKey}>Balance after</Text>
            <Text style={[styles.summaryVal, { color: COLORS.secondary, fontWeight: '900' }]}>₿ {afterBal.toLocaleString()}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.confirmBtn} onPress={handleBook}>
          <Text style={styles.confirmBtnText}>CONFIRM BOOKING</Text>
          <Text style={styles.confirmBtnCost}>· ₿ {cost}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  hero: { height: 280, justifyContent: 'flex-end', padding: 20 },
  heroOverlay: { position: 'absolute', inset: 0 },
  backBtn: {
    position: 'absolute', top: 52, left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  heroBottom: { gap: 6 },
  heroEmoji: { fontSize: 40 },
  heroTitle: { fontSize: 40, fontWeight: '900', color: '#fff' },
  heroMeta: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },

  dateScroll: { marginBottom: 24, marginHorizontal: -16 },
  dateScrollContent: { paddingHorizontal: 16, gap: 10 },
  dateChip: {
    height: 48, paddingHorizontal: 18, borderRadius: 14,
    backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  dateChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  dateChipText: { fontSize: 13, fontWeight: '700', color: '#aaa' },
  dateChipTextActive: { color: '#fff' },
  dateDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#fff' },

  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: '#666',
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12,
  },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  slotCard: {
    width: '47%', alignItems: 'center', padding: 16, borderRadius: 14,
    backgroundColor: '#1C1C1E', borderWidth: 1.5, borderColor: '#333',
  },
  slotCardSelected: { borderColor: COLORS.secondary },
  slotCardFull: { opacity: 0.4 },
  slotTime: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  slotTimeFull: { color: '#888' },
  slotSpots: { fontSize: 10, color: COLORS.secondary, fontWeight: '600' },

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
  confirmBtnText: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },
  confirmBtnCost: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '700' },
});
