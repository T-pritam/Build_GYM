import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  ActivityIndicator, Alert, RefreshControl, Dimensions,
} from 'react-native';

const { width: W } = Dimensions.get('window');
const PACK_W = Math.floor((W - 48 - 20) / 3); // 48 = scroll paddingH*2, 20 = 2 gaps
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useWalletStore } from '../../store/walletStore';
import { fetchPackages } from '../../services/walletService';
import SafeBottomBar from '../../components/SafeBottomBar';

export default function BuildCoinTransactionsScreen({ navigation }) {
  const {
    balance,
    transactions,
    hasMore,
    isLoading,
    isTxnLoading,
    fetchBalance,
    fetchTransactions,
    fetchMoreTransactions,
    purchasePackage,
  } = useWalletStore();

  const [packages, setPackages] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lowBalance, setLowBalance] = useState(false);
  const [purchasingId, setPurchasingId] = useState(null);

  const LOW_BALANCE_THRESHOLD = 200;

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
    fetchPackages()
      .then(setPackages)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLowBalance(balance < LOW_BALANCE_THRESHOLD);
  }, [balance]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchBalance(), fetchTransactions()]);
    setRefreshing(false);
  }, [fetchBalance, fetchTransactions]);

  const handleBuyPackage = (pkg) => {
    const totalCoins = (pkg.coins + (pkg.bonusCoins ?? 0)).toLocaleString('en-IN');
    const price = parseFloat(pkg.priceInr).toLocaleString('en-IN');
    Alert.alert(
      'Confirm Purchase',
      `Pay ₹${price} at the counter and receive ${totalCoins} coins.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setPurchasingId(pkg.id);
            try {
              const result = await purchasePackage(pkg.id);
              await fetchTransactions();
              Alert.alert('Done!', `${result.coinsAdded.toLocaleString()} coins added to your wallet.`);
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message ?? 'Purchase failed. Try again.');
            } finally {
              setPurchasingId(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.glowTop} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 80;
          if (isNearBottom) fetchMoreTransactions();
        }}
        scrollEventThrottle={400}
      >
        {/* Balance hero */}
        <View style={styles.balanceSection}>
          {isLoading ? (
            <ActivityIndicator color={COLORS.secondary} size="large" style={{ marginVertical: 20 }} />
          ) : (
            <>
              <View style={styles.balanceRow}>
                <Ionicons name="logo-bitcoin" size={40} color={COLORS.secondary} />
                <Text style={styles.balanceNum}>{balance.toLocaleString('en-IN')}</Text>
              </View>
              <Text style={styles.balanceSub}>Build Coins</Text>
            </>
          )}
          {/* <TouchableOpacity
            style={styles.buyBtn}
            onPress={() => packages.length > 0 && handleBuyPackage(packages[0])}
            disabled={packages.length === 0}
          >
            <Text style={styles.buyBtnText}>BUY COINS</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity> */}
        </View>

        {/* Top-Up Packages */}
        {packages.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>TOP UP COINS</Text>
            <View style={styles.packsGrid}>
              {packages.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.packCard, p.popular && styles.packCardPopular]}
                  activeOpacity={0.8}
                  onPress={() => handleBuyPackage(p)}
                  disabled={purchasingId !== null}
                >
                  {p.popular && (
                    <View style={styles.popularBanner}>
                      <Text style={styles.popularText}>★ POPULAR</Text>
                    </View>
                  )}
                  <View style={[styles.packIconWrap, p.popular && { marginTop: 22 }]}>
                    {purchasingId === p.id ? (
                      <ActivityIndicator color={COLORS.secondary} size="small" />
                    ) : (
                      <Ionicons name="logo-bitcoin" size={20} color={COLORS.secondary} />
                    )}
                  </View>
                  <Text style={styles.packCoins}>
                    {(p.coins + (p.bonusCoins ?? 0)).toLocaleString()}
                  </Text>
                  <Text style={styles.packCoinsLabel}>coins</Text>
                  {p.bonusCoins > 0 && (
                    <View style={styles.packBonusBadge}>
                      <Text style={styles.packBonus}>+{p.bonusCoins} bonus</Text>
                    </View>
                  )}
                  <View style={styles.packPricePill}>
                    <Text style={styles.packPrice}>₹{parseFloat(p.priceInr).toLocaleString('en-IN')}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Low balance banner */}
        {lowBalance && (
          <View style={styles.lowBanner}>
            <Ionicons name="warning-outline" size={20} color={COLORS.secondary} />
            <Text style={styles.lowBannerText}>
              Low Balance. Top up to continue booking sessions without interruption.
            </Text>
          </View>
        )}

        {/* Transactions */}
        <Text style={styles.sectionLabel}>RECENT TRANSACTIONS</Text>

        {isTxnLoading && transactions.length === 0 ? (
          <ActivityIndicator color={COLORS.secondary} style={{ marginVertical: 20 }} />
        ) : transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={40} color="#444" />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          <>
            {transactions.map((t) => {
              const isCredit  = t.transactionType === 'CREDIT' || t.transactionType === 'REFUND';
              const isRefund  = t.transactionType === 'REFUND';
              const isSession = t.itemCategory === 'SESSION';
              const isCafe    = t.itemCategory === 'CAFE';

              // Formatted label per category
              let label = t.itemName;
              let iconName = isCredit ? 'add' : 'remove';
              let iconColor = isCredit ? '#22C55E' : '#EF4444';
              let iconBg    = isCredit ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)';
              let sublabel  = null;

              if (isSession) {
                label     = isRefund ? `Refund: ${t.itemName}` : `Activity: ${t.itemName}`;
                sublabel  = isRefund ? 'Session refund' : 'Session booking';
                iconName  = isRefund ? 'refresh-circle-outline' : 'fitness-outline';
                iconColor = isRefund ? '#3B82F6' : COLORS.secondary;
                iconBg    = isRefund ? 'rgba(59,130,246,0.1)' : COLORS.secondaryGlow;
              } else if (isCafe) {
                label     = isRefund ? `Refund: ${t.itemName}` : t.itemName;
                sublabel  = isRefund ? 'Café refund' : 'Café order';
                iconName  = isRefund ? 'refresh-circle-outline' : 'restaurant-outline';
                iconColor = isRefund ? '#3B82F6' : '#22C55E';
                iconBg    = isRefund ? 'rgba(59,130,246,0.1)' : 'rgba(34,197,94,0.12)';
              } else if (t.itemCategory === 'PURCHASE' || t.transactionType === 'CREDIT') {
                sublabel = 'Coins added';
                iconName  = 'add-circle-outline';
                iconColor = '#22C55E';
                iconBg    = 'rgba(34,197,94,0.1)';
              }

              return (
                <TouchableOpacity
                  key={t.id}
                  style={styles.txnRow}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate('TransactionDetail', { transaction: t })}
                >
                  <View style={[styles.txnIcon, { backgroundColor: iconBg }]}>
                    <Ionicons name={iconName} size={18} color={iconColor} />
                  </View>
                  <View style={styles.txnInfo}>
                    <Text style={styles.txnLabel}>{label}</Text>
                    <Text style={styles.txnDate}>
                      {sublabel ? `${sublabel} · ` : ''}{formatDate(t.createdAt)}
                    </Text>
                  </View>
                  <Text style={[styles.txnAmount, { color: isCredit ? '#22C55E' : '#EF4444' }]}>
                    {isCredit ? '+ ₿ ' : '− ₿ '}{t.coinAmount}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#444" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              );
            })}

            {isTxnLoading && (
              <ActivityIndicator color={COLORS.secondary} style={{ marginVertical: 16 }} />
            )}

            {!hasMore && transactions.length > 0 && (
              <Text style={styles.endText}>— All transactions loaded —</Text>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeBottomBar>
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

  // Packs grid — 3 per row
  packsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  packCard: {
    width: PACK_W, backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1,
    borderColor: '#2A2A2A', padding: 12, alignItems: 'center', gap: 3, overflow: 'hidden',
  },
  packCardPopular: { borderColor: COLORS.secondary + '80', backgroundColor: '#1F1800' },
  popularBanner: {
    position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: COLORS.secondary,
    paddingVertical: 3, alignItems: 'center',
  },
  popularText: { fontSize: 7, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  packIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.secondaryGlow,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  packCoins: { fontSize: 17, fontWeight: '900', color: '#fff', lineHeight: 20 },
  packCoinsLabel: { fontSize: 9, color: '#555', fontWeight: '600', marginBottom: 2 },
  packBonusBadge: {
    backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2,
  },
  packBonus: { fontSize: 9, color: '#22C55E', fontWeight: '800' },
  packPricePill: {
    backgroundColor: '#2A2A2A', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, marginTop: 2,
  },
  packPrice: { fontSize: 12, color: '#ccc', fontWeight: '700' },

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

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, color: '#555' },
  endText: { textAlign: 'center', fontSize: 11, color: '#444', paddingVertical: 16 },
});
