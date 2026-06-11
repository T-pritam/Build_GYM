import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert,
  Modal, Pressable, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';
import SafeBottomBar from '../../components/SafeBottomBar';
import { HoloButton } from '../../components/auth';
import { cancelBooking } from '../../services/activityService';
import { logEvent } from '../../services/analyticsService';

const STATUS_META = {
  confirmed: { label: 'CONFIRMED', color: '#4ADE80', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.4)' },
  completed: { label: 'COMPLETED', color: '#4ADE80', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.4)' },
  cancelled: { label: 'CANCELLED', color: '#F87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.4)' },
  no_show:   { label: 'NO SHOW',   color: '#F5B041', bg: 'rgba(245,176,65,0.12)', border: 'rgba(245,176,65,0.4)' },
};

export default function BookingDetailScreen({ navigation, route }) {
  const { row } = route?.params || {};
  const b = row?.booking || {};
  const meta = STATUS_META[b.status] || STATUS_META.confirmed;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Cancellable when > 2 hours before slot start AND still confirmed.
  const canCancel = (() => {
    if (b.status !== 'confirmed') return false;
    try {
      const [h, m] = row.slotStartTime.split(':').map(Number);
      const slotDate = new Date(row.slotDate);
      slotDate.setHours(h, m, 0, 0);
      return slotDate - Date.now() > 2 * 60 * 60 * 1000;
    } catch { return false; }
  })();

  const hoursBefore = () => {
    try {
      const [h, m] = row.slotStartTime.split(':').map(Number);
      const slotDate = new Date(row.slotDate);
      slotDate.setHours(h, m, 0, 0);
      return Math.round(((slotDate - Date.now()) / 3.6e6) * 10) / 10;
    } catch { return null; }
  };

  const doCancel = async () => {
    setCancelling(true);
    try {
      await cancelBooking(b.id);
      logEvent('activity_cancelled_by_member', {
        activity_type: row.activityName,
        coins_refunded: b.coinsPaid,
        time_before_slot_hours: hoursBefore(),
      }).catch(() => {});
      setSheetOpen(false);
      navigation.replace('BookingCancelled', {
        activityName: row.activityName,
        slotDate: row.slotDate,
        slotStartTime: row.slotStartTime,
        slotEndTime: row.slotEndTime,
        coinsRefunded: b.coinsPaid,
        bookingRef: b.ref,
      });
    } catch (err) {
      setSheetOpen(false);
      Alert.alert('Cancel Failed', err.response?.data?.message || err.message);
    } finally {
      setCancelling(false);
    }
  };

  const goReceipt = () => navigation.navigate('TransactionDetail', {
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
  });

  const Detail = ({ label, value, accent }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, accent && { color: COLORS.primaryLight }]}>{value}</Text>
    </View>
  );

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.titleRow}>
          <Text style={styles.activityName}>{row?.activityName}</Text>
          <View style={[styles.badge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Detail label="Date" value={row?.slotDate || '—'} />
          <Detail label="Time" value={`${row?.slotStartTime || '—'}${row?.slotEndTime ? ` – ${row.slotEndTime}` : ''}`} />
          {row?.trainers?.length > 0 && (
            <Detail label="Instructor" value={row.trainers.map((t) => t.name).join(', ')} />
          )}
          <Detail label="Booking Ref" value={b.ref || '—'} accent />
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>Coins Paid</Text>
            <Text style={styles.detailValue}>₿ {b.coinsPaid ?? 0}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('BookingQR', {
              booking: { ...b, slotDate: row.slotDate, slotTime: row.slotStartTime },
              activityName: row.activityName,
            })}
          >
            <Ionicons name="qr-code-outline" size={18} color={COLORS.primaryLight} />
            <Text style={styles.actionText}>View QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={goReceipt}>
            <Ionicons name="receipt-outline" size={18} color={COLORS.primaryLight} />
            <Text style={styles.actionText}>Receipt</Text>
          </TouchableOpacity>
        </View>

        {/* Cancel */}
        {b.status === 'confirmed' && (
          canCancel ? (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSheetOpen(true)}>
              <Text style={styles.cancelBtnText}>Cancel Booking</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.cancelDisabled}>Cancellations must be made at least 2 hours before the session.</Text>
          )
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Cancel bottom sheet */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => !cancelling && setSheetOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Cancel Booking?</Text>
            <Text style={styles.sheetSub}>
              Your {row?.activityName} session on {row?.slotDate} will be removed from your schedule.
            </Text>

            <View style={styles.refundBanner}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#4ADE80" />
              <Text style={styles.refundText}>Eligible for 100% refund (₿ {b.coinsPaid ?? 0})</Text>
            </View>

            <HoloButton
              label="KEEP MY BOOKING"
              onPress={() => setSheetOpen(false)}
              style={{ marginTop: 16 }}
            />
            <TouchableOpacity style={styles.confirmCancelBtn} onPress={doCancel} disabled={cancelling}>
              {cancelling
                ? <ActivityIndicator color="#F87171" />
                : <Text style={styles.confirmCancelText}>YES, CANCEL BOOKING</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeBottomBar>
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
  headerTitle: { fontFamily: FONTS.headline, fontSize: 16, color: COLORS.textPrimary, letterSpacing: 1 },

  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  activityName: { fontFamily: FONTS.headline, fontSize: 26, color: COLORS.white, flex: 1 },
  badge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: FONTS.label, fontSize: 9, letterSpacing: 1 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 18, marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  detailLabel: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted },
  detailValue: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.white },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.primaryBorder,
    borderRadius: 14, paddingVertical: 14,
  },
  actionText: { fontFamily: FONTS.label, fontSize: 12, color: COLORS.primaryLight, letterSpacing: 0.5 },

  cancelBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  cancelBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#F87171' },
  cancelDisabled: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 18 },

  // Sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1B191E', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: COLORS.border,
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 20 },
  sheetTitle: { fontFamily: FONTS.headline, fontSize: 22, color: COLORS.white, textAlign: 'center', marginBottom: 8 },
  sheetSub: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  refundBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(74,222,128,0.08)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)',
    borderRadius: 12, paddingVertical: 12,
  },
  refundText: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: '#4ADE80' },
  confirmCancelBtn: {
    alignItems: 'center', justifyContent: 'center', height: 52, marginTop: 12,
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.5)', borderRadius: 12,
  },
  confirmCancelText: { fontFamily: FONTS.label, fontSize: 13, color: '#F87171', letterSpacing: 1 },
});
