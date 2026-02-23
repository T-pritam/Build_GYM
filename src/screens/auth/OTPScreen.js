import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function OTPScreen({ navigation, route }) {
  const { mobile } = route.params || { mobile: '+91 98765 43210' };
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);
  const successScale = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    startTimer();
  }, []);

  const startTimer = () => {
    setTimer(30);
    setCanResend(false);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text.slice(-1);
    setOtp(newOtp);
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newOtp.every((d) => d !== '')) {
      handleVerify(newOtp);
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = (otpArr) => {
    const code = (otpArr || otp).join('');
    if (code.length < 6) return;
    // Animate success then navigate
    Animated.spring(successScale, { toValue: 1, useNativeDriver: true }).start();
    setTimeout(() => {
      navigation.replace('Onboarding');
    }, 600);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <LinearGradient
        colors={['#0D0D0D', '#160800']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.circle1} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <Animated.View style={[styles.inner, { opacity: fadeIn }]}>
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark" size={36} color={COLORS.secondary} />
          </View>

          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.mobileHighlight}>{mobile}</Text>
          </Text>

          {/* OTP Boxes */}
          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(ref) => (inputRefs.current[i] = ref)}
                style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                value={digit}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
                autoFocus={i === 0}
              />
            ))}
          </View>

          {/* Resend */}
          <View style={styles.resendRow}>
            {!canResend ? (
              <Text style={styles.timerText}>
                Resend OTP in <Text style={styles.timerNum}>{timer}s</Text>
              </Text>
            ) : (
              <TouchableOpacity onPress={startTimer}>
                <Text style={styles.resendBtn}>Resend OTP</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Verify button */}
          <TouchableOpacity
            style={[styles.btn, otp.join('').length < 6 && styles.btnDisabled]}
            onPress={() => handleVerify()}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={
                otp.join('').length === 6
                  ? [COLORS.secondary, COLORS.secondaryDark]
                  : ['#333', '#222']
              }
              style={styles.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.btnText, otp.join('').length < 6 && styles.btnTextDisabled]}>
                VERIFY & CONTINUE
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Hint */}
          <Text style={styles.hint}>
            <Text style={styles.hintOrange}>Demo:</Text> Enter any 6 digits to proceed.
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  kav: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  circle1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,107,0,0.06)', top: -80, right: -60,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: 36,
    borderWidth: 1, borderColor: COLORS.border,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.secondaryGlow,
    borderWidth: 1, borderColor: COLORS.secondaryBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  title: { fontSize: 34, fontWeight: '900', color: COLORS.white, marginBottom: 10 },
  subtitle: {
    fontSize: 15, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 40,
  },
  mobileHighlight: { color: COLORS.white, fontWeight: '700' },

  // OTP
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  otpBox: {
    width: 50, height: 58, borderRadius: 14, backgroundColor: COLORS.surface2,
    borderWidth: 1, borderColor: COLORS.border,
    fontSize: 24, fontWeight: '800', color: COLORS.white,
  },
  otpBoxFilled: {
    borderColor: COLORS.secondary, backgroundColor: COLORS.secondaryGlow,
    color: COLORS.secondary,
  },

  // Resend
  resendRow: { alignItems: 'center', marginBottom: 32 },
  timerText: { fontSize: 13, color: COLORS.textMuted },
  timerNum: { color: COLORS.secondary, fontWeight: '700' },
  resendBtn: { fontSize: 14, color: COLORS.secondary, fontWeight: '700' },

  // Button
  btn: { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  btnDisabled: { opacity: 0.5 },
  btnGradient: { paddingVertical: 17, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '800', color: COLORS.white, letterSpacing: 2 },
  btnTextDisabled: { color: COLORS.textMuted },

  // Hint
  hint: { textAlign: 'center', fontSize: 12, color: COLORS.textMuted },
  hintOrange: { color: COLORS.secondary, fontWeight: '700' },
});
