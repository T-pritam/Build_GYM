import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import SafeBottomBar from '../../components/SafeBottomBar';
import { fetchMyProfile, updateHealthEmergency } from '../../services/customerProfileService';
import { setUserProperty } from '../../services/analyticsService';

function Row({ icon, color, label, sub, value, onChange, locked }) {
  return (
    <View style={s.row}>
      <View style={[s.rowIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={s.rowInfo}>
        <Text style={s.rowLabel}>{label}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      {locked ? (
        <View style={s.lockWrap}>
          {value
            ? <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
            : <Ionicons name="close-circle" size={22} color="#EF4444" />}
          <Ionicons name="lock-closed" size={14} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
        </View>
      ) : (
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: '#333', true: COLORS.secondary }}
          thumbColor="#fff"
        />
      )}
    </View>
  );
}

export default function ConsentPreferencesScreen({ navigation }) {
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);

  // read-only consents (immutable after onboarding)
  const [consentTerms,    setConsentTerms]    = useState(false);
  const [consentPrivacy,  setConsentPrivacy]  = useState(false);
  const [consentMedical,  setConsentMedical]  = useState(false);

  // editable opt-ins
  const [optLeaderboard, setOptLeaderboard] = useState(false);
  const [optCommunity,   setOptCommunity]   = useState(false);
  const [optPromotions,  setOptPromotions]  = useState(false);

  const [original, setOriginal] = useState(null);

  useEffect(() => {
    fetchMyProfile()
      .then((data) => {
        setConsentTerms(!!data.consentTerms);
        setConsentPrivacy(!!data.consentPrivacy);
        setConsentMedical(!!data.consentMedicalFitness);
        setOptLeaderboard(!!data.optLeaderboard);
        setOptCommunity(!!data.optCommunity);
        setOptPromotions(!!data.optPromotions);
        setUserProperty('has_leaderboard_consent', String(!!data.optLeaderboard)).catch(() => {});
        setOriginal({
          optLeaderboard: !!data.optLeaderboard,
          optCommunity: !!data.optCommunity,
          optPromotions: !!data.optPromotions,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isDirty = original
    ? optLeaderboard !== original.optLeaderboard ||
      optCommunity   !== original.optCommunity   ||
      optPromotions  !== original.optPromotions
    : false;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateHealthEmergency({ optLeaderboard, optCommunity, optPromotions });
      setOriginal({ optLeaderboard, optCommunity, optPromotions });
      setUserProperty('has_leaderboard_consent', String(optLeaderboard)).catch(() => {});
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={COLORS.secondary} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={s.glowTop} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Preferences & Consents</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, isDirty && { paddingBottom: 120 }]}
      >
        {/* Consents — locked */}
        <Text style={s.sectionLabel}>ONBOARDING CONSENTS</Text>
        <Text style={s.sectionHint}>These consents were given during onboarding and cannot be changed.</Text>
        <View style={s.card}>
          <Row
            icon="document-text-outline"
            color="#3B82F6"
            label="Terms & Conditions"
            sub="Agreed during onboarding"
            value={consentTerms}
            locked
          />
          <View style={s.divider} />
          <Row
            icon="shield-outline"
            color="#A855F7"
            label="Privacy Policy"
            sub="Agreed during onboarding"
            value={consentPrivacy}
            locked
          />
          <View style={s.divider} />
          <Row
            icon="fitness-outline"
            color="#22C55E"
            label="Medical Fitness Declaration"
            sub="Agreed during onboarding"
            value={consentMedical}
            locked
          />
        </View>

        {/* Opt-ins — editable */}
        <Text style={[s.sectionLabel, { marginTop: 28 }]}>OPT-IN PREFERENCES</Text>
        <Text style={s.sectionHint}>You can change these at any time.</Text>
        <View style={s.card}>
          <Row
            icon="trophy-outline"
            color={COLORS.secondary}
            label="Leaderboard"
            sub="Show my name on community rankings"
            value={optLeaderboard}
            onChange={setOptLeaderboard}
          />
          <View style={s.divider} />
          <Row
            icon="people-outline"
            color="#3B82F6"
            label="Community Features"
            sub="Participate in community events and feeds"
            value={optCommunity}
            onChange={setOptCommunity}
          />
          <View style={s.divider} />
          <Row
            icon="megaphone-outline"
            color="#F59E0B"
            label="Promotions & Offers"
            sub="Receive notifications about deals and updates"
            value={optPromotions}
            onChange={setOptPromotions}
          />
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {isDirty && (
        <SafeBottomBar style={s.footer}>
          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#000" />
              : <Text style={s.saveBtnText}>SAVE PREFERENCES</Text>}
          </TouchableOpacity>
        </SafeBottomBar>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  glowTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 260,
    backgroundColor: 'rgba(233,99,22,0.05)',
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },

  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },

  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: COLORS.secondary,
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6,
  },
  sectionHint: { fontSize: 12, color: COLORS.textMuted, marginBottom: 14 },

  card: {
    backgroundColor: '#1C1C1E', borderRadius: 16, borderWidth: 1, borderColor: '#333',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
  },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  rowSub: { fontSize: 11, color: COLORS.textMuted },
  lockWrap: { flexDirection: 'row', alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#333', marginLeft: 70 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.97)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  saveBtn: {
    backgroundColor: COLORS.secondary, borderRadius: 12, paddingVertical: 17, alignItems: 'center',
    shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14,
  },
  saveBtnText: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 2 },
});
