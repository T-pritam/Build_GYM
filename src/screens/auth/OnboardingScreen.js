import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const STEPS_CONFIG = [
  { title: 'Personal Info', icon: 'person-outline' },
  { title: 'Health Details', icon: 'fitness-outline' },
  { title: 'Emergency', icon: 'heart-outline' },
  { title: 'Declaration', icon: 'document-text-outline' },
];

export default function OnboardingScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    dob: '',
    healthHistory: '',
    injuryHistory: '',
    emergencyName: '',
    emergencyPhone: '',
    declarationAccepted: false,
  });
  const next = () => {
    if (step < STEPS_CONFIG.length - 1) {
      setStep((s) => s + 1);
    } else {
      navigation.replace('MainTabs');
    }
  };

  const back = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const renderField = (label, key, placeholder, opts = {}) => (
    <View style={styles.fieldGroup} key={key}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, opts.multiline && styles.fieldInputMulti]}
        value={form[key]}
        onChangeText={(t) => update(key, t)}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        multiline={opts.multiline}
        numberOfLines={opts.multiline ? 3 : 1}
        keyboardType={opts.keyboardType || 'default'}
        {...opts}
      />
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View>
            <Text style={styles.stepTitle}>Personal Information</Text>
            <Text style={styles.stepSub}>Tell us about yourself.</Text>
            {renderField('Full Name *', 'fullName', 'e.g. Arjun Sharma')}
            {renderField('Email Address', 'email', 'e.g. arjun@email.com', { keyboardType: 'email-address' })}
            {renderField('Date of Birth', 'dob', 'DD / MM / YYYY')}
          </View>
        );
      case 1:
        return (
          <View>
            <Text style={styles.stepTitle}>Health Details</Text>
            <Text style={styles.stepSub}>This helps trainers guide you safely.</Text>
            {renderField(
              'Health History',
              'healthHistory',
              'e.g. Diabetes, BP, Asthma – or "None"',
              { multiline: true }
            )}
            {renderField(
              'Injury History',
              'injuryHistory',
              'e.g. Right knee sprain 2022 – or "None"',
              { multiline: true }
            )}
            <View style={styles.infoBox}>
              <Ionicons name="lock-closed-outline" size={14} color={COLORS.secondary} />
              <Text style={styles.infoText}>
                Your health data is stored securely and only shared with your assigned trainer.
              </Text>
            </View>
          </View>
        );
      case 2:
        return (
          <View>
            <Text style={styles.stepTitle}>Emergency Contact</Text>
            <Text style={styles.stepSub}>Optional, but recommended for your safety.</Text>
            {renderField('Contact Name', 'emergencyName', 'e.g. Priya Sharma')}
            {renderField('Contact Number', 'emergencyPhone', 'e.g. +91 91234 56789', { keyboardType: 'phone-pad' })}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={14} color={COLORS.secondary} />
              <Text style={styles.infoText}>
                This is only used in case of a medical emergency at the gym.
              </Text>
            </View>
          </View>
        );
      case 3:
        return (
          <View>
            <Text style={styles.stepTitle}>Declaration & Consent</Text>
            <Text style={styles.stepSub}>Please read and accept before proceeding.</Text>
            <View style={styles.declarationBox}>
              <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.declarationText}>
                  I, the undersigned, hereby declare that:
                  {'\n\n'}• I am voluntarily joining and using the facilities at Build Gym.
                  {'\n'}• I acknowledge that physical exercise involves inherent risks.
                  {'\n'}• I have disclosed all known medical conditions, injuries, and health history.
                  {'\n'}• I agree to follow all gym rules and safety guidelines.
                  {'\n'}• I consent to my health data being stored securely and shared only with my assigned trainer.
                  {'\n'}• I understand that Build Gym staff may act in my interest in case of a medical emergency.
                  {'\n\n'}Build Gym management reserves the right to suspend access for any breach of conduct.
                </Text>
              </ScrollView>
            </View>
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => update('declarationAccepted', !form.declarationAccepted)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, form.declarationAccepted && styles.checkboxChecked]}>
                {form.declarationAccepted && (
                  <Ionicons name="checkmark" size={14} color={COLORS.white} />
                )}
              </View>
              <Text style={styles.checkLabel}>
                I have read and accept the terms of this declaration.
              </Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  const canProceed = () => {
    if (step === 0) return form.fullName.trim().length > 0;
    if (step === 3) return form.declarationAccepted;
    return true;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={back} disabled={step === 0}>
            <Ionicons
              name="arrow-back"
              size={20}
              color={step === 0 ? COLORS.textDim : COLORS.white}
            />
          </TouchableOpacity>

          <View style={styles.stepLabelWrap}>
            <Text style={styles.stepLabelMain}>{STEPS_CONFIG[step].title}</Text>
            <Text style={styles.stepLabelSub}>Step {step + 1} of {STEPS_CONFIG.length}</Text>
          </View>

          {/* Checkmark icon for current step */}
          <View style={styles.stepIconBox}>
            <Ionicons name={STEPS_CONFIG[step].icon} size={18} color={COLORS.secondary} />
          </View>
        </View>

        {/* Segmented progress bar */}
        <View style={styles.segmentRow}>
          {STEPS_CONFIG.map((_, i) => (
            <View
              key={i}
              style={[
                styles.segment,
                i < step && styles.segmentDone,
                i === step && styles.segmentActive,
              ]}
            />
          ))}
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
          onPress={next}
          activeOpacity={0.85}
          disabled={!canProceed()}
        >
          <LinearGradient
            colors={canProceed() ? [COLORS.secondary, COLORS.secondaryDark] : ['#333', '#222']}
            style={styles.nextBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[styles.nextBtnText, !canProceed() && styles.nextBtnTextDisabled]}>
              {step === STEPS_CONFIG.length - 1 ? 'GET STARTED' : 'CONTINUE'}
            </Text>
            <Ionicons
              name={step === STEPS_CONFIG.length - 1 ? 'rocket-outline' : 'arrow-forward'}
              size={18}
              color={canProceed() ? COLORS.white : COLORS.textMuted}
              style={{ marginLeft: 8 }}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: COLORS.background },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  stepLabelWrap: { flex: 1 },
  stepLabelMain: { fontSize: 15, fontWeight: '800', color: COLORS.white },
  stepLabelSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  stepIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.secondaryGlow, borderWidth: 1,
    borderColor: COLORS.secondaryBorder, alignItems: 'center', justifyContent: 'center',
  },
  segmentRow: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.surface3 },
  segmentDone: { backgroundColor: COLORS.secondaryDark },
  segmentActive: { backgroundColor: COLORS.secondary },
  backBtn: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },

  // Content
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 20 },
  stepTitle: { fontSize: 28, fontWeight: '900', color: COLORS.white, marginBottom: 6 },
  stepSub: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 32 },

  // Fields
  fieldGroup: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 10, fontWeight: '700', color: COLORS.secondary, letterSpacing: 2, marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, color: COLORS.white, fontSize: 15,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  fieldInputMulti: { height: 90, textAlignVertical: 'top' },

  // Info box
  infoBox: {
    flexDirection: 'row', backgroundColor: COLORS.secondaryGlow, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.secondaryBorder, padding: 12, gap: 8, marginTop: 4,
  },
  infoText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },

  // Declaration
  declarationBox: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, padding: 16, marginBottom: 16,
  },
  declarationText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  checkboxChecked: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  checkLabel: { flex: 1, fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },

  // Bottom CTA
  bottomBar: {
    paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 34 : 24, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background,
  },
  nextBtn: { borderRadius: 14, overflow: 'hidden' },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnGradient: {
    paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  nextBtnText: { fontSize: 15, fontWeight: '800', color: COLORS.white, letterSpacing: 2 },
  nextBtnTextDisabled: { color: COLORS.textMuted },
});
