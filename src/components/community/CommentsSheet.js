import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Keyboard, Modal,
  Animated, Dimensions, Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS as THEME, FONTS } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import {
  fetchComments, addComment, deleteComment, voteComment,
} from '../../services/communityService';

const COLORS = {
  background: THEME.background, surface: '#1B191E', surface2: THEME.surface2,
  secondary: THEME.primaryLight, primary: THEME.primary, cyan: THEME.cyan,
  textPrimary: THEME.textPrimary, textSecondary: THEME.textSecondary, textMuted: THEME.textMuted,
  border: THEME.border, glass: 'rgba(255,255,255,0.03)', glassBorder: 'rgba(255,255,255,0.08)',
  white: THEME.white,
};

const SCREEN_H = Dimensions.get('window').height;
const SHEET_H = Math.round(SCREEN_H * 0.75);

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const safe = dateStr.replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1').replace('+00', 'Z');
  const time = new Date(safe).getTime();
  if (isNaN(time)) return '';
  const mins = Math.floor((Date.now() - time) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/**
 * CommentsSheet — Stitch comments bottom sheet. Opened from a feed card's
 * COMMENTS button. Reuses the comment logic from PostDetailScreen.
 *
 * Props: visible, postId, onClose, onCountChange(delta) — keeps the feed
 * card's comment_count in sync as comments are added/removed.
 */
export default function CommentsSheet({ visible, postId, onClose, onCountChange }) {
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id;

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [kbHeight, setKbHeight] = useState(0);
  const slide = useRef(new Animated.Value(SHEET_H)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  const loadComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const data = await fetchComments(postId);
      setComments(data || []);
    } catch (err) {
      console.warn('Comments load error:', err);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (visible) {
      setComments([]); setCommentText(''); setSubmitting(false);
      loadComments();
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      slide.setValue(SHEET_H);
      backdrop.setValue(0);
    }
  }, [visible, loadComments, slide, backdrop]);

  const requestClose = () => {
    Animated.parallel([
      Animated.timing(slide, { toValue: SHEET_H, duration: 220, useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose && onClose());
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const newComment = await addComment(postId, commentText.trim());
      setComments((prev) => [{
        ...newComment,
        author_name: user?.fullName || 'You',
        author_avatar: user?.profilePhotoUrl || null,
      }, ...prev]);
      setCommentText('');
      onCountChange && onCountChange(1);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = (commentId) => {
    Alert.alert('Delete Comment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(commentId);
            setComments((prev) => prev.filter((c) => c.id !== commentId));
            onCountChange && onCountChange(-1);
          } catch {
            Alert.alert('Error', 'Failed to delete comment');
          }
        },
      },
    ]);
  };

  const voteTimersRef = useRef({});
  const handleCommentVote = (commentId, type) => {
    clearTimeout(voteTimersRef.current[commentId]);
    voteTimersRef.current[commentId] = setTimeout(async () => {
      delete voteTimersRef.current[commentId];
      try {
        const result = await voteComment(commentId, type);
        setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, ...result } : c)));
      } catch { /* silent */ }
    }, 1000);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={requestClose}>
      <View style={[styles.root, kbHeight > 0 && { paddingBottom: kbHeight }]}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slide }] }]}>
          <View style={{ flex: 1 }}>
            {/* Drag handle */}
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Comments</Text>
              <Text style={styles.headerCount}>
                {loading ? '…' : `${comments.length} comment${comments.length !== 1 ? 's' : ''}`}
              </Text>
            </View>

            {/* List */}
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="small" color={COLORS.secondary} />
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {comments.length === 0 ? (
                  <Text style={styles.noComments}>No comments yet. Be the first!</Text>
                ) : comments.map((c) => {
                  const cScore = (c.upvotes || 0) - (c.downvotes || 0);
                  const canDelete = c.member_id === currentUserId;
                  return (
                    <View key={c.id} style={styles.commentRow}>
                      {c.author_avatar ? (
                        <Image source={{ uri: c.author_avatar }} style={styles.commentAvatar} />
                      ) : (
                        <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
                          <Ionicons name="person" size={14} color={COLORS.textMuted} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <View style={styles.commentMeta}>
                          <Text style={styles.commentAuthor}>{c.author_name || '[Deleted Member]'}</Text>
                          <Text style={styles.commentTime}>{timeAgo(c.created_at)}</Text>
                          {canDelete && (
                            <TouchableOpacity onPress={() => handleDeleteComment(c.id)} hitSlop={8} style={{ marginLeft: 'auto' }}>
                              <Ionicons name="trash-outline" size={14} color={COLORS.textMuted} />
                            </TouchableOpacity>
                          )}
                        </View>
                        <Text style={styles.commentBody}>{c.body}</Text>
                        <View style={styles.commentVoteRow}>
                          <TouchableOpacity onPress={() => handleCommentVote(c.id, 'up')} hitSlop={6}>
                            <Ionicons
                              name={c.user_vote === 'up' ? 'arrow-up' : 'arrow-up-outline'}
                              size={15}
                              color={c.user_vote === 'up' ? COLORS.secondary : COLORS.textMuted}
                            />
                          </TouchableOpacity>
                          <Text style={styles.commentScore}>{cScore}</Text>
                          <TouchableOpacity onPress={() => handleCommentVote(c.id, 'down')} hitSlop={6}>
                            <Ionicons
                              name={c.user_vote === 'down' ? 'arrow-down' : 'arrow-down-outline'}
                              size={15}
                              color={c.user_vote === 'down' ? '#FF4444' : COLORS.textMuted}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* Input */}
            <View style={styles.inputBar}>
              {user?.profilePhotoUrl ? (
                <Image source={{ uri: user.profilePhotoUrl }} style={styles.inputAvatar} />
              ) : (
                <View style={[styles.inputAvatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={16} color={COLORS.textMuted} />
                </View>
              )}
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="Write a comment..."
                  placeholderTextColor={COLORS.textMuted}
                  value={commentText}
                  onChangeText={setCommentText}
                  maxLength={200}
                  onSubmitEditing={handleAddComment}
                />
                <TouchableOpacity
                  onPress={handleAddComment}
                  disabled={!commentText.trim() || submitting}
                  style={[styles.sendBtn, (!commentText.trim() || submitting) && { opacity: 0.4 }]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Ionicons name="arrow-up" size={18} color={COLORS.white} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  handleWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 6 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },

  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder },
  headerTitle: { fontSize: 16, color: COLORS.white, fontFamily: FONTS.bodyBold },
  headerCount: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.body },

  listContent: { padding: 20, gap: 18 },
  noComments: { fontSize: 14, color: COLORS.textMuted, fontStyle: 'italic', fontFamily: FONTS.body },

  commentRow: { flexDirection: 'row', gap: 12 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16 },
  avatarPlaceholder: { backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center' },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  commentAuthor: { fontSize: 13, color: COLORS.white, fontFamily: FONTS.bodyBold },
  commentTime: { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.body },
  commentBody: { fontSize: 13, color: COLORS.white, lineHeight: 20, fontFamily: FONTS.body },
  commentVoteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  commentScore: { fontSize: 12, color: COLORS.textMuted, minWidth: 14, textAlign: 'center', fontFamily: FONTS.bodyBold },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: COLORS.glassBorder, backgroundColor: '#1A1A2E',
  },
  inputAvatar: { width: 36, height: 36, borderRadius: 18 },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0D0D0F', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(127,41,130,0.40)',
    paddingLeft: 14, paddingRight: 4, paddingVertical: 4,
  },
  input: { flex: 1, fontSize: 14, color: COLORS.white, paddingVertical: 8, fontFamily: FONTS.body },
  sendBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});
