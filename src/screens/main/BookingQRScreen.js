import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function BookingQRScreen({ navigation, route }) {
  const { booking, activityName } = route?.params || {};

  const ref = booking?.ref || '—';
  const qrCode = booking?.qrCode || booking?.id || '';
  const slotDate = booking?.slotDate || '';
  const slotTime = booking?.slotTime || booking?.startTime || '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking QR</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* QR Code area */}
        <View style={styles.qrContainer}>
          <View style={styles.qrPlaceholder}>
            <Ionicons name="qr-code" size={160} color={COLORS.secondary} />
          </View>
          <Text style={styles.qrCodeText}>{qrCode}</Text>
        </View>

        {/* Booking info */}
        <View style={styles.infoCard}>
          <Text style={styles.refText}>{ref}</Text>
          <Text style={styles.activityText}>{activityName || 'Activity'}</Text>
          {slotDate ? (
            <Text style={styles.dateTimeText}>
              {slotDate} {slotTime ? `at ${slotTime}` : ''}
            </Text>
          ) : null}
        </View>

        <Text style={styles.instruction}>
          Show this QR code at the facility for check-in
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },

  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },

  qrContainer: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    alignItems: 'center', marginBottom: 32,
  },
  qrPlaceholder: {
    width: 200, height: 200, alignItems: 'center', justifyContent: 'center',
  },
  qrCodeText: {
    fontSize: 10, color: '#999', marginTop: 8, fontFamily: 'monospace',
  },

  infoCard: { alignItems: 'center', gap: 6, marginBottom: 24 },
  refText: { fontSize: 24, fontWeight: '900', color: COLORS.secondary, letterSpacing: 2 },
  activityText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  dateTimeText: { fontSize: 14, color: '#888' },

  instruction: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 18 },
});
