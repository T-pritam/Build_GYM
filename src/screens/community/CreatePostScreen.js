import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS as THEME, FONTS } from '../../theme';
import { createCommunityPost } from '../../services/communityService';
import { useAuthStore } from '../../store/authStore';
import { logEvent } from '../../services/analyticsService';

// Theme-compat: legacy colour keys → new "Holographic Noir" palette.
const COLORS = {
  background: THEME.background, surface: '#1B191E', surface2: THEME.surface2,
  secondary: THEME.primaryLight, primary: THEME.primary, cyan: THEME.cyan, primaryBright: THEME.primaryBright,
  textPrimary: THEME.textPrimary, textSecondary: THEME.textSecondary, textMuted: THEME.textMuted,
  border: THEME.border, glass: 'rgba(255,255,255,0.03)', glassBorder: 'rgba(255,255,255,0.08)',
  white: THEME.white, warning: THEME.warning,
};

// Content categories for a standard post (single-select). "Poll" is NOT here — it
// is a distinct post *type* chosen via the POST TYPE toggle below.
const CATEGORIES = [
  { key: 'transformation', label: 'Transformation', icon: 'body-outline', color: '#A855F7' },
  { key: 'workout', label: 'Workout', icon: 'barbell-outline', color: THEME.primaryLight },
  { key: 'nutrition', label: 'Nutrition', icon: 'nutrition-outline', color: '#22C55E' },
  { key: 'question', label: 'Question', icon: 'help-circle-outline', color: '#3B82F6' },
  { key: 'motivation', label: 'Motivation', icon: 'heart-outline', color: '#F59E0B' },
  { key: 'achievement', label: 'Achievement', icon: 'trophy-outline', color: '#EC4899' },
];

const POLL_COLOR = '#06B6D4';

const MAX_BODY_CHARS = 500;
const MAX_OPTION_CHARS = 100;

export default function CreatePostScreen({ navigation }) {
  const [body, setBody] = useState('');
  const [postType, setPostType] = useState('standard'); // 'standard' | 'poll'
  const [category, setCategory] = useState(null);        // content category (standard only)
  const [image, setImage] = useState(null);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);

  const isPoll = postType === 'poll';

  // Switch post type. Choosing Poll clears the content category (a poll has none);
  // single-select is preserved — only one type and at most one category at a time.
  const selectPostType = (type) => {
    setPostType(type);
    if (type === 'poll') setCategory(null);
  };

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
    if (!body.trim()) return false;
    if (body.length > MAX_BODY_CHARS) return false;
    if (isPoll) {
      const validOptions = pollOptions.filter((o) => o.trim().length > 0);
      return validOptions.length >= 2;
    }
    // A standard post requires one content category.
    return !!category;
  };

  const handleSubmit = async () => {
    if (!canSubmit() || submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        body: body.trim(),
        category: isPoll ? 'poll' : category,
        image: isPoll ? undefined : (image || undefined),
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

  const submitEnabled = canSubmit() && !submitting;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerSide} hitSlop={8}>
          <Text style={styles.cancelText}>CANCEL</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!submitEnabled}
          style={[styles.headerSide, styles.headerSideRight]}
          hitSlop={8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={[styles.postText, !submitEnabled && styles.postTextDisabled]}>POST</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Post type — a Poll is a different kind of post (single-select) */}
        <Text style={[styles.sectionLabel, { marginTop: 4 }]}>POST TYPE</Text>
        <View style={styles.postTypeRow}>
          <TouchableOpacity
            style={[styles.postTypeChip, !isPoll && styles.postTypeChipActive]}
            onPress={() => selectPostType('standard')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="document-text-outline"
              size={16}
              color={!isPoll ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[styles.postTypeText, !isPoll && { color: COLORS.primary }]}>Standard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.postTypeChip, isPoll && styles.postTypeChipPollActive]}
            onPress={() => selectPostType('poll')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="bar-chart-outline"
              size={16}
              color={isPoll ? POLL_COLOR : COLORS.textMuted}
            />
            <Text style={[styles.postTypeText, isPoll && { color: POLL_COLOR }]}>Poll</Text>
          </TouchableOpacity>
        </View>

        {/* Category Picker — standard posts only */}
        {!isPoll && (
          <>
            <Text style={styles.sectionLabel}>CATEGORY</Text>
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
          </>
        )}

        {/* Body Input */}
        <View style={styles.bodyContainer}>
          <TextInput
            style={styles.bodyInput}
            placeholder="What's on your mind?"
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
            <Text style={styles.sectionLabel}>POLL OPTIONS (2–4)</Text>
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
                <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
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
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder,
  },
  headerSide: { width: 72, justifyContent: 'center' },
  headerSideRight: { alignItems: 'flex-end' },
  cancelText: { fontSize: 12, color: COLORS.cyan, fontFamily: FONTS.label, letterSpacing: 1 },
  headerTitle: { fontSize: 16, color: COLORS.white, textAlign: 'center', fontFamily: FONTS.bodyBold },
  postText: { fontSize: 14, color: COLORS.primary, fontFamily: FONTS.bodyBold, letterSpacing: 1 },
  postTextDisabled: { opacity: 0.4 },

  content: { padding: 20, paddingBottom: 40 },

  // Post type toggle
  postTypeRow: { flexDirection: 'row', gap: 10 },
  postTypeChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
  },
  postTypeChipActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(255,169,250,0.08)' },
  postTypeChipPollActive: { borderColor: POLL_COLOR, backgroundColor: 'rgba(6,182,212,0.10)' },
  postTypeText: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.bodyBold },

  sectionLabel: {
    fontSize: 10, color: COLORS.secondary, letterSpacing: 1.5,
    marginBottom: 10, marginTop: 18, fontFamily: FONTS.label,
  },
  categoryRow: { flexDirection: 'row', marginBottom: 4 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    marginRight: 8,
  },
  categoryChipText: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.label },
  bodyContainer: {
    backgroundColor: COLORS.glass, borderRadius: 14, padding: 14, marginTop: 18,
    borderWidth: 1, borderColor: COLORS.glassBorder,
  },
  bodyInput: {
    fontSize: 15, color: COLORS.white, minHeight: 120,
    textAlignVertical: 'top', fontFamily: FONTS.body,
  },
  charCount: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginTop: 4, fontFamily: FONTS.label },
  charCountWarn: { color: COLORS.warning },
  imageSection: { marginTop: 16 },
  addImageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.glass, borderRadius: 14, paddingVertical: 24,
    borderWidth: 1, borderColor: COLORS.glassBorder, borderStyle: 'dashed',
  },
  addImageText: { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.body },
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
  pollOptionNumText: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.bodyBold },
  pollOptionInput: {
    flex: 1, backgroundColor: COLORS.glass, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: COLORS.white, fontFamily: FONTS.body,
  },
  addOptionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8,
  },
  addOptionText: { fontSize: 13, color: COLORS.primary, fontFamily: FONTS.bodyBold },
});
