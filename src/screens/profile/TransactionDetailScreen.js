import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchBookingDetail } from '../../services/activityService';
import { fetchTransactionById } from '../../services/walletService';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return ''; }
}

function getCategoryMeta(itemCategory, transactionType) {
  const isRefund = transactionType === 'REFUND';
  switch (itemCategory) {
    case 'SESSION':
      return {
        label: isRefund ? 'Session Refund' : 'Session Booking',
        icon: isRefund ? 'refresh-circle-outline' : 'fitness-outline',
        color: isRefund ? '#3B82F6' : COLORS.secondary,
        bg: isRefund ? 'rgba(59,130,246,0.15)' : COLORS.secondaryGlow,
      };
    case 'CAFE':
      return {
        label: isRefund ? 'Café Refund' : 'Café Order',
        icon: isRefund ? 'refresh-circle-outline' : 'restaurant-outline',
        color: isRefund ? '#3B82F6' : '#22C55E',
        bg: isRefund ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.12)',
      };
    case 'PURCHASE':
      return { label: 'Coin Purchase', icon: 'logo-bitcoin', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' };
    case 'AIRDROP':
      return { label: 'Airdrop', icon: 'gift-outline', color: '#A855F7', bg: 'rgba(168,85,247,0.12)' };
    case 'MANUAL':
      return { label: 'Manual Credit', icon: 'create-outline', color: COLORS.secondary, bg: COLORS.secondaryGlow };
    default:
      return { label: itemCategory || 'Transaction', icon: 'cash-outline', color: '#888', bg: '#2A2A2A' };
  }
}

function getStatusStyle(status) {
  switch (status) {
    case 'confirmed':  return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)' };
    case 'cancelled':  return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)' };
    case 'completed':  return { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' };
    case 'no_show':    return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' };
    default:           return { color: '#888',    bg: 'rgba(136,136,136,0.1)' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function TransactionDetailScreen({ navigation, route }) {
  const { transaction: passedTransaction, transactionId } = route.params || {};

  const [transaction, setTransaction] = useState(passedTransaction || null);
  const [loadingTxn, setLoadingTxn] = useState(!passedTransaction && !!transactionId);
  const [txnError, setTxnError] = useState(false);
  const [booking, setBooking] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(false);

  // Deeplink support: fetch by ID when only transactionId is passed
  useEffect(() => {
    if (!passedTransaction && transactionId) {
      fetchTransactionById(transactionId)
        .then(data => setTransaction(data))
        .catch(() => setTxnError(true))
        .finally(() => setLoadingTxn(false));
    }
  }, []);

  // Booking context fetch — must be before any early return (React hooks rule)
  // Depends on `transaction` so it fires once the fetch above resolves
  useEffect(() => {
    if (!transaction || transaction.itemCategory !== 'SESSION' || !transaction.referenceId) return;

    if (transaction.slotDate) {
      setBooking({
        booking: {
          ref:       transaction.bookingRef,
          status:    transaction.bookingStatus,
          coinsPaid: transaction.coinAmount,
          qrCode:    transaction.qrCode,
          id:        transaction.referenceId,
        },
        activityName:  transaction.activityName || transaction.itemName,
        slotDate:      transaction.slotDate,
        slotStartTime: transaction.slotStartTime,
        slotEndTime:   transaction.slotEndTime,
        trainers:      transaction.trainers || [],
      });
      return;
    }

    setLoadingBooking(true);
    fetchBookingDetail(transaction.referenceId)
      .then(res => setBooking(res.data?.data || null))
      .catch(() => {})
      .finally(() => setLoadingBooking(false));
  }, [transaction]);

  if (loadingTxn) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.secondary} size="large" />
      </View>
    );
  }

  if (txnError || !transaction) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  const isCredit   = transaction.transactionType === 'CREDIT' || transaction.transactionType === 'REFUND';
  const isRefund   = transaction.transactionType === 'REFUND';
  const isSession  = transaction.itemCategory === 'SESSION';
  const isCafe     = transaction.itemCategory === 'CAFE';

  const meta = getCategoryMeta(transaction.itemCategory, transaction.transactionType);

  const b = booking?.booking;
  const ss = b ? getStatusStyle(b.status) : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.glow} pointerEvents="none" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Amount hero */}
        <View style={styles.amountCard}>
          <View style={[styles.categoryIconWrap, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={28} color={meta.color} />
          </View>
          <Text style={[styles.amountValue, { color: isCredit ? '#22C55E' : '#EF4444' }]}>
            {isCredit ? '+ ' : '− '}₿ {transaction.coinAmount?.toLocaleString()}
          </Text>
          <Text style={styles.amountLabel}>Build Coins</Text>

          <View style={[styles.typeBadge, {
            backgroundColor: isCredit ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            borderColor: isCredit ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
          }]}>
            <Text style={[styles.typeBadgeText, { color: isCredit ? '#22C55E' : '#EF4444' }]}>
              {isRefund ? 'REFUND' : isCredit ? 'CREDIT' : 'DEBIT'}
            </Text>
          </View>
        </View>

        {/* Core details */}
        <View style={styles.detailCard}>
          <Text style={styles.detailCardTitle}>DETAILS</Text>

          <DetailRow label="Type" value={meta.label} />
          <DetailRow
            label={isSession ? 'Activity' : isCafe ? 'Order' : 'Description'}
            value={transaction.itemName}
          />
          <DetailRow label="Date" value={formatDateTime(transaction.createdAt)} />
          {transaction.note ? <DetailRow label="Note" value={transaction.note} /> : null}
        </View>

        {/* Session booking details */}
        {isSession && (
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>BOOKING INFO</Text>

            {loadingBooking ? (
              <ActivityIndicator color={COLORS.secondary} style={{ marginVertical: 16 }} />
            ) : booking ? (
              <>
                <DetailRow label="Activity"     value={booking.activityName} />
                <DetailRow label="Date"         value={formatDate(booking.slotDate)} />
                <DetailRow label="Time"         value={`${booking.slotStartTime} – ${booking.slotEndTime}`} />
                {booking.trainers?.length > 0 && (
                  <DetailRow label="Instructor" value={booking.trainers.map(t => t.name).join(', ')} />
                )}
                <DetailRow label="Ref" value={b?.ref} />
                {b?.status && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: ss.color }]}>
                        {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.btnRow}>
                  {b?.status === 'confirmed' && b?.qrCode && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => navigation.navigate('BookingQR', {
                        booking: {
                          ...b,
                          slotDate: booking.slotDate,
                          slotTime: booking.slotStartTime,
                        },
                        activityName: booking.activityName,
                      })}
                    >
                      <Ionicons name="qr-code-outline" size={16} color={COLORS.secondary} />
                      <Text style={styles.actionBtnText}>View QR</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionBtn, { flex: 1 }]}
                    onPress={() => navigation.navigate('MyBookings')}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#aaa" />
                    <Text style={[styles.actionBtnText, { color: '#aaa' }]}>My Bookings</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.noDetailText}>Booking details not available.</Text>
            )}
          </View>
        )}

        {/* Café order action */}
        {isCafe && transaction.referenceId && (
          <TouchableOpacity
            style={styles.fullActionBtn}
            onPress={() => navigation.navigate('OrderTracking', { orderId: transaction.referenceId })}
          >
            <Ionicons name="receipt-outline" size={18} color="#fff" />
            <Text style={styles.fullActionBtnText}>View Café Order</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 240, backgroundColor: 'rgba(233,99,22,0.07)' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#1C1C1E',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },

  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },

  // Amount hero
  amountCard: {
    backgroundColor: '#1C1C1E', borderRadius: 20, borderWidth: 1, borderColor: '#2A2A2A',
    padding: 28, alignItems: 'center', gap: 8,
  },
  categoryIconWrap: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  amountValue: { fontSize: 44, fontWeight: '900', letterSpacing: -1 },
  amountLabel: { fontSize: 13, color: '#666', fontWeight: '600' },
  typeBadge: {
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, marginTop: 4,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },

  // Detail card
  detailCard: {
    backgroundColor: '#1C1C1E', borderRadius: 16, borderWidth: 1,
    borderColor: '#2A2A2A', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
  },
  detailCardTitle: {
    fontSize: 9, fontWeight: '800', color: COLORS.secondary,
    letterSpacing: 2, marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  detailLabel: { fontSize: 13, color: '#666', flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#fff', flex: 2, textAlign: 'right' },

  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  noDetailText: { fontSize: 13, color: '#555', paddingVertical: 16, textAlign: 'center' },

  // Action buttons
  btnRow: { flexDirection: 'row', gap: 10, paddingTop: 14, paddingBottom: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.secondaryBorder, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.secondary },

  fullActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1,
    borderColor: '#2A2A2A', padding: 16,
  },
  fullActionBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
