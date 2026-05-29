import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { forgotPasswordSend } from '../../services/authService';

export default function ForgotPasswordScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [focused,    setFocused]    = useState(false);
  const [loading,    setLoading]    = useState(false);

  const isEmail   = identifier.includes('@');
  const isPhone   = /^\d{10}$/.test(identifier.trim());
  const canSubmit = isEmail || isPhone;

  const handleSend = async () => {
    if (!canSubmit || loading) return;
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
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back + Logo */}
          <View style={s.topRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={s.logoBox}><Text style={s.logoLetter}>B</Text></View>
          </View>

          {/* Title */}
          <View style={s.titleBlock}>
            <Text style={s.title}>Forgot{'\n'}Password?</Text>
            <Text style={s.subtitle}>
              Enter your registered mobile number or email. We'll send an OTP to reset your password.
            </Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.fieldLabel}>MOBILE NUMBER OR EMAIL</Text>
            <View style={[s.inputRow, focused && s.inputRowFocused]}>
              <Ionicons
                name={isEmail ? 'mail-outline' : 'call-outline'}
                size={18}
                color="#555"
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={s.input}
                placeholder="Enter your email or phone"
                placeholderTextColor="#555"
                keyboardType="email-address"
                autoCapitalize="none"
                value={identifier}
                onChangeText={setIdentifier}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                returnKeyType="done"
                onSubmitEditing={handleSend}
              />
            </View>
            <Text style={s.hint}>
              OTP will be sent to your registered phone and email (if available).
            </Text>

            <TouchableOpacity
              style={[s.btn, (!canSubmit || loading) && s.btnDisabled]}
              onPress={handleSend}
              disabled={!canSubmit || loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : (
                  <>
                    <Text style={s.btnText}>SEND RESET OTP</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </>
                )
              }
            </TouchableOpacity>
          </View>

          {/* Info banner */}
          <View style={s.infoBanner}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.secondary} />
            <Text style={s.infoText}>
              Only registered Build Gym members can reset their password. Contact reception if you need help.
            </Text>
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

  titleBlock: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 8, lineHeight: 40 },
  subtitle: { fontSize: 15, color: '#888', lineHeight: 22 },

  card: {
    backgroundColor: '#1C1C1E', borderRadius: 18, borderWidth: 1,
    borderColor: '#333', padding: 24, marginBottom: 24,
  },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: COLORS.secondary, letterSpacing: 2, marginBottom: 14 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 14, height: 56,
    borderWidth: 1, borderColor: '#333', paddingHorizontal: 16,
  },
  inputRowFocused: { borderColor: COLORS.secondary + '80' },
  input: { flex: 1, fontSize: 15, color: '#fff', height: '100%' },
  hint: { fontSize: 11, color: '#555', marginTop: 10, marginBottom: 24, lineHeight: 16 },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.secondary, borderRadius: 14, height: 54, gap: 8,
    shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10,
    elevation: 6,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 2 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#2A1A0A', borderWidth: 1, borderColor: COLORS.secondary + '33',
    borderRadius: 14, padding: 16,
  },
  infoText: { flex: 1, fontSize: 13, color: '#aaa', lineHeight: 20 },
});
