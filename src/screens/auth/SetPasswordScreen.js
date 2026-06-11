import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPE } from '../../theme';
import {
  AuthBackground, BrandHeader, GlassCard, AuthField, HoloButton, InfoBanner,
} from '../../components/auth';
import { passwordStrength, STRENGTH_COLORS, STRENGTH_LABELS } from '../../utils/passwordUtils';
import { setPassword } from '../../services/customerProfileService';
import { useAuthStore } from '../../store/authStore';
import { CommonActions } from '@react-navigation/native';

export default function SetPasswordScreen({ navigation, route }) {
  const { user } = route?.params || {};
  const updateUser = useAuthStore((s) => s.updateUser);

  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNew,   setShowNew]   = useState(false);
  const [showCon,   setShowCon]   = useState(false);
  const [loading,   setLoading]   = useState(false);

  const strength = passwordStrength(newPw);
  const canSubmit = newPw.length >= 8 && confirmPw.length >= 8;

  // Move past this screen: onboard first if not yet done, otherwise straight to home.
  const goNext = () => {
    const currentUser = user ?? {};
    if (currentUser.onboardingCompleted) {
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'MainTabs' }] }));
    } else {
      navigation.dispatch(CommonActions.reset({
        index: 0,
        routes: [{ name: 'Onboarding', params: { mobile: currentUser.phone } }],
      }));
    }
  };

  const handleSkip = () => {
    if (loading) return;
    goNext();
  };

  const handleSet = async () => {
    if (newPw.length < 8) {
      Alert.alert('Too Short', 'Password must be at least 8 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await setPassword(newPw, confirmPw);
      await updateUser({ hasPassword: true });
      goNext();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not set password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      {/* Logo */}
      <BrandHeader logoSize={48} style={styles.brand} />

      {/* Title */}
      <View style={styles.titleBlock}>
        <Text style={[TYPE.headlineMd, styles.title]}>Secure Your{'\n'}Account.</Text>
        <Text style={[TYPE.bodySm, styles.subtitle]}>
          Set a password to enable quick login in the future. You can always use OTP too.
        </Text>
      </View>

      {/* Card */}
      <GlassCard style={styles.card}>
        {/* New password */}
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

        {/* Strength bar */}
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

        {/* Confirm password */}
        <AuthField
          label="CONFIRM PASSWORD"
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

        {/* Info */}
        <InfoBanner icon="shield-checkmark-outline" style={styles.infoBanner}>
          Use 8+ characters with uppercase, numbers, and symbols for a strong password.
        </InfoBanner>

        {/* CTA */}
        <HoloButton
          label="SECURE MY ACCOUNT"
          icon="checkmark"
          onPress={handleSet}
          loading={loading}
          disabled={!canSubmit}
          style={styles.cta}
        />

        {/* Skip — continue without setting a password */}
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={handleSkip}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </GlassCard>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  brand: { paddingTop: 56, marginBottom: 32 },

  titleBlock: { marginBottom: 28 },
  title: { marginBottom: 10 },
  subtitle: {},

  card: { marginBottom: 24 },
  eyeBtn: { paddingLeft: 8 },
  confirmField: { marginTop: 20 },

  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  strengthBar: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthSeg: { flex: 1, height: 3, borderRadius: 99 },
  strengthLabel: { ...TYPE.bodySm, fontWeight: '700', minWidth: 40, textAlign: 'right' },

  errorText: { ...TYPE.bodySm, color: COLORS.error, marginTop: 8 },

  infoBanner: { marginTop: 20 },
  cta: { marginTop: 20 },

  skipBtn: { alignItems: 'center', justifyContent: 'center', height: 44, marginTop: 12 },
  skipText: { ...TYPE.bodySm, color: COLORS.textMuted, fontWeight: '700' },
});
