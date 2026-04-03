import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function BookingConfirmationScreen({ navigation, route }) {
  const { booking, newBalance, activityName, activityColor, activityEmoji } = route?.params || {};
  const color = activityColor || ['#6B7280', '#374151'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.content}>
        {/* Success icon */}
        <View style={[styles.successCircle, { backgroundColor: COLORS.secondary + '22' }]}>
          <View style={[styles.successInner, { backgroundColor: COLORS.secondary }]}>
            <Ionicons name="checkmark" size={48} color="#fff" />
          </View>
        </View>

        <Text style={styles.title}>Booking Confirmed!</Text>
        <Text style={styles.subtitle}>Your session has been booked successfully</Text>

        {/* Booking details card */}
        <View style={styles.detailCard}>
          <View style={[styles.accentBar, { backgroundColor: color[0] }]} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Activity</Text>
            <Text style={styles.detailValue}>{activityName || booking?.activityName || 'Activity'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{booking?.slotDate || '—'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>{booking?.slotTime || '—'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Booking Ref</Text>
            <Text style={[styles.detailValue, { color: COLORS.secondary, fontWeight: '900' }]}>
              {booking?.ref || '—'}
            </Text>
          </View>

          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>Coins Paid</Text>
            <Text style={styles.detailValue}>₿ {booking?.coinsPaid || 0}</Text>
          </View>
        </View>

        {/* QR Code button */}
        <TouchableOpacity
          style={styles.qrBtn}
          onPress={() => navigation.navigate('BookingQR', { booking, activityName })}
        >
          <Ionicons name="qr-code-outline" size={20} color={COLORS.secondary} />
          <Text style={styles.qrBtnText}>View QR Code</Text>
        </TouchableOpacity>

        {/* Remaining balance */}
        {newBalance !== undefined && (
          <Text style={styles.balanceText}>
            Remaining balance: <Text style={{ color: COLORS.secondary, fontWeight: '900' }}>₿ {newBalance}</Text>
          </Text>
        )}
      </View>

      {/* Bottom buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('MyBookings')}
        >
          <Ionicons name="calendar-outline" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>View My Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Activities')}
        >
          <Text style={styles.secondaryBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24,
  },

  successCircle: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  successInner: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },

  title: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 32, textAlign: 'center' },

  detailCard: {
    backgroundColor: '#1C1C1E', borderRadius: 18, borderWidth: 1, borderColor: '#333',
    width: '100%', padding: 20, marginBottom: 20, overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute', top: 0, left: 0, width: 4, height: '100%', borderRadius: 2,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#333',
  },
  detailLabel: { fontSize: 13, color: '#888' },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#fff' },

  qrBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.secondary + '55', borderRadius: 14,
    marginBottom: 12,
  },
  qrBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.secondary },

  balanceText: { fontSize: 13, color: '#888', marginBottom: 32 },

  bottomButtons: {
    paddingHorizontal: 24, paddingBottom: 40, gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.secondary, borderRadius: 16, height: 56,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  secondaryBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#444', borderRadius: 16, height: 48,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: '#aaa' },
});
