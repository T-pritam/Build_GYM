import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert, TextInput, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS as THEME, FONTS } from '../../theme';

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
import {
  fetchMyMembership,
  pauseMembership,
  resumeMembershipPause,
  cancelMembershipPause,
} from '../../services/membershipService';

// ─── Pause status display ─────────────────────────────────────────────────────
const PAUSE_STATUS = {
  scheduled: { label: 'Scheduled', color: '#3B82F6' },
  active:    { label: 'Active',    color: '#F59E0B' },
  completed: { label: 'Completed', color: '#22C55E' },
  cancelled: { label: 'Cancelled', color: '#6B7280' },
};

// ─── Date helpers ─────────────────────────────────────────────────────────────
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays    = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/** Format a Date as a local YYYY-MM-DD string (no timezone shift). */
function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const fmtLong  = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtShort = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
const fmtRange = (p) => `${fmtShort(p.startDate)} → ${fmtShort(p.endDate)}`;

// Days a pause lasted: credited days once completed, else the planned span.
const pauseDays = (p) => {
  if (p.pauseDaysApplied != null) return p.pauseDaysApplied;
  return Math.max(0, Math.round((new Date(p.endDate) - new Date(p.startDate)) / (1000 * 60 * 60 * 24)));
};

export default function PauseSubscriptionScreen({ navigation }) {
  const [membershipData, setMembershipData] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  // Form state
  const [startDate, setStartDate] = useState(null); // Date | null
  const [endDate, setEndDate]     = useState(null); // Date | null
  const [reason, setReason]       = useState('');
  const [pickerMode, setPickerMode] = useState(null); // 'start' | 'end' | null

  const load = useCallback(async () => {
    try {
      const data = await fetchMyMembership();
      setMembershipData(data);
    } catch {
      Alert.alert('Error', 'Failed to load membership. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived values ────────────────────────────────────────────────────────
  const pauseInfo       = membershipData?.pause ?? {};
  const membership      = membershipData?.membership ?? null;
  const currentPause    = pauseInfo.currentPause ?? null;
  const pausesUsed      = pauseInfo.pausesUsed ?? 0;
  const permittedPauses = pauseInfo.permittedPauseCount ?? 0;
  const pausesRemaining = pauseInfo.pausesRemaining ?? 0;
  const maxPauseDays    = pauseInfo.maxPauseDays ?? 30;
  const pastPauses      = (pauseInfo.history ?? []).filter(
    (h) => h.status === 'completed' || h.status === 'cancelled',
  );

  const today = startOfDay(new Date());

  // End date can't exceed start + maxPauseDays, nor the membership end date.
  const maxEndDate = (() => {
    if (!startDate) return null;
    let cap = addDays(startDate, maxPauseDays);
    if (membership?.endDate) {
      const memEnd = startOfDay(new Date(membership.endDate));
      if (memEnd < cap) cap = memEnd;
    }
    return cap;
  })();

  const durationDays = startDate && endDate
    ? Math.round((startOfDay(endDate) - startOfDay(startDate)) / 86400000)
    : 0;

  const canSubmit = !!startDate && !!endDate && durationDays > 0 && pausesRemaining > 0 && !submitting;

  // ── Date picker handling ──────────────────────────────────────────────────
  const onPickDate = (mode, picked) => {
    if (!picked) return;
    const d = startOfDay(picked);
    if (mode === 'start') {
      setStartDate(d);
      // Clear an end date that no longer fits the new start
      if (endDate && (startOfDay(endDate) <= d || startOfDay(endDate) > addDays(d, maxPauseDays))) {
        setEndDate(null);
      }
    } else {
      setEndDate(d);
    }
  };

  const handleAndroidChange = (event, picked) => {
    const mode = pickerMode;
    setPickerMode(null);
    if (event.type === 'set') onPickDate(mode, picked);
  };

  const pickerValue = pickerMode === 'start'
    ? (startDate ?? today)
    : (endDate ?? (startDate ? addDays(startDate, 1) : today));
  const pickerMin = pickerMode === 'start'
    ? today
    : (startDate ? addDays(startDate, 1) : today);
  const pickerMax = pickerMode === 'end' ? maxEndDate : undefined;

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      Alert.alert('Incomplete', 'Please choose both a start and an end date.');
      return;
    }
    setSubmitting(true);
    try {
      await pauseMembership({
        startDate: toYMD(startDate),
        endDate:   toYMD(endDate),
        reason:    reason.trim() || undefined,
      });
      Alert.alert('Pause Saved', 'Your membership pause has been scheduled.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to schedule the pause.');
      setSubmitting(false);
    }
  };

  const handleResume = async (pauseId) => {
    setActioningId(pauseId);
    try {
      await resumeMembershipPause(pauseId);
      await load();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to resume membership.');
    } finally {
      setActioningId(null);
    }
  };

  const handleCancel = (pauseId) => {
    Alert.alert('Cancel Pause', 'Cancel this scheduled pause? It will not count against your limit.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Pause',
        style: 'destructive',
        onPress: async () => {
          setActioningId(pauseId);
          try {
            await cancelMembershipPause(pauseId);
            await load();
          } catch (err) {
            Alert.alert('Error', err?.response?.data?.message ?? 'Failed to cancel the pause.');
          } finally {
            setActioningId(null);
          }
        },
      },
    ]);
  };

  // ── Header (shared) ───────────────────────────────────────────────────────
  const Header = (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Pause Membership</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeBottomBar style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        {Header}
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.secondary} /></View>
      </SafeBottomBar>
    );
  }

  if (!membershipData) {
    return (
      <SafeBottomBar style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        {Header}
        <View style={styles.center}>
          <Ionicons name="card-outline" size={56} color="#333" />
          <Text style={styles.emptyTitle}>No Active Membership</Text>
          <Text style={styles.emptySubtitle}>You need an active membership to pause it.</Text>
        </View>
      </SafeBottomBar>
    );
  }

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.glowTop} />
      {Header}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Allowance summary ─── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{pausesRemaining}</Text>
            <Text style={styles.summaryLabel}>Pauses Left</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{pausesUsed}/{permittedPauses}</Text>
            <Text style={styles.summaryLabel}>Used</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{maxPauseDays}</Text>
            <Text style={styles.summaryLabel}>Max Days</Text>
          </View>
        </View>

        {/* ── Current pause ─── */}
        {currentPause ? (
          <>
            <Text style={styles.sectionTitle}>Current Pause</Text>
            <View style={styles.currentCard}>
              <View style={styles.currentRow}>
                <Ionicons
                  name={currentPause.status === 'active' ? 'pause-circle' : 'time-outline'}
                  size={22}
                  color={PAUSE_STATUS[currentPause.status]?.color ?? '#888'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.currentDates}>{fmtRange(currentPause)}</Text>
                  <Text style={styles.currentMeta}>
                    {currentPause.status === 'active' ? 'Active now' : 'Scheduled'}
                    {currentPause.isAdminOverride ? ' · set by gym staff' : ''}
                  </Text>
                </View>
              </View>
              {currentPause.status === 'active' ? (
                <TouchableOpacity
                  style={[styles.resumeBtn, actioningId === currentPause.id && { opacity: 0.6 }]}
                  onPress={() => handleResume(currentPause.id)}
                  disabled={actioningId === currentPause.id}
                >
                  {actioningId === currentPause.id
                    ? <ActivityIndicator size="small" color="#000" />
                    : <Text style={styles.resumeBtnText}>Resume Now</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.cancelBtn, actioningId === currentPause.id && { opacity: 0.6 }]}
                  onPress={() => handleCancel(currentPause.id)}
                  disabled={actioningId === currentPause.id}
                >
                  {actioningId === currentPause.id
                    ? <ActivityIndicator size="small" color="#EF4444" />
                    : <Text style={styles.cancelBtnText}>Cancel Pause</Text>}
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.note}>
              You already have a pause {currentPause.status === 'active' ? 'running' : 'scheduled'}.
              Resume or cancel it before scheduling another.
            </Text>
          </>
        ) : pausesRemaining <= 0 ? (
          /* ── Limit reached ─── */
          <View style={styles.limitCard}>
            <Ionicons name="information-circle-outline" size={22} color="#F59E0B" />
            <Text style={styles.limitText}>
              You have used all {permittedPauses} pause{permittedPauses === 1 ? '' : 's'} permitted on
              your plan. Please contact reception if you need to pause again.
            </Text>
          </View>
        ) : (
          /* ── New pause form ─── */
          <>
            <Text style={styles.sectionTitle}>Schedule a Pause</Text>

            {/* Start date */}
            <Text style={styles.fieldLabel}>START DATE</Text>
            <TouchableOpacity style={styles.dateField} onPress={() => setPickerMode('start')}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.secondary} />
              <Text style={[styles.dateFieldText, !startDate && styles.dateFieldPlaceholder]}>
                {startDate ? fmtLong(startDate) : 'Select start date (today or later)'}
              </Text>
            </TouchableOpacity>

            {/* End date */}
            <Text style={styles.fieldLabel}>END DATE</Text>
            <TouchableOpacity
              style={[styles.dateField, !startDate && styles.dateFieldDisabled]}
              onPress={() => startDate && setPickerMode('end')}
              disabled={!startDate}
            >
              <Ionicons name="calendar-outline" size={18} color={startDate ? COLORS.secondary : '#555'} />
              <Text style={[styles.dateFieldText, !endDate && styles.dateFieldPlaceholder]}>
                {endDate
                  ? fmtLong(endDate)
                  : startDate ? 'Select end date' : 'Choose a start date first'}
              </Text>
            </TouchableOpacity>

            {durationDays > 0 && (
              <Text style={styles.durationNote}>
                Your membership will be extended by {durationDays} day{durationDays === 1 ? '' : 's'}.
              </Text>
            )}
            <Text style={styles.maxNote}>A single pause can be at most {maxPauseDays} days on your plan.</Text>

            {/* Reason */}
            <Text style={styles.fieldLabel}>REASON (OPTIONAL)</Text>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Travelling, injury recovery…"
              placeholderTextColor="#555"
              multiline
              maxLength={300}
            />

            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#000" />
                : <Text style={styles.submitBtnText}>Confirm Pause</Text>}
            </TouchableOpacity>
          </>
        )}

        {/* ── Past pauses ─── */}
        {pastPauses.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Past Pauses</Text>
            <View style={styles.histCard}>
              {pastPauses.map((h, i) => {
                const meta = PAUSE_STATUS[h.status] ?? { label: h.status, color: '#888' };
                return (
                  <View
                    key={h.id}
                    style={[styles.histRow, i < pastPauses.length - 1 && styles.histRowBorder]}
                  >
                    <View style={[styles.histDot, { backgroundColor: meta.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.histDates}>{fmtRange(h)}</Text>
                      <Text style={styles.histMeta}>
                        {h.isAdminOverride ? 'By gym staff' : 'Self-requested'}
                        {h.resumedEarly && h.actualEndDate ? ` · resumed early on ${fmtShort(h.actualEndDate)}` : ''}
                        {h.pauseDaysApplied != null ? ` · ${pauseDays(h)} day${pauseDays(h) === 1 ? '' : 's'} paused` : ''}
                        {h.reason ? ` · ${h.reason}` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.histStatus, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ── Android inline picker ─── */}
      {Platform.OS === 'android' && pickerMode && (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="default"
          minimumDate={pickerMin}
          maximumDate={pickerMax}
          onChange={handleAndroidChange}
        />
      )}

      {/* ── iOS modal picker ─── */}
      {Platform.OS === 'ios' && (
        <Modal visible={!!pickerMode} transparent animationType="slide">
          <View style={styles.pickerBackdrop}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setPickerMode(null)}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>
                  {pickerMode === 'start' ? 'Start Date' : 'End Date'}
                </Text>
                <TouchableOpacity onPress={() => setPickerMode(null)}>
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerValue}
                mode="date"
                display="spinner"
                themeVariant="dark"
                minimumDate={pickerMin}
                maximumDate={pickerMax}
                onChange={(_e, picked) => onPickDate(pickerMode, picked)}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeBottomBar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  glowTop:   { position: 'absolute', top: 0, left: 0, right: 0, height: 220, backgroundColor: 'rgba(127,41,130,0.06)' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: FONTS.headline, fontSize: 16, color: COLORS.textPrimary, letterSpacing: 3 },

  scroll: { paddingHorizontal: 16, paddingBottom: 20 },

  emptyTitle:    { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#666', textAlign: 'center' },

  // Summary
  summaryCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1C1C1E', borderRadius: 16, borderWidth: 1, borderColor: '#333',
    paddingVertical: 16, marginTop: 4, marginBottom: 20,
  },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryValue:   { fontSize: 20, fontWeight: '900', color: COLORS.secondary },
  summaryLabel:   { fontSize: 10, color: '#888', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  summaryDivider: { width: 1, height: 32, backgroundColor: '#333' },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 12, marginTop: 4 },

  // Form fields
  fieldLabel: {
    fontSize: 10, fontWeight: '700', color: '#888', letterSpacing: 1.5,
    marginBottom: 8, marginTop: 12,
  },
  dateField: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#333',
    borderRadius: 12, paddingHorizontal: 14, height: 50,
  },
  dateFieldDisabled:    { opacity: 0.5 },
  dateFieldText:        { fontSize: 14, color: '#fff', fontWeight: '600', flex: 1 },
  dateFieldPlaceholder: { color: '#555', fontWeight: '400' },

  durationNote: { fontSize: 12, color: '#22C55E', marginTop: 10, fontWeight: '600' },
  maxNote:      { fontSize: 11, color: '#888', marginTop: 6 },

  reasonInput: {
    backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#333', borderRadius: 12,
    padding: 14, color: '#fff', fontSize: 14, minHeight: 70, textAlignVertical: 'top',
  },

  submitBtn: {
    height: 52, borderRadius: 14, backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center', marginTop: 20,
  },
  submitBtnDisabled: { backgroundColor: '#3A3A3A' },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#000' },

  // Current pause
  currentCard: {
    backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#333',
    padding: 16, gap: 14,
  },
  currentRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currentDates: { fontSize: 14, fontWeight: '700', color: '#fff' },
  currentMeta:  { fontSize: 11, color: '#888', marginTop: 2 },
  resumeBtn: {
    height: 44, borderRadius: 10, backgroundColor: '#F59E0B',
    alignItems: 'center', justifyContent: 'center',
  },
  resumeBtnText: { fontSize: 14, fontWeight: '800', color: '#000' },
  cancelBtn: {
    height: 44, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '800', color: '#EF4444' },
  note: { fontSize: 11, color: '#888', marginTop: 10, lineHeight: 16 },

  // Limit reached
  limitCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: 'rgba(245,158,11,0.08)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
    borderRadius: 12, padding: 14,
  },
  limitText: { flex: 1, fontSize: 12, color: '#e5e5e5', lineHeight: 18 },

  // History
  histCard: {
    backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#333',
    marginBottom: 16,
  },
  histRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  histRowBorder: { borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  histDot:       { width: 8, height: 8, borderRadius: 4 },
  histDates:     { fontSize: 13, color: '#e5e5e5', fontWeight: '600' },
  histMeta:      { fontSize: 10, color: '#888', marginTop: 2 },
  histStatus:    { fontSize: 11, fontWeight: '800' },

  // iOS picker modal
  pickerBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  pickerSheet:    { backgroundColor: '#1C1C1E', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#333',
  },
  pickerTitle:  { fontSize: 15, fontWeight: '800', color: '#fff' },
  pickerCancel: { fontSize: 14, color: '#888' },
  pickerDone:   { fontSize: 14, fontWeight: '800', color: COLORS.secondary },
});
