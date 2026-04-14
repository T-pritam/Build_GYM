import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Linking, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import SafeBottomBar from '../../components/SafeBottomBar';
import { fetchMyMembership } from '../../services/membershipService';

const RECEPTION = '+919876543210';

// ─── Tier colours ─────────────────────────────────────────────────────────────
const TIER_COLORS = {
  basic: { badge: '#6B7280', label: 'Basic'  },
  pro:   { badge: '#3B82F6', label: 'Pro'    },
  elite: { badge: COLORS.secondary, label: 'Elite' },
};

// ─── Days-remaining colour ────────────────────────────────────────────────────
function daysColor(daysLeft) {
  if (daysLeft > 30) return '#22C55E';
  if (daysLeft > 7)  return '#F59E0B';
  return '#EF4444';
}

// ─── Perk display labels ──────────────────────────────────────────────────────
const PERK_LABELS = {
  yoga:          'Yoga Sessions',
  pilates:       'Pilates Sessions',
  boxing:        'Boxing Sessions',
  pickleball:    'Pickleball Sessions',
  cafe_meal:     'Complimentary Café Meals',
  protein_shake: 'Protein Shakes',
};

const PERK_ICONS = {
  yoga:          'body-outline',
  pilates:       'fitness-outline',
  boxing:        'hand-right-outline',
  pickleball:    'tennisball-outline',
  cafe_meal:     'restaurant-outline',
  protein_shake: 'beaker-outline',
};

// ─── Feature list by tier ─────────────────────────────────────────────────────
const TIER_FEATURES = {
  basic: [
    'Gym floor access during operating hours',
    'Workout self-logging',
    'Community section (view, post, vote)',
    'Leaderboard participation (opt-in)',
    'Activity Rings & streak tracking',
    'Attendance calendar',
    'BuildCoin wallet (earn & redeem)',
  ],
  pro: [
    'Everything in Basic, plus:',
    '1 Personal Trainer assigned',
    'Trainer-assigned workout plans',
    'Progressive overload & PR tracking',
    'Priority push notifications & weekly reports',
    'Trainer chat within app',
  ],
  elite: [
    'Everything in Pro, plus:',
    'Dedicated Senior Trainer assigned',
    'Custom diet plan from trainer',
    'Body composition tracking (monthly)',
    'Priority session booking',
    'VIP badge on profile & community posts',
  ],
};

export default function MembershipScreen({ navigation }) {
  const [membershipData, setMembershipData] = useState(null);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchMyMembership();
      setMembershipData(data);
    } catch {
      Alert.alert('Error', 'Failed to load membership. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <SafeBottomBar style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Membership</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
        </View>
      </SafeBottomBar>
    );
  }

  // ── No active membership ──────────────────────────────────────────────────
  if (!membershipData) {
    return (
      <SafeBottomBar style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.glowTop} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Membership</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="card-outline" size={56} color="#333" />
          <Text style={styles.emptyTitle}>No Active Membership</Text>
          <Text style={styles.emptySubtitle}>Choose a plan to unlock all gym features</Text>
          <TouchableOpacity
            style={styles.getPlanBtn}
            onPress={() => navigation.navigate('MembershipPlans')}
          >
            <Text style={styles.getPlanBtnText}>View Plans</Text>
          </TouchableOpacity>
        </View>
      </SafeBottomBar>
    );
  }

  const { membership, plan, totalDays, daysLeft } = membershipData;
  const tierInfo = TIER_COLORS[plan.tier] ?? TIER_COLORS.basic;
  const progress = Math.max(0.03, Math.min(1, daysLeft / totalDays));
  const dayColor = daysColor(daysLeft);

  const validFrom = new Date(membership.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const validTill = new Date(membership.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const features = TIER_FEATURES[plan.tier] ?? [];
  const perks     = (plan.perks ?? []).filter((p) => p.quantity !== 0);

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.glowTop} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Membership</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.secondary}
            colors={[COLORS.secondary]}
          />
        }
      >
        {/* ── Membership card ─── */}
        <LinearGradient
          colors={['#1C1C1E', 'rgba(45,30,20,1)']}
          style={styles.memCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Badges row */}
          <View style={styles.memBadgeRow}>
            <View style={[styles.tierBadge, { backgroundColor: tierInfo.badge }]}>
              <Text style={styles.tierBadgeText}>{tierInfo.label.toUpperCase()}</Text>
            </View>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>Active</Text>
            </View>
          </View>

          {/* Tenure */}
          <Text style={styles.tenureText}>{plan.tenureMonths}-Month Plan</Text>

          {/* Dates row */}
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

          {/* Progress bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelLeft}>Progress</Text>
              <Text style={[styles.progressLabelRight, { color: dayColor }]}>
                {daysLeft} days remaining
              </Text>
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: dayColor }]} />
            </View>
          </View>

          {/* Cafe discount tag */}
          {plan.cafeDiscountPercent > 0 && (
            <View style={styles.discountTag}>
              <Ionicons name="cafe-outline" size={13} color={COLORS.secondary} />
              <Text style={styles.discountTagText}>
                {plan.cafeDiscountPercent}% café discount applied to all orders
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* ── Upgrade nudge for Basic ─── */}
        {plan.tier === 'basic' && (
          <TouchableOpacity
            style={styles.upgradeBanner}
            onPress={() => navigation.navigate('MembershipPlans')}
          >
            <View>
              <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
              <Text style={styles.upgradeSubtitle}>Get a personal trainer, workout plans & more</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.secondary} />
          </TouchableOpacity>
        )}

        {/* ── Plan Features ─── */}
        <Text style={styles.sectionTitle}>Plan Features</Text>
        <View style={styles.featuresCard}>
          {features.map((f, i) => (
            <View key={i} style={[styles.featureRow, i < features.length - 1 && styles.featureRowBorder]}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* ── Bonus Perks ─── */}
        {perks.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Bonus Perks</Text>
            <View style={styles.featuresCard}>
              {perks.map((perk, i) => {
                const isUnlimited = perk.quantity === -1;
                const remaining   = perk.remaining ?? perk.quantity;
                const used        = perk.usedCount ?? 0;
                const total       = isUnlimited ? null : perk.quantity;
                const barFill     = isUnlimited ? 0 : total > 0 ? Math.min(1, used / total) : 0;

                return (
                  <View key={perk.id} style={[styles.perkRow, i < perks.length - 1 && styles.featureRowBorder]}>
                    <View style={styles.perkIconWrap}>
                      <Ionicons name={PERK_ICONS[perk.perkType] ?? 'gift-outline'} size={18} color={COLORS.secondary} />
                    </View>
                    <View style={styles.perkInfo}>
                      <Text style={styles.perkLabel}>{PERK_LABELS[perk.perkType] ?? perk.perkType}</Text>
                      {perk.frequency === 'per_month' && (
                        <Text style={styles.perkFreq}>Resets monthly</Text>
                      )}
                      {isUnlimited ? (
                        <Text style={styles.perkQty}>Unlimited</Text>
                      ) : (
                        <>
                          <Text style={styles.perkQty}>{used}/{total} used</Text>
                          <View style={styles.perkBar}>
                            <View style={[styles.perkBarFill, { width: `${barFill * 100}%` }]} />
                          </View>
                        </>
                      )}
                    </View>
                    <Text style={[styles.perkRemaining, { color: remaining === 0 ? '#EF4444' : '#22C55E' }]}>
                      {isUnlimited ? '∞' : `${remaining} left`}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ── Contact row ─── */}
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

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeBottomBar>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#000' },
  glowTop:    { position: 'absolute', top: 0, left: 0, right: 0, height: 260, backgroundColor: 'rgba(233,99,22,0.06)' },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },

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
    marginBottom: 16,
  },
  memBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tierBadge: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
  },
  tierBadgeText: { fontSize: 10, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 2 },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
  },
  activeDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  activeText: { fontSize: 10, fontWeight: '800', color: '#22C55E' },
  tenureText: { fontSize: 12, color: '#888', marginBottom: 16 },

  datesRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  dateLabel: { fontSize: 9, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  dateValue: { fontSize: 14, fontWeight: '700', color: '#fff' },
  arrowCircle: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(233,99,22,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  progressSection: { marginBottom: 12 },
  progressLabels:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabelLeft:  { fontSize: 11, color: '#888' },
  progressLabelRight: { fontSize: 11, fontWeight: '700' },
  progressBg:   { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  discountTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    backgroundColor: 'rgba(233,99,22,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  discountTagText: { fontSize: 11, color: COLORS.secondary, flex: 1 },

  upgradeBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(233,99,22,0.08)', borderWidth: 1, borderColor: 'rgba(233,99,22,0.25)',
    borderRadius: 12, padding: 14, marginBottom: 20,
  },
  upgradeTitle:    { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 2 },
  upgradeSubtitle: { fontSize: 11, color: '#888' },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 12, marginTop: 4 },

  featuresCard: {
    backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#333', marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
  },
  featureRowBorder: { borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  featureText: { fontSize: 13, color: '#e5e5e5', flex: 1 },

  perkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
  },
  perkIconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(233,99,22,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  perkInfo:    { flex: 1 },
  perkLabel:   { fontSize: 13, color: '#e5e5e5', fontWeight: '600', marginBottom: 2 },
  perkFreq:    { fontSize: 10, color: '#888', marginBottom: 2 },
  perkQty:     { fontSize: 11, color: '#888' },
  perkBar:     { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  perkBarFill: { height: '100%', backgroundColor: COLORS.secondary, borderRadius: 2 },
  perkRemaining: { fontSize: 12, fontWeight: '700' },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, height: 48,
  },
  waBtn:        { borderColor: 'rgba(34,197,94,0.35)' },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  emptyTitle:    { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#666', textAlign: 'center' },
  getPlanBtn: {
    marginTop: 8, backgroundColor: COLORS.secondary, borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  getPlanBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
