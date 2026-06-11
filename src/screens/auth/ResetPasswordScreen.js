import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPE } from '../../theme';
import {
  AuthBackground, BrandHeader, GlassCard, AuthField, HoloButton, OtpInput,
} from '../../components/auth';
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
  const otpRef = useRef(null);

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
      otpRef.current?.focus(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      {/* Top bar */}
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <BrandHeader logoSize={40} />
        <View style={styles.backBtn} />
      </View>

      {/* Title */}
      <View style={styles.titleBlock}>
        <Text style={[TYPE.headlineMd, styles.title]}>Reset{'\n'}Password.</Text>
        <Text style={[TYPE.bodySm, styles.subtitle]}>
          Enter the OTP sent to {identifier?.includes('@') ? identifier : `+91 ${identifier?.slice(-10)}`} and set your new password.
        </Text>
      </View>

      {/* OTP card */}
      <GlassCard style={styles.card}>
        <Text style={[TYPE.labelCaps, styles.sectionLabel]}>VERIFICATION CODE</Text>
        <OtpInput ref={otpRef} value={otp} onChange={setOtp} />

        {/* Resend */}
        <View style={styles.resendRow}>
          {canResend
            ? (
              <TouchableOpacity onPress={handleResend} disabled={resending}>
                {resending
                  ? <ActivityIndicator color={COLORS.primaryLight} size="small" />
                  : <Text style={styles.resendLink}>Resend OTP</Text>
                }
              </TouchableOpacity>
            )
            : (
              <Text style={styles.timerText}>Resend in <Text style={styles.timerNum}>{timer}s</Text></Text>
            )
          }
        </View>
      </GlassCard>

      {/* Password card */}
      <GlassCard style={styles.card}>
        <AuthField
          label="NEW PASSWORD"
          value={newPw}
          onChangeText={setNewPw}
          placeholder="Min. 8 characters"
          secureTextEntry={!showNew}
          autoCapitalize="none"
          rightAccessory={(
            <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
              <Ionicons name={showNew ? 'eye-off' : 'eye'} size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        />

        {newPw.length > 0 && (
          <View style={styles.strengthWrap}>
            <View style={styles.strengthBar}>
              {[1, 2, 3, 4].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.strengthSeg,
                    { backgroundColor: i <= strength ? STRENGTH_COLORS[strength] : COLORS.surface3 },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.strengthLabel, { color: STRENGTH_COLORS[strength] }]}>
              {STRENGTH_LABELS[strength]}
            </Text>
          </View>
        )}

        <AuthField
          label="CONFIRM NEW PASSWORD"
          containerStyle={styles.confirmField}
          value={confirmPw}
          onChangeText={setConfirmPw}
          placeholder="Re-enter password"
          secureTextEntry={!showCon}
          autoCapitalize="none"
          rightAccessory={(
            <TouchableOpacity onPress={() => setShowCon(!showCon)} style={styles.eyeBtn}>
              <Ionicons name={showCon ? 'eye-off' : 'eye'} size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        />
        {confirmPw.length > 0 && newPw !== confirmPw && (
          <Text style={styles.errorText}>Passwords do not match</Text>
        )}

        <HoloButton
          label="RESET & SECURE"
          icon="checkmark"
          onPress={handleReset}
          loading={loading}
          disabled={!canSubmit}
          style={styles.cta}
        />
      </GlassCard>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 24,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.glass,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },

  titleBlock: { marginBottom: 24 },
  title: { marginBottom: 10 },
  subtitle: {},

  card: { marginBottom: 16 },
  sectionLabel: { color: COLORS.textSecondary, marginBottom: 16 },

  resendRow: { alignItems: 'center', marginTop: 18 },
  timerText: { ...TYPE.bodySm, color: COLORS.textMuted },
  timerNum: { color: COLORS.textSecondary, fontWeight: '700' },
  resendLink: { ...TYPE.bodySm, color: COLORS.primaryLight, fontWeight: '700' },

  eyeBtn: { paddingLeft: 8 },
  confirmField: { marginTop: 20 },

  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  strengthBar: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthSeg: { flex: 1, height: 3, borderRadius: 99 },
  strengthLabel: { ...TYPE.bodySm, fontWeight: '700', minWidth: 40, textAlign: 'right' },

  errorText: { ...TYPE.bodySm, color: COLORS.error, marginTop: 8 },

  cta: { marginTop: 20 },
});
