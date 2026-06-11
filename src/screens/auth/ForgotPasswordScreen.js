import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPE } from '../../theme';
import {
  AuthBackground, BrandHeader, GlassCard, AuthField, HoloButton, InfoBanner,
} from '../../components/auth';
import { forgotPasswordSend } from '../../services/authService';

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export default function ForgotPasswordScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [loading,    setLoading]    = useState(false);

  const isEmail   = identifier.includes('@');
  const isPhone   = /^\d{10}$/.test(identifier.trim());
  const canSubmit = isEmail || isPhone;

  const handleSend = async () => {
    if (!canSubmit || loading) return;
    if (isEmail && !EMAIL_RE.test(identifier.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address (e.g. name@domain.com).');
      return;
    }
    setLoading(true);
    try {
      const raw = isPhone ? `+91${identifier.trim()}` : identifier.trim().toLowerCase();
      await forgotPasswordSend(raw);
      navigation.navigate('ResetPassword', { identifier: raw });
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      {/* Back + Logo */}
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        {/* <BrandHeader logoSize={40} /> */}
        {/* <View style={styles.backBtn} /> */}
      </View>

      {/* Title */}
      <View style={styles.titleBlock}>
        <Text style={[TYPE.headlineMd, styles.title]}>Forgot{'\n'}Password?</Text>
        <Text style={[TYPE.bodySm, styles.subtitle]}>
          Enter your registered mobile number or email. We'll send an OTP to reset your password.
        </Text>
      </View>

      {/* Card */}
      <GlassCard style={styles.card}>
        <AuthField
          label="MOBILE NUMBER OR EMAIL"
          placeholder="Enter your email or phone"
          keyboardType="email-address"
          autoCapitalize="none"
          value={identifier}
          onChangeText={setIdentifier}
          returnKeyType="done"
          onSubmitEditing={handleSend}
          leftIcon={isEmail ? 'mail-outline' : 'call-outline'}
        />
        <Text style={styles.hint}>
          OTP will be sent to your registered phone and email (if available).
        </Text>

        <HoloButton
          label="SEND RESET CODE"
          icon="arrow-forward"
          onPress={handleSend}
          loading={loading}
          disabled={!canSubmit}
        />
      </GlassCard>

      {/* Info banner */}
      <InfoBanner>
        Only registered Build Gym members can reset their password. Contact reception if you need help.
      </InfoBanner>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 28,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.glass,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },

  titleBlock: { marginBottom: 28 },
  title: { marginBottom: 10 },
  subtitle: {},

  card: { marginBottom: 24 },
  hint: { ...TYPE.bodySm, color: COLORS.textMuted, marginTop: 10, marginBottom: 4 },
});
