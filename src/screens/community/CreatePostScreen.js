import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { createCommunityPost } from '../../services/communityService';
import { useAuthStore } from '../../store/authStore';
import { logEvent } from '../../services/analyticsService';

const CATEGORIES = [
  { key: 'transformation', label: 'Transformation', icon: 'body-outline', color: '#A855F7' },
  { key: 'workout', label: 'Workout', icon: 'barbell-outline', color: COLORS.secondary },
  { key: 'nutrition', label: 'Nutrition', icon: 'nutrition-outline', color: '#22C55E' },
  { key: 'question', label: 'Question', icon: 'help-circle-outline', color: '#3B82F6' },
  { key: 'motivation', label: 'Motivation', icon: 'heart-outline', color: '#F59E0B' },
  { key: 'achievement', label: 'Achievement', icon: 'trophy-outline', color: '#EC4899' },
  { key: 'poll', label: 'Poll', icon: 'bar-chart-outline', color: '#06B6D4' },
];

const MAX_BODY_CHARS = 500;
const MAX_OPTION_CHARS = 100;

export default function CreatePostScreen({ navigation }) {
  const [body, setBody] = useState('');
  const [category, setCategory] = useState(null);
  const [image, setImage] = useState(null);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);

  const isPoll = category === 'poll';

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setImage(result.assets[0]);
    }
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index, text) => {
    const updated = [...pollOptions];
    updated[index] = text;
    setPollOptions(updated);
  };

  const canSubmit = () => {
    if (!body.trim() || !category) return false;
    if (body.length > MAX_BODY_CHARS) return false;
    if (isPoll) {
      const validOptions = pollOptions.filter((o) => o.trim().length > 0);
      if (validOptions.length < 2) return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!canSubmit() || submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        body: body.trim(),
        category,
        image: image || undefined,
      };
      if (isPoll) {
        payload.isPoll = true;
        payload.options = pollOptions.filter((o) => o.trim().length > 0).map((o) => o.trim());
      }
      await createCommunityPost(payload);
      logEvent('community_post_created', {
        member_id: useAuthStore.getState().user?.displayId ?? 'guest',
      }).catch(() => {});
      navigation.goBack();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to create post';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>New Post</Text>
        <View style={[styles.headerSide, styles.headerSideRight]}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit() || submitting}
            style={[styles.postBtn, (!canSubmit() || submitting) && styles.postBtnDisabled]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.postBtnText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Category Picker */}
        <Text style={styles.sectionLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryChip,
                category === cat.key && { backgroundColor: cat.color + '22', borderColor: cat.color },
              ]}
              onPress={() => setCategory(cat.key)}
            >
              <Ionicons
                name={cat.icon}
                size={16}
                color={category === cat.key ? cat.color : COLORS.textMuted}
              />
              <Text style={[
                styles.categoryChipText,
                category === cat.key && { color: cat.color },
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Body Input */}
        <Text style={styles.sectionLabel}>What's on your mind?</Text>
        <View style={styles.bodyContainer}>
          <TextInput
            style={styles.bodyInput}
            placeholder="Share your progress, ask a question..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={MAX_BODY_CHARS}
            value={body}
            onChangeText={setBody}
          />
          <Text style={[
            styles.charCount,
            body.length > MAX_BODY_CHARS * 0.9 && styles.charCountWarn,
          ]}>
            {body.length}/{MAX_BODY_CHARS}
          </Text>
        </View>

        {/* Image Picker (not for polls) */}
        {!isPoll && (
          <View style={styles.imageSection}>
            {image ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: image.uri }} style={styles.imagePreview} contentFit="cover" />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setImage(null)}
                >
                  <Ionicons name="close-circle" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                <Ionicons name="image-outline" size={24} color={COLORS.textMuted} />
                <Text style={styles.addImageText}>Add Photo (optional)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Poll Options */}
        {isPoll && (
          <View style={styles.pollSection}>
            <Text style={styles.sectionLabel}>Poll Options (2–4)</Text>
            {pollOptions.map((opt, i) => (
              <View key={i} style={styles.pollOptionRow}>
                <View style={styles.pollOptionNum}>
                  <Text style={styles.pollOptionNumText}>{i + 1}</Text>
                </View>
                <TextInput
                  style={styles.pollOptionInput}
                  placeholder={`Option ${i + 1}`}
                  placeholderTextColor={COLORS.textMuted}
                  maxLength={MAX_OPTION_CHARS}
                  value={opt}
                  onChangeText={(t) => updatePollOption(i, t)}
                />
                {pollOptions.length > 2 && (
                  <TouchableOpacity onPress={() => removePollOption(i)} hitSlop={8}>
                    <Ionicons name="close-circle-outline" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {pollOptions.length < 4 && (
              <TouchableOpacity style={styles.addOptionBtn} onPress={addPollOption}>
                <Ionicons name="add-circle-outline" size={18} color={COLORS.secondary} />
                <Text style={styles.addOptionText}>Add option</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12,
  },
  headerSide: {
    width: 84,
    justifyContent: 'center',
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white, textAlign: 'center' },
  postBtn: {
    backgroundColor: COLORS.secondary, paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, minWidth: 70, alignItems: 'center',
  },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  content: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: COLORS.textSecondary,
    marginBottom: 8, marginTop: 16,
  },
  categoryRow: { flexDirection: 'row', marginBottom: 4 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    marginRight: 8,
  },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  bodyContainer: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14 },
  bodyInput: {
    fontSize: 15, color: COLORS.white, minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginTop: 4 },
  charCountWarn: { color: COLORS.warning },
  imageSection: { marginTop: 16 },
  addImageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: 14, paddingVertical: 24,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  addImageText: { fontSize: 14, color: COLORS.textMuted },
  imagePreviewContainer: { position: 'relative' },
  imagePreview: { width: '100%', height: 200, borderRadius: 14, backgroundColor: COLORS.surface2 },
  removeImageBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 14,
  },
  pollSection: { marginTop: 8 },
  pollOptionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 10,
  },
  pollOptionNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.surface2,
    justifyContent: 'center', alignItems: 'center',
  },
  pollOptionNumText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  pollOptionInput: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: COLORS.white,
  },
  addOptionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8,
  },
  addOptionText: { fontSize: 13, fontWeight: '600', color: COLORS.secondary },
});
