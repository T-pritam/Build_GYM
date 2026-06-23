import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPE } from '../../theme';
import { AuthBackground, GlassCard, HoloButton, OtpInput } from '../../components/auth';
import { verifyOTP, resendOTP } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveFCMToken, FCM_TOKEN_KEY } from '../../services/notificationService';
import { CommonActions } from '@react-navigation/native';

export default function OTPScreen({ navigation, route }) {
  const { phone } = route?.params || {};
  // Display format: +91 98765 43210
  const displayPhone = phone
    ? phone.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2')
    : '+91 XXXXX XXXXX';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [locked, setLocked] = useState(false);
  const [resending, setResending] = useState(false);
  const otpRef = useRef(null);

  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => { startTimer(); }, []);

  const startTimer = () => {
    setTimer(30);
    setCanResend(false);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) { clearInterval(interval); setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  };

  const handleResend = async () => {
    if (!canResend || !phone || resending) return;
    setCanResend(false);
    setResending(true);
    try {
      await resendOTP(phone);
      startTimer();
      setAttemptsLeft(null);
      setLocked(false);
      setOtp(['', '', '', '', '', '']);
      otpRef.current?.focus(0);
    } catch {
      Alert.alert('Error', 'Could not resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (digits = otp) => {
    const code = Array.isArray(digits) ? digits.join('') : digits;
    if (code.length < 6 || loading || !phone) return;

    setLoading(true);
    try {
      const { accessToken, refreshToken, user } = await verifyOTP(phone, code);

      // Belt-and-suspenders: block staff accounts from the member app
      if (user.role !== 'member') {
        Alert.alert(
          'Access Denied',
          'This app is for members only. Please use the BuildGym Staff app to sign in.'
        );
        setOtp(['', '', '', '', '', '']);
        otpRef.current?.focus(0);
        return;
      }

      // Persist to store + SecureStore. Keep phone on the user object so the
      // gym→cafe auth bridge can sign HMAC payloads later without re-prompting.
      const userWithPhone = user?.phone ? user : { ...user, phone };
      await setAuth(userWithPhone, accessToken, refreshToken);

      // Associate FCM token with this userId on the gym backend, then mirror
      // the registration to the cafe backend (best-effort — non-blocking).
      AsyncStorage.getItem(FCM_TOKEN_KEY).then(token => {
        if (!token) return;
        saveFCMToken(token, null, user.id).catch(() => { });
        // Lazy import to keep this auth screen free of cafe deps until needed
        import('../../services/cafeFcmService')
          .then(m => m.registerCafeFcmToken(token, { phone, userId: user.id }))
          .catch(() => { });
      }).catch(() => { });

      // If user has no password yet, require them to set one first (mandatory)
      if (!user.hasPassword) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'SetPassword', params: { user: userWithPhone } }],
          })
        );
        return;
      }

      // Route based on onboarding status
      if (user.onboardingCompleted) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          })
        );
      } else {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: 'Onboarding',
                params: { mobile: phone },
              },
            ],
          })
        );
      }
    } catch (error) {
      const responseData = error.response?.data;
      const remaining = responseData?.attemptsLeft ?? null;
      const msg = responseData?.message || 'Invalid or expired OTP.';

      if (remaining !== null && remaining !== undefined) {
        setAttemptsLeft(remaining);
      }

      if (remaining === 0) {
        setLocked(true);
        setOtp(['', '', '', '', '', '']);
        Alert.alert(
          'Too Many Attempts',
          msg,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Verification Failed', msg);
        setOtp(['', '', '', '', '', '']);
        otpRef.current?.focus(0);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground scroll={false}>
      {/* Back */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconBox}>
          <Ionicons name="shield-checkmark" size={34} color={COLORS.primaryLight} />
        </View>

        {/* Title */}
        <Text style={[TYPE.headlineMd, styles.title]}>Verify OTP</Text>
        <Text style={[TYPE.bodySm, styles.subtitle]}>
          We sent a 6-digit code to{' '}
          <Text style={styles.mobileText}>{displayPhone}</Text>
        </Text>

        <GlassCard style={styles.card}>
          <OtpInput
            ref={otpRef}
            value={otp}
            onChange={setOtp}
            onComplete={(code) => handleVerify(code)}
            editable={!loading && !locked}
          />

          {/* Attempts remaining indicator */}
          {attemptsLeft !== null && attemptsLeft > 0 && (
            <Text style={styles.attemptsText}>
              {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} remaining
            </Text>
          )}

          {/* Timer */}
          <View style={styles.timerRow}>
            {canResend ? (
              <TouchableOpacity onPress={handleResend} disabled={resending}>
                {resending
                  ? <ActivityIndicator color={COLORS.primaryLight} size="small" />
                  : <Text style={styles.resendBtn}>Resend OTP</Text>
                }
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>
                Resend OTP in <Text style={styles.timerCount}>{timer}s</Text>
              </Text>
            )}
          </View>
        </GlassCard>

        {/* Verify button */}
        <HoloButton
          label="VERIFY & ENTER"
          icon="arrow-forward"
          onPress={() => handleVerify()}
          loading={loading}
          disabled={otp.join('').length < 6}
          style={styles.cta}
        />
      </View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  topNav: { paddingTop: 52, paddingBottom: 8 },
  backBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.glass,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { flex: 1, paddingTop: 24 },

  iconBox: {
    width: 64, height: 64, borderRadius: 18, backgroundColor: COLORS.primarySoft,
    borderWidth: 1, borderColor: COLORS.primaryBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },

  title: { marginBottom: 8 },
  subtitle: { marginBottom: 32 },
  mobileText: { color: COLORS.textPrimary, fontWeight: '700' },

  card: { marginBottom: 28, paddingHorizontal: 16 },

  attemptsText: {
    ...TYPE.bodySm,
    color: COLORS.primaryLight,
    textAlign: 'center',
    marginTop: 16,
  },

  timerRow: { alignItems: 'center', marginTop: 20 },
  timerText: { ...TYPE.bodySm, color: COLORS.textMuted },
  timerCount: { color: COLORS.primaryLight, fontWeight: '700' },
  resendBtn: { ...TYPE.bodySm, color: COLORS.primaryLight, fontWeight: '700' },

  cta: {},
});
