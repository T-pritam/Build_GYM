import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchWallet } from '../../services/api';
import { useUser } from '../../context/UserContext';

const TOP_UP_PACKS = [
  { coins: 500, price: '₹50', popular: false },
  { coins: 1000, price: '₹95', popular: true },
  { coins: 2500, price: '₹225', popular: false },
];

const DUMMY_TXN = [
  { type: 'credit', description: 'Elite Membership Renewal', date: '1 Jan 2026', amount: 500 },
  { type: 'debit', description: 'Build Café - Shake', date: '15 Jan 2026', amount: 120 },
  { type: 'credit', description: 'Admin Credit - Cashback', date: '16 Jan 2026', amount: 500 },
  { type: 'debit', description: 'Yoga Class Booking', date: '18 Jan 2026', amount: 80 },
  { type: 'debit', description: 'Build Café - Protein Bar', date: '20 Jan 2026', amount: 60 },
];

export default function BuildCoinTransactionsScreen({ navigation }) {
  const { userId } = useUser();
  const [wallet, setWallet]       = useState(null);
  const [txns, setTxns]           = useState(DUMMY_TXN);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadWallet = async (isRefresh = false) => {
    if (!userId) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await fetchWallet(userId);
      setWallet(data.wallet);
      setTxns(data.transactions.map(t => ({
        type: t.type,
        description: t.description || 'Transaction',
        date: new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        amount: t.amount,
      })));
    } catch (e) {
      // Fall back to dummy data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadWallet(); }, [userId]);

  const balance = wallet?.balance ?? 2450;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.glowTop} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadWallet(true)} tintColor={COLORS.secondary} />}
      >
        {/* Balance hero */}
        <View style={styles.balanceSection}>
          <View style={styles.balanceRow}>
            <Ionicons name="logo-bitcoin" size={40} color={COLORS.secondary} />
            <Text style={styles.balanceNum}>{balance.toLocaleString('en-IN')}</Text>
          </View>
          <Text style={styles.balanceSub}>Build Coins</Text>
          <TouchableOpacity
            style={styles.buyBtn}
            onPress={() => Alert.alert('Buy Coins', 'Top-up functionality coming soon!')}
          >
            <Text style={styles.buyBtnText}>BUY COINS</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Top-Up section */}
        <Text style={styles.sectionLabel}>TOP UP COINS</Text>
        <View style={styles.packsRow}>
          {TOP_UP_PACKS.map((p) => (
            <TouchableOpacity
              key={p.coins}
              style={[styles.packCard, p.popular && styles.packCardPopular]}
              activeOpacity={0.8}
            >
              {p.popular && (
                <View style={styles.popularBanner}>
                  <Text style={styles.popularText}>POPULAR</Text>
                </View>
              )}
              <Ionicons name="logo-bitcoin" size={22} color={COLORS.secondary} style={p.popular && { marginTop: 8 }} />
              <Text style={styles.packCoins}>{p.coins.toLocaleString()}</Text>
              <Text style={styles.packPrice}>{p.price}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Low balance banner */}
        <View style={styles.lowBanner}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.secondary} />
          <Text style={styles.lowBannerText}>
            Low balance! Top up to continue booking classes and meals.
          </Text>
        </View>

        {/* Transactions */}
        <Text style={styles.sectionLabel}>RECENT TRANSACTIONS</Text>
        {loading && <ActivityIndicator color={COLORS.secondary} style={{ marginVertical: 16 }} />}
        {!loading && txns.length === 0 && (
          <Text style={{ color: '#666', fontSize: 13, textAlign: 'center', marginVertical: 16 }}>No transactions yet</Text>
        )}
        {txns.map((t, i) => (
          <View key={t.id || i} style={styles.txnRow}>
            <View style={[
              styles.txnIcon,
              { backgroundColor: t.type === 'credit' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' },
            ]}>
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
              {t.type === 'credit' ? '+ ₿ ' : '- ₿ '}{t.amount}
            </Text>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  glowTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 260, backgroundColor: 'rgba(233,99,22,0.1)' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 52, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#1C1C1E',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },

  scroll: { paddingHorizontal: 24, paddingBottom: 20 },

  // Balance
  balanceSection: { alignItems: 'center', paddingVertical: 28 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  balanceNum: { fontSize: 52, fontWeight: '900', color: '#fff' },
  balanceSub: { fontSize: 13, color: '#666', fontWeight: '600', marginBottom: 20 },
  buyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.secondary,
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 24,
    width: '100%', justifyContent: 'center',
  },
  buyBtnText: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 2 },

  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: COLORS.secondary,
    letterSpacing: 2.5, marginBottom: 12, marginTop: 8,
  },

  // Packs
  packsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  packCard: {
    flex: 1, backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1,
    borderColor: '#333', padding: 14, alignItems: 'center', gap: 6, overflow: 'hidden',
  },
  packCardPopular: { borderColor: COLORS.secondary + '66' },
  popularBanner: {
    position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: COLORS.secondary,
    paddingVertical: 2, alignItems: 'center',
  },
  popularText: { fontSize: 8, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  packCoins: { fontSize: 18, fontWeight: '900', color: '#fff' },
  packPrice: { fontSize: 11, color: '#777' },

  // Low balance
  lowBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#2A1A0A',
    borderWidth: 1, borderColor: COLORS.secondary + '55', borderRadius: 12, padding: 14, marginBottom: 24,
  },
  lowBannerText: { flex: 1, fontSize: 12, color: '#ccc', lineHeight: 18 },

  // Transactions
  txnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(28,28,30,0.4)', borderRadius: 12, borderWidth: 1, borderColor: '#333',
    padding: 14, marginBottom: 8,
  },
  txnIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txnInfo: { flex: 1 },
  txnLabel: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 2 },
  txnDate: { fontSize: 10, color: '#666' },
  txnAmount: { fontSize: 14, fontWeight: '800' },
});
