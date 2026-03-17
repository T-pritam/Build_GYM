import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { verifyOTP, resendOTP } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';

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
  const inputRefs = useRef([]);

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

  const handleChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text.slice(-1);
    setOtp(newOtp);
    if (text && index < 5) inputRefs.current[index + 1]?.focus();
    if (newOtp.every((d) => d !== '')) handleVerify(newOtp);
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend || !phone) return;
    try {
      await resendOTP(phone);
      startTimer();
    } catch {
      Alert.alert('Error', 'Could not resend OTP. Please try again.');
    }
  };

  const handleVerify = async (digits = otp) => {
    const code = digits.join('');
    if (code.length < 6 || loading || !phone) return;

    setLoading(true);
    try {
      const { accessToken, refreshToken, user } = await verifyOTP(phone, code);
      console.log('OTP verified, user:', user);

      // Persist to store + SecureStore
      await setAuth(user, accessToken, refreshToken);

      // Route based on onboarding status
      if (user.onboardingCompleted) {
        navigation.replace('MainTabs');
      } else {
        navigation.replace('Onboarding', { mobile: phone });
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Invalid or expired OTP.';
      Alert.alert('Verification Failed', msg);
      // Reset OTP boxes
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Corner glow */}
      <View style={styles.cornerGlow} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Back */}
        <View style={styles.topNav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconBox}>
            <Ionicons name="shield-checkmark" size={38} color="#fff" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{' '}
            <Text style={styles.mobileText}>{displayPhone}</Text>
          </Text>

          {/* OTP Boxes */}
          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputRefs.current[i] = r; }}
                style={[
                  styles.otpBox,
                  digit ? styles.otpBoxFilled : styles.otpBoxEmpty,
                  i === otp.findIndex((d) => d === '') && styles.otpBoxActive,
                ]}
                value={digit}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                caretHidden={false}
              />
            ))}
          </View>

          {/* Timer */}
          <View style={styles.timerRow}>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendBtn}>Resend OTP</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>
                Resend OTP in <Text style={styles.timerCount}>{timer}s</Text>
              </Text>
            )}
          </View>

          {/* Verify button */}
          <TouchableOpacity
            style={[styles.verifyBtn, (otp.join('').length < 6 || loading) && styles.verifyBtnDisabled]}
            onPress={() => handleVerify()}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.verifyBtnText}>VERIFY &amp; CONTINUE</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cornerGlow: {
    position: 'absolute', top: -80, right: -80, width: 280, height: 280,
    borderRadius: 140, backgroundColor: COLORS.secondary + '33',
    opacity: 0.5,
  },
  topNav: { padding: 24, paddingTop: 52 },
  backBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  content: { flex: 1, paddingHorizontal: 24 },

  iconBox: {
    width: 64, height: 64, borderRadius: 18, backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12,
  },

  title: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#9A9A9A', lineHeight: 22, marginBottom: 36 },
  mobileText: { color: '#fff', fontWeight: '700' },

  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  otpBox: {
    width: 48, height: 58, borderRadius: 12, textAlign: 'center',
    fontSize: 22, fontWeight: '800', color: '#fff',
    borderWidth: 1.5,
  },
  otpBoxEmpty: { backgroundColor: '#1C1C1E', borderColor: '#444' },
  otpBoxFilled: { backgroundColor: '#1C1C1E', borderColor: COLORS.secondary, color: COLORS.secondary },
  otpBoxActive: { borderColor: '#2DD4BF' },

  timerRow: { alignItems: 'center', marginBottom: 36 },
  timerText: { fontSize: 13, color: '#9A9A9A' },
  timerCount: { color: COLORS.secondary, fontWeight: '700' },
  resendBtn: { fontSize: 14, color: COLORS.secondary, fontWeight: '700' },

  verifyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.secondary, borderRadius: 14, height: 56, gap: 10,
  },
  verifyBtnDisabled: { opacity: 0.5 },
  verifyBtnText: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 2 },

  demoHint: { textAlign: 'center', fontSize: 12, color: '#9A9A9A', marginTop: 24 },
  demoHighlight: { color: COLORS.secondary, fontWeight: '600' },
});
