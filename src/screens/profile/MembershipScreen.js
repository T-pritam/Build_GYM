import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { membership } from '../../constants/dummyData';

export default function MembershipScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1A0800', '#0D0D0D']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Membership</Text>
        <View style={{ width: 42 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Plan card */}
        <View style={styles.planCard}>
          <LinearGradient
            colors={['#2A1200', '#1A0800']}
            style={styles.planCardInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.planBadgeRow}>
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>{membership.type}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: COLORS.successLight }]}>
                <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
                <Text style={[styles.statusText, { color: COLORS.success }]}>{membership.status}</Text>
              </View>
            </View>

            <View style={styles.planDates}>
              <View>
                <Text style={styles.planDateLabel}>VALID FROM</Text>
                <Text style={styles.planDate}>
                  {new Date(membership.validFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <View style={styles.arrowWrap}>
                <Ionicons name="arrow-forward" size={20} color={COLORS.secondary} />
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.planDateLabel}>VALID TILL</Text>
                <Text style={styles.planDate}>
                  {new Date(membership.validTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            </View>

            {/* Days left bar */}
            <View style={styles.daysBar}>
              <View style={styles.daysBarInner}>
                <View style={[styles.daysBarFill, { width: `${(membership.daysLeft / 180) * 100}%` }]} />
              </View>
              <Text style={styles.daysText}>{membership.daysLeft} days remaining</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Features */}
        <Text style={styles.sectionTitle}>Plan Features</Text>
        {membership.planFeatures.map((feat, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={styles.featureCheck}>
              <Ionicons name="checkmark" size={14} color={COLORS.white} />
            </View>
            <Text style={styles.featureText}>{feat}</Text>
          </View>
        ))}

        {/* Renew note */}
        <View style={styles.renewNote}>
          <View style={styles.renewNoteIcon}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.secondary} />
          </View>
          <Text style={styles.renewNoteText}>
            Online renewal is not available yet. Please contact the reception desk to renew your membership.
          </Text>
        </View>

        {/* Contact buttons */}
        <View style={styles.contactBtns}>
          <TouchableOpacity style={styles.callBtn}>
            <Ionicons name="call-outline" size={18} color={COLORS.white} />
            <Text style={styles.callBtnText}>Call Reception</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.waBtn}>
            <Ionicons name="logo-whatsapp" size={18} color={COLORS.white} />
            <Text style={styles.waBtnText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  scroll: { padding: 20 },
  planCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 28 },
  planCardInner: { padding: 20, borderWidth: 1, borderColor: '#3A1A00' },
  planBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  planBadge: { backgroundColor: COLORS.secondary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  planBadgeText: { fontSize: 14, fontWeight: '900', color: COLORS.white, letterSpacing: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, gap: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  planDates: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  planDateLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2, marginBottom: 3 },
  planDate: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  arrowWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.secondaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  daysBar: { gap: 6 },
  daysBarInner: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden',
  },
  daysBarFill: { height: '100%', backgroundColor: COLORS.secondary, borderRadius: 3 },
  daysText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.white, marginBottom: 14 },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.border, padding: 12, marginBottom: 8,
  },
  featureCheck: {
    width: 24, height: 24, borderRadius: 8, backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  featureText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500', flex: 1 },
  renewNote: {
    flexDirection: 'row', gap: 10, backgroundColor: COLORS.secondaryGlow,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.secondaryBorder,
    padding: 14, marginTop: 20, marginBottom: 16, alignItems: 'flex-start',
  },
  renewNoteIcon: { marginTop: 1 },
  renewNoteText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  contactBtns: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  callBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, paddingVertical: 13, gap: 8,
  },
  callBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  waBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(37,211,102,0.1)', borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(37,211,102,0.25)', paddingVertical: 13, gap: 8,
  },
  waBtnText: { fontSize: 13, fontWeight: '700', color: '#25D366' },
});
