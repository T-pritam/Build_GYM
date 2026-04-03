import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert,
  ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchActivityDetail, fetchSlots, createBooking } from '../../services/activityService';
import { useWalletStore } from '../../store/walletStore';
import { getSocket } from '../../services/socketService';

function buildDates() {
  const today = new Date();
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      label: i === 0 ? 'Today' : `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`,
      dateStr: d.toISOString().split('T')[0], // YYYY-MM-DD
      isToday: i === 0,
    };
  });
}

export default function ActivityDetailScreen({ navigation, route }) {
  const { activity: passedActivity, fallbackStyle } = route?.params || {};

  const [activity, setActivity] = useState(passedActivity || null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const DATES = buildDates();
  const [selectedDate, setSelectedDate] = useState(DATES[0].dateStr);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const balance = useWalletStore((s) => s.balance);
  const fetchBalance = useWalletStore((s) => s.fetchBalance);

  const name = activity?.name || 'Activity';
  const cost = activity?.coinPrice || 0;
  const duration = activity?.durationMinutes || 45;
  const emoji = fallbackStyle?.emoji || '🏋️';
  const color = fallbackStyle?.color || ['#6B7280', '#374151'];
  const trainers = activity?.trainers || [];
  const trainerLabel = trainers.map(t => t.name).join(', ') || 'TBD';
  const afterBal = balance - cost;

  // Load activity detail
  useEffect(() => {
    if (passedActivity?.id) {
      fetchActivityDetail(passedActivity.id).then(res => {
        if (res.data?.data) setActivity(res.data.data);
      }).catch(() => {});
    }
    fetchBalance();
  }, [passedActivity?.id]);

  // Load slots when date changes
  const loadSlots = useCallback(async () => {
    if (!activity?.id) return;
    setSlotsLoading(true);
    try {
      const res = await fetchSlots(activity.id, selectedDate);
      const data = res.data?.data || [];
      setSlots(data);
      // Auto-select first available slot
      const firstAvailable = data.find(s => !s.isFull);
      setSelectedSlot(firstAvailable?.id || null);
    } catch (err) {
      console.warn('Failed to load slots:', err.message);
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [activity?.id, selectedDate]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  // Socket.io real-time slot updates
  useEffect(() => {
    if (!activity?.id) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('join:activity', activity.id);
      const handler = ({ slotId, bookedCount, totalCapacity }) => {
        setSlots(prev => prev.map(s =>
          s.id === slotId
            ? { ...s, bookedCount, remainingCapacity: totalCapacity - bookedCount, isFull: bookedCount >= totalCapacity }
            : s
        ));
      };
      socket.on('activity:slot_updated', handler);
      const cancelHandler = ({ slotId: cancelledId }) => {
        setSlots(prev => prev.filter(s => s.id !== cancelledId));
      };
      socket.on('activity:slot_cancelled', cancelHandler);
      return () => {
        socket.off('activity:slot_updated', handler);
        socket.off('activity:slot_cancelled', cancelHandler);
      };
    }
  }, [activity?.id]);

  const handleBook = async () => {
    if (!selectedSlot || booking) return;

    if (balance < cost) {
      Alert.alert('Insufficient Coins', `You need ₿ ${cost} but only have ₿ ${balance}.`);
      return;
    }

    setBooking(true);
    try {
      const res = await createBooking({ slotId: selectedSlot, activityId: activity.id });
      const data = res.data?.data;
      fetchBalance();
      navigation.navigate('BookingConfirmation', {
        booking: data?.booking,
        newBalance: data?.newBalance,
        activityName: name,
        activityColor: color,
        activityEmoji: emoji,
      });
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      Alert.alert('Booking Failed', msg);
    } finally {
      setBooking(false);
    }
  };

  const selectedSlotObj = slots.find(s => s.id === selectedSlot);
  const selectedDateLabel = DATES.find(d => d.dateStr === selectedDate)?.label || selectedDate;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={color[1]} />

      {/* Hero */}
      {activity?.coverImageUrl ? (
        <View style={styles.hero}>
          <Image source={{ uri: activity.coverImageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={[styles.heroOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroBottom}>
            <Text style={styles.heroTitle}>{name}</Text>
            <Text style={styles.heroMeta}>{duration} min · ₿ {cost}  · {trainerLabel}</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.hero, { backgroundColor: color[1] }]}>
          <View style={[styles.heroOverlay, { backgroundColor: color[0] + '66' }]} />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroBottom}>
            <Text style={styles.heroEmoji}>{emoji}</Text>
            <Text style={styles.heroTitle}>{name}</Text>
            <Text style={styles.heroMeta}>{duration} min · ₿ {cost}  · {trainerLabel}</Text>
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Description */}
        {activity?.description ? (
          <Text style={styles.description}>{activity.description}</Text>
        ) : null}

        {/* Date selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll} contentContainerStyle={styles.dateScrollContent}>
          {DATES.map((d) => (
            <TouchableOpacity
              key={d.dateStr}
              style={[styles.dateChip, selectedDate === d.dateStr && styles.dateChipActive]}
              onPress={() => setSelectedDate(d.dateStr)}
            >
              <Text style={[styles.dateChipText, selectedDate === d.dateStr && styles.dateChipTextActive]}>
                {d.label}
              </Text>
              {selectedDate === d.dateStr && <View style={styles.dateDot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Slots */}
        <Text style={styles.sectionLabel}>AVAILABLE SLOTS</Text>
        {slotsLoading ? (
          <ActivityIndicator size="small" color={COLORS.secondary} style={{ marginVertical: 20 }} />
        ) : slots.length === 0 ? (
          <View style={styles.noSlots}>
            <Ionicons name="time-outline" size={32} color="#555" />
            <Text style={styles.noSlotsText}>No slots available for this date</Text>
          </View>
        ) : (
          <View style={styles.slotsGrid}>
            {slots.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.slotCard,
                  s.isFull && styles.slotCardFull,
                  selectedSlot === s.id && !s.isFull && styles.slotCardSelected,
                ]}
                onPress={() => !s.isFull && setSelectedSlot(s.id)}
                activeOpacity={s.isFull ? 1 : 0.75}
              >
                <Text style={[styles.slotTime, s.isFull && styles.slotTimeFull]}>{s.startTime}</Text>
                <Text style={[styles.slotSpots, s.isFull && { color: '#EF4444' }]}>
                  {s.isFull ? 'Full' : `${s.remainingCapacity} spots left`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Booking Summary */}
        {selectedSlotObj && (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>BOOKING SUMMARY</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Activity</Text>
                <Text style={styles.summaryVal}>{name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Date</Text>
                <Text style={styles.summaryVal}>{selectedDateLabel}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Time</Text>
                <Text style={styles.summaryVal}>{selectedSlotObj.startTime} – {selectedSlotObj.endTime}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Cost</Text>
                <Text style={styles.summaryVal}>₿ {cost}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryFinalRow]}>
                <Text style={styles.summaryKey}>Balance after</Text>
                <Text style={[styles.summaryVal, { color: afterBal >= 0 ? COLORS.secondary : '#EF4444', fontWeight: '900' }]}>
                  ₿ {afterBal.toLocaleString()}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, (booking || afterBal < 0) && { opacity: 0.5 }]}
              onPress={handleBook}
              disabled={booking || afterBal < 0}
            >
              {booking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.confirmBtnText}>CONFIRM & PAY</Text>
                  <Text style={styles.confirmBtnCost}>· ₿ {cost}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

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

  description: { fontSize: 14, color: '#aaa', lineHeight: 20, marginBottom: 20 },

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

  noSlots: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  noSlotsText: { fontSize: 14, color: '#666' },

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
