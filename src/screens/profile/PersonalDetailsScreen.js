import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import SafeBottomBar from '../../components/SafeBottomBar';
import { useAuthStore } from '../../store/authStore';
import {
  fetchMyProfile, updatePersonalDetails,
  requestEmailChange, verifyEmailChange,
  setPassword, changePassword,
} from '../../services/customerProfileService';
import { isAtLeast16 } from '../../utils/ageValidator';
import { passwordStrength, STRENGTH_COLORS, STRENGTH_LABELS } from '../../utils/passwordUtils';

function Field({ label, required, children }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>
        {label}{required ? <Text style={s.req}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

function SectionHeader({ label }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionHeaderText}>{label}</Text>
      <View style={s.sectionHeaderLine} />
    </View>
  );
}

export default function PersonalDetailsScreen({ navigation }) {
  const user       = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  // ── profile form ──────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [dob,       setDob]       = useState('');
  const [original,  setOriginal]  = useState(null);
  const [dobError,  setDobError]  = useState('');
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  // ── email change state ────────────────────────────────────────────────────
  const [emailChangeMode, setEmailChangeMode] = useState(false); // show OTP section
  const [emailOtp,        setEmailOtp]        = useState(['', '', '', '', '', '']);
  const [emailOtpRefs]    = useState(() => Array(6).fill(null).map(() => React.createRef()));
  const [emailOtpSending, setEmailOtpSending] = useState(false);
  const [emailOtpVerifying, setEmailOtpVerifying] = useState(false);
  const [emailOtpError,   setEmailOtpError]   = useState('');

  // ── password change ───────────────────────────────────────────────────────
  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [showCurPw,  setShowCurPw]  = useState(false);
  const [showNewPw,  setShowNewPw]  = useState(false);
  const [showConPw,  setShowConPw]  = useState(false);
  const [savingPw,   setSavingPw]   = useState(false);

  const hasPassword   = user?.hasPassword ?? false;
  const pwStrength    = passwordStrength(newPw);
  const isPwDirty     = (hasPassword ? currentPw.length > 0 : false) || newPw.length > 0 || confirmPw.length > 0;

  // ── load profile on mount ─────────────────────────────────────────────────
  useEffect(() => {
    fetchMyProfile()
      .then((data) => {
        const fn = data.firstName || user?.firstName || '';
        const ln = data.lastName  || user?.lastName  || '';
        const em = data.email     || user?.email     || '';
        const db = data.dob       || '';
        setFirstName(fn); setLastName(ln); setEmail(em); setDob(db);
        setOriginal({ firstName: fn, lastName: ln, email: em, dob: db });
      })
      .catch(() => {
        const fn = user?.firstName || '';
        const ln = user?.lastName  || '';
        const em = user?.email     || '';
        setFirstName(fn); setLastName(ln); setEmail(em);
        setOriginal({ firstName: fn, lastName: ln, email: em, dob: '' });
      })
      .finally(() => setLoading(false));
  }, []);

  // ── dirty detection ───────────────────────────────────────────────────────
  const isProfileDirty = original
    ? firstName !== original.firstName ||
      lastName  !== original.lastName  ||
      dob       !== original.dob
    : false;
  const isDirty = isProfileDirty;

  // ── save personal details (name + dob only — email handled separately) ────
  const handleSave = useCallback(async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Required', 'First and last name cannot be empty.');
      return;
    }
    if (!dob.trim()) { setDobError('Date of birth is required.'); return; }
    if (!isAtLeast16(dob.trim())) { setDobError('You must be at least 16 years old.'); return; }

    setSaving(true);
    try {
      const payload = { firstName: firstName.trim(), lastName: lastName.trim(), dob: dob.trim() };
      const updated = await updatePersonalDetails(payload);

      if (updateUser) {
        await updateUser({
          firstName: updated?.firstName ?? payload.firstName,
          lastName:  updated?.lastName  ?? payload.lastName,
          fullName:  updated?.fullName  ?? `${payload.firstName} ${payload.lastName}`,
        });
      }
      setOriginal((o) => ({ ...o, firstName: firstName.trim(), lastName: lastName.trim(), dob: dob.trim() }));
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [firstName, lastName, dob]);

  // ── email change: send OTP ────────────────────────────────────────────────
  const handleRequestEmailChange = async () => {
    const newEmail = email.trim().toLowerCase();
    if (!newEmail.includes('@')) { Alert.alert('Invalid', 'Enter a valid email address.'); return; }
    if (newEmail === (original?.email || '').toLowerCase()) {
      Alert.alert('No Change', 'This is already your current email.');
      return;
    }
    setEmailOtpSending(true);
    setEmailOtpError('');
    try {
      await requestEmailChange(newEmail);
      setEmailChangeMode(true);
      setEmailOtp(['', '', '', '', '', '']);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to send verification email.');
    } finally {
      setEmailOtpSending(false);
    }
  };

  const handleEmailOtpChange = (text, idx) => {
    const next = [...emailOtp];
    next[idx] = text.slice(-1);
    setEmailOtp(next);
    if (text && idx < 5) emailOtpRefs[idx + 1]?.current?.focus();
  };

  const handleEmailOtpKey = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !emailOtp[idx] && idx > 0) {
      emailOtpRefs[idx - 1]?.current?.focus();
    }
  };

  const handleVerifyEmailChange = async () => {
    const code = emailOtp.join('');
    if (code.length < 6) return;
    setEmailOtpVerifying(true);
    setEmailOtpError('');
    try {
      const result = await verifyEmailChange(code);
      const newEmail = result?.data?.email || email.trim().toLowerCase();
      if (updateUser) await updateUser({ email: newEmail });
      setOriginal((o) => ({ ...o, email: newEmail }));
      setEmailChangeMode(false);
      Alert.alert('Success', 'Email updated successfully.');
    } catch (err) {
      setEmailOtpError(err?.response?.data?.message || 'Invalid or expired code.');
    } finally {
      setEmailOtpVerifying(false);
    }
  };

  // ── password change ───────────────────────────────────────────────────────
  const handlePasswordChange = async () => {
    if (newPw.length < 8) { Alert.alert('Too Short', 'Password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { Alert.alert('Mismatch', 'Passwords do not match.'); return; }
    if (hasPassword && !currentPw) { Alert.alert('Required', 'Enter your current password.'); return; }

    setSavingPw(true);
    try {
      if (hasPassword) {
        await changePassword(currentPw, newPw, confirmPw);
      } else {
        await setPassword(newPw, confirmPw);
      }
      if (updateUser) await updateUser({ hasPassword: true });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      Alert.alert('Success', 'Password updated successfully.');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not update password.');
    } finally {
      setSavingPw(false);
    }
  };

  const initials = (user?.firstName?.[0] || user?.fullName?.[0] || 'A').toUpperCase();

  if (loading) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={COLORS.secondary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>PROFILE</Text>
        <View style={s.avatarSmall}>
          <Text style={s.avatarSmallText}>{initials}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, isDirty && { paddingBottom: 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.titleRow}>
          <Text style={s.pageTitle}>Personal Details</Text>
          <View style={s.titleAccent} />
        </View>

        {/* ── Personal Info ── */}
        <Field label="FIRST NAME" required>
          <TextInput
            style={s.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="next"
          />
        </Field>

        <Field label="LAST NAME" required>
          <TextInput
            style={s.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="next"
          />
        </Field>

        {/* ── Email field + inline change flow ── */}
        <Field label="EMAIL ADDRESS" required>
          <View style={s.emailRow}>
            <TextInput
              style={[s.input, s.emailInput]}
              value={email}
              onChangeText={(v) => { setEmail(v); setEmailChangeMode(false); }}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              editable={!emailChangeMode}
            />
            {email.trim().toLowerCase() !== (original?.email || '').toLowerCase() && email.includes('@') && !emailChangeMode && (
              <TouchableOpacity
                style={[s.verifyBtn, emailOtpSending && { opacity: 0.6 }]}
                onPress={handleRequestEmailChange}
                disabled={emailOtpSending}
              >
                {emailOtpSending
                  ? <ActivityIndicator size="small" color={COLORS.secondary} />
                  : <Text style={s.verifyBtnText}>Verify</Text>
                }
              </TouchableOpacity>
            )}
          </View>

          {/* OTP entry section for email change */}
          {emailChangeMode && (
            <View style={s.emailOtpCard}>
              <View style={s.emailOtpHeader}>
                <Ionicons name="mail-outline" size={16} color={COLORS.secondary} />
                <Text style={s.emailOtpTitle}>Enter verification code sent to {email.trim()}</Text>
              </View>
              <View style={s.otpRow}>
                {emailOtp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={emailOtpRefs[i]}
                    style={[s.otpBox, digit && s.otpBoxFilled]}
                    value={digit}
                    onChangeText={(t) => handleEmailOtpChange(t, i)}
                    onKeyPress={(e) => handleEmailOtpKey(e, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                    selectTextOnFocus
                  />
                ))}
              </View>
              {emailOtpError ? <Text style={s.fieldError}>{emailOtpError}</Text> : null}
              <View style={s.emailOtpActions}>
                <TouchableOpacity onPress={() => { setEmailChangeMode(false); setEmail(original?.email || ''); }}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.confirmBtn, (emailOtp.join('').length < 6 || emailOtpVerifying) && { opacity: 0.5 }]}
                  onPress={handleVerifyEmailChange}
                  disabled={emailOtp.join('').length < 6 || emailOtpVerifying}
                >
                  {emailOtpVerifying
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={s.confirmBtnText}>VERIFY & SAVE</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Field>

        <Field label="DATE OF BIRTH" required>
          <View style={s.inputWrap}>
            <TextInput
              style={[s.input, s.inputWithIcon, dobError ? { borderColor: '#EF4444' } : null]}
              value={dob}
              onChangeText={(v) => { setDob(v); setDobError(''); }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              returnKeyType="done"
            />
            <Ionicons name="calendar-outline" size={20} color={COLORS.textMuted} style={s.inputIcon} />
          </View>
          {dobError ? <Text style={s.fieldError}>{dobError}</Text> : null}
        </Field>

        <Field label="PHONE NUMBER">
          <View style={[s.input, s.lockedRow]}>
            <Text style={s.lockedText}>{user?.phone || ''}</Text>
            <Ionicons name="lock-closed" size={16} color={COLORS.textMuted} />
          </View>
        </Field>

        {/* ── Security / Password section ── */}
        <SectionHeader label="SECURITY" />

        <View style={s.pwCard}>
          <Text style={s.pwCardTitle}>
            {hasPassword ? 'Change Password' : 'Set Password'}
          </Text>
          <Text style={s.pwCardSub}>
            {hasPassword
              ? 'Update your login password.'
              : 'Add a password so you can log in without OTP.'}
          </Text>

          {hasPassword && (
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>CURRENT PASSWORD</Text>
              <View style={s.pwInputRow}>
                <TextInput
                  style={s.pwInput}
                  value={currentPw}
                  onChangeText={setCurrentPw}
                  placeholder="Enter current password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showCurPw}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowCurPw(!showCurPw)} style={s.eyeBtn}>
                  <Ionicons name={showCurPw ? 'eye-off' : 'eye'} size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>NEW PASSWORD</Text>
            <View style={s.pwInputRow}>
              <TextInput
                style={s.pwInput}
                value={newPw}
                onChangeText={setNewPw}
                placeholder="Min. 8 characters"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showNewPw}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowNewPw(!showNewPw)} style={s.eyeBtn}>
                <Ionicons name={showNewPw ? 'eye-off' : 'eye'} size={20} color="#666" />
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
                        { backgroundColor: i <= pwStrength ? STRENGTH_COLORS[pwStrength] : '#2A2A2A' },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[s.strengthLabel, { color: STRENGTH_COLORS[pwStrength] }]}>
                  {STRENGTH_LABELS[pwStrength]}
                </Text>
              </View>
            )}
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>CONFIRM NEW PASSWORD</Text>
            <View style={s.pwInputRow}>
              <TextInput
                style={s.pwInput}
                value={confirmPw}
                onChangeText={setConfirmPw}
                placeholder="Re-enter new password"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showConPw}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConPw(!showConPw)} style={s.eyeBtn}>
                <Ionicons name={showConPw ? 'eye-off' : 'eye'} size={20} color="#666" />
              </TouchableOpacity>
            </View>
            {confirmPw.length > 0 && newPw !== confirmPw && (
              <Text style={s.fieldError}>Passwords do not match</Text>
            )}
          </View>

          <TouchableOpacity
            style={[s.pwSaveBtn, (!isPwDirty || savingPw) && s.pwSaveBtnDisabled]}
            onPress={handlePasswordChange}
            disabled={!isPwDirty || savingPw}
            activeOpacity={0.85}
          >
            {savingPw
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.pwSaveBtnText}>UPDATE PASSWORD</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>

      {isDirty && (
        <SafeBottomBar style={s.stickyFooter}>
          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#000" />
              : <Text style={s.saveBtnText}>SAVE CHANGES</Text>
            }
          </TouchableOpacity>
        </SafeBottomBar>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.95)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 14, fontWeight: '800', color: COLORS.secondary, letterSpacing: 4 },
  avatarSmall: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarSmallText: { fontSize: 16, fontWeight: '900', color: '#fff' },

  scroll: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40 },

  titleRow: { marginBottom: 28 },
  pageTitle: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  titleAccent: { width: 40, height: 3, backgroundColor: COLORS.secondary, borderRadius: 99, marginTop: 8 },

  fieldWrap: { marginBottom: 20 },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: COLORS.secondary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  req: { color: '#EF4444' },
  fieldError: { fontSize: 11, color: '#EF4444', marginTop: 6 },
  input: {
    backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 14, color: '#fff', fontWeight: '500',
  },
  inputWrap: { position: 'relative' },
  inputWithIcon: { paddingRight: 48 },
  inputIcon: { position: 'absolute', right: 14, top: '50%', marginTop: -10 },

  lockedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: 0.5 },
  lockedText: { fontSize: 14, color: COLORS.textMuted },

  // Email change
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emailInput: { flex: 1 },
  verifyBtn: {
    backgroundColor: 'rgba(233,99,22,0.12)', borderWidth: 1, borderColor: 'rgba(233,99,22,0.3)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
  },
  verifyBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.secondary },

  emailOtpCard: {
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(233,99,22,0.2)',
    borderRadius: 12, padding: 16, marginTop: 12,
  },
  emailOtpHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 16 },
  emailOtpTitle: { flex: 1, fontSize: 12, color: '#aaa', lineHeight: 18 },
  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 8 },
  otpBox: {
    width: 42, height: 52, borderRadius: 10, textAlign: 'center',
    fontSize: 20, fontWeight: '800', color: '#fff',
    backgroundColor: '#111', borderWidth: 1.5, borderColor: '#333',
  },
  otpBoxFilled: { borderColor: COLORS.secondary },
  emailOtpActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  cancelText: { fontSize: 13, color: '#666', fontWeight: '600' },
  confirmBtn: {
    backgroundColor: COLORS.secondary, borderRadius: 9,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  confirmBtnText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 16 },
  sectionHeaderText: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 2 },
  sectionHeaderLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },

  // Password card
  pwCard: {
    backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16, padding: 20, marginBottom: 20,
  },
  pwCardTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4 },
  pwCardSub: { fontSize: 12, color: '#666', marginBottom: 20, lineHeight: 18 },

  pwInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, height: 52,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14,
  },
  pwInput: { flex: 1, fontSize: 14, color: '#fff', height: '100%' },
  eyeBtn: { padding: 4 },

  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  strengthBar: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthSeg: { flex: 1, height: 3, borderRadius: 99 },
  strengthLabel: { fontSize: 11, fontWeight: '700', minWidth: 40, textAlign: 'right' },

  pwSaveBtn: {
    backgroundColor: COLORS.secondary, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
    shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10,
    elevation: 5,
  },
  pwSaveBtnDisabled: { opacity: 0.4 },
  pwSaveBtnText: { fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 2 },

  // Sticky footer
  stickyFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.97)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  saveBtn: {
    backgroundColor: COLORS.secondary, borderRadius: 12, paddingVertical: 17,
    alignItems: 'center',
    shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14,
    elevation: 8,
  },
  saveBtnText: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 2 },
});
