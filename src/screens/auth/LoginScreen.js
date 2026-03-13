import React, { useState, useRef } from 'react';
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
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import axios from 'axios';
import * as Device from 'expo-device';
import { BASE_API_URL } from '@env';

export default function LoginScreen({ navigation }) {
  const [mobile, setMobile] = useState('');
  const [focused, setFocused] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  const handleGetOTP = () => {
    if (mobile.length < 10) {
      // Shake animation for error
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
      return;
    }
    const deviceId = Device.osInternalBuildId || Device.modelId || 'unknown';
    axios.post(`${BASE_API_URL}/otp/send`, { userId: `Guest`, deviceId })
    navigation.navigate('OTP', { mobile: `+91 ${mobile}` });
  };

  const handlePressIn = () => {
    Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <LinearGradient
        colors={['#0D0D0D', '#160800']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Decorative circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo area */}
          <View style={styles.logoArea}>
            <View style={styles.logoMini}>
              <Text style={styles.logoMiniText}>B</Text>
            </View>
            <Text style={styles.logoLabel}>BUILD GYM</Text>
          </View>

          {/* Hero copy */}
          <Text style={styles.headline}>Welcome{'\n'}Back.</Text>
          <Text style={styles.subtext}>
            Enter your registered mobile number to continue.
          </Text>

          {/* Input card */}
          <View style={styles.card}>
            <Text style={styles.label}>MOBILE NUMBER</Text>
            <Animated.View
              style={[
                styles.inputRow,
                focused && styles.inputRowFocused,
                { transform: [{ translateX: shakeAnim }] },
              ]}
            >
              <View style={styles.prefix}>
                <Text style={styles.prefixText}>+91</Text>
                <View style={styles.prefixDivider} />
              </View>
              <TextInput
                style={styles.input}
                value={mobile}
                onChangeText={(t) => setMobile(t.replace(/[^0-9]/g, '').slice(0, 10))}
                placeholder="Enter 10-digit"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                maxLength={10}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
              {mobile.length === 10 && (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={{ marginRight: 14 }} />
              )}
            </Animated.View>

            <Text style={styles.hintText}>
              An OTP will be sent to this number for verification.
            </Text>

            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[styles.btn, mobile.length < 10 && styles.btnDisabled]}
                onPress={handleGetOTP}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={mobile.length === 10 ? [COLORS.secondary, COLORS.secondaryDark] : ['#333', '#222']}
                  style={styles.btnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={[styles.btnText, mobile.length < 10 && styles.btnTextDisabled]}>
                    GET OTP
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={mobile.length === 10 ? COLORS.white : COLORS.textMuted}
                    style={{ marginLeft: 8 }}
                  />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Note */}
          <View style={styles.noteBox}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.secondary} />
            <Text style={styles.noteText}>
              Only registered Build Gym members can access this app.
            </Text>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            Need help? Contact{' '}
            <Text style={styles.footerLink}>reception@buildgym.in</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  circle1: {
    position: 'absolute', width: 350, height: 350, borderRadius: 175,
    backgroundColor: 'rgba(255,107,0,0.05)', top: -100, right: -80,
  },
  circle2: {
    position: 'absolute', width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(255,107,0,0.03)', bottom: 60, left: -60,
  },

  // Logo
  logoArea: { flexDirection: 'row', alignItems: 'center', marginBottom: 48 },
  logoMini: {
    width: 38, height: 38, borderRadius: 8, backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  logoMiniText: { fontSize: 20, fontWeight: '900', color: COLORS.white },
  logoLabel: { fontSize: 16, fontWeight: '800', color: COLORS.white, letterSpacing: 4 },

  // Hero
  headline: {
    fontSize: 48, fontWeight: '900', color: COLORS.white,
    lineHeight: 52, marginBottom: 12,
  },
  subtext: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 40 },

  // Card
  card: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: COLORS.border, marginBottom: 24,
  },
  label: {
    fontSize: 10, fontWeight: '700', color: COLORS.secondary,
    letterSpacing: 2, marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12,
    overflow: 'hidden',
  },
  inputRowFocused: { borderColor: COLORS.secondary },
  prefix: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 16,
  },
  prefixText: { fontSize: 16, color: COLORS.white, fontWeight: '600' },
  prefixDivider: { width: 1, height: 20, backgroundColor: COLORS.border, marginLeft: 12 },
  input: {
    flex: 1, fontSize: 18, color: COLORS.white, fontWeight: '600',
    paddingHorizontal: 12, paddingVertical: 16, letterSpacing: 2,
  },
  hintText: { fontSize: 12, color: COLORS.textMuted, marginBottom: 20 },

  // Button
  btn: { borderRadius: 14, overflow: 'hidden' },
  btnDisabled: { opacity: 0.6 },
  btnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16,
  },
  btnText: { fontSize: 15, fontWeight: '800', color: COLORS.white, letterSpacing: 2 },
  btnTextDisabled: { color: COLORS.textMuted },

  // Note
  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.secondaryGlow,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.secondaryBorder,
    padding: 14, marginBottom: 24, gap: 8,
  },
  noteText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  // Footer
  footer: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  footerLink: { color: COLORS.secondary, fontWeight: '600' },
});
