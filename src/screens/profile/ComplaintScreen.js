import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { submitComplaint, fetchMemberComplaints } from '../../services/api';
import { useUser } from '../../context/UserContext';

const complaintCategories = [
  'Equipment Issue', 'Staff Behaviour', 'Hygiene', 'Café Quality',
  'Facilities', 'Billing', 'Safety', 'Other',
];

const STATUS_COLORS = {
  open:        COLORS.warning,
  in_progress: '#3B82F6',
  resolved:    COLORS.success || '#22C55E',
};
const STATUS_LABELS = {
  open: 'Open', in_progress: 'In Progress', resolved: 'Resolved',
};

export default function ComplaintScreen({ navigation }) {
  const { userId } = useUser();
  const [tab, setTab] = useState('new'); // 'new' | 'history'
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [myComplaints, setMyComplaints] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!userId) return;
    setHistoryLoading(true);
    try {
      const data = await fetchMemberComplaints(userId);
      setMyComplaints(data || []);
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab, loadHistory]);

  const handleSubmit = async () => {
    if (!selectedCategory || description.trim().length < 20) {
      Alert.alert('Missing Info', 'Please select a category and provide a description (min 20 characters).');
      return;
    }
    setLoading(true);
    try {
      const complaint = await submitComplaint(userId, selectedCategory, description.trim());
      setReferenceId(complaint?.referenceId || '');
      setSubmitted(true);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to submit complaint. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['rgba(33,150,243,0.12)', 'transparent']} style={StyleSheet.absoluteFill} />
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={72} color="#2196F3" />
        </View>
        <Text style={styles.successTitle}>Complaint Registered</Text>
        <Text style={styles.successSub}>
          Your complaint has been submitted successfully. Our team will look into it and respond within 24-48 hours.
        </Text>
        <View style={styles.successDetails}>
          <View style={styles.successRow}>
            <Text style={styles.successLabel}>Category</Text>
            <Text style={styles.successValue}>{selectedCategory}</Text>
          </View>
          <View style={styles.successRow}>
            <Text style={styles.successLabel}>Status</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.warning }} />
              <Text style={[styles.successValue, { color: COLORS.warning }]}>Pending Review</Text>
            </View>
          </View>
          <View style={[styles.successRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.successLabel}>Reference ID</Text>
            <Text style={styles.successValue}>{referenceId || '—'}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.backHomeBtn, { marginBottom: 12 }]}
          onPress={() => { setSubmitted(false); setTab('history'); loadHistory(); }}
        >
          <LinearGradient
            colors={[COLORS.secondary, COLORS.secondaryDark]}
            style={styles.backHomeBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.backHomeBtnText}>VIEW MY COMPLAINTS</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => navigation.goBack()}>
          <View style={[styles.backHomeBtnGradient, { backgroundColor: COLORS.surface }]}>
            <Text style={[styles.backHomeBtnText, { color: COLORS.textMuted }]}>BACK TO PROFILE</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1A0800', '#0D0D0D']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register Complaint</Text>
        <View style={{ width: 42 }} />
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'new' && styles.tabBtnActive]} onPress={() => setTab('new')}>
          <Text style={[styles.tabText, tab === 'new' && styles.tabTextActive]}>New Complaint</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]} onPress={() => setTab('history')}>
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>My Complaints</Text>
        </TouchableOpacity>
      </View>

      {tab === 'history' ? (
        <View style={{ flex: 1 }}>
          {historyLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={COLORS.secondary} size="large" />
            </View>
          ) : (
            <FlatList
              data={myComplaints}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 12 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingTop: 60 }}>
                  <Ionicons name="clipboard-outline" size={48} color={COLORS.textMuted} />
                  <Text style={{ color: COLORS.textMuted, marginTop: 12, fontSize: 14 }}>No complaints filed yet</Text>
                </View>
              }
              renderItem={({ item }) => {
                const statusColor = STATUS_COLORS[item.status] || COLORS.textMuted;
                return (
                  <View style={styles.historyCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={styles.historyRef}>{item.referenceId || item.id?.slice(0, 8)}</Text>
                      <View style={[styles.statusBadge, { borderColor: statusColor + '60', backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>{STATUS_LABELS[item.status] || item.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.historyCat}>{item.category}</Text>
                    <Text style={styles.historyDesc} numberOfLines={2}>{item.description}</Text>
                    <Text style={styles.historyDate}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                    </Text>
                    {item.resolutionNote ? (
                      <View style={styles.resolutionBox}>
                        <Text style={styles.resolutionLabel}>Resolution Note</Text>
                        <Text style={styles.resolutionText}>{item.resolutionNote}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              }}
            />
          )}
        </View>
      ) : (

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info box */}
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.secondary} />
            <Text style={styles.infoText}>
              All complaints are reviewed by the Build Gym management team within 24-48 hours.
            </Text>
          </View>

          {/* Category */}
          <Text style={styles.fieldLabel}>COMPLAINT CATEGORY *</Text>
          <View style={styles.categoryGrid}>
            {complaintCategories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, selectedCategory === cat && styles.catChipSelected]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[styles.catChipText, selectedCategory === cat && styles.catChipTextSelected]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <Text style={styles.fieldLabel}>DESCRIPTION *</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue in detail (minimum 20 characters)..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>

          {/* Guidelines */}
          <View style={styles.guidelinesBox}>
            <Text style={styles.guidelinesTitle}>Guidelines</Text>
            {[
              'Be specific about the issue you faced.',
              'Include date and time if relevant.',
              'Avoid offensive or inappropriate language.',
              'Complaints are reviewed within 24-48 hours.',
            ].map((g, i) => (
              <View key={i} style={styles.guidelineRow}>
                <View style={styles.guidelineDot} />
                <Text style={styles.guidelineText}>{g}</Text>
              </View>
            ))}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!selectedCategory || description.trim().length < 20 || loading) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={
                selectedCategory && description.trim().length >= 20 && !loading
                  ? [COLORS.secondary, COLORS.secondaryDark]
                  : ['#333', '#222']
              }
              style={styles.submitBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <>
                    <Ionicons name="send-outline" size={18} color={selectedCategory && description.trim().length >= 20 ? COLORS.white : COLORS.textMuted} />
                    <Text style={[styles.submitBtnText, (!selectedCategory || description.trim().length < 20) && { color: COLORS.textMuted }]}>
                      SUBMIT COMPLAINT
                    </Text>
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      )}
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
  infoBox: {
    flexDirection: 'row', gap: 10, backgroundColor: COLORS.secondaryGlow,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.secondaryBorder,
    padding: 14, marginBottom: 24, alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  fieldLabel: {
    fontSize: 10, fontWeight: '700', color: COLORS.secondary, letterSpacing: 2, marginBottom: 12,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  catChipSelected: { backgroundColor: COLORS.secondaryGlow, borderColor: COLORS.secondary },
  catChipText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  catChipTextSelected: { color: COLORS.secondary, fontWeight: '800' },
  textArea: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.border, color: COLORS.white, fontSize: 14,
    paddingHorizontal: 16, paddingVertical: 14, minHeight: 120, lineHeight: 20,
  },
  charCount: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginTop: 6, marginBottom: 20 },
  guidelinesBox: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.border, padding: 16, marginBottom: 24,
  },
  guidelinesTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 12 },
  guidelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  guidelineDot: {
    width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.secondary,
    marginTop: 6, flexShrink: 0,
  },
  guidelineText: { flex: 1, fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  submitBtn: { borderRadius: 14, overflow: 'hidden' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 8,
  },
  submitBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.white, letterSpacing: 1.5 },
  successContainer: {
    flex: 1, backgroundColor: COLORS.background, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 32,
  },
  successIcon: { marginBottom: 20 },
  successTitle: { fontSize: 26, fontWeight: '900', color: COLORS.white, marginBottom: 10, textAlign: 'center' },
  successSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  successDetails: {
    width: '100%', backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 28,
  },
  successRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  successLabel: { fontSize: 13, color: COLORS.textMuted },
  successValue: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  backHomeBtn: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  backHomeBtnGradient: { paddingVertical: 15, alignItems: 'center' },
  backHomeBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.white, letterSpacing: 1.5 },
  tabRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 4, gap: 8 },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: COLORS.secondaryGlow, borderColor: COLORS.secondary },
  tabText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.secondary },
  historyCard: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 14,
  },
  historyRef: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted },
  statusBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  historyCat: { fontSize: 11, fontWeight: '700', color: COLORS.secondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  historyDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 4 },
  historyDate: { fontSize: 11, color: COLORS.textMuted },
  resolutionBox: {
    marginTop: 10, backgroundColor: 'rgba(34,197,94,0.08)',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', padding: 10,
  },
  resolutionLabel: { fontSize: 10, fontWeight: '800', color: '#22C55E', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  resolutionText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
});
