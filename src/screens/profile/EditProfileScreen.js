import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS as THEME, FONTS } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { requestAccountDeletion } from '../../services/customerProfileService';

// Theme-compat: legacy colour keys -> new "Holographic Noir" palette so the
// whole screen restyles without rewriting the render. Accent (orange) -> purple.
const COLORS = {
  primary: THEME.background, primaryLight: THEME.surface, primaryDark: THEME.black,
  orange: THEME.primaryLight, orangeLight: THEME.primarySoft, orangeBorder: THEME.primaryBorder, orangeGlow: THEME.primaryGlow,
  secondary: THEME.primaryLight, secondaryLight: THEME.primaryNeon, secondaryDark: THEME.primary, secondaryGlow: THEME.primarySoft, secondaryBorder: THEME.primaryBorder,
  background: THEME.background, surface: '#1B191E', surface2: THEME.surface2, surface3: THEME.surface3, card: '#1B191E',
  textPrimary: THEME.textPrimary, textSecondary: THEME.textSecondary, textMuted: THEME.textMuted, textDim: THEME.textDim,
  success: THEME.success, successLight: THEME.successSoft, error: THEME.error, errorLight: THEME.errorSoft, warning: THEME.warning, warningLight: THEME.warningSoft,
  border: THEME.border, borderLight: THEME.borderStrong, overlay: THEME.overlay, overlayLight: THEME.overlayLight,
  white: THEME.white, black: THEME.black, transparent: 'transparent',
  primarySoft: THEME.primarySoft, primaryBorder: THEME.primaryBorder, primaryNeon: THEME.primaryNeon,
};
import SafeBottomBar from '../../components/SafeBottomBar';

const SECTIONS = [
  {
    id: 'personal',
    label: 'Personal Details',
    sub: 'Name, email, date of birth',
    icon: 'person-outline',
    color: '#A855F7',
    bg: 'rgba(168,85,247,0.12)',
    nav: 'PersonalDetails',
  },
  {
    id: 'health',
    label: 'Health & Emergency Info',
    sub: 'Medical details & emergency contact',
    icon: 'heart-outline',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.12)',
    nav: 'HealthEmergency',
  },
  {
    id: 'consents',
    label: 'Preferences & Consents',
    sub: 'Opt-in settings & consent records',
    icon: 'shield-checkmark-outline',
    color: COLORS.secondary,
    bg: COLORS.secondaryGlow,
    nav: 'ConsentPreferences',
  },
];

export default function EditProfileScreen({ navigation }) {
  const logout = useAuthStore((s) => s.logout);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete My Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Your data will be scheduled for permanent deletion.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await requestAccountDeletion();
                      await logout();
                    } catch (err) {
                      Alert.alert('Error', err?.response?.data?.message || 'Could not process your request. Please try again.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <SafeBottomBar style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={s.glowTop} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Personal Info</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Text style={s.hint}>Edit details and preferences.</Text>

        <View style={s.list}>
          {SECTIONS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={s.card}
              onPress={() => navigation.navigate(item.nav)}
              activeOpacity={0.75}
            >
              <View style={[s.iconWrap, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <View style={s.cardInfo}>
                <Text style={s.cardLabel}>{item.label}</Text>
                <Text style={s.cardSub}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Delete Account */}
        <TouchableOpacity style={s.deleteBtn} onPress={handleDeleteAccount} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={15} color="#F87171" />
          <Text style={s.deleteText}>Delete My Account</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeBottomBar>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  glowTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 260,
    backgroundColor: 'rgba(127,41,130,0.05)',
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: FONTS.headline, fontSize: 16, color: COLORS.textPrimary, letterSpacing: 3 },

  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },

  hint: { fontSize: 13, color: COLORS.textMuted, marginBottom: 20 },

  list: { gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1C1C1E', borderRadius: 16, borderWidth: 1, borderColor: '#333',
    padding: 18,
  },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  cardSub: { fontSize: 12, color: COLORS.textMuted },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, marginTop: 28,
  },
  deleteText: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: '#F87171', opacity: 0.8 },
});
