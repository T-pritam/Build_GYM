import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, Linking, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../constants/colors';
import { FCM_TOKEN_KEY, saveFCMToken } from '../../services/notificationService';
import { sendOTP, passwordLogin } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { CommonActions } from '@react-navigation/native';

export default function LoginScreen({ navigation }) {
  const [tab,        setTab]        = useState('otp');   // 'otp' | 'password'
  // OTP tab
  const [mobile,     setMobile]     = useState('');
  const [otpFocused, setOtpFocused] = useState(false);
  // Password tab
  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [pwFocused,  setPwFocused]  = useState(false);
  const [idFocused,  setIdFocused]  = useState(false);

  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);

  // ── OTP tab ───────────────────────────────────────────────────────────────

  const handleGetOTP = async () => {
    if (mobile.length < 10 || loading) return;
    const fullPhone = `+91${mobile}`;
    setLoading(true);
    try {
      const fcmToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      if (fcmToken) await saveFCMToken(fcmToken, fullPhone);
      await sendOTP(fullPhone, 'member');
      navigation.navigate('OTP', { phone: fullPhone });
    } catch (error) {
      if (error.response?.status === 404) {
        Alert.alert('Not Registered', 'This number is not registered. Please contact your admin.');
      } else if (error.response?.status === 403) {
        Alert.alert('Staff Account Detected', 'Please use the BuildGym Staff app to sign in.');
      } else {
        Alert.alert('Error', 'Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Password tab ──────────────────────────────────────────────────────────

  const handlePasswordLogin = async () => {
    if (!identifier.trim() || !password || loading) return;
    setLoading(true);
    try {
      const raw = identifier.includes('@')
        ? identifier.trim().toLowerCase()
        : (identifier.trim().startsWith('+91') ? identifier.trim() : `+91${identifier.trim()}`);

      const { accessToken, refreshToken, user } = await passwordLogin(raw, password);

      if (user.role !== 'member') {
        Alert.alert('Access Denied', 'This app is for members only. Please use the BuildGym Staff app.');
        return;
      }

      const userWithPhone = user?.phone ? user : { ...user, phone: raw };
      await setAuth(userWithPhone, accessToken, refreshToken);

      // Associate FCM token (best-effort)
      AsyncStorage.getItem(FCM_TOKEN_KEY).then((token) => {
        if (!token) return;
        saveFCMToken(token, null, user.id).catch(() => {});
        import('../../services/cafeFcmService')
          .then((m) => m.registerCafeFcmToken(token, { phone: user.phone, userId: user.id }))
          .catch(() => {});
      }).catch(() => {});

      if (!user.hasPassword) {
        // Shouldn't reach here (logged in via password means hasPassword must be true),
        // but guard just in case
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'SetPassword', params: { user } }] }));
      } else if (user.onboardingCompleted) {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'MainTabs' }] }));
      } else {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Onboarding', params: { mobile: user.phone } }] }));
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Invalid credentials. Please try again.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

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
              {tab === 'otp'
                ? 'Enter your registered mobile number to continue.'
                : 'Sign in with your phone/email and password.'}
            </Text>
          </View>

          {/* Tab switcher */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'otp' && styles.tabActive]}
              onPress={() => setTab('otp')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={15}
                color={tab === 'otp' ? COLORS.secondary : '#555'}
              />
              <Text style={[styles.tabText, tab === 'otp' && styles.tabTextActive]}>OTP LOGIN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'password' && styles.tabActive]}
              onPress={() => setTab('password')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="lock-closed-outline"
                size={15}
                color={tab === 'password' ? COLORS.secondary : '#555'}
              />
              <Text style={[styles.tabText, tab === 'password' && styles.tabTextActive]}>PASSWORD</Text>
            </TouchableOpacity>
          </View>

          {/* ── OTP tab card ── */}
          {tab === 'otp' && (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
              <View style={[styles.inputRow, otpFocused && styles.inputRowFocused]}>
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
                  onFocus={() => setOtpFocused(true)}
                  onBlur={() => setOtpFocused(false)}
                  returnKeyType="done"
                  onSubmitEditing={handleGetOTP}
                />
              </View>
              <Text style={styles.hint}>An OTP will be sent to this number for verification.</Text>

              <TouchableOpacity
                style={[styles.btn, (mobile.length < 10 || loading) && styles.btnDisabled]}
                onPress={handleGetOTP}
                activeOpacity={0.85}
                disabled={mobile.length < 10 || loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : (
                    <>
                      <Text style={styles.btnText}>GET OTP</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </>
                  )
                }
              </TouchableOpacity>
            </View>
          )}

          {/* ── Password tab card ── */}
          {tab === 'password' && (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>MOBILE NUMBER OR EMAIL</Text>
              <View style={[styles.inputRow, idFocused && styles.inputRowFocused]}>
                <Ionicons
                  name={identifier.includes('@') ? 'mail-outline' : 'call-outline'}
                  size={18}
                  color="#555"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Enter your email or phone"
                  placeholderTextColor="#555"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={identifier}
                  onChangeText={setIdentifier}
                  onFocus={() => setIdFocused(true)}
                  onBlur={() => setIdFocused(false)}
                  returnKeyType="next"
                />
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 20 }]}>PASSWORD</Text>
              <View style={[styles.inputRow, pwFocused && styles.inputRowFocused]}>
                <Ionicons name="lock-closed-outline" size={18} color="#555" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Enter your password"
                  placeholderTextColor="#555"
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPwFocused(true)}
                  onBlur={() => setPwFocused(false)}
                  returnKeyType="done"
                  onSubmitEditing={handlePasswordLogin}
                />
                <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                  <Ionicons name={showPw ? 'eye-off' : 'eye'} size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => navigation.navigate('ForgotPassword')}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, (!identifier.trim() || !password || loading) && styles.btnDisabled]}
                onPress={handlePasswordLogin}
                activeOpacity={0.85}
                disabled={!identifier.trim() || !password || loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : (
                    <>
                      <Text style={styles.btnText}>LOGIN</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </>
                  )
                }
              </TouchableOpacity>
            </View>
          )}

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
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 56, paddingBottom: 28 },
  logoBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  logoLetter: { fontSize: 20, fontWeight: '900', color: '#fff' },
  logoLabel: { fontSize: 13, fontWeight: '800', color: '#fff', letterSpacing: 3 },

  titleBlock: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 8, lineHeight: 40 },
  subtitle: { fontSize: 15, color: '#888', lineHeight: 22 },

  // Tab switcher
  tabs: {
    flexDirection: 'row', backgroundColor: '#1C1C1E', borderRadius: 12,
    borderWidth: 1, borderColor: '#333', padding: 4, marginBottom: 20,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 9,
  },
  tabActive: { backgroundColor: 'rgba(233,99,22,0.12)' },
  tabText: { fontSize: 11, fontWeight: '800', color: '#555', letterSpacing: 1.5 },
  tabTextActive: { color: COLORS.secondary },

  card: {
    backgroundColor: '#1C1C1E', borderRadius: 18, borderWidth: 1,
    borderColor: '#333', padding: 24, marginBottom: 20,
  },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: COLORS.secondary, letterSpacing: 2, marginBottom: 14 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 14, height: 56,
    borderWidth: 1, borderColor: '#333',
  },
  inputRowFocused: { borderColor: COLORS.secondary + '80' },
  countryCode: { paddingHorizontal: 16, fontSize: 15, fontWeight: '600', color: '#ccc' },
  inputDivider: { width: 1, height: 24, backgroundColor: '#333' },
  input: { flex: 1, paddingHorizontal: 16, fontSize: 15, color: '#fff', height: '100%' },
  // For rows that have a left icon — icon provides left spacing, TextInput skips its own paddingLeft
  inputIcon: { marginLeft: 14, marginRight: 10 },
  inputWithIcon: { flex: 1, paddingLeft: 0, paddingRight: 16, fontSize: 15, color: '#fff', height: '100%' },
  eyeBtn: { paddingRight: 14 },
  hint: { fontSize: 11, color: '#555', marginTop: 10, marginBottom: 24, lineHeight: 16 },

  forgotBtn: { alignSelf: 'flex-end', marginTop: 12, marginBottom: 20 },
  forgotText: { fontSize: 13, color: COLORS.secondary, fontWeight: '600' },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.secondary, borderRadius: 14, height: 54, gap: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 2 },

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
