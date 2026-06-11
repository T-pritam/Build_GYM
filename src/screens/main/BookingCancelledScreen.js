import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';
import { HoloButton } from '../../components/auth';

export default function BookingCancelledScreen({ navigation, route }) {
  const {
    activityName, slotDate, slotStartTime, slotEndTime, coinsRefunded = 0, bookingRef,
  } = route?.params || {};

  const timeLabel = slotEndTime ? `${slotStartTime} — ${slotEndTime}` : (slotStartTime || '—');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.content}>
        {/* X glow */}
        <View style={styles.xCircle}>
          <Ionicons name="close" size={42} color="#F5B041" />
        </View>

        <Text style={styles.title}>Booking Cancelled</Text>
        <Text style={styles.sub}>Your booking has been successfully cancelled.</Text>
        <Text style={styles.refund}>₿ {coinsRefunded} refunded to your balance.</Text>

        {/* Detail card */}
        <View style={styles.card}>
          <Row label="ACTIVITY" value={activityName || '—'} />
          <Row label="DATE" value={slotDate || '—'} />
          <Row label="TIME" value={timeLabel} />
          <Row label="COINS REFUNDED" value={`₿ ${coinsRefunded}`} valueColor="#4ADE80" />
          <Row label="STATUS" value="CANCELLED" valueColor="#F5B041" />
          {bookingRef ? <Row label="ID" value={bookingRef} valueColor={COLORS.textMuted} last /> : null}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <HoloButton label="BACK TO ACTIVITIES" onPress={() => navigation.navigate('Activities')} />
        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('MyBookings')}>
          <Text style={styles.linkText}>VIEW MY BOOKINGS</Text>
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
  xCircle: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, borderColor: '#F5B041',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    backgroundColor: 'rgba(245,176,65,0.08)',
  },
  title: { fontFamily: FONTS.headline, fontSize: 30, color: COLORS.white, marginBottom: 12 },
  sub: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 4 },
  refund: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#4ADE80', textAlign: 'center', marginBottom: 28 },

  card: {
    width: '100%', backgroundColor: COLORS.surface, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowLabel: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted, letterSpacing: 1.5 },
  rowValue: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white },

  footer: { paddingHorizontal: 24, paddingBottom: 40, gap: 16 },
  linkBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  linkText: { fontFamily: FONTS.label, fontSize: 12, color: COLORS.cyanNeon, letterSpacing: 1.5 },
});
