import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';
import SafeBottomBar from '../../components/SafeBottomBar';
import GradientIcon from '../../components/GradientIcon';

/**
 * BUILD Settings — visual shell only (per plan).
 * Toggles flip locally for feel; rows/buttons are NOT wired to any logic,
 * navigation, or persistence. The functional Log Out / account deletion live
 * on the Profile screen.
 */
export default function SettingsScreen({ navigation }) {
  const [toggles, setToggles] = useState({
    push: true, whatsapp: true, booking: true, classUpd: false, promo: false,
    visibility: true, rankings: true, sharing: false,
  });
  const flip = (key) => setToggles((t) => ({ ...t, [key]: !t[key] }));

  const LinkRow = ({ icon, label, value, locked }) => (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} disabled>
      <View style={styles.rowIcon}>
        <MaterialIcons name={icon} size={20} color={COLORS.textSecondary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {!!value && <Text style={styles.rowValue}>{value}</Text>}
      {locked
        ? <MaterialIcons name="lock" size={16} color={COLORS.textMuted} />
        : <MaterialIcons name="chevron-right" size={22} color={COLORS.textMuted} />}
    </TouchableOpacity>
  );

  const ToggleRow = ({ icon, label, k }) => (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <MaterialIcons name={icon} size={20} color={COLORS.textSecondary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={toggles[k]}
        onValueChange={() => flip(k)}
        trackColor={{ false: 'rgba(255,255,255,0.12)', true: COLORS.primary }}
        thumbColor={COLORS.white}
      />
    </View>
  );

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <TouchableOpacity style={styles.floatLeft} onPress={() => navigation.goBack()} hitSlop={10} activeOpacity={0.7}>
        <GradientIcon name="arrow-back" size={24} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Settings</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <LinkRow icon="key" label="Change Password" />
          <LinkRow icon="smartphone" label="Linked Phone" locked />
          <LinkRow icon="mail" label="Email Address" />
          <LinkRow icon="language" label="Language" value="English" />
        </View>

        {/* Notifications */}
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          <ToggleRow icon="notifications" label="Push Notifications" k="push" />
          <ToggleRow icon="forum" label="WhatsApp Alerts" k="whatsapp" />
          <ToggleRow icon="event" label="Booking Reminders" k="booking" />
          <ToggleRow icon="school" label="Class Updates" k="classUpd" />
          <ToggleRow icon="local-offer" label="Promotional Offers" k="promo" />
        </View>

        {/* Privacy */}
        <Text style={styles.sectionLabel}>Privacy</Text>
        <View style={styles.card}>
          <ToggleRow icon="visibility" label="Profile Visibility" k="visibility" />
          <ToggleRow icon="leaderboard" label="Show in Rankings" k="rankings" />
          <ToggleRow icon="share" label="Activity Sharing" k="sharing" />
          <LinkRow icon="analytics" label="Data & Analytics" />
        </View>

        {/* About */}
        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.card}>
          <LinkRow icon="help" label="Help & Support" />
          <LinkRow icon="policy" label="Privacy Policy" />
          <LinkRow icon="description" label="Terms & Conditions" />
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <MaterialIcons name="info" size={20} color={COLORS.textSecondary} />
            </View>
            <Text style={styles.rowLabel}>App Version</Text>
            <Text style={styles.rowValue}>2.1.0</Text>
          </View>
        </View>

        {/* Footer actions (visual only) */}
        <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.8} disabled>
          <MaterialIcons name="delete-outline" size={16} color="#F87171" />
          <Text style={styles.deleteText}>Request Account Deletion</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8} disabled>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeBottomBar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  floatLeft: { position: 'absolute', top: 52, left: 20, zIndex: 100, padding: 4 },
  headerTitle: { fontFamily: FONTS.bodyBold, fontSize: 16, color: COLORS.white, textAlign: 'center', marginTop: 54 },

  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },

  sectionLabel: {
    fontFamily: FONTS.label, fontSize: 11, color: COLORS.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, marginTop: 18,
  },
  card: {
    backgroundColor: '#1A1A2E', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rowIcon: { width: 28, alignItems: 'center' },
  rowLabel: { flex: 1, fontFamily: FONTS.bodyMedium, fontSize: 14, color: COLORS.white },
  rowValue: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted, marginRight: 6 },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 28, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', backgroundColor: 'rgba(248,113,113,0.06)',
  },
  deleteText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: '#F87171' },
  logoutBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginTop: 6 },
  logoutText: { fontFamily: FONTS.label, fontSize: 13, color: '#EF4444', letterSpacing: 2, opacity: 0.85 },
});
