import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';
import { HoloButton } from '../../components/auth';

export default function BookingConfirmationScreen({ navigation, route }) {
  const { booking, newBalance, activityName, duration, slotEndTime } = route?.params || {};

  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  const start = booking?.slotTime;
  const timeLabel = start ? (slotEndTime ? `${start} – ${slotEndTime}` : start) : '—';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.content}>
        <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={44} color="#4ADE80" />
          </View>
          <Text style={styles.title}>Booking Confirmed</Text>
        </Animated.View>

        {/* Detail card */}
        <Animated.View style={[styles.card, { opacity: opacityAnim }]}>
          <Row label="Activity" value={activityName || booking?.activityName || 'Activity'} />
          <Row label="Date" value={booking?.slotDate || '—'} />
          <Row label="Time" value={timeLabel} />
          {duration ? <Row label="Duration" value={`${duration} min`} /> : null}
          <View style={styles.divider} />
          <Row label="Coins Deducted" value={`₿ ${booking?.coinsPaid ?? 0}`} valueColor={COLORS.primaryLight} />
          <Row label="Booking ID" value={booking?.ref || '—'} valueColor={COLORS.textMuted} last />
        </Animated.View>

        {/* Reminder */}
        <View style={styles.reminder}>
          <Text style={styles.reminderText}>
            Reminder: Cancellations made less than 2 hours before your session are non-refundable.
          </Text>
        </View>

        {newBalance !== undefined && (
          <Text style={styles.balanceText}>
            Remaining balance: <Text style={styles.balanceVal}>₿ {newBalance}</Text>
          </Text>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <HoloButton label="VIEW MY BOOKINGS" onPress={() => navigation.navigate('MyBookings')} />
        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Activities')}>
          <Text style={styles.linkText}>BACK TO ACTIVITIES</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Row({ label, value, valueColor, last }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  checkCircle: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 2, borderColor: '#4ADE80', backgroundColor: 'rgba(74,222,128,0.08)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: { fontFamily: FONTS.headline, fontSize: 28, color: COLORS.white, marginBottom: 28 },

  card: {
    width: '100%', backgroundColor: COLORS.surface, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 20, marginBottom: 16,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowLabel: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted },
  rowValue: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 2 },

  reminder: {
    width: '100%',
    backgroundColor: 'rgba(245,176,65,0.08)', borderWidth: 1, borderColor: 'rgba(245,176,65,0.3)',
    borderRadius: 12, padding: 14, marginBottom: 16,
  },
  reminderText: { fontFamily: FONTS.body, fontSize: 12, color: '#F5B041', textAlign: 'center', lineHeight: 18 },

  balanceText: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted },
  balanceVal: { fontFamily: FONTS.bodyBold, color: COLORS.primaryLight },

  footer: { paddingHorizontal: 24, paddingBottom: 40, gap: 16 },
  linkBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  linkText: { fontFamily: FONTS.label, fontSize: 12, color: COLORS.cyanNeon, letterSpacing: 1.5 },
});
