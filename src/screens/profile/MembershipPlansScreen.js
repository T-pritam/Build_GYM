import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import RazorpayCheckout from 'react-native-razorpay';
import { COLORS as THEME, FONTS } from '../../theme';

// Theme-compat: legacy colour keys -> new "Holographic Noir" palette so the
// whole screen restyles without rewriting the render. Accent (orange) -> purple.
const COLORS = {
  primary: THEME.background, primaryLight: THEME.surface, primaryDark: THEME.black,
  orange: THEME.primaryLight, orangeLight: THEME.primarySoft, orangeBorder: THEME.primaryBorder, orangeGlow: THEME.primaryGlow,
  secondary: THEME.primaryLight, secondaryLight: THEME.primaryNeon, secondaryDark: THEME.primary, secondaryGlow: THEME.primarySoft, secondaryBorder: THEME.primaryBorder,
  background: THEME.background, surface: '#1B191E', surface2: THEME.surface2, surface3: THEME.surface3, card: '#1B191E',
  textPrimary: THEME.textPrimary, textSecondary: THEME.textSecondary, textMuted: THEME.textMuted, textDim: THEME.textDim,
  success: THEME.success, successLight: THEME.successSoft, error: THEME.error, errorLight: THEME.errorSoft, warning: THEME.warning, warningLight: THEME.warningSoft,
  border: THEME.border, borderLight: THEME.borderStrong, overlay: THEME.overlay, overlayLight: THEME.overlayLight,
  white: THEME.white, black: THEME.black, transparent: 'transparent',
  primarySoft: THEME.primarySoft, primaryBorder: THEME.primaryBorder, primaryNeon: THEME.primaryNeon,
};
import SafeBottomBar from '../../components/SafeBottomBar';
import { fetchMembershipPlans, createMembershipOrder, verifyMembershipPayment } from '../../services/membershipService';
import { useAuthStore } from '../../store/authStore';
import { logEvent } from '../../services/analyticsService';
import { IS_LEGACY_BUILD } from '../../config/featureFlags';

// ─── Tier display config ──────────────────────────────────────────────────────
const TIER_CONFIG = {
  basic: {
    label:    'Basic',
    color:    '#6B7280',
    gradient: ['#1A1A1A', '#1A1A1A'],
    tagline:  'Everything you need to get started',
  },
  pro: {
    label:    'Pro',
    color:    '#3B82F6',
    gradient: ['#1A1A2A', '#1A1E2A'],
    tagline:  'Personal trainer + workout plans',
  },
  elite: {
    label:    'Elite',
    color:    COLORS.secondary,
    gradient: ['#1C1410', '#1C1208'],
    tagline:  'Senior trainer, diet plan & VIP perks',
  },
};

const TIER_ORDER = ['basic', 'pro', 'elite'];

// ─── Perk labels ──────────────────────────────────────────────────────────────
const PERK_LABELS = {
  yoga:          'Yoga',
  pilates:       'Pilates',
  boxing:        'Boxing',
  pickleball:    'Pickleball',
  cafe_meal:     'Café Meals',
  protein_shake: 'Protein Shakes',
};

// ─── Plan features summary per tier (shown in card) ──────────────────────────
const TIER_BULLETS = {
  basic: ['Gym floor access', 'Self-log workouts', 'Community & leaderboard', 'BuildCoin wallet'],
  pro:   ['Personal Trainer assigned', 'Trainer-assigned workouts', 'Trainer chat', 'All Basic features'],
  elite: ['Senior Trainer + diet plan', 'Body composition tracking', 'VIP badge & priority booking', 'All Pro features'],
};

export default function MembershipPlansScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);

  const [plans, setPlans]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying]   = useState(false);

  // Selected tier and tenure
  const [selectedTier,   setSelectedTier]   = useState('pro');
  const [selectedTenure, setSelectedTenure] = useState(6);

  const loadPlans = useCallback(async () => {
    try {
      const data = await fetchMembershipPlans();
      setPlans(data ?? []);
    } catch {
      Alert.alert('Error', 'Failed to load plans. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  // Group plans by tier
  const plansByTier = {};
  for (const plan of plans) {
    if (!plansByTier[plan.tier]) plansByTier[plan.tier] = {};
    plansByTier[plan.tier][plan.tenureMonths] = plan;
  }

  const selectedPlan = plansByTier[selectedTier]?.[selectedTenure];

  const handleBuy = useCallback(async () => {
    if (!selectedPlan) return;

    setPaying(true);
    try {
      // 1. Create Razorpay order on backend
      const orderData = await createMembershipOrder(selectedPlan.id);

      // 2. Open Razorpay checkout sheet
      const paymentData = await RazorpayCheckout.open({
        description: `${TIER_CONFIG[selectedTier].label} ${selectedTenure}-Month Membership`,
        currency:    orderData.currency,
        key:         orderData.keyId,
        amount:      String(orderData.amountPaise),
        order_id:    orderData.razorpayOrderId,
        name:        'BuildGym',
        prefill: {
          contact: user?.phone ?? '',
          name:    user?.firstName
            ? `${user.firstName} ${user.lastName ?? ''}`.trim()
            : user?.fullName ?? '',
        },
        theme: { color: '#A78BFA' },
      });

      // 3. Verify on backend — activates membership
      await verifyMembershipPayment({
        razorpayOrderId:   paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature,
      });

      logEvent('membership_purchased', {
        plan_type: selectedTier,
        amount_inr: Number(orderData.amountPaise) / 100,
        validity_days: selectedPlan.durationDays ?? selectedTenure * 30,
      }).catch(() => {});

      Alert.alert(
        'Membership Activated!',
        `Your ${TIER_CONFIG[selectedTier].label} ${selectedTenure}-month membership is now active.`,
        [{ text: 'View Membership', onPress: () => navigation.replace('Membership') }],
      );
    } catch (err) {
      if (err?.code === 'PAYMENT_CANCELLED' || err?.description === 'Payment cancelled') {
        // User dismissed checkout — do nothing
      } else {
        Alert.alert('Payment Failed', err?.response?.data?.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setPaying(false);
    }
  }, [selectedPlan, selectedTier, selectedTenure, user, navigation]);

  if (loading) {
    return (
      <SafeBottomBar style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose a Plan</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
        </View>
      </SafeBottomBar>
    );
  }

  const tierCfg = TIER_CONFIG[selectedTier];

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.glowTop} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose a Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Tier selector tabs ─── */}
        <View style={styles.tierTabs}>
          {TIER_ORDER.map((tier) => {
            const cfg = TIER_CONFIG[tier];
            const active = tier === selectedTier;
            return (
              <TouchableOpacity
                key={tier}
                style={[styles.tierTab, active && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                onPress={() => setSelectedTier(tier)}
              >
                <Text style={[styles.tierTabText, active && { color: '#fff' }]}>{cfg.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Tier tagline ─── */}
        <Text style={[styles.tierTagline, { color: tierCfg.color }]}>{tierCfg.tagline}</Text>

        {/* ── Feature bullets ─── */}
        <View style={styles.bulletsCard}>
          {(TIER_BULLETS[selectedTier] ?? []).map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={16} color={tierCfg.color} />
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </View>

        {/* ── Tenure selector ─── */}
        <Text style={styles.sectionLabel}>Select Duration</Text>
        <View style={styles.tenureTabs}>
          {[3, 6, 12].map((months) => {
            const plan = plansByTier[selectedTier]?.[months];
            if (!plan || !plan.isActive) return null;
            const active = months === selectedTenure;
            return (
              <TouchableOpacity
                key={months}
                style={[styles.tenureTab, active && { borderColor: tierCfg.color, backgroundColor: `${tierCfg.color}18` }]}
                onPress={() => setSelectedTenure(months)}
              >
                <Text style={[styles.tenureMonths, active && { color: tierCfg.color }]}>{months} months</Text>
                <Text style={[styles.tenurePrice, active && { color: '#fff' }]}>
                  ₹{parseInt(plan.price).toLocaleString('en-IN')}
                </Text>
                {months === 12 && (
                  <View style={[styles.saveBadge, { backgroundColor: tierCfg.color }]}>
                    <Text style={styles.saveBadgeText}>Best Value</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Perks for selected plan (never shown in the legacy build — Section 6 requires no perks/activities) ─── */}
        {!IS_LEGACY_BUILD && selectedPlan && (selectedPlan.perks ?? []).length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Bonus Perks Included</Text>
            <View style={styles.perksCard}>
              {selectedPlan.perks.map((perk, i) => (
                <View key={perk.id} style={[styles.perkRow, i < selectedPlan.perks.length - 1 && styles.perkBorder]}>
                  <Ionicons name="star" size={14} color={tierCfg.color} />
                  <Text style={styles.perkText}>
                    {perk.quantity === -1 ? 'Unlimited' : perk.quantity}
                    {' '}
                    {PERK_LABELS[perk.perkType] ?? perk.perkType}
                    {perk.frequency === 'per_month' ? ' / month' : ''}
                  </Text>
                </View>
              ))}
              {selectedPlan.cafeDiscountPercent > 0 && (
                <View style={[styles.perkRow, styles.perkBorder]}>
                  <Ionicons name="star" size={14} color={tierCfg.color} />
                  <Text style={styles.perkText}>{selectedPlan.cafeDiscountPercent}% off café menu (entire tenure)</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* ── No perks note ─── */}
        {selectedPlan && (
          IS_LEGACY_BUILD
            ? true
            : (selectedPlan.perks ?? []).length === 0 && selectedPlan.cafeDiscountPercent === 0
        ) && (
          <View style={styles.noPerksNote}>
            <Ionicons name="information-circle-outline" size={16} color="#666" />
            <Text style={styles.noPerksText}>No bonus perks for this plan. Perks unlock at 6-month commitment.</Text>
          </View>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* ── Sticky buy button ─── */}
      {selectedPlan && (
        <View style={styles.stickyBar}>
          <View style={styles.stickyPriceRow}>
            <Text style={styles.stickyLabel}>
              {tierCfg.label} · {selectedTenure}m
            </Text>
            <Text style={styles.stickyPrice}>
              ₹{parseInt(selectedPlan.price).toLocaleString('en-IN')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.buyBtn, { backgroundColor: tierCfg.color }, paying && styles.buyBtnDisabled]}
            onPress={handleBuy}
            disabled={paying}
          >
            {paying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="card-outline" size={18} color="#fff" />
                <Text style={styles.buyBtnText}>Pay Online — ₹{parseInt(selectedPlan.price).toLocaleString('en-IN')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeBottomBar>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#000' },
  glowTop:    { position: 'absolute', top: 0, left: 0, right: 0, height: 200, backgroundColor: 'rgba(127,41,130,0.05)' },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: FONTS.headline, fontSize: 16, color: COLORS.textPrimary, letterSpacing: 3 },

  scroll: { paddingHorizontal: 16, paddingBottom: 20 },

  tierTabs: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tierTab:  {
    flex: 1, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: '#333', backgroundColor: '#1A1A1A',
  },
  tierTabText: { fontSize: 13, fontWeight: '700', color: '#888' },
  tierTagline: { fontSize: 12, marginBottom: 12 },

  bulletsCard: {
    backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A',
    padding: 14, marginBottom: 20, gap: 8,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bulletText: { fontSize: 13, color: '#ccc' },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },

  tenureTabs: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tenureTab:  {
    flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#333',
    backgroundColor: '#1A1A1A', padding: 12, alignItems: 'center', position: 'relative',
  },
  tenureMonths: { fontSize: 11, color: '#888', marginBottom: 4 },
  tenurePrice:  { fontSize: 16, fontWeight: '800', color: '#ccc' },
  saveBadge: {
    position: 'absolute', top: -8, right: -4, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  saveBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  perksCard: {
    backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A',
    marginBottom: 20,
  },
  perkRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  perkBorder: { borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  perkText:   { fontSize: 13, color: '#ccc', flex: 1 },

  noPerksNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1A1A1A', borderRadius: 10, padding: 12, marginBottom: 16,
  },
  noPerksText: { fontSize: 12, color: '#666', flex: 1 },

  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#111', borderTopWidth: 1, borderTopColor: '#2A2A2A',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 10,
  },
  stickyPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stickyLabel:    { fontSize: 13, color: '#888' },
  stickyPrice:    { fontSize: 18, fontWeight: '800', color: '#fff' },
  buyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 14,
  },
  buyBtnDisabled: { opacity: 0.6 },
  buyBtnText:     { fontSize: 15, fontWeight: '800', color: '#fff' },
});
