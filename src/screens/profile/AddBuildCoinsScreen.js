import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS } from '../../theme';
import { useWalletStore } from '../../store/walletStore';
import { useAuthStore } from '../../store/authStore';
import { fetchPackages } from '../../services/walletService';
import { logEvent, logScreenView } from '../../services/analyticsService';
import SafeBottomBar from '../../components/SafeBottomBar';

const GOLD = '#FFD700';

/**
 * Maps a Razorpay / backend error into a short, human-readable reason for the
 * Payment Failed screen. Avoids surfacing raw SDK / server strings to the user.
 */
function getFailureReason(err) {
  const raw = (
    err?.description ??
    err?.response?.data?.message ??
    err?.message ??
    ''
  ).toString().toLowerCase();

  if (!raw || raw === 'undefined') return 'Payment could not be processed.';
  if (raw.includes('network') || raw.includes('timeout') || raw.includes('internet')) {
    return 'Network error. Please check your connection.';
  }
  if (raw.includes('declin') || raw.includes('bank') || raw.includes('insufficient') || raw.includes('bad_request')) {
    return 'Payment declined by bank.';
  }
  if (raw.includes('signature') || raw.includes('verif')) {
    return 'Payment verification failed.';
  }
  return 'Payment could not be processed.';
}

export default function AddBuildCoinsScreen({ navigation, route }) {
  const { balance, fetchBalance, fetchTransactions, purchaseWithRazorpay } = useWalletStore();
  const { user } = useAuthStore();

  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    fetchBalance();
    fetchPackages()
      .then((data) => setPackages(data || []))
      .catch(() => setPackages([]))
      .finally(() => setLoadingPackages(false));
  }, []);

  const selectedPack = packages.find((p) => p.id === selectedId) || null;

  const handleProceed = async () => {
    if (!selectedPack || purchasing) return;
    const pkg = selectedPack;
    setPurchasing(true);

    const coinsAmount = pkg.coins + (pkg.bonusCoins ?? 0);
    const amountInr = parseFloat(pkg.priceInr);
    // Screen #14 — Buy Coins (Razorpay funnel) entry.
    logScreenView('BuyCoinsRazorpay').catch(() => {});
    logEvent('coins_purchase_started', {
      package_id: pkg.id,
      coins_amount: coinsAmount,
      amount_inr: amountInr,
    }).catch(() => {});

    try {
      const result = await purchaseWithRazorpay(pkg.id, {
        phone: user?.phone ?? '',
        name:  user?.firstName ?? user?.fullName ?? user?.name ?? '',
      });
      await fetchTransactions();
      logEvent('coins_purchased', {
        coins_amount: result.coinsAdded,
        amount_inr: amountInr,
        new_balance: result.newBalance,
      }).catch(() => {});
      navigation.navigate('PaymentSuccess', {
        amountPaid:        pkg.priceInr,
        baseCoins:         pkg.coins,
        bonusCoins:        pkg.bonusCoins ?? 0,
        coinsAdded:        result.coinsAdded,
        newBalance:        result.newBalance,
        razorpayPaymentId: result.razorpayPaymentId ?? null,
      });
    } catch (err) {
      // Silent on user-initiated cancellation (Razorpay SDK may use code 0 or the string)
      if (
        err?.code === 'PAYMENT_CANCELLED' ||
        err?.code === 0 ||
        err?.description?.toLowerCase?.().includes('cancel')
      ) return;
      logEvent('coins_purchase_failed', {
        error_reason: err?.description ?? err?.message ?? 'unknown',
        package_id: pkg.id,
        amount_inr: amountInr,
      }).catch(() => {});
      navigation.navigate('PaymentFailed', {
        amountPaid: pkg.priceInr,
        baseCoins:  pkg.coins,
        reason:     getFailureReason(err),
        packageId:  pkg.id,
      });
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <LinearGradient colors={['rgba(127,41,130,0.15)', 'transparent']} style={styles.glowTop} pointerEvents="none" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.primaryLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Build Coins</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Current balance */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>CURRENT BALANCE</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceNum}>{balance.toLocaleString('en-IN')}</Text>
            <Ionicons name="ellipse" size={20} color={GOLD} style={{ marginLeft: 8 }} />
          </View>
        </View>

        {/* Pack grid */}
        <Text style={styles.sectionLabel}>SELECT A PACK</Text>
        {loadingPackages ? (
          <ActivityIndicator color={COLORS.primaryLight} style={{ marginVertical: 30 }} />
        ) : packages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No packages available right now.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {packages.map((p) => {
              const selected = p.id === selectedId;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.tile, selected && styles.tileSelected]}
                  activeOpacity={0.85}
                  onPress={() => setSelectedId(p.id)}
                >
                  <View style={[styles.tileDot, selected && styles.tileDotActive]} />
                  <Text style={styles.tileCoins}>{p.coins.toLocaleString()}</Text>
                  {p.bonusCoins > 0 && (
                    <Text style={styles.tileBonus}>+{p.bonusCoins.toLocaleString()} ₿ bonus</Text>
                  )}
                  <Text style={styles.tilePrice}>₹{parseFloat(p.priceInr).toLocaleString('en-IN')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryLabel}>SELECTED PACK</Text>
          <Text style={styles.summaryText} numberOfLines={1}>
            {selectedPack
              ? `${selectedPack.coins.toLocaleString()} ₿${selectedPack.bonusCoins > 0 ? ` + ${selectedPack.bonusCoins.toLocaleString()} bonus` : ''}`
              : 'Select a pack'}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleProceed}
          disabled={!selectedPack || purchasing}
          style={styles.proceedWrap}
        >
          <LinearGradient
            colors={GRADIENTS.violetCyan}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.proceedBtn, (!selectedPack || purchasing) && styles.proceedDisabled]}
          >
            {purchasing ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.proceedText}>PROCEED</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeBottomBar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  glowTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.glass,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  headerTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.white },

  scroll: { paddingHorizontal: 20, paddingBottom: 20 },

  balanceSection: { alignItems: 'center', paddingVertical: 24 },
  balanceLabel: { fontFamily: FONTS.label, fontSize: 11, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 10 },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  balanceNum: { fontFamily: FONTS.headline, fontSize: 30, color: COLORS.white },

  sectionLabel: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.primaryLight, letterSpacing: 2.5, marginBottom: 16 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47%', flexGrow: 1, backgroundColor: COLORS.surfaceLow,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 16,
    paddingVertical: 20, paddingHorizontal: 12, alignItems: 'center', gap: 6,
  },
  tileSelected: {
    borderColor: COLORS.primaryBright, backgroundColor: 'rgba(124,58,237,0.15)',
  },
  tileDot: {
    position: 'absolute', top: 12, right: 12, width: 7, height: 7, borderRadius: 4,
    backgroundColor: 'transparent',
  },
  tileDotActive: { backgroundColor: COLORS.primaryLight },
  tileCoins: { fontFamily: FONTS.headline, fontSize: 20, color: COLORS.white },
  tileBonus: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.primaryLight, letterSpacing: 0.5 },
  tilePrice: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textMuted },

  bottomBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28,
    backgroundColor: COLORS.surfaceLow,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  summaryLabel: { fontFamily: FONTS.label, fontSize: 9, color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 3 },
  summaryText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white },
  proceedWrap: { borderRadius: 999, overflow: 'hidden' },
  proceedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, paddingHorizontal: 26, minWidth: 130,
  },
  proceedDisabled: { opacity: 0.4 },
  proceedText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.white, letterSpacing: 1 },
});
