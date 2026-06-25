import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
  Animated, Dimensions, Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
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
// is a distinct post *type* chosen via the poll action toggle in the action bar.
const CATEGORIES = [
  { key: 'transformation', label: 'Transformation', icon: 'body-outline', color: '#A855F7' },
  { key: 'workout', label: 'Workout', icon: 'barbell-outline', color: THEME.primaryLight },
  { key: 'nutrition', label: 'Nutrition', icon: 'nutrition-outline', color: '#22C55E' },
  { key: 'question', label: 'Question', icon: 'help-circle-outline', color: '#3B82F6' },
  { key: 'motivation', label: 'Motivation', icon: 'heart-outline', color: '#F59E0B' },
  { key: 'achievement', label: 'Achievement', icon: 'trophy-outline', color: '#EC4899' },
];

const POLL_COLOR = '#2dd4bf';
const MAX_BODY_CHARS = 500;
const MAX_OPTION_CHARS = 100;

const SCREEN_H = Dimensions.get('window').height;
const SHEET_H = Math.round(SCREEN_H * 0.9);

/**
 * CreatePostSheet — Stitch "Create Post" bottom-sheet modal. Holds all of the
 * former CreatePostScreen logic (body / category / poll / image / submit) and
 * presents it as a slide-up sheet over the Community feed.
 *
 * Props: visible, onClose, onPosted (parent reloads the feed).
 */
export default function CreatePostSheet({ visible, onClose, onPosted }) {
  const user = useAuthStore((s) => s.user);

  const [body, setBody] = useState('');
  const [postType, setPostType] = useState('standard'); // 'standard' | 'poll'
  const [category, setCategory] = useState(null);
  const [image, setImage] = useState(null);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);

  const isPoll = postType === 'poll';

  // Slide / backdrop animation
  const slide = useRef(new Animated.Value(SHEET_H)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset the form each time the sheet opens.
      setBody(''); setPostType('standard'); setCategory(null);
      setImage(null); setPollOptions(['', '']); setSubmitting(false);
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      slide.setValue(SHEET_H);
      backdrop.setValue(0);
    }
  }, [visible, slide, backdrop]);

  const requestClose = () => {
    Animated.parallel([
      Animated.timing(slide, { toValue: SHEET_H, duration: 220, useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose && onClose());
  };

  const selectPostType = (type) => {
    setPostType(type);
    if (type === 'poll') { setCategory(null); setImage(null); }
  };

  const togglePoll = () => selectPostType(isPoll ? 'standard' : 'poll');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPostType('standard');
      setImage(result.assets[0]);
    }
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) setPollOptions([...pollOptions, '']);
  };
  const removePollOption = (index) => {
    if (pollOptions.length > 2) setPollOptions(pollOptions.filter((_, i) => i !== index));
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
      onPosted && onPosted();
      requestClose();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const submitEnabled = canSubmit() && !submitting;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={requestClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slide }] }]}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={requestClose} style={styles.headerSide} hitSlop={8}>
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
              {/* Member row */}
              <View style={styles.memberRow}>
                {user?.profilePhotoUrl ? (
                  <Image source={{ uri: user.profilePhotoUrl }} style={styles.memberAvatar} />
                ) : (
                  <View style={[styles.memberAvatar, styles.memberAvatarPlaceholder]}>
                    <Ionicons name="person" size={18} color={COLORS.textMuted} />
                  </View>
                )}
                <View>
                  <Text style={styles.memberName}>{user?.fullName || 'You'}</Text>
                  {/* <View style={styles.audienceChip}>
                    <Text style={styles.audienceText}>Everyone</Text>
                    <MaterialIcons name="expand-more" size={14} color={COLORS.textMuted} />
                  </View> */}
                </View>
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
                        <Text style={[styles.categoryChipText, category === cat.key && { color: cat.color }]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Body */}
              <TextInput
                style={styles.bodyInput}
                placeholder="What's on your mind?"
                placeholderTextColor={COLORS.textMuted}
                multiline
                maxLength={MAX_BODY_CHARS}
                value={body}
                onChangeText={setBody}
              />

              {/* Image preview (standard only) */}
              {!isPoll && image && (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: image.uri }} style={styles.imagePreview} contentFit="cover" />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImage(null)}>
                    <Ionicons name="close-circle" size={24} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Poll options */}
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

            {/* Action bar */}
            <View style={styles.actionBar}>
              <View style={styles.actionIcons}>
                <TouchableOpacity onPress={pickImage} hitSlop={6} disabled={isPoll}>
                  <MaterialIcons name="attach-file" size={22} color={isPoll ? COLORS.textMuted + '55' : COLORS.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={togglePoll} hitSlop={6}>
                  <MaterialIcons name="bar-chart" size={22} color={isPoll ? POLL_COLOR : COLORS.textMuted} />
                </TouchableOpacity>
                {/* Visual-only (no existing backing) */}
                <MaterialIcons name="alternate-email" size={22} color={COLORS.primary + '88'} />
                <MaterialIcons name="mood" size={22} color={COLORS.warning + '88'} />
              </View>
              <Text style={[styles.charCount, body.length > MAX_BODY_CHARS * 0.9 && styles.charCountWarn]}>
                {body.length}/{MAX_BODY_CHARS}
              </Text>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    height: SHEET_H, backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden',
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder,
  },
  headerSide: { width: 72, justifyContent: 'center' },
  headerSideRight: { alignItems: 'flex-end' },
  cancelText: { fontSize: 12, color: COLORS.cyan, fontFamily: FONTS.label, letterSpacing: 1 },
  headerTitle: { fontSize: 16, color: COLORS.white, textAlign: 'center', fontFamily: FONTS.bodyBold },
  postText: { fontSize: 14, color: COLORS.primary, fontFamily: FONTS.bodyBold, letterSpacing: 1 },
  postTextDisabled: { opacity: 0.4 },

  content: { padding: 20, paddingBottom: 30 },

  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: COLORS.glassBorder },
  memberAvatarPlaceholder: { backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center' },
  memberName: { fontSize: 14, color: COLORS.white, fontFamily: FONTS.bodyBold, marginBottom: 4 },
  audienceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start',
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: 999, paddingLeft: 10, paddingRight: 4, paddingVertical: 2,
  },
  audienceText: { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.label, letterSpacing: 1 },

  sectionLabel: {
    fontSize: 10, color: COLORS.secondary, letterSpacing: 1.5,
    marginBottom: 10, marginTop: 18, fontFamily: FONTS.label,
  },
  categoryRow: { flexDirection: 'row', marginBottom: 4 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder, marginRight: 8,
  },
  categoryChipText: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.label },

  bodyInput: {
    fontSize: 16, color: COLORS.white, minHeight: 120, marginTop: 12,
    textAlignVertical: 'top', fontFamily: FONTS.body, lineHeight: 24,
  },

  imagePreviewContainer: { position: 'relative', marginTop: 8 },
  imagePreview: { width: '100%', height: 200, borderRadius: 14, backgroundColor: COLORS.surface2 },
  removeImageBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 14 },

  pollSection: { marginTop: 4 },
  pollOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
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
  addOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addOptionText: { fontSize: 13, color: COLORS.primary, fontFamily: FONTS.bodyBold },

  actionBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: COLORS.glassBorder, backgroundColor: '#1A1A2E',
  },
  actionIcons: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  charCount: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.label },
  charCountWarn: { color: COLORS.warning },
});
