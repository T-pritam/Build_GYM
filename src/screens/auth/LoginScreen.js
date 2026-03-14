import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, Linking, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function LoginScreen({ navigation }) {
  const [mobile, setMobile] = useState('');
  const [focused, setFocused] = useState(false);

  const handleGetOTP = () => {
    if (mobile.length < 10) return;
    navigation.navigate('OTP', { mobile: `+91 ${mobile}` });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.glowTop} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.logoLetter}>B</Text>
            </View>
            <Text style={styles.logoLabel}>BUILD GYM</Text>
          </View>

          {/* Title */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Welcome Back.</Text>
            <Text style={styles.subtitle}>
              Enter your registered mobile number to continue.
            </Text>
          </View>

          {/* Input card */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
            <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
              <Text style={styles.countryCode}>+91</Text>
              <View style={styles.inputDivider} />
              <TextInput
                style={styles.input}
                placeholder="Enter 10-digit"
                placeholderTextColor="#555"
                keyboardType="number-pad"
                maxLength={10}
                value={mobile}
                onChangeText={setMobile}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                returnKeyType="done"
                onSubmitEditing={handleGetOTP}
              />
            </View>
            <Text style={styles.hint}>
              An OTP will be sent to this number for verification.
            </Text>

            <TouchableOpacity
              style={[styles.otpBtn, mobile.length < 10 && styles.otpBtnDisabled]}
              onPress={handleGetOTP}
              activeOpacity={0.85}
            >
              <Text style={styles.otpBtnText}>GET OTP</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.secondary} />
            <Text style={styles.infoText}>
              <Text style={styles.infoTextBold}>Only registered Build Gym members</Text>
              {' '}can access this app.
            </Text>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            Need help?{' '}
            <Text
              style={styles.footerLink}
              onPress={() => Linking.openURL('mailto:reception@buildgym.in')}
            >
              reception@buildgym.in
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  glowTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 400,
    backgroundColor: 'transparent',
    background: 'radial-gradient(circle at top, rgba(233,99,22,0.15) 0%, transparent 70%)',
    // Fake glow via a View gradient approach
  },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 56, paddingBottom: 36 },
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
    letterSpacing: 2, marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 14, height: 56,
    borderWidth: 1, borderColor: '#333',
  },
  inputRowFocused: { borderColor: COLORS.secondary + '80' },
  countryCode: { paddingHorizontal: 16, fontSize: 15, fontWeight: '600', color: '#ccc' },
  inputDivider: { width: 1, height: 24, backgroundColor: '#333' },
  input: {
    flex: 1, paddingHorizontal: 16, fontSize: 16, color: '#fff', height: '100%',
  },
  hint: { fontSize: 11, color: '#555', marginTop: 10, marginBottom: 24, lineHeight: 16 },

  otpBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.secondary, borderRadius: 14, height: 54, gap: 8,
  },
  otpBtnDisabled: { opacity: 0.5 },
  otpBtnText: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 2 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#2A1A0A', borderWidth: 1, borderColor: COLORS.secondary + '33',
    borderRadius: 14, padding: 16, marginBottom: 28,
  },
  infoText: { flex: 1, fontSize: 13, color: '#aaa', lineHeight: 20 },
  infoTextBold: { color: '#fff', fontWeight: '600' },

  footer: { textAlign: 'center', fontSize: 13, color: '#555' },
  footerLink: { color: COLORS.secondary, fontWeight: '600' },
});
