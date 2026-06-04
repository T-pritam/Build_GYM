import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { passwordStrength, STRENGTH_COLORS, STRENGTH_LABELS } from '../../utils/passwordUtils';
import { forgotPasswordSend, forgotPasswordVerify } from '../../services/authService';
import { CommonActions } from '@react-navigation/native';

export default function ResetPasswordScreen({ navigation, route }) {
  const { identifier } = route?.params || {};

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showCon, setShowCon] = useState(false);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  const strength = passwordStrength(newPw);
  const otpFilled = otp.every((d) => d !== '');
  const canSubmit = otpFilled && newPw.length >= 8 && newPw === confirmPw;

  useEffect(() => { startTimer(); }, []);

  const startTimer = () => {
    setTimer(30); setCanResend(false);
    const iv = setInterval(() => {
      setTimer((p) => {
        if (p <= 1) { clearInterval(iv); setCanResend(true); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  };

  const handleChange = (text, idx) => {
    const next = [...otp];
    next[idx] = text.slice(-1);
    setOtp(next);
    if (text && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend || !identifier || resending) return;
    setCanResend(false);
    setResending(true);
    try {
      await forgotPasswordSend(identifier);
      startTimer();
    } catch {
      Alert.alert('Error', 'Could not resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleReset = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      await forgotPasswordVerify(identifier, otp.join(''), newPw);
      Alert.alert(
        'Password Reset',
        'Your password has been reset successfully. Please log in.',
        [{ text: 'OK', onPress: () => navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })) }],
      );
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Invalid or expired OTP.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar */}
          <View style={s.topRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={s.logoBox}><Text style={s.logoLetter}>B</Text></View>
          </View>

          {/* Title */}
          <View style={s.titleBlock}>
            <Text style={s.title}>Reset{'\n'}Password.</Text>
            <Text style={s.subtitle}>
              Enter the OTP sent to {identifier?.includes('@') ? identifier : `+91 ${identifier?.slice(-10)}`} and set your new password.
            </Text>
          </View>

          {/* OTP card */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>VERIFICATION CODE</Text>
            <View style={s.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(r) => (inputRefs.current[i] = r)}
                  style={[s.otpBox, digit && s.otpBoxFilled]}
                  value={digit}
                  onChangeText={(t) => handleChange(t, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  multiline={false}
                  scrollEnabled={false}
                  textAlign="center"
                  textAlignVertical="center"
                  selectTextOnFocus
                />
              ))}
            </View>

            {/* Resend */}
            <View style={s.resendRow}>
              {canResend
                ? (
                  <TouchableOpacity onPress={handleResend} disabled={resending}>
                    {resending
                      ? <ActivityIndicator color={COLORS.secondary} size="small" />
                      : <Text style={s.resendLink}>Resend OTP</Text>
                    }
                  </TouchableOpacity>
                )
                : (
                  <Text style={s.timerText}>Resend in <Text style={s.timerNum}>{timer}s</Text></Text>
                )
              }
            </View>
          </View>

          {/* Password card */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>NEW PASSWORD</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                value={newPw}
                onChangeText={setNewPw}
                placeholder="Min. 8 characters"
                placeholderTextColor="#555"
                secureTextEntry={!showNew}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} style={s.eyeBtn}>
                <Ionicons name={showNew ? 'eye-off' : 'eye'} size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {newPw.length > 0 && (
              <View style={s.strengthWrap}>
                <View style={s.strengthBar}>
                  {[1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        s.strengthSeg,
                        { backgroundColor: i <= strength ? STRENGTH_COLORS[strength] : '#2A2A2A' },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[s.strengthLabel, { color: STRENGTH_COLORS[strength] }]}>
                  {STRENGTH_LABELS[strength]}
                </Text>
              </View>
            )}

            <Text style={[s.sectionLabel, { marginTop: 20 }]}>CONFIRM NEW PASSWORD</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                value={confirmPw}
                onChangeText={setConfirmPw}
                placeholder="Re-enter password"
                placeholderTextColor="#555"
                secureTextEntry={!showCon}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowCon(!showCon)} style={s.eyeBtn}>
                <Ionicons name={showCon ? 'eye-off' : 'eye'} size={20} color="#666" />
              </TouchableOpacity>
            </View>
            {confirmPw.length > 0 && newPw !== confirmPw && (
              <Text style={s.errorText}>Passwords do not match</Text>
            )}

            <TouchableOpacity
              style={[s.btn, (!canSubmit || loading) && s.btnDisabled]}
              onPress={handleReset}
              disabled={!canSubmit || loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : (
                  <>
                    <Text style={s.btnText}>RESET PASSWORD</Text>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </>
                )
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 32 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  logoLetter: { fontSize: 20, fontWeight: '900', color: '#fff' },

  titleBlock: { marginBottom: 28 },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 8, lineHeight: 40 },
  subtitle: { fontSize: 14, color: '#888', lineHeight: 22 },

  card: {
    backgroundColor: '#1C1C1E', borderRadius: 18, borderWidth: 1,
    borderColor: '#333', padding: 24, marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.secondary,
    letterSpacing: 2, marginBottom: 16, textTransform: 'uppercase',
  },

  // OTP boxes — flex: 1 so all 6 fit on any screen width
  // OTP
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },

  otpBox: {
    width: 44,
    height: 46,
    borderRadius: 12,

    backgroundColor: '#111',
    borderWidth: 1.5,
    borderColor: '#333',

    color: '#fff',
    fontSize: 20,
    fontWeight: '700',

    textAlign: 'center',
    textAlignVertical: 'center',

    includeFontPadding: false,
    paddingVertical: 0,
  },

  otpBoxFilled: {
    borderColor: COLORS.secondary,
  },

  resendRow: { alignItems: 'center', marginTop: 16 },
  timerText: { fontSize: 13, color: '#555' },
  timerNum: { color: '#aaa', fontWeight: '700' },
  resendLink: { fontSize: 13, color: COLORS.secondary, fontWeight: '700' },

  // Password inputs
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 14, height: 56,
    borderWidth: 1, borderColor: '#333', paddingHorizontal: 16,
  },
  input: { flex: 1, fontSize: 15, color: '#fff', height: '100%' },
  eyeBtn: { padding: 4 },

  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  strengthBar: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthSeg: { flex: 1, height: 3, borderRadius: 99 },
  strengthLabel: { fontSize: 11, fontWeight: '700', minWidth: 40, textAlign: 'right' },

  errorText: { fontSize: 11, color: '#EF4444', marginTop: 6 },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.secondary, borderRadius: 14, height: 54, gap: 8, marginTop: 20,
    shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10,
    elevation: 6,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 2 },
});
