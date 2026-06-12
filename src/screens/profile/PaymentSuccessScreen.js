/**
 * PaymentSuccessScreen
 * ─────────────────────────────────────────────────────────────
 * Full-screen result shown after a successful Razorpay coin purchase.
 * Mockup: NewUi/build_payment_successful/code.html (Holographic Noir).
 *
 * Behaviour:
 *  · Animated SVG tick (circle draws, then checkmark draws).
 *  · Receipt card + new balance fade in.
 *  · Auto-redirects to Home after 3 s (cleared if the user navigates away).
 *
 * Route params (from AddBuildCoinsScreen):
 *   amountPaid, baseCoins, bonusCoins, coinsAdded, newBalance, razorpayPaymentId
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { COLORS, FONTS, GRADIENTS } from '../../theme';
import SafeBottomBar from '../../components/SafeBottomBar';

const GREEN = COLORS.success;     // #4CAF50
const GOLD  = '#F59E0B';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath   = Animated.createAnimatedComponent(Path);

const REDIRECT_MS = 3000;

export default function PaymentSuccessScreen({ navigation, route }) {
  const {
    amountPaid,
    baseCoins = 0,
    bonusCoins = 0,
    coinsAdded = 0,
    newBalance = 0,
    razorpayPaymentId = null,
  } = route?.params ?? {};

  // Drawing animations: circle stroke (≈240 circumference) then checkmark (≈50).
  const circleDash = useRef(new Animated.Value(240)).current;
  const checkDash  = useRef(new Animated.Value(50)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const goHome = () =>
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });

  useEffect(() => {
    Animated.sequence([
      Animated.timing(circleDash, { toValue: 0, duration: 800, useNativeDriver: false }),
      Animated.parallel([
        Animated.timing(checkDash, { toValue: 0, duration: 500, useNativeDriver: false }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();

    // Auto-redirect home after 3 s. Cleared on unmount so manual nav wins.
    const timer = setTimeout(goHome, REDIRECT_MS);
    return () => clearTimeout(timer);
  }, []);

  const txnRef = razorpayPaymentId
    ? razorpayPaymentId.toUpperCase()
    : '—';
  const dateStr = formatNow();
  const amount = parseFloat(amountPaid ?? 0);

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      {/* Subtle green success glow */}
      <LinearGradient
        colors={['rgba(76,175,80,0.16)', 'transparent']}
        style={styles.glowTop}
        pointerEvents="none"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Animated tick + title */}
        <View style={styles.headerBlock}>
          <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
            <AnimatedCircle
              cx={40} cy={40} r={38}
              stroke={GREEN} strokeWidth={4} strokeLinecap="round"
              strokeDasharray={240}
              strokeDashoffset={circleDash}
            />
            <AnimatedPath
              d="M25 40L35 50L55 30"
              stroke={GREEN} strokeWidth={4}
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={50}
              strokeDashoffset={checkDash}
            />
          </Svg>
          <Text style={styles.title}>Payment Successful</Text>
        </View>

        <Animated.View style={{ opacity: contentOpacity, width: '100%', alignItems: 'center' }}>
          {/* Receipt card */}
          <View style={styles.card}>
            <Row label="Amount Paid" value={`₹${amount.toLocaleString('en-IN')}`} />
            <Row label="Build Coins" value={`+ ₿ ${baseCoins.toLocaleString()}`} valueColor={GREEN} />
            {bonusCoins > 0 && (
              <Row label="Bonus Coins" value={`+ ₿ ${bonusCoins.toLocaleString()}`} valueColor={GREEN} />
            )}

            <View style={styles.divider} />

            <Row
              label="Total Credited"
              value={`₿ ${coinsAdded.toLocaleString()}`}
              valueColor={GREEN}
              bold
            />

            <View style={styles.metaBlock}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Transaction ID</Text>
                <Text style={styles.metaValueMono} numberOfLines={1}>{txnRef}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Date &amp; Time</Text>
                <Text style={styles.metaValue}>{dateStr}</Text>
              </View>
            </View>
          </View>

          {/* New balance */}
          <View style={styles.balanceBlock}>
            <Text style={styles.balanceLabel}>NEW BALANCE</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceNum}>{newBalance.toLocaleString('en-IN')}</Text>
              <Text style={styles.balanceCoin}>₿</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.actions}>
        <TouchableOpacity activeOpacity={0.9} onPress={goHome} style={styles.primaryWrap}>
          <LinearGradient
            colors={GRADIENTS.violetCyan}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryText}>BACK TO HOME</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            navigation.reset({
              index: 1,
              routes: [{ name: 'MainTabs' }, { name: 'BuildCoinTransactions' }],
            })
          }
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryText}>VIEW TRANSACTION</Text>
        </TouchableOpacity>
      </View>
    </SafeBottomBar>
  );
}

function Row({ label, value, valueColor, bold }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          valueColor && { color: valueColor },
          bold && styles.rowValueBold,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function formatNow() {
  try {
    const now = new Date();
    const date = now.toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
    const time = now.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit',
    });
    return `${date} · ${time}`;
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  glowTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },

  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },

  headerBlock: { alignItems: 'center', marginBottom: 28 },
  title: {
    fontFamily: FONTS.headline, fontSize: 26, color: COLORS.white,
    textAlign: 'center', marginTop: 16, letterSpacing: 0.5,
  },

  // Glass receipt card
  card: {
    width: '92%',
    backgroundColor: COLORS.glass,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 18,
    padding: 22,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowLabel: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary },
  rowValue: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: COLORS.white },
  rowValueBold: { fontFamily: FONTS.bodyBold, fontSize: 18 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },

  metaBlock: { marginTop: 14, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaLabel: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted },
  metaValue: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted },
  metaValueMono: {
    fontFamily: FONTS.body, fontSize: 11, color: COLORS.textSecondary,
    maxWidth: '60%',
  },

  // New balance
  balanceBlock: { alignItems: 'center', marginTop: 28 },
  balanceLabel: {
    fontFamily: FONTS.label, fontSize: 11, color: COLORS.textSecondary,
    letterSpacing: 2.5, marginBottom: 10,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceNum: { fontFamily: FONTS.headline, fontSize: 32, color: COLORS.white },
  balanceCoin: { fontFamily: FONTS.headline, fontSize: 28, color: GOLD },

  // Bottom actions
  actions: { paddingHorizontal: 24, paddingTop: 12, gap: 6 },
  primaryWrap: { borderRadius: 14, overflow: 'hidden' },
  primaryBtn: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white, letterSpacing: 1 },
  secondaryBtn: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.cyan, letterSpacing: 0.5 },
});
