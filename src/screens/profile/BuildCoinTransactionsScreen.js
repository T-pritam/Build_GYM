import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { buildCoins } from '../../constants/dummyData';

export default function BuildCoinTransactionsScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1A0800', '#0D0D0D']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Build Coin Transactions</Text>
        <View style={{ width: 42 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={['#2A1200', '#1A0800']}
            style={styles.summaryCardInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>CURRENT BALANCE</Text>
                <View style={styles.balanceRow}>
                  <MaterialCommunityIcons name="bitcoin" size={24} color={COLORS.secondary} />
                  <Text style={styles.balanceAmount}>{buildCoins.balance.toLocaleString('en-IN')}</Text>
                </View>
              </View>
              <View style={styles.summaryStats}>
                <View style={styles.stat}>
                  <Text style={styles.statNum}>{buildCoins.totalEarned.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Earned</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statNum, { color: COLORS.error }]}>{buildCoins.totalSpent.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Spent</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Transactions */}
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {buildCoins.transactions.length > 0 ? (
          buildCoins.transactions.map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={[
                styles.txIcon,
                { backgroundColor: tx.type === 'credit' ? COLORS.successLight : COLORS.errorLight }
              ]}>
                <Ionicons
                  name={tx.type === 'credit' ? 'add-circle-outline' : 'remove-circle-outline'}
                  size={18}
                  color={tx.type === 'credit' ? COLORS.success : COLORS.error}
                />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txDesc}>{tx.desc}</Text>
                <Text style={styles.txDate}>{tx.date}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <MaterialCommunityIcons name="bitcoin" size={13} color={tx.type === 'credit' ? COLORS.success : COLORS.error} />
                <Text style={[styles.txAmount, { color: tx.type === 'credit' ? COLORS.success : COLORS.error }]}>
                  {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyStateText}>No transactions yet</Text>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  scroll: { padding: 20 },
  summaryCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 28 },
  summaryCardInner: { padding: 20, borderWidth: 1, borderColor: '#3A1A00' },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2, marginBottom: 8 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceAmount: { fontSize: 32, fontWeight: '900', color: COLORS.secondary },
  summaryStats: { flexDirection: 'row', gap: 16, alignItems: 'flex-end' },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: '800', color: COLORS.success, marginBottom: 4 },
  statLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.white, marginBottom: 14 },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, padding: 12, marginBottom: 8,
  },
  txIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 13, fontWeight: '600', color: COLORS.white, marginBottom: 2 },
  txDate: { fontSize: 11, color: COLORS.textMuted },
  txAmount: { fontSize: 15, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyStateText: { fontSize: 16, color: COLORS.textMuted, fontWeight: '600' },
});
