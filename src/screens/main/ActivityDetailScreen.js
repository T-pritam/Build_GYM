import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';
import SafeBottomBar from '../../components/SafeBottomBar';
import { HoloButton } from '../../components/auth';
import { fetchActivityDetail, fetchSlots, createBooking } from '../../services/activityService';
import { useWalletStore } from '../../store/walletStore';
import { getSocket } from '../../services/socketService';
import { handleInsufficientCoins } from '../../utils/handleInsufficientCoins';
import { logEvent } from '../../services/analyticsService';

function buildDates() {
  const today = new Date();
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      dow: i === 0 ? 'TODAY' : d.toLocaleString('en', { weekday: 'short' }).toUpperCase(),
      day: d.getDate(),
      label: i === 0 ? 'Today' : `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`,
      dateStr: d.toISOString().split('T')[0], // YYYY-MM-DD
      isToday: i === 0,
    };
  });
}

// "14:00" -> "2:00 PM"
const fmt12 = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const s = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${s}`;
};

export default function ActivityDetailScreen({ navigation, route }) {
  const { activity: passedActivity, fallbackStyle } = route?.params || {};

  const [activity, setActivity] = useState(passedActivity || null);

  // Support deeplink navigation where only activityId is available (no full object passed)
  useEffect(() => {
    const activityId = route.params?.activityId;
    if (!passedActivity && activityId) {
      fetchActivityDetail(activityId)
        .then(res => setActivity(res.data?.data || null))
        .catch(() => {});
    }
  }, []);

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
      const raw = res.data?.data || [];

      // For today, hide slots whose start time has already passed
      const todayStr = new Date().toISOString().split('T')[0];
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const data = raw
        .filter((s) => {
          if (selectedDate !== todayStr) return true;
          const [h, m] = s.startTime.split(':').map(Number);
          return h * 60 + m > nowMinutes;
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

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
      handleInsufficientCoins({ required: cost, balance, navigation });
      return;
    }

    const slotObj = slots.find(s => s.id === selectedSlot);
    const slotStartTime = slotObj?.startTime;
    logEvent('activity_booking_started', {
      activity_type: name,
      activity_id: activity.id,
      coins_cost: cost,
    }).catch(() => {});

    setBooking(true);
    try {
      const res = await createBooking({ slotId: selectedSlot, activityId: activity.id });
      const data = res.data?.data;
      fetchBalance();
      logEvent('activity_booked', {
        activity_type: name,
        activity_id: activity.id,
        coins_spent: cost,
        date: selectedDate,
        time: slotStartTime,
      }).catch(() => {});
      navigation.navigate('BookingConfirmation', {
        booking: data?.booking,
        newBalance: data?.newBalance,
        activityName: name,
        activityColor: color,
        activityEmoji: emoji,
        duration,
        slotEndTime: slotObj?.endTime,
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
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Summary card */}
        <View style={styles.summaryTop}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryKey}>ACTIVITY</Text>
            <Text style={styles.summaryName} numberOfLines={1}>{name}</Text>
          </View>
          <View style={[styles.summaryCol, { alignItems: 'center' }]}>
            <Text style={styles.summaryKey}>DURATION</Text>
            <Text style={styles.summaryVal}>{duration} min</Text>
          </View>
          <View style={[styles.summaryCol, { alignItems: 'flex-end' }]}>
            <Text style={styles.summaryKey}>COST</Text>
            <Text style={[styles.summaryVal, { color: COLORS.primaryLight }]}>₿ {cost}</Text>
          </View>
        </View>

        {activity?.description ? (
          <Text style={styles.description}>{activity.description}</Text>
        ) : null}
        {trainerLabel !== 'TBD' && (
          <Text style={styles.trainerLine}>Instructor: {trainerLabel}</Text>
        )}

        {/* Date selector */}
        <Text style={styles.sectionLabel}>SELECT DATE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll} contentContainerStyle={styles.dateScrollContent}>
          {DATES.map((d) => {
            const active = selectedDate === d.dateStr;
            return (
              <TouchableOpacity
                key={d.dateStr}
                style={[styles.dateChip, active && styles.dateChipActive]}
                onPress={() => setSelectedDate(d.dateStr)}
              >
                <Text style={[styles.dateDow, active && styles.dateActiveText]}>{d.dow}</Text>
                <Text style={[styles.dateNum, active && styles.dateActiveText]}>{d.day}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Slots */}
        <Text style={styles.sectionLabel}>SELECT TIME</Text>
        {slotsLoading ? (
          <ActivityIndicator size="small" color={COLORS.primaryLight} style={{ marginVertical: 20 }} />
        ) : slots.length === 0 ? (
          <View style={styles.noSlots}>
            <Ionicons name="time-outline" size={32} color={COLORS.textMuted} />
            <Text style={styles.noSlotsText}>No slots available for this date</Text>
          </View>
        ) : (
          <View style={styles.slotsGrid}>
            {slots.map((s) => {
              const sel = selectedSlot === s.id && !s.isFull;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.slotCard, s.isFull && styles.slotCardFull, sel && styles.slotCardSelected]}
                  onPress={() => !s.isFull && setSelectedSlot(s.id)}
                  activeOpacity={s.isFull ? 1 : 0.75}
                >
                  <Text style={[styles.slotTime, s.isFull && styles.slotTimeFull, sel && { color: COLORS.white }]}>
                    {fmt12(s.startTime)}
                  </Text>
                  <Text style={[styles.slotSpots, s.isFull && { color: COLORS.error }]}>
                    {s.isFull ? 'Full' : `${s.remainingCapacity} left`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Booking summary line */}
        {selectedSlotObj && (
          <>
            <Text style={styles.bookingLine}>
              You are booking: <Text style={styles.bookingLineBold}>
                {name}, {selectedDateLabel}, {fmt12(selectedSlotObj.startTime)}
              </Text>
            </Text>
            <Text style={styles.deductLine}>
              <Text style={styles.deductCoin}>₿ {cost}</Text> will be deducted from your balance
              <Text style={[styles.afterBal, { color: afterBal >= 0 ? COLORS.primaryLight : COLORS.error }]}>
                {'  '}(balance after: ₿ {afterBal.toLocaleString()})
              </Text>
            </Text>

            {/* Cancellation policy */}
            <View style={styles.policyBanner}>
              <Ionicons name="warning-outline" size={16} color="#F5B041" />
              <View style={{ flex: 1 }}>
                <Text style={styles.policyTitle}>CANCELLATION POLICY</Text>
                <Text style={styles.policyText}>
                  Cancellations made within 2 hours of the activity start time are non-refundable.
                </Text>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky footer CTA */}
      {selectedSlotObj && (
        <SafeBottomBar style={styles.footer}>
          <HoloButton
            label={`CONFIRM BOOKING   ·   ₿ ${cost}`}
            onPress={handleBook}
            loading={booking}
            disabled={afterBal < 0}
          />
        </SafeBottomBar>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: FONTS.headline, fontSize: 18, color: COLORS.white },

  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },

  // Summary card
  summaryTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    padding: 18, marginBottom: 16,
  },
  summaryCol: { flex: 1, gap: 6 },
  summaryKey: { fontFamily: FONTS.label, fontSize: 9, color: COLORS.textMuted, letterSpacing: 1.5 },
  summaryName: { fontFamily: FONTS.headline, fontSize: 18, color: COLORS.white },
  summaryVal: { fontFamily: FONTS.bodyBold, fontSize: 16, color: COLORS.white },

  description: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary, lineHeight: 21, marginBottom: 12 },
  trainerLine: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.textMuted, marginBottom: 12 },

  sectionLabel: {
    fontFamily: FONTS.label, fontSize: 11, color: COLORS.textSecondary,
    letterSpacing: 2, marginBottom: 12, marginTop: 12,
  },

  // Date chips
  dateScroll: { marginHorizontal: -16, marginBottom: 8 },
  dateScrollContent: { paddingHorizontal: 16, gap: 10 },
  dateChip: {
    width: 64, height: 72, borderRadius: 14, gap: 4,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dateChipActive: { borderColor: COLORS.primaryNeon, backgroundColor: COLORS.primarySoft },
  dateDow: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted, letterSpacing: 1 },
  dateNum: { fontFamily: FONTS.headline, fontSize: 20, color: COLORS.textSecondary },
  dateActiveText: { color: COLORS.white },

  // Slots
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  slotCard: {
    width: '47%', alignItems: 'center', paddingVertical: 14, borderRadius: 14, gap: 4,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
  },
  slotCardSelected: { borderColor: COLORS.primaryNeon, backgroundColor: COLORS.primarySoft },
  slotCardFull: { opacity: 0.4 },
  slotTime: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.textPrimary },
  slotTimeFull: { color: COLORS.textMuted },
  slotSpots: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.primaryLight },

  noSlots: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  noSlotsText: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textMuted },

  bookingLine: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary, marginTop: 16, lineHeight: 21 },
  bookingLineBold: { fontFamily: FONTS.bodyBold, color: COLORS.white },
  deductLine: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted, marginTop: 8 },
  deductCoin: { fontFamily: FONTS.bodyBold, color: COLORS.primaryLight },
  afterBal: { fontFamily: FONTS.bodyMedium, fontSize: 12 },

  policyBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 16,
    backgroundColor: 'rgba(245,176,65,0.08)', borderWidth: 1, borderColor: 'rgba(245,176,65,0.3)',
    borderRadius: 12, padding: 14,
  },
  policyTitle: { fontFamily: FONTS.label, fontSize: 10, color: '#F5B041', letterSpacing: 1.5, marginBottom: 4 },
  policyText: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 14,
    backgroundColor: COLORS.background,
  },
});
