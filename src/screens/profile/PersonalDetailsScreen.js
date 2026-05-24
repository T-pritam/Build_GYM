import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import SafeBottomBar from '../../components/SafeBottomBar';
import { useAuthStore } from '../../store/authStore';
import { fetchMyProfile, updatePersonalDetails } from '../../services/customerProfileService';
import { isAtLeast16 } from '../../utils/ageValidator';

// ─── Password strength helper ──────────────────────────────────────────────
function passwordStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8)          score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0–4
}

const STRENGTH_COLORS = ['#EF4444', '#F59E0B', '#F59E0B', '#22C55E', '#22C55E'];

// ─── Field component ──────────────────────────────────────────────────────
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

export default function PersonalDetailsScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  // ── form state ────────────────────────────────────────────────────────────
  const [firstName,    setFirstName]    = useState('');
  const [lastName,     setLastName]     = useState('');
  const [email,        setEmail]        = useState('');
  const [dob,          setDob]          = useState('');
  // password
  const [currentPw,    setCurrentPw]    = useState('');
  const [newPw,        setNewPw]        = useState('');
  const [confirmPw,    setConfirmPw]    = useState('');
  const [showCurPw,    setShowCurPw]    = useState(false);
  const [showNewPw,    setShowNewPw]    = useState(false);
  const [showConPw,    setShowConPw]    = useState(false);

  // ── original snapshot (to detect dirty) ──────────────────────────────────
  const [original,     setOriginal]     = useState(null);
  const [dobError,     setDobError]     = useState('');
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);

  // ── load profile on mount ─────────────────────────────────────────────────
  useEffect(() => {
    fetchMyProfile()
      .then((data) => {
        const fn = data.firstName || user?.firstName || '';
        const ln = data.lastName  || user?.lastName  || '';
        const em = data.email     || user?.email     || '';
        const db = data.dob       || '';
        setFirstName(fn);
        setLastName(ln);
        setEmail(em);
        setDob(db);
        setOriginal({ firstName: fn, lastName: ln, email: em, dob: db });
      })
      .catch(() => {
        // fall back to auth store
        const fn = user?.firstName || '';
        const ln = user?.lastName  || '';
        const em = user?.email     || '';
        setFirstName(fn);
        setLastName(ln);
        setEmail(em);
        setOriginal({ firstName: fn, lastName: ln, email: em, dob: '' });
      })
      .finally(() => setLoading(false));
  }, []);

  // ── dirty detection ────────────────────────────────────────────────────────
  const isProfileDirty = original
    ? firstName !== original.firstName ||
      lastName  !== original.lastName  ||
      email     !== original.email     ||
      dob       !== original.dob
    : false;
  const isPasswordDirty = currentPw.length > 0 || newPw.length > 0 || confirmPw.length > 0;
  const isDirty = isProfileDirty || isPasswordDirty;

  // ── save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Required', 'First and last name cannot be empty.');
      return;
    }
    if (!dob.trim()) {
      setDobError('Date of birth is required.');
      return;
    }
    if (!isAtLeast16(dob.trim())) {
      setDobError('You must be at least 16 years old.');
      return;
    }
    if (isPasswordDirty) {
      if (!currentPw) {
        Alert.alert('Required', 'Enter your current password to change it.');
        return;
      }
      if (newPw.length < 6) {
        Alert.alert('Too short', 'New password must be at least 6 characters.');
        return;
      }
      if (newPw !== confirmPw) {
        Alert.alert('Mismatch', 'New password and confirmation do not match.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), dob: dob.trim() || undefined };
      const updated = await updatePersonalDetails(payload);

      // Sync auth store
      if (updateUser) {
        await updateUser({
          firstName: updated?.firstName ?? payload.firstName,
          lastName:  updated?.lastName  ?? payload.lastName,
          fullName:  updated?.fullName  ?? `${payload.firstName} ${payload.lastName}`,
          email:     updated?.email     ?? payload.email,
        });
      }
      setOriginal({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), dob: dob.trim() });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [firstName, lastName, email, dob, currentPw, newPw, confirmPw, isPasswordDirty]);

  const strength = passwordStrength(newPw);
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

      {/* Header */}
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
        {/* Page title */}
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

        <Field label="EMAIL ADDRESS" required>
          <View style={s.inputWrap}>
            <TextInput
              style={[s.input, s.inputWithIcon]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />
            {email.includes('@') && (
              <Ionicons name="checkmark-circle" size={20} color="#22C55E" style={s.inputIcon} />
            )}
          </View>
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
      </ScrollView>

      {/* Sticky save button — shown only when dirty */}
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

  // Header
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

  // Scroll
  scroll: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40 },

  // Title
  titleRow: { marginBottom: 28 },
  pageTitle: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  titleAccent: { width: 40, height: 3, backgroundColor: COLORS.secondary, borderRadius: 99, marginTop: 8 },

  // Fields
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

  // Locked phone
  lockedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: 0.5 },
  lockedText: { fontSize: 14, color: COLORS.textMuted },

  // Divider
  divider: { marginVertical: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 24 },
  dividerLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 2, textTransform: 'uppercase' },

  // Strength bar
  strengthRow: { flexDirection: 'row', gap: 4, marginTop: 8 },
  strengthSeg: { flex: 1, height: 3, borderRadius: 99 },

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
