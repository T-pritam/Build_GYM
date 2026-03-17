import React, { useState, useRef } from 'react';
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
  Switch,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import DatePickerModal from '../../components/DatePickerModal';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/apiService';
import {
  FITNESS_LEVELS,
  HEALTH_CONDITIONS,
  DIETARY_PREFERENCES,
  SLEEP_PATTERNS,
  PAST_INJURIES,
  INJURY_STATUSES,
  FITNESS_GOALS,
  WORKOUT_FREQUENCIES,
  WORKOUT_TIMES,
  ACTIVITY_INTERESTS,
  RELATIONSHIPS,
} from '../../constants/dummyData';

const STEPS = [
  { title: 'Personal Info',   icon: 'person-outline',           step: 'Step 1 of 6' },
  { title: 'Health Profile',  icon: 'heart-outline',            step: 'Step 2 of 6' },
  { title: 'Injury History',  icon: 'medical-outline',          step: 'Step 3 of 6' },
  { title: 'Activity Goals',  icon: 'trophy-outline',           step: 'Step 4 of 6' },
  { title: 'Emergency',       icon: 'call-outline',             step: 'Step 5 of 6' },
  { title: 'Consent',         icon: 'shield-checkmark-outline', step: 'Step 6 of 6' },
];

const O = COLORS.secondary; // orange
const S = COLORS.surface;
const B = COLORS.border;

// ─── Chip selector ────────────────────────────────────────────────────────────
function Chips({ options, selected, onToggle, single = false }) {
  return (
    <View style={s.chips}>
      {options.map((opt) => {
        const active = Array.isArray(selected) ? selected.includes(opt) : selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[s.chip, active && s.chipActive]}
            onPress={() => {
              if (single) onToggle(opt);
              else onToggle(opt);
            }}
            activeOpacity={0.8}
          >
            <Text style={[s.chipText, active && s.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, optional, children }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 8 }}>
        <Text style={s.label}>{label}</Text>
        {optional && <Text style={s.optional}>(Optional)</Text>}
      </View>
      {children}
    </View>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Input({ value, onChangeText, placeholder, keyboardType, secureTextEntry, trailing }) {
  return (
    <View style={{ position: 'relative' }}>
      <TextInput
        style={[s.input, trailing && { paddingRight: 44 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        keyboardType={keyboardType || 'default'}
        secureTextEntry={secureTextEntry}
      />
      {trailing && (
        <View style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}>
          {trailing}
        </View>
      )}
    </View>
  );
}

// ─── Radio list ───────────────────────────────────────────────────────────────
function RadioList({ options, selected, onSelect }) {
  return (
    <View style={{ gap: 10 }}>
      {options.map((opt) => {
        const active = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[s.radioRow, active && s.radioRowActive]}
            onPress={() => onSelect(opt)}
            activeOpacity={0.8}
          >
            <Text style={[s.radioText, active && { color: O, fontWeight: '700' }]}>{opt}</Text>
            <View style={[s.radioCircle, active && s.radioCircleActive]}>
              {active && <View style={s.radioInner} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────
function Checkbox({ checked, onToggle, label, sublabel, badge }) {
  return (
    <TouchableOpacity style={s.checkRow} onPress={onToggle} activeOpacity={0.85}>
      <View style={[s.checkBox, checked && s.checkBoxChecked]}>
        {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={s.checkLabel}>{label}</Text>
          {badge && <Text style={s.badgeText}>{badge}</Text>}
        </View>
        {sublabel && <Text style={s.checkSub}>{sublabel}</Text>}
      </View>
    </TouchableOpacity>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, sub }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
      <Text style={s.sectionTitle}>{title}</Text>
      {sub && <Text style={s.sectionSub}>{sub}</Text>}
    </View>
  );
}

// ─── Info Banner ──────────────────────────────────────────────────────────────
function InfoBanner({ text, icon = 'information-circle-outline' }) {
  return (
    <View style={s.infoBanner}>
      <Ionicons name={icon} size={18} color={O} />
      <Text style={s.infoBannerText}>{text}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function OnboardingScreen({ route, navigation }) {
  const mobile = route?.params?.mobile || '+91 86494 65959';

  const user               = useAuthStore((s) => s.user);
  const markOnboardingComplete = useAuthStore((s) => s.markOnboardingComplete);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [relationModal, setRelationModal] = useState(false);

  // Step 1 – Personal Info
  const [firstName, setFirstName]     = useState('');
  const [lastName, setLastName]       = useState('');
  const [email, setEmail]             = useState('');
  const [dob, setDob]                 = useState('');

  // Step 2 – Health Profile
  const [fitnessLevel, setFitnessLevel]         = useState('');
  const [healthConditions, setHealthConditions] = useState([]);
  const [hasMeds, setHasMeds]                   = useState(false);
  const [medsText, setMedsText]                 = useState('');
  const [dietary, setDietary]                   = useState('');
  const [sleep, setSleep]                       = useState('');

  // Step 3 – Injury History
  const [injuries, setInjuries]           = useState([]);
  const [injuryStatus, setInjuryStatus]   = useState({});
  const [physiotherapy, setPhysiotherapy] = useState(false);
  const [doctorClear, setDoctorClear]     = useState('');

  // Step 4 – Activity Goals
  const [goals, setGoals]         = useState([]);
  const [frequency, setFrequency] = useState('');
  const [workoutTime, setWorkoutTime]   = useState([]);
  const [activities, setActivities]     = useState([]);

  // Step 5 – Emergency Contact
  const [ecName, setEcName]         = useState('');
  const [ecRelation, setEcRelation] = useState('');
  const [ecPhone, setEcPhone]       = useState('');

  // Date picker (Step 1)
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Custom chip inputs
  const [showCustomHealth,   setShowCustomHealth]   = useState(false);
  const [customHealthText,   setCustomHealthText]   = useState('');
  const [showCustomInjury,   setShowCustomInjury]   = useState(false);
  const [customInjuryText,   setCustomInjuryText]   = useState('');
  const [showCustomActivity, setShowCustomActivity] = useState(false);
  const [customActivityText, setCustomActivityText] = useState('');

  // Step 6 – Consent
  const [consentTerms, setConsentTerms]     = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentFit, setConsentFit]         = useState(false);
  const [optLeader, setOptLeader]           = useState(false);
  const [optCommunity, setOptCommunity]     = useState(false);
  const [optPromo, setOptPromo]             = useState(false);

  const scrollRef = useRef(null);

  const canNext = () => {
    if (step === 0) return firstName.trim().length > 0;
    if (step === 5) return consentTerms && consentPrivacy && consentFit;
    return true;
  };

  const goNext = async () => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });

    if (step < 5) {
      setStep((s) => s + 1);
      return;
    }

    // ── Final step: submit full onboarding to backend ─────────────────────
    if (!user?.id) {
      Alert.alert('Error', 'Session expired. Please log in again.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        // Step 1
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        email,
        dob,
        // Step 2
        fitnessLevel,
        healthConditions,
        hasMedications: hasMeds,
        medicationsText: medsText,
        dietaryPreference: dietary,
        sleepPattern: sleep,
        // Step 3
        pastInjuries: injuries,
        injuryStatusMap: injuryStatus,
        hasPhysiotherapy: physiotherapy,
        doctorClearance: doctorClear,
        // Step 4
        fitnessGoals: goals,
        workoutFrequency: frequency,
        preferredWorkoutTimes: workoutTime,
        activityInterests: activities,
        // Step 5
        ecName,
        ecRelationship: ecRelation,
        ecPhone : '+91' + ecPhone,
        // Step 6
        consentTerms,
        consentPrivacy,
        consentMedicalFitness: consentFit,
        optLeaderboard: optLeader,
        optCommunity,
        optPromotions: optPromo,
      };

      await api.post(`/members/${user.id}/onboarding`, payload);
      await markOnboardingComplete();

      navigation.replace('Welcome', { firstName: firstName || user.firstName || 'there' });
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to save onboarding. Please try again.';
      Alert.alert('Submission Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (step > 0) { setStep((s) => s - 1); }
    else { navigation.goBack(); }
  };

  const toggleChip = (arr, setArr, val) => {
    if (arr.includes(val)) setArr(arr.filter((x) => x !== val));
    else setArr([...arr, val]);
  };

  // ── STEP RENDERS ──────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <View>
      <Text style={s.stepTitle}>Personal Information</Text>
      <Text style={s.stepSub}>Tell us about yourself.</Text>

      <Field label="FIRST NAME *">
        <Input value={firstName} onChangeText={setFirstName} placeholder="e.g. Arjun" />
      </Field>
      <Field label="LAST NAME *">
        <Input value={lastName} onChangeText={setLastName} placeholder="e.g. Sharma" />
      </Field>
      <Field label="EMAIL ADDRESS">
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="e.g. arjun@email.com"
          keyboardType="email-address"
          trailing={email.includes('@') && <Ionicons name="checkmark-circle" size={18} color="#22C55E" />}
        />
      </Field>
      <Field label="DATE OF BIRTH *">
        <TouchableOpacity
          style={[s.input, { flexDirection: 'row', alignItems: 'center' }]}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.8}
        >
          <Text style={{ flex: 1, color: dob ? COLORS.white : COLORS.textMuted, fontSize: 15 }}>
            {dob || 'DD / MM / YYYY'}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={dob ? O : COLORS.textMuted} />
        </TouchableOpacity>
        <DatePickerModal
          visible={showDatePicker}
          value={dob}
          onConfirm={(val) => { setDob(val); setShowDatePicker(false); }}
          onClose={() => setShowDatePicker(false)}
        />
      </Field>
      <Field label="PHONE NUMBER">
        <View style={[s.input, { flexDirection: 'row', alignItems: 'center', opacity: 0.7 }]}>
          <Text style={{ color: COLORS.textSecondary, marginRight: 8 }}>+91</Text>
          <Text style={{ color: COLORS.white }}>{mobile.replace('+91 ', '').replace('+91', '')}</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="lock-closed-outline" size={16} color={COLORS.textMuted} />
        </View>
      </Field>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={s.stepTitle}>Your Health Profile</Text>
      <Text style={s.stepSub}>Help us personalise your training safely.</Text>

      <View style={{ marginBottom: 24 }}>
        <SectionHeader title="CURRENT FITNESS LEVEL" sub="(Select one)" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {FITNESS_LEVELS.map((lvl) => {
            const active = fitnessLevel === lvl.id;
            return (
              <TouchableOpacity
                key={lvl.id}
                style={[s.fitnessCard, active && s.fitnessCardActive]}
                onPress={() => setFitnessLevel(lvl.id)}
                activeOpacity={0.8}
              >
                {active && <Ionicons name="checkmark-circle" size={16} color={O} style={{ position: 'absolute', top: 8, right: 8 }} />}
                <Text style={{ fontSize: 24, marginBottom: 6 }}>{lvl.emoji}</Text>
                <Text style={[s.fitnessName, active && { color: O }]}>{lvl.label}</Text>
                <Text style={s.fitnessDesc}>{lvl.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={{ marginBottom: 24 }}>
        <SectionHeader title="PRIMARY HEALTH CONDITIONS" sub="(Select all that apply)" />
        <View style={s.chips}>
          {HEALTH_CONDITIONS.filter((o) => o !== '+ Custom').map((opt) => {
            const active = healthConditions.includes(opt);
            return (
              <TouchableOpacity
                key={opt}
                style={[s.chip, active && s.chipActive]}
                onPress={() => toggleChip(healthConditions, setHealthConditions, opt)}
                activeOpacity={0.8}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
          {healthConditions.filter((o) => !HEALTH_CONDITIONS.includes(o)).map((custom) => (
            <TouchableOpacity
              key={custom}
              style={[s.chip, s.chipActive]}
              onPress={() => setHealthConditions(healthConditions.filter((x) => x !== custom))}
              activeOpacity={0.8}
            >
              <Text style={[s.chipText, s.chipTextActive]}>{custom}  ✕</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[s.chip, showCustomHealth && s.chipActive]}
            onPress={() => { setShowCustomHealth((v) => !v); setCustomHealthText(''); }}
            activeOpacity={0.8}
          >
            <Text style={[s.chipText, showCustomHealth && s.chipTextActive]}>+ Custom</Text>
          </TouchableOpacity>
        </View>
        {showCustomHealth && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TextInput
              style={[s.input, { flex: 1, paddingVertical: 10 }]}
              value={customHealthText}
              onChangeText={setCustomHealthText}
              placeholder="e.g. Thyroid, PCOS…"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
            />
            <TouchableOpacity
              style={[s.chip, s.chipActive, { paddingHorizontal: 18, alignSelf: 'center' }]}
              onPress={() => {
                const t = customHealthText.trim();
                if (t && !healthConditions.includes(t)) {
                  setHealthConditions([...healthConditions, t]);
                }
                setCustomHealthText('');
                setShowCustomHealth(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={[s.chipText, s.chipTextActive]}>Add</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={s.sectionTitle}>CURRENT MEDICATIONS</Text>
          <View style={{ flexDirection: 'row', backgroundColor: S, borderWidth: 1, borderColor: B, borderRadius: 8, padding: 3 }}>
            {['YES', 'NO'].map((v) => (
              <TouchableOpacity
                key={v}
                style={[s.toggleBtn, (v === 'YES') === hasMeds && s.toggleBtnActive]}
                onPress={() => setHasMeds(v === 'YES')}
              >
                <Text style={[s.toggleText, (v === 'YES') === hasMeds && { color: '#fff' }]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {hasMeds && (
          <TextInput
            style={[s.input, { height: 80, textAlignVertical: 'top' }]}
            value={medsText}
            onChangeText={setMedsText}
            placeholder="List your current medications..."
            placeholderTextColor={COLORS.textMuted}
            multiline
          />
        )}
      </View>

      <View style={{ marginBottom: 24 }}>
        <SectionHeader title="DIETARY PREFERENCE" sub="(Select one)" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {DIETARY_PREFERENCES.map((d) => (
              <TouchableOpacity
                key={d}
                style={[s.scrollChip, dietary === d && s.scrollChipActive]}
                onPress={() => setDietary(d)}
              >
                <Text style={[s.scrollChipText, dietary === d && { color: '#fff', fontWeight: '700' }]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={{ marginBottom: 24 }}>
        <SectionHeader title="SLEEP PATTERN" sub="(Select one)" />
        <RadioList options={SLEEP_PATTERNS} selected={sleep} onSelect={setSleep} />
      </View>

      <InfoBanner
        text="Your health data is stored securely and only shared with your assigned trainer."
        icon="lock-closed-outline"
      />
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={s.stepTitle}>Injury History</Text>
      <Text style={s.stepSub}>This helps your trainer plan safe workouts.</Text>

      <View style={{ marginBottom: 24 }}>
        <Text style={[s.label, { marginBottom: 12 }]}>PAST INJURIES</Text>
        <View style={s.chips}>
          {PAST_INJURIES.filter((o) => o !== '+ Custom').map((opt) => {
            const active = injuries.includes(opt);
            return (
              <TouchableOpacity
                key={opt}
                style={[s.chip, active && s.chipActive]}
                onPress={() => toggleChip(injuries, setInjuries, opt)}
                activeOpacity={0.8}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
          {injuries.filter((o) => !PAST_INJURIES.includes(o)).map((custom) => (
            <TouchableOpacity
              key={custom}
              style={[s.chip, s.chipActive]}
              onPress={() => {
                setInjuries(injuries.filter((x) => x !== custom));
                setInjuryStatus((prev) => { const n = { ...prev }; delete n[custom]; return n; });
              }}
              activeOpacity={0.8}
            >
              <Text style={[s.chipText, s.chipTextActive]}>{custom}  ✕</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[s.chip, showCustomInjury && s.chipActive]}
            onPress={() => { setShowCustomInjury((v) => !v); setCustomInjuryText(''); }}
            activeOpacity={0.8}
          >
            <Text style={[s.chipText, showCustomInjury && s.chipTextActive]}>+ Custom</Text>
          </TouchableOpacity>
        </View>
        {showCustomInjury && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TextInput
              style={[s.input, { flex: 1, paddingVertical: 10 }]}
              value={customInjuryText}
              onChangeText={setCustomInjuryText}
              placeholder="e.g. Torn ACL, Rotator Cuff…"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
            />
            <TouchableOpacity
              style={[s.chip, s.chipActive, { paddingHorizontal: 18, alignSelf: 'center' }]}
              onPress={() => {
                const t = customInjuryText.trim();
                if (t && !injuries.includes(t)) {
                  setInjuries([...injuries, t]);
                }
                setCustomInjuryText('');
                setShowCustomInjury(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={[s.chipText, s.chipTextActive]}>Add</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {injuries.filter((x) => x !== 'None' && x !== '+ Custom').length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <Text style={[s.label, { marginBottom: 12 }]}>INJURY STATUS</Text>
          {injuries.filter((x) => x !== 'None' && x !== '+ Custom').map((inj) => (
            <View key={inj} style={[s.input, { marginBottom: 12, padding: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: O }} />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{inj}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {INJURY_STATUSES.map((st) => {
                  const active = injuryStatus[inj] === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[s.statusBtn, active && s.statusBtnActive]}
                      onPress={() => setInjuryStatus({ ...injuryStatus, [inj]: st })}
                    >
                      <Text style={[s.statusText, active && { color: O, fontWeight: '700' }]}>{st}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={s.label}>PHYSIOTHERAPY / REHABILITATION</Text>
          <Switch
            value={physiotherapy}
            onValueChange={setPhysiotherapy}
            thumbColor={physiotherapy ? O : '#888'}
            trackColor={{ false: B, true: COLORS.orangeLight }}
          />
        </View>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={[s.label, { marginBottom: 12 }]}>DOCTOR CLEARANCE FOR EXERCISE</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {['Yes', 'No', 'Not Applicable'].map((opt) => {
            const active = doctorClear === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[s.clearBtn, active && s.clearBtnActive]}
                onPress={() => setDoctorClear(opt)}
              >
                <Text style={[s.clearText, active && { color: O, fontWeight: '700' }]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View>
      <Text style={s.stepTitle}>Your Fitness Goals</Text>
      <Text style={s.stepSub}>Tell us what you want to achieve.</Text>

      <View style={{ marginBottom: 24 }}>
        <Text style={s.sectionTitle}>PRIMARY FITNESS GOALS</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
          {FITNESS_GOALS.map((goal) => {
            const active = goals.includes(goal.id);
            return (
              <TouchableOpacity
                key={goal.id}
                style={[s.goalCard, active && s.goalCardActive]}
                onPress={() => toggleChip(goals, setGoals, goal.id)}
                activeOpacity={0.8}
              >
                {active && (
                  <View style={s.goalCheck}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
                <Text style={{ fontSize: 22, marginBottom: 6 }}>{goal.emoji}</Text>
                <Text style={s.goalLabel}>{goal.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={s.sectionTitle}>TARGET WORKOUT FREQUENCY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {WORKOUT_FREQUENCIES.map((wf) => {
              const active = frequency === wf.id;
              return (
                <TouchableOpacity
                  key={wf.id}
                  style={[s.freqChip, active && { backgroundColor: O, borderColor: O }]}
                  onPress={() => setFrequency(wf.id)}
                >
                  <Text style={[s.freqText, active && { color: '#fff', fontWeight: '700' }]}>{wf.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={s.sectionTitle}>PREFERRED WORKOUT TIME</Text>
        <View style={[s.chips, { marginTop: 12 }]}>
          {WORKOUT_TIMES.map((wt) => {
            const active = workoutTime.includes(wt.id);
            return (
              <TouchableOpacity
                key={wt.id}
                style={[s.chip, active && s.chipActive]}
                onPress={() => toggleChip(workoutTime, setWorkoutTime, wt.id)}
                activeOpacity={0.8}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{wt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={s.sectionTitle}>ACTIVITIES INTERESTED IN</Text>
        <View style={[s.chips, { marginTop: 12 }]}>
          {ACTIVITY_INTERESTS.filter((a) => a.id !== 'custom').map((act) => {
            const active = activities.includes(act.id);
            return (
              <TouchableOpacity
                key={act.id}
                style={[s.chip, active && s.chipActive]}
                onPress={() => toggleChip(activities, setActivities, act.id)}
                activeOpacity={0.8}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{act.label}</Text>
              </TouchableOpacity>
            );
          })}
          {activities
            .filter((id) => !ACTIVITY_INTERESTS.find((a) => a.id === id))
            .map((custom) => (
              <TouchableOpacity
                key={custom}
                style={[s.chip, s.chipActive]}
                onPress={() => setActivities(activities.filter((x) => x !== custom))}
                activeOpacity={0.8}
              >
                <Text style={[s.chipText, s.chipTextActive]}>{custom}  ✕</Text>
              </TouchableOpacity>
            ))}
          <TouchableOpacity
            style={[s.chip, showCustomActivity && s.chipActive]}
            onPress={() => { setShowCustomActivity((v) => !v); setCustomActivityText(''); }}
            activeOpacity={0.8}
          >
            <Text style={[s.chipText, showCustomActivity && s.chipTextActive]}>+ Custom</Text>
          </TouchableOpacity>
        </View>
        {showCustomActivity && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TextInput
              style={[s.input, { flex: 1, paddingVertical: 10 }]}
              value={customActivityText}
              onChangeText={setCustomActivityText}
              placeholder="e.g. Calisthenics, Swimming…"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
            />
            <TouchableOpacity
              style={[s.chip, s.chipActive, { paddingHorizontal: 18, alignSelf: 'center' }]}
              onPress={() => {
                const t = customActivityText.trim();
                if (t && !activities.includes(t)) {
                  setActivities([...activities, t]);
                }
                setCustomActivityText('');
                setShowCustomActivity(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={[s.chipText, s.chipTextActive]}>Add</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View>
      <Text style={s.stepTitle}>Emergency Contact</Text>
      <Text style={s.stepSub}>In case we need to reach someone for you.</Text>

      <Field label="CONTACT NAME *">
        <Input value={ecName} onChangeText={setEcName} placeholder="e.g. Priya Sharma" />
      </Field>

      <Field label="RELATIONSHIP *">
        <TouchableOpacity style={[s.input, { flexDirection: 'row', alignItems: 'center' }]} onPress={() => setRelationModal(true)}>
          <Text style={{ flex: 1, color: ecRelation ? COLORS.white : COLORS.textMuted, fontSize: 15 }}>
            {ecRelation || 'Select relationship'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </Field>

      <Field label="CONTACT PHONE *">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={[s.input, { width: 64, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: COLORS.white, fontWeight: '600' }}>+91</Text>
          </View>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={ecPhone}
            onChangeText={setEcPhone}
            placeholder="Enter 10-digit"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>
      </Field>


      <InfoBanner text="This is only used in case of a medical emergency at the gym." />

      {/* Relationship Modal */}
      <Modal visible={relationModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} onPress={() => setRelationModal(false)}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Select Relationship</Text>
            {RELATIONSHIPS.map((r) => (
              <TouchableOpacity
                key={r}
                style={s.modalOption}
                onPress={() => { setEcRelation(r); setRelationModal(false); }}
              >
                <Text style={{ color: '#fff', fontSize: 16 }}>{r}</Text>
                {ecRelation === r && <Ionicons name="checkmark" size={18} color={O} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );

  const renderStep6 = () => (
    <View>
      <Text style={s.stepTitle}>Almost There!</Text>
      <Text style={s.stepSub}>Review and accept to complete your profile.</Text>

      {/* Declaration card */}
      <View style={s.declarationCard}>
        <Text style={s.declarationText}>
          I, the undersigned, hereby declare that:{'\n'}
          {'\n'}• I am voluntarily joining and using the facilities at Build Gym.
          {'\n'}• I acknowledge that physical exercise involves inherent risks.
          {'\n'}• I have disclosed all known medical conditions, injuries, and health history.
          {'\n'}• I agree to follow all gym rules and safety guidelines.
        </Text>
      </View>

      <Text style={[s.sectionTitle, { marginBottom: 16, color: O }]}>MANDATORY *</Text>
      <View style={{ gap: 18, marginBottom: 28 }}>
        <Checkbox
          checked={consentTerms}
          onToggle={() => setConsentTerms((v) => !v)}
          label="I have read and accept the Terms of Service"
        />
        <Checkbox
          checked={consentPrivacy}
          onToggle={() => setConsentPrivacy((v) => !v)}
          label="I have read and accept the Privacy Policy"
        />
        <Checkbox
          checked={consentFit}
          onToggle={() => setConsentFit((v) => !v)}
          label="I acknowledge I am medically fit for exercise"
        />
      </View>

      <Text style={[s.sectionTitle, { marginBottom: 16, color: COLORS.textSecondary }]}>OPTIONAL</Text>
      <View style={{ gap: 20, marginBottom: 28 }}>
        <Checkbox
          checked={optLeader}
          onToggle={() => setOptLeader((v) => !v)}
          label="Show my name on the Leaderboard"
          badge="(Optional)"
          sublabel="You can change this anytime in settings"
        />
        <Checkbox
          checked={optCommunity}
          onToggle={() => setOptCommunity((v) => !v)}
          label="Join the Community Section"
          badge="(Optional)"
          sublabel="Share gym progress with other members"
        />
        <Checkbox
          checked={optPromo}
          onToggle={() => setOptPromo((v) => !v)}
          label="Receive promotional notifications"
          badge="(Optional)"
          sublabel="Gym offers, events, and updates"
        />
      </View>

      <Text style={{ color: COLORS.textMuted, fontSize: 11, textAlign: 'center', fontStyle: 'italic', marginBottom: 20 }}>
        Consent timestamps are recorded for legal compliance.
      </Text>
    </View>
  );

  const RENDERS = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* ── Top Bar ── */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={s.stepName}>{STEPS[step].title}</Text>
          <Text style={s.stepCount}>{STEPS[step].step}</Text>
        </View>

        <View style={[s.stepIcon, { backgroundColor: O }]}>
          <Ionicons name={STEPS[step].icon} size={18} color="#fff" />
        </View>
      </View>

      {/* ── Progress Bar ── */}
      <View style={s.progressRow}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              s.progressSeg,
              i < step && { backgroundColor: O },
              i === step && { backgroundColor: O },
            ]}
          />
        ))}
      </View>

      {/* ── Content ── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {RENDERS[step]()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Bottom CTA ── */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={[s.ctaBtn, (!canNext() || submitting) && { opacity: 0.4 }]}
          onPress={goNext}
          disabled={!canNext() || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={s.ctaText}>
                {step === 5 ? 'GET STARTED 🚀' : 'CONTINUE'}
              </Text>
              {step < 5 && <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />}
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  stepName: { color: '#fff', fontWeight: '700', fontSize: 15 },
  stepCount: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  stepIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // Progress
  progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
  progressSeg:  { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#333' },

  // Content
  scrollContent: { padding: 20, paddingBottom: 40 },
  stepTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 4 },
  stepSub:   { fontSize: 14, color: COLORS.textSecondary, marginBottom: 28 },

  // Label
  label:    { fontSize: 10, fontWeight: '700', color: COLORS.secondary, letterSpacing: 2 },
  optional: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },

  // Input
  input: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#fff',
  },

  // Strength
  strengthRow: { flexDirection: 'row', gap: 4 },
  strengthSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#333' },

  // Chips
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  chipActive:     { borderColor: COLORS.secondary, backgroundColor: 'rgba(233,99,22,0.1)' },
  chipText:       { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  chipTextActive: { color: COLORS.secondary, fontWeight: '600' },

  // Fitness Level Cards
  fitnessCard: {
    width: '47%', backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 14, alignItems: 'center',
  },
  fitnessCardActive: { borderWidth: 2, borderColor: COLORS.secondary, backgroundColor: 'rgba(233,99,22,0.07)' },
  fitnessName: { color: '#fff', fontWeight: '700', fontSize: 13, marginBottom: 3 },
  fitnessDesc: { color: COLORS.textMuted, fontSize: 10, textAlign: 'center' },

  // Radio
  radioRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  radioRowActive: { borderColor: COLORS.secondary },
  radioText:      { fontSize: 14, color: COLORS.textSecondary },
  radioCircle:    { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: COLORS.secondary },
  radioInner:     { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.secondary },

  // Toggle
  toggleBtn:       { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6 },
  toggleBtnActive: { backgroundColor: COLORS.secondary },
  toggleText:      { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },

  // Section header
  sectionTitle:    { fontSize: 11, fontWeight: '800', color: COLORS.secondary, letterSpacing: 3 },
  sectionSub:      { fontSize: 11, color: COLORS.textMuted },

  // Scroll chip
  scrollChip:       { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  scrollChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  scrollChipText:   { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },

  // Goal card
  goalCard: {
    width: '47%', backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 14,
  },
  goalCardActive: { borderWidth: 2, borderColor: COLORS.secondary, backgroundColor: 'rgba(233,99,22,0.07)' },
  goalCheck: {
    position: 'absolute', top: -6, right: -6, width: 20, height: 20,
    backgroundColor: COLORS.secondary, borderRadius: 10,
    borderWidth: 3, borderColor: '#000', alignItems: 'center', justifyContent: 'center',
  },
  goalLabel: { color: '#fff', fontWeight: '700', fontSize: 13, lineHeight: 18 },

  // Freq chip
  freqChip: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, minWidth: 110,
  },
  freqText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textAlign: 'center' },

  // Injury status
  statusBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'transparent', alignItems: 'center',
  },
  statusBtnActive: { backgroundColor: 'rgba(233,99,22,0.1)', borderColor: COLORS.secondary },
  statusText: { fontSize: 10, color: COLORS.textMuted },

  // Doctor clear
  clearBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: 'center',
  },
  clearBtnActive: { borderColor: COLORS.secondary, backgroundColor: 'rgba(233,99,22,0.1)' },
  clearText: { fontSize: 13, color: COLORS.textMuted },

  // Info Banner
  infoBanner: {
    flexDirection: 'row', gap: 10, backgroundColor: 'rgba(233,99,22,0.1)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(233,99,22,0.3)',
    padding: 14, alignItems: 'flex-start',
  },
  infoBannerText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },

  // Declaration
  declarationCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.border, padding: 16, marginBottom: 24,
  },
  declarationText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },

  // Checkbox
  checkRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  checkBox:    { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkBoxChecked: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  checkLabel:  { color: '#fff', fontSize: 14, lineHeight: 20, flex: 1 },
  checkSub:    { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  badgeText:   { fontSize: 10, color: COLORS.textMuted, backgroundColor: COLORS.surface3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: '#1C1C1E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalTitle:   { color: '#fff', fontWeight: '800', fontSize: 16, marginBottom: 16 },
  modalOption:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#333' },

  // Bottom
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 14,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#000',
  },
  ctaBtn: {
    backgroundColor: COLORS.secondary, borderRadius: 14, height: 56,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 2 },
});

