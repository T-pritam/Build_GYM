import React, { useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { complaintCategories } from '../../constants/dummyData';

export default function ComplaintScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selectedCategory || description.trim().length < 20) {
      Alert.alert('Missing Info', 'Please select a category and provide a description (min 20 characters).');
      return;
    }
    setSubmitted(true);
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
            <Text style={styles.successValue}>#CMP-{Math.floor(Math.random() * 9000) + 1000}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.backHomeBtn}
          onPress={() => navigation.goBack()}
        >
          <LinearGradient
            colors={[COLORS.secondary, COLORS.secondaryDark]}
            style={styles.backHomeBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.backHomeBtnText}>BACK TO PROFILE</Text>
          </LinearGradient>
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
              (!selectedCategory || description.trim().length < 20) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={
                selectedCategory && description.trim().length >= 20
                  ? [COLORS.secondary, COLORS.secondaryDark]
                  : ['#333', '#222']
              }
              style={styles.submitBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons
                name="send-outline"
                size={18}
                color={selectedCategory && description.trim().length >= 20 ? COLORS.white : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.submitBtnText,
                  (!selectedCategory || description.trim().length < 20) && { color: COLORS.textMuted },
                ]}
              >
                SUBMIT COMPLAINT
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
});
