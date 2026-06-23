import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Linking, Alert,
  LayoutAnimation, UIManager, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';
import SafeBottomBar from '../../components/SafeBottomBar';
import GradientIcon from '../../components/GradientIcon';

// ⚠ TODO: replace with the real BuildGym support number before release.
const SUPPORT_PHONE = '+910000000000';
const SUPPORT_EMAIL = 'reception@buildgym.in';

const open = (url) =>
  Linking.openURL(url).catch(() =>
    Alert.alert('Unavailable', 'Could not open this on your device.'),
  );

// FAQ — answers reworded to route members to "register a complaint" (no tickets).
const FAQS = [
  {
    q: 'How do I cancel a booking?',
    a: 'Go to My Bookings, select the session, and tap Cancel. Cancellations over 2 hours before the session are fully refunded.',
  },
  {
    q: 'What is the Build Coins refund policy?',
    a: 'Coins are refunded for cancellations made more than 2 hours before a session. Within 2 hours, coins are non-refundable.',
  },
  {
    q: 'Can I freeze my membership?',
    a: 'Yes. Contact the front desk or register a complaint below to request a membership freeze.',
  },
  {
    q: 'How do I change my registered phone number?',
    a: 'Your phone number is locked for security. Register a complaint and our team will verify and update it.',
  },
  {
    q: 'Who do I contact for locker issues?',
    a: 'Register a complaint describing the locker issue and our staff will resolve it within 24 hours.',
  },
];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SupportScreen({ navigation }) {
  const [openIdx, setOpenIdx] = useState(null);
  const toggle = (i) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIdx((cur) => (cur === i ? null : i));
  };

  return (
    <SafeBottomBar style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <TouchableOpacity style={s.floatLeft} onPress={() => navigation.goBack()} hitSlop={10} activeOpacity={0.7}>
        <GradientIcon name="arrow-back" size={24} />
      </TouchableOpacity>
      <Text style={s.headerTitle}>Support</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Contact options */}
        <View style={s.contactRow}>
          <TouchableOpacity
            style={s.contactCard}
            activeOpacity={0.85}
            onPress={() => open(`https://wa.me/${SUPPORT_PHONE.replace(/[^\d]/g, '')}`)}
          >
            <View style={[s.contactIcon, { backgroundColor: 'rgba(37,211,102,0.14)' }]}>
              <MaterialIcons name="chat" size={22} color="#25D366" />
            </View>
            <Text style={s.contactLabel}>WhatsApp</Text>
            <Text style={s.contactSub}>Replies in ~5 min</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.contactCard}
            activeOpacity={0.85}
            onPress={() => open(`tel:${SUPPORT_PHONE}`)}
          >
            <View style={[s.contactIcon, { backgroundColor: 'rgba(96,165,250,0.14)' }]}>
              <MaterialIcons name="call" size={22} color="#60A5FA" />
            </View>
            <Text style={s.contactLabel}>Call Us</Text>
            <Text style={s.contactSub}>24/7 concierge</Text>
          </TouchableOpacity>
        </View>

        {/* FAQ */}
        <Text style={s.sectionLabel}>Frequently Asked</Text>
        <View style={s.faqList}>
          {FAQS.map((f, i) => {
            const expanded = openIdx === i;
            return (
              <TouchableOpacity
                key={i}
                style={s.faqItem}
                activeOpacity={0.8}
                onPress={() => toggle(i)}
              >
                <View style={s.faqHead}>
                  <Text style={s.faqQ} numberOfLines={expanded ? 0 : 2}>{f.q}</Text>
                  <MaterialIcons
                    name={expanded ? 'expand-less' : 'chevron-right'}
                    size={22}
                    color={COLORS.textMuted}
                  />
                </View>
                {expanded && <Text style={s.faqA}>{f.a}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Register a Complaint CTA (replaces Stitch ticket form) */}
        <Text style={s.sectionLabel}>Still need help?</Text>
        <TouchableOpacity
          style={s.complaintCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Complaint')}
        >
          <View style={s.complaintIcon}>
            <MaterialIcons name="report" size={22} color="#F87171" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.complaintTitle}>Register a Complaint</Text>
            <Text style={s.complaintSub}>Report an issue and our team will follow up</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>

        <Text style={s.note}>Build Gym · Member concierge</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeBottomBar>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  floatLeft: { position: 'absolute', top: 52, left: 20, zIndex: 100, padding: 4 },
  headerTitle: { fontFamily: FONTS.bodyBold, fontSize: 16, color: COLORS.white, textAlign: 'center', marginTop: 54 },

  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },

  contactRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  contactCard: {
    flex: 1, backgroundColor: '#1A1A2E', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    padding: 16, alignItems: 'flex-start', gap: 6,
  },
  contactIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  contactLabel: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.white },
  contactSub: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted },

  sectionLabel: {
    fontFamily: FONTS.label, fontSize: 11, color: COLORS.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12,
  },
  faqList: { gap: 10, marginBottom: 24 },
  faqItem: {
    backgroundColor: '#1A1A2E', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  faqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  faqQ: { flex: 1, fontFamily: FONTS.bodyMedium, fontSize: 14, color: COLORS.white },
  faqA: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginTop: 10 },

  complaintCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1A1A2E', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', padding: 16,
  },
  complaintIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(248,113,113,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  complaintTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.white, marginBottom: 2 },
  complaintSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },

  note: {
    fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted,
    textAlign: 'center', letterSpacing: 2, marginTop: 28, opacity: 0.6,
  },
});
