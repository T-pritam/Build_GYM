import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
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
  return (
    <SafeBottomBar style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={s.glowTop} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Text style={s.hint}>Choose a section to update your information.</Text>

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

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeBottomBar>
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
});
