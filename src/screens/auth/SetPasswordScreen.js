import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
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

      const currentUser = user ?? {};
      if (currentUser.onboardingCompleted) {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'MainTabs' }] }));
      } else {
        navigation.dispatch(CommonActions.reset({
          index: 0,
          routes: [{ name: 'Onboarding', params: { mobile: currentUser.phone } }],
        }));
      }
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not set password. Please try again.');
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
          {/* Logo */}
          <View style={s.logoRow}>
            <View style={s.logoBox}><Text style={s.logoLetter}>B</Text></View>
            <Text style={s.logoLabel}>BUILD GYM</Text>
          </View>

          {/* Title */}
          <View style={s.titleBlock}>
            <Text style={s.title}>Secure Your{'\n'}Account.</Text>
            <Text style={s.subtitle}>
              Set a password to enable quick login in the future. You can always use OTP too.
            </Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            {/* New password */}
            <Text style={s.fieldLabel}>NEW PASSWORD</Text>
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

            {/* Strength bar */}
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

            {/* Confirm password */}
            <Text style={[s.fieldLabel, { marginTop: 20 }]}>CONFIRM PASSWORD</Text>
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

            {/* Info */}
            <View style={s.infoBanner}>
              <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.secondary} />
              <Text style={s.infoText}>
                Use 8+ characters with uppercase, numbers, and symbols for a strong password.
              </Text>
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[s.btn, (!canSubmit || loading) && s.btnDisabled]}
              onPress={handleSet}
              disabled={!canSubmit || loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : (
                  <>
                    <Text style={s.btnText}>SET PASSWORD</Text>
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

  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 56, paddingBottom: 36 },
  logoBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  logoLetter: { fontSize: 20, fontWeight: '900', color: '#fff' },
  logoLabel: { fontSize: 13, fontWeight: '800', color: '#fff', letterSpacing: 3 },

  titleBlock: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 8, lineHeight: 40 },
  subtitle: { fontSize: 15, color: '#888', lineHeight: 22 },

  card: {
    backgroundColor: '#1C1C1E', borderRadius: 18, borderWidth: 1,
    borderColor: '#333', padding: 24, marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.secondary,
    letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase',
  },
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

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(233,99,22,0.08)', borderWidth: 1, borderColor: 'rgba(233,99,22,0.25)',
    borderRadius: 12, padding: 14, marginTop: 20,
  },
  infoText: { flex: 1, fontSize: 12, color: '#aaa', lineHeight: 18 },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.secondary, borderRadius: 14, height: 54, gap: 8, marginTop: 20,
    shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10,
    elevation: 6,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 2 },
});
