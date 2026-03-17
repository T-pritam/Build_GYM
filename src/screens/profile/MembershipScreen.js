import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Linking, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { useUser } from '../../context/UserContext';
import { fetchMemberMembership } from '../../services/api';

const RECEPTION = '+919876543210';

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MembershipScreen({ navigation }) {
  const { userId, wallet } = useUser();
  const [memData, setMemData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchMemberMembership(userId)
      .then((data) => setMemData(data))
      .catch(() => setMemData(null))
      .finally(() => setLoading(false));
  }, [userId]);

  const planName   = memData?.plan?.name || '—';
  const validFrom  = fmtDate(memData?.validFrom);
  const validTill  = fmtDate(memData?.validTill);
  const daysLeft   = memData?.daysLeft ?? 0;
  const totalDays  = memData?.totalDays ?? 1;
  const progress   = Math.max(0.05, Math.min(1, daysLeft / totalDays));
  const perks      = memData?.plan?.perks ?? [];
  const transactions = wallet?.transactions ?? null;

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.glowTop} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Membership</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Membership card */}
        <LinearGradient
          colors={['#1C1C1E', 'rgba(45,30,20,1)']}
          style={styles.memCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Badges */}
          <View style={styles.memBadgeRow}>
            <View style={styles.eliteBadge}>
              <Text style={styles.eliteBadgeText}>{planName}</Text>
            </View>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>Active</Text>
            </View>
          </View>

          {/* Dates */}
          <View style={styles.datesRow}>
            <View>
              <Text style={styles.dateLabel}>Valid From</Text>
              <Text style={styles.dateValue}>{validFrom}</Text>
            </View>
            <View style={styles.arrowCircle}>
              <Ionicons name="arrow-forward" size={18} color={COLORS.secondary} />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.dateLabel}>Valid Till</Text>
              <Text style={styles.dateValue}>{validTill}</Text>
            </View>
          </View>

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelLeft}>Progress</Text>
              <Text style={styles.progressLabelRight}>{daysLeft} days remaining</Text>
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
        </LinearGradient>

        {/* Plan Features */}
        <Text style={styles.sectionTitle}>Plan Features</Text>
        <View style={styles.featuresCard}>
          {perks.length > 0
            ? perks.map((f, i) => (
                <View key={i} style={[styles.featureRow, i < perks.length - 1 && styles.featureRowBorder]}>
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.secondary} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))
            : <View style={styles.featureRow}>
                <Text style={styles.featureText}>No membership assigned yet. Contact reception to get started.</Text>
              </View>
          }
        </View>

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.secondary} />
          <Text style={styles.infoText}>
            Online renewal is not available yet. Please contact the reception desk to renew your membership.
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Linking.openURL(`tel:${RECEPTION}`)}
          >
            <Ionicons name="call-outline" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Call Reception</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.waBtn]}
            onPress={() => Linking.openURL(`whatsapp://send?phone=${RECEPTION}`)}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#22C55E" />
            <Text style={[styles.actionBtnText, { color: '#22C55E' }]}>WhatsApp</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {(transactions || DUMMY_TXN).slice(0, 5).map((t, i) => (
          <View key={i} style={styles.txnRow}>
            <View style={[styles.txnIcon, { backgroundColor: t.type === 'credit' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }]}>
              <Ionicons
                name={t.type === 'credit' ? 'add' : 'remove'}
                size={18}
                color={t.type === 'credit' ? '#22C55E' : '#EF4444'}
              />
            </View>
            <View style={styles.txnInfo}>
              <Text style={styles.txnLabel}>{t.description}</Text>
              <Text style={styles.txnDate}>{t.date}</Text>
            </View>
            <Text style={[styles.txnAmount, { color: t.type === 'credit' ? '#22C55E' : '#EF4444' }]}>
              {t.type === 'credit' ? '+' : '-'}₿ {t.amount}
            </Text>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const DUMMY_TXN = [
  { type: 'debit', description: 'Elite Membership Renewal', date: '1 Jan 2026', amount: '5,000' },
  { type: 'debit', description: 'Build Café - Shake', date: '15 Jan 2026', amount: '120' },
  { type: 'credit', description: 'Admin Credit - Cashback', date: '16 Jan 2026', amount: '500' },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  glowTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 260, backgroundColor: 'rgba(233,99,22,0.06)' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },

  scroll: { paddingHorizontal: 16, paddingBottom: 20 },

  memCard: {
    borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 20,
  },
  memBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  eliteBadge: {
    backgroundColor: COLORS.secondary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
  },
  eliteBadgeText: { fontSize: 10, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 2 },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  activeText: { fontSize: 10, fontWeight: '800', color: '#22C55E' },

  datesRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24,
  },
  dateLabel: { fontSize: 9, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  dateValue: { fontSize: 14, fontWeight: '700', color: '#fff' },
  arrowCircle: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(233,99,22,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  progressSection: {},
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabelLeft: { fontSize: 11, color: '#888' },
  progressLabelRight: { fontSize: 11, color: COLORS.secondary, fontWeight: '700' },
  progressBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.secondary, borderRadius: 4 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 12 },

  featuresCard: {
    backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#333', marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
  },
  featureRowBorder: { borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  featureText: { fontSize: 13, color: '#e5e5e5' },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#2D1E14',
    borderWidth: 1, borderColor: COLORS.secondary + '44', borderRadius: 12, padding: 14, marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 12, color: '#ccc', lineHeight: 18 },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, height: 48,
  },
  waBtn: { borderColor: 'rgba(34,197,94,0.35)' },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  txnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1C1C1E', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A',
    padding: 14, marginBottom: 8,
  },
  txnIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txnInfo: { flex: 1 },
  txnLabel: { fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 2 },
  txnDate: { fontSize: 10, color: '#666' },
  txnAmount: { fontSize: 14, fontWeight: '800' },
});
