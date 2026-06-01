import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  TextInput, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import SafeBottomBar from '../../components/SafeBottomBar';
import { fetchMyProfile, updateHealthEmergency } from '../../services/customerProfileService';

// ─── Constants ────────────────────────────────────────────────────────────────
const FITNESS_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Athlete'];

const HEALTH_CONDITIONS_PRESET = [
  'None', 'Asthma', 'Hypertension', 'Diabetes', 'Lower Back Pain',
  'Knee Pain', 'Shoulder Injury', 'Heart Condition',
];

const RELATIONSHIP_OPTIONS = ['Spouse', 'Parent', 'Sibling', 'Friend', 'Child', 'Other'];

// ─── Small helpers ────────────────────────────────────────────────────────────
function SectionDivider({ label }) {
  return (
    <View style={s.sectionDivider}>
      <View style={s.dividerLine} />
      <Text style={s.sectionDividerLabel}>{label}</Text>
      <View style={s.dividerLine} />
    </View>
  );
}

function FieldLabel({ children }) {
  return <Text style={s.fieldLabel}>{children}</Text>;
}

export default function HealthEmergencyScreen({ navigation }) {
  // ── Health Profile ──────────────────────────────────────────────────────
  const [fitnessLevel,     setFitnessLevel]     = useState(null);
  const [healthConditions, setHealthConditions] = useState([]);
  const [customCondition,  setCustomCondition]  = useState('');
  const [hasMedications,   setHasMedications]   = useState(false);
  const [medicationsText,  setMedicationsText]  = useState('');

  // ── Injury History ──────────────────────────────────────────────────────
  const [pastInjuries,    setPastInjuries]    = useState([]);      // string[]
  const [injuryStatusMap, setInjuryStatusMap] = useState({});      // { [injury]: 'recovering' | 'healed' }

  // ── Emergency Contact ───────────────────────────────────────────────────
  const [ecName,         setEcName]         = useState('');
  const [ecRelationship, setEcRelationship] = useState('');
  const [ecPhone,        setEcPhone]        = useState('');
  const [relPickerOpen,  setRelPickerOpen]  = useState(false);

  // ── "None" for injuries ─────────────────────────────────────────────────
  const [noInjuries, setNoInjuries] = useState(false);

  // ── Errors ──────────────────────────────────────────────────────────────
  const [errors, setErrors] = useState({});

  // ── Meta ────────────────────────────────────────────────────────────────
  const [original,  setOriginal]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMyProfile()
      .then((data) => {
        const fl  = data.fitnessLevel || null;
        const hc  = Array.isArray(data.healthConditions) ? data.healthConditions : [];
        const hm  = !!data.hasMedications;
        const mt  = data.medicationsText || '';
        const pi  = Array.isArray(data.pastInjuries) ? data.pastInjuries : [];
        const ism = data.injuryStatusMap && typeof data.injuryStatusMap === 'object' ? data.injuryStatusMap : {};
        const en  = data.ecName || '';
        const er  = data.ecRelationship || '';
        const rawEp = data.ecPhone || '';
        const ep  = rawEp.startsWith('+91') ? rawEp.slice(3) : rawEp.replace(/\D/g, '');
        const ni  = pi.length === 0 && !!(data.noInjuries ?? false);

        setFitnessLevel(fl);
        setHealthConditions(hc);
        setHasMedications(hm);
        setMedicationsText(mt);
        setPastInjuries(pi);
        setInjuryStatusMap(ism);
        setNoInjuries(ni);
        setEcName(en);
        setEcRelationship(er);
        setEcPhone(ep);
        setOriginal({ fl, hc: JSON.stringify(hc), hm, mt, pi: JSON.stringify(pi), ism: JSON.stringify(ism), ni, en, er, ep });
      })
      .catch(() => setOriginal({}))
      .finally(() => setLoading(false));
  }, []);

  // ── Dirty detection ──────────────────────────────────────────────────────
  const isDirty = original
    ? fitnessLevel              !== original.fl  ||
      JSON.stringify(healthConditions) !== original.hc  ||
      hasMedications            !== original.hm  ||
      medicationsText           !== original.mt  ||
      JSON.stringify(pastInjuries)     !== original.pi  ||
      JSON.stringify(injuryStatusMap)  !== original.ism ||
      noInjuries                !== original.ni  ||
      ecName                    !== original.en  ||
      ecRelationship            !== original.er  ||
      ecPhone                   !== original.ep
    : false;

  // ── Health conditions toggle ─────────────────────────────────────────────
  const toggleCondition = (cond) => {
    if (cond === 'None') {
      setHealthConditions(healthConditions.includes('None') ? [] : ['None']);
      return;
    }
    setHealthConditions((prev) => {
      const without = prev.filter((c) => c !== 'None');
      return without.includes(cond)
        ? without.filter((c) => c !== cond)
        : [...without, cond];
    });
  };

  const addCustomCondition = () => {
    Alert.prompt(
      'Add Condition',
      'Enter a custom health condition',
      (text) => {
        if (text?.trim()) {
          setHealthConditions((prev) => {
            const without = prev.filter((c) => c !== 'None');
            return without.includes(text.trim()) ? without : [...without, text.trim()];
          });
        }
      },
      'plain-text',
    );
  };

  // ── Injury status toggle ──────────────────────────────────────────────────
  const setInjuryStatus = (injury, status) => {
    setInjuryStatusMap((prev) => ({ ...prev, [injury]: status }));
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const errs = {};
    if (!fitnessLevel) errs.fitnessLevel = 'Please select your fitness level.';
    if (healthConditions.length === 0) errs.healthConditions = 'Please select at least one option (or "None").';
    if (!noInjuries && pastInjuries.length === 0) errs.injuries = 'Select "None" if you have no injuries, or add at least one.';
    if (!ecName.trim()) errs.ecName = 'Emergency contact name is required.';
    if (!ecRelationship.trim()) errs.ecRelationship = 'Please select a relationship.';
    if (!ecPhone.trim()) {
      errs.ecPhone = 'Emergency contact phone is required.';
    } else if (!/^\d{10}$/.test(ecPhone.trim().replace(/[\s\-+]/g, ''))) {
      errs.ecPhone = 'Enter a valid 10-digit phone number.';
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await updateHealthEmergency({
        fitnessLevel,
        healthConditions,
        hasMedications,
        medicationsText: hasMedications ? medicationsText : '',
        pastInjuries: noInjuries ? [] : pastInjuries,
        injuryStatusMap: noInjuries ? {} : injuryStatusMap,
        noInjuries,
        ecName:         ecName.trim(),
        ecRelationship: ecRelationship.trim(),
        ecPhone:        ecPhone.trim(),
      });
      setOriginal({
        fl: fitnessLevel,
        hc: JSON.stringify(healthConditions),
        hm: hasMedications,
        mt: medicationsText,
        pi: JSON.stringify(noInjuries ? [] : pastInjuries),
        ism: JSON.stringify(noInjuries ? {} : injuryStatusMap),
        ni: noInjuries,
        en: ecName.trim(),
        er: ecRelationship.trim(),
        ep: ecPhone.trim(),
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [fitnessLevel, healthConditions, hasMedications, medicationsText, pastInjuries, injuryStatusMap, noInjuries, ecName, ecRelationship, ecPhone]);

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
        <Text style={s.headerTitle}>HEALTH & EMERGENCY</Text>
        <Ionicons name="heart" size={20} color={COLORS.secondary} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, isDirty && { paddingBottom: 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Page title */}
        <View style={s.titleRow}>
          <Text style={s.pageTitle}>Health &{'\n'}Emergency</Text>
          <Text style={s.pageSub}>Manage your vital statistics and safety protocols.</Text>
        </View>

        {/* ══ SECTION 1 — HEALTH PROFILE ══════════════════════════════ */}
        <SectionDivider label="01 — HEALTH PROFILE" />

        {/* Fitness Level */}
        <View style={s.fieldBlock}>
          <FieldLabel>FITNESS LEVEL <Text style={s.req}>*</Text></FieldLabel>
          <View style={s.chipRow}>
            {FITNESS_LEVELS.map((lvl) => {
              const active = fitnessLevel === lvl;
              return (
                <TouchableOpacity
                  key={lvl}
                  style={[s.chip, active && s.chipActive, errors.fitnessLevel && s.chipError]}
                  onPress={() => { setFitnessLevel(lvl); setErrors((e) => ({ ...e, fitnessLevel: undefined })); }}
                  activeOpacity={0.75}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>{lvl}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.fitnessLevel && <Text style={s.errorText}>{errors.fitnessLevel}</Text>}
        </View>

        {/* Health Conditions */}
        <View style={s.fieldBlock}>
          <FieldLabel>HEALTH CONDITIONS <Text style={s.req}>*</Text></FieldLabel>
          <View style={s.chipRow}>
            {HEALTH_CONDITIONS_PRESET.map((cond) => {
              const active = healthConditions.includes(cond);
              return (
                <TouchableOpacity
                  key={cond}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => toggleCondition(cond)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>{cond}</Text>
                  {active && <Ionicons name="checkmark-circle" size={13} color={COLORS.secondary} style={{ marginLeft: 4 }} />}
                </TouchableOpacity>
              );
            })}
            {/* Custom conditions added by user */}
            {healthConditions.filter((c) => !HEALTH_CONDITIONS_PRESET.includes(c)).map((cond) => (
              <TouchableOpacity
                key={cond}
                style={[s.chip, s.chipActive]}
                onPress={() => setHealthConditions((prev) => prev.filter((c) => c !== cond))}
                activeOpacity={0.75}
              >
                <Text style={[s.chipText, s.chipTextActive]}>{cond}</Text>
                <Ionicons name="close-circle" size={13} color={COLORS.secondary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.chip, s.chipDashed]} onPress={addCustomCondition} activeOpacity={0.75}>
              <Ionicons name="add" size={14} color={COLORS.textMuted} />
              <Text style={[s.chipText, { color: COLORS.textMuted }]}> Custom</Text>
            </TouchableOpacity>
          </View>
          {errors.healthConditions && <Text style={s.errorText}>{errors.healthConditions}</Text>}
        </View>

        {/* Medications */}
        <View style={s.fieldBlock}>
          <View style={s.medRow}>
            <FieldLabel>CURRENT MEDICATIONS</FieldLabel>
            <View style={s.toggleWrap}>
              <TouchableOpacity
                style={[s.toggleOpt, !hasMedications && s.toggleOptInactive]}
                onPress={() => setHasMedications(false)}
              >
                <Text style={[s.toggleText, !hasMedications && s.toggleTextInactive]}>NO</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toggleOpt, hasMedications && s.toggleOptActive]}
                onPress={() => setHasMedications(true)}
              >
                <Text style={[s.toggleText, hasMedications && s.toggleTextActive]}>YES</Text>
              </TouchableOpacity>
            </View>
          </View>
          {hasMedications && (
            <TextInput
              style={s.textArea}
              value={medicationsText}
              onChangeText={setMedicationsText}
              placeholder="List any daily supplements or medications..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          )}
        </View>

        {/* ══ SECTION 2 — INJURY HISTORY ══════════════════════════════ */}
        <SectionDivider label="02 — INJURY HISTORY" />

        <View style={s.fieldBlock}>
          <View style={s.injuryHeader}>
            <FieldLabel>ACTIVE CONCERNS <Text style={s.req}>*</Text></FieldLabel>
            {!noInjuries && (
              <TouchableOpacity
                style={s.addInjuryBtn}
                onPress={() =>
                  Alert.prompt('Add Injury', 'Describe the injury or concern', (text) => {
                    if (text?.trim()) {
                      setPastInjuries((prev) => [...prev, text.trim()]);
                      setInjuryStatusMap((prev) => ({ ...prev, [text.trim()]: 'recovering' }));
                      setErrors((e) => ({ ...e, injuries: undefined }));
                    }
                  }, 'plain-text')
                }
              >
                <Ionicons name="add-circle-outline" size={18} color={COLORS.secondary} />
                <Text style={s.addInjuryText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* None toggle */}
          <TouchableOpacity
            style={[s.chip, noInjuries && s.chipActive, { alignSelf: 'flex-start', marginBottom: 10 }]}
            onPress={() => {
              const next = !noInjuries;
              setNoInjuries(next);
              if (next) { setPastInjuries([]); setInjuryStatusMap({}); }
              setErrors((e) => ({ ...e, injuries: undefined }));
            }}
            activeOpacity={0.75}
          >
            <Text style={[s.chipText, noInjuries && s.chipTextActive]}>None</Text>
            {noInjuries && <Ionicons name="checkmark-circle" size={13} color={COLORS.secondary} style={{ marginLeft: 4 }} />}
          </TouchableOpacity>

          {!noInjuries && pastInjuries.length === 0 ? (
            <Text style={s.emptyNote}>No active concerns added yet. Tap "Add" or select "None".</Text>
          ) : !noInjuries && (
            <View style={s.injuryGrid}>
              {pastInjuries.map((injury) => {
                const status = injuryStatusMap[injury] || 'recovering';
                return (
                  <View key={injury} style={s.injuryCard}>
                    <View style={s.injuryCardTop}>
                      <Text style={s.injuryName}>{injury}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setPastInjuries((prev) => prev.filter((i) => i !== injury));
                          setInjuryStatusMap((prev) => {
                            const next = { ...prev };
                            delete next[injury];
                            return next;
                          });
                        }}
                      >
                        <Ionicons name="close" size={16} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>
                    <View style={s.injuryStatusRow}>
                      <TouchableOpacity
                        style={s.injuryRadioRow}
                        onPress={() => setInjuryStatus(injury, 'recovering')}
                      >
                        <View style={[s.radioCircle, status === 'recovering' && s.radioCircleActive]}>
                          {status === 'recovering' && <View style={s.radioDot} />}
                        </View>
                        <Text style={[s.radioLabel, status === 'recovering' && { color: '#fff' }]}>RECOVERING</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.injuryRadioRow, { opacity: status === 'healed' ? 1 : 0.4 }]}
                        onPress={() => setInjuryStatus(injury, 'healed')}
                      >
                        <View style={[s.radioCircle, status === 'healed' && s.radioCircleActive]}>
                          {status === 'healed' && <View style={s.radioDot} />}
                        </View>
                        <Text style={[s.radioLabel, status === 'healed' && { color: '#fff' }]}>HEALED</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          {errors.injuries && <Text style={s.errorText}>{errors.injuries}</Text>}
        </View>

        {/* ══ SECTION 3 — EMERGENCY PROTOCOL ═════════════════════════ */}
        <SectionDivider label="03 — EMERGENCY PROTOCOL" />

        {/* Info banner */}
        <View style={s.infoBanner}>
          <Ionicons name="information-circle" size={20} color={COLORS.secondary} />
          <Text style={s.infoBannerText}>This is used in case of a medical emergency.</Text>
        </View>

        <View style={s.fieldBlock}>
          <FieldLabel>CONTACT NAME <Text style={s.req}>*</Text></FieldLabel>
          <TextInput
            style={[s.underlineInput, errors.ecName && s.inputError]}
            value={ecName}
            onChangeText={(v) => { setEcName(v); setErrors((e) => ({ ...e, ecName: undefined })); }}
            placeholder="Full name"
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="next"
          />
          {errors.ecName && <Text style={s.errorText}>{errors.ecName}</Text>}
        </View>

        <View style={s.fieldBlock}>
          <FieldLabel>RELATIONSHIP <Text style={s.req}>*</Text></FieldLabel>
          <TouchableOpacity
            style={[s.selectRow, errors.ecRelationship && s.inputError]}
            onPress={() => { setRelPickerOpen(true); setErrors((e) => ({ ...e, ecRelationship: undefined })); }}
            activeOpacity={0.8}
          >
            <Text style={[s.selectText, !ecRelationship && { color: COLORS.textMuted }]}>
              {ecRelationship || 'Select relationship'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
          {errors.ecRelationship && <Text style={s.errorText}>{errors.ecRelationship}</Text>}
        </View>

        <View style={s.fieldBlock}>
          <FieldLabel>CONTACT PHONE <Text style={s.req}>*</Text></FieldLabel>
          <TextInput
            style={[s.underlineInput, errors.ecPhone && s.inputError]}
            value={ecPhone}
            onChangeText={(v) => { setEcPhone(v); setErrors((e) => ({ ...e, ecPhone: undefined })); }}
            placeholder="10-digit phone number"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
            maxLength={10}
            returnKeyType="done"
          />
          {errors.ecPhone && <Text style={s.errorText}>{errors.ecPhone}</Text>}
        </View>
      </ScrollView>

      {/* Sticky save — shown only when dirty */}
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

      {/* Relationship picker modal */}
      <Modal visible={relPickerOpen} transparent animationType="slide" onRequestClose={() => setRelPickerOpen(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setRelPickerOpen(false)}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Relationship</Text>
            {RELATIONSHIP_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[s.modalOption, ecRelationship === opt && s.modalOptionActive]}
                onPress={() => { setEcRelationship(opt); setRelPickerOpen(false); }}
                activeOpacity={0.75}
              >
                <Text style={[s.modalOptionText, ecRelationship === opt && { color: COLORS.secondary }]}>{opt}</Text>
                {ecRelationship === opt && <Ionicons name="checkmark" size={18} color={COLORS.secondary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.modalCancel} onPress={() => setRelPickerOpen(false)}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 3 },

  // Scroll
  scroll: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40 },

  // Title
  titleRow: { marginBottom: 32 },
  pageTitle: { fontSize: 34, fontWeight: '900', color: '#fff', letterSpacing: -1, lineHeight: 38, textTransform: 'uppercase' },
  pageSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 8, fontWeight: '500' },

  // Section divider
  sectionDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24, marginTop: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  sectionDividerLabel: { fontSize: 9, fontWeight: '900', color: COLORS.secondary, letterSpacing: 2, textTransform: 'uppercase' },

  // Field
  fieldBlock: { marginBottom: 24 },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: COLORS.secondary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  req: { color: '#EF4444' },
  errorText: { fontSize: 11, color: '#EF4444', marginTop: 4 },
  chipError: { borderColor: 'rgba(239,68,68,0.5)' },
  inputError: { borderBottomColor: '#EF4444' },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#1C1C1E',
  },
  chipActive: { backgroundColor: 'rgba(233,99,22,0.15)', borderColor: COLORS.secondary },
  chipDashed: { borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.2)' },
  chipText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  chipTextActive: { color: COLORS.secondary },

  // Medications toggle
  medRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  toggleWrap: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 999, padding: 3 },
  toggleOpt: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  toggleOptActive: { backgroundColor: COLORS.secondary },
  toggleOptInactive: {},
  toggleText: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },
  toggleTextActive: { color: '#fff' },
  toggleTextInactive: {},
  textArea: {
    backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, padding: 14, fontSize: 13, color: '#fff', minHeight: 100,
  },

  // Injury
  injuryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addInjuryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addInjuryText: { fontSize: 12, fontWeight: '700', color: COLORS.secondary },
  emptyNote: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' },
  injuryGrid: { gap: 10 },
  injuryCard: {
    backgroundColor: '#1C1C1E', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  injuryCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  injuryName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  injuryStatusRow: { flexDirection: 'row', gap: 20 },
  injuryRadioRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radioCircle: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 2,
    borderColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center',
  },
  radioCircleActive: {},
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.secondary },
  radioLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase' },

  // Emergency contact
  infoBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: 'rgba(45,30,20,0.6)', borderWidth: 1, borderColor: 'rgba(233,99,22,0.2)',
    borderRadius: 12, padding: 14, marginBottom: 24,
  },
  infoBannerText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,219,195,0.8)', flex: 1, letterSpacing: 0.5 },
  underlineInput: {
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12, paddingHorizontal: 4,
    fontSize: 14, fontWeight: '700', color: '#fff',
  },
  selectRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12, paddingHorizontal: 4,
  },
  selectText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Sticky footer
  stickyFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.97)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  saveBtn: {
    backgroundColor: COLORS.secondary, borderRadius: 12, paddingVertical: 18,
    alignItems: 'center',
    shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16,
    elevation: 8,
  },
  saveBtnText: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 2 },

  // Relationship modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#1C1C1E', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
  },
  modalHandle: { width: 36, height: 4, backgroundColor: '#333', borderRadius: 99, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 16, letterSpacing: 1 },
  modalOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalOptionActive: {},
  modalOptionText: { fontSize: 15, fontWeight: '600', color: '#e2e8f0' },
  modalCancel: { marginTop: 16, paddingVertical: 14, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
});
