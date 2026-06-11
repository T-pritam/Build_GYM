import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';
import SafeBottomBar from '../../components/SafeBottomBar';

// ⚠ TODO: replace with the real BuildGym support number before release.
const SUPPORT_PHONE = '+910000000000';
const SUPPORT_EMAIL = 'reception@buildgym.in';

const open = (url) =>
  Linking.openURL(url).catch(() =>
    Alert.alert('Unavailable', 'Could not open this on your device.'),
  );

const OPTIONS = [
  {
    id: 'call', label: 'Call Reception', sub: '24/7 concierge assistance',
    icon: 'call-outline', color: '#2DD4BF', bg: 'rgba(45,212,191,0.14)',
    onPress: () => open(`tel:${SUPPORT_PHONE}`),
  },
  {
    id: 'whatsapp', label: 'WhatsApp', sub: 'Chat with our team',
    icon: 'logo-whatsapp', color: '#25D366', bg: 'rgba(37,211,102,0.14)',
    onPress: () => open(`https://wa.me/${SUPPORT_PHONE.replace(/[^\d]/g, '')}`),
  },
  {
    id: 'email', label: 'Email Us', sub: SUPPORT_EMAIL,
    icon: 'mail-outline', color: '#60A5FA', bg: 'rgba(96,165,250,0.14)',
    onPress: () => open(`mailto:${SUPPORT_EMAIL}`),
  },
];

export default function SupportScreen({ navigation }) {
  return (
    <SafeBottomBar style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>SUPPORT</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Ionicons name="headset" size={30} color={COLORS.primaryLight} />
          </View>
          <Text style={s.heroTitle}>How can we help?</Text>
          <Text style={s.heroSub}>
            Our concierge team is available around the clock for anything you need.
          </Text>
        </View>

        <View style={s.list}>
          {OPTIONS.map((o) => (
            <TouchableOpacity key={o.id} style={s.option} onPress={o.onPress} activeOpacity={0.8}>
              <View style={[s.optionIcon, { backgroundColor: o.bg }]}>
                <Ionicons name={o.icon} size={22} color={o.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.optionLabel}>{o.label}</Text>
                <Text style={s.optionSub}>{o.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.note}>Build Gym · Member concierge</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeBottomBar>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: FONTS.headline, fontSize: 16, color: COLORS.textPrimary, letterSpacing: 3 },

  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },

  hero: { alignItems: 'center', marginBottom: 28 },
  heroIcon: {
    width: 64, height: 64, borderRadius: 18, backgroundColor: COLORS.primarySoft,
    borderWidth: 1, borderColor: COLORS.primaryBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  heroTitle: { fontFamily: FONTS.headline, fontSize: 22, color: COLORS.white, marginBottom: 8 },
  heroSub: {
    fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 20, maxWidth: 300,
  },

  list: { gap: 10 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16,
  },
  optionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.white, marginBottom: 2 },
  optionSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },

  note: {
    fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted,
    textAlign: 'center', letterSpacing: 2, marginTop: 28, opacity: 0.6,
  },
});
