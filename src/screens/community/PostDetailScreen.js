import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import {
  fetchCommunityPost, votePost, fetchComments, addComment,
  deleteComment, voteComment, reportPost, deleteCommunityPost, votePoll,
} from '../../services/communityService';

const CATEGORY_COLORS = {
  transformation: '#A855F7',
  workout: COLORS.secondary,
  nutrition: '#22C55E',
  question: '#3B82F6',
  motivation: '#F59E0B',
  achievement: '#EC4899',
  poll: '#06B6D4',
};

const REPORT_REASONS = [
  { key: 'inappropriate', label: 'Inappropriate Content' },
  { key: 'spam', label: 'Spam' },
  { key: 'harassment', label: 'Harassment' },
  { key: 'irrelevant', label: 'Irrelevant' },
  { key: 'other', label: 'Other' },
];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function PostDetailScreen({ navigation, route }) {
  const { postId } = route?.params || {};
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id;

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const loadPost = useCallback(async () => {
    if (!postId) return;
    try {
      setError(null);
      const data = await fetchCommunityPost(postId);
      setPost(data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load post');
    }
  }, [postId]);

  const loadComments = useCallback(async () => {
    if (!postId) return;
    try {
      const data = await fetchComments(postId);
      setComments(data || []);
    } catch (err) {
      console.warn('Comments load error:', err);
    }
  }, [postId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadPost(), loadComments()]).finally(() => setLoading(false));
  }, [loadPost, loadComments]);

  // ── Voting ─────────────────────────────────────────────────────────────────

  const handleVote = async (type) => {
    if (!post) return;
    const prev = { upvotes: post.upvotes, downvotes: post.downvotes, user_vote: post.user_vote };

    // Optimistic
    if (post.user_vote === type) {
      setPost((p) => ({
        ...p,
        user_vote: null,
        upvotes: type === 'up' ? p.upvotes - 1 : p.upvotes,
        downvotes: type === 'down' ? p.downvotes - 1 : p.downvotes,
      }));
    } else {
      setPost((p) => ({
        ...p,
        user_vote: type,
        upvotes: type === 'up' ? p.upvotes + 1 : p.upvotes - (p.user_vote === 'up' ? 1 : 0),
        downvotes: type === 'down' ? p.downvotes + 1 : p.downvotes - (p.user_vote === 'down' ? 1 : 0),
      }));
    }

    try {
      await votePost(postId, type);
    } catch {
      setPost((p) => ({ ...p, ...prev }));
    }
  };

  const handleCommentVote = async (commentId, type) => {
    try {
      const result = await voteComment(commentId, type);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, ...result } : c)),
      );
    } catch {
      // silent
    }
  };

  // ── Comments ───────────────────────────────────────────────────────────────

  const handleAddComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const newComment = await addComment(postId, commentText.trim());
      setComments((prev) => [newComment, ...prev]);
      setCommentText('');
      setPost((p) => p ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p);
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
            setPost((p) => p ? { ...p, comment_count: Math.max((p.comment_count || 0) - 1, 0) } : p);
          } catch {
            Alert.alert('Error', 'Failed to delete comment');
          }
        },
      },
    ]);
  };

  // ── Post Actions ───────────────────────────────────────────────────────────

  const handleDeletePost = () => {
    Alert.alert('Delete Post', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteCommunityPost(postId);
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Failed to delete post');
          }
        },
      },
    ]);
  };

  const handleReport = () => {
    Alert.alert('Report Post', 'Select a reason:', [
      ...REPORT_REASONS.map((r) => ({
        text: r.label,
        onPress: async () => {
          try {
            await reportPost(postId, r.key);
            Alert.alert('Reported', 'Thank you for your report.');
          } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to report');
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Poll Voting ────────────────────────────────────────────────────────────

  const handlePollVote = async (optionId) => {
    if (!post?.poll || post.poll.userVote || post.poll.isClosed) return;
    try {
      const result = await votePoll(postId, optionId);
      setPost((p) => ({ ...p, poll: { ...p.poll, ...result } }));
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to vote');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.errorText}>{error || 'Post not found'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const score = (post.upvotes || 0) - (post.downvotes || 0);
  const isAuthor = post.member_id === currentUserId;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <TouchableOpacity
          onPress={() => {
            const options = [];
            if (isAuthor) options.push({ text: 'Delete Post', onPress: handleDeletePost, style: 'destructive' });
            if (!isAuthor) options.push({ text: 'Report', onPress: handleReport });
            options.push({ text: 'Cancel', style: 'cancel' });
            Alert.alert('Options', undefined, options);
          }}
          hitSlop={8}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Author */}
        <View style={styles.authorRow}>
          {post.author_avatar ? (
            <Image source={{ uri: post.author_avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={16} color={COLORS.textMuted} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.authorName}>{post.author_name || '[Deleted Member]'}</Text>
            <Text style={styles.timestamp}>{timeAgo(post.created_at)}</Text>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: (CATEGORY_COLORS[post.category] || COLORS.secondary) + '22' }]}>
            <Text style={[styles.categoryText, { color: CATEGORY_COLORS[post.category] || COLORS.secondary }]}>
              {post.category}
            </Text>
          </View>
        </View>

        {/* Body */}
        <Text style={styles.postBody}>{post.body}</Text>

        {/* Image */}
        {post.image_url && (
          <Image source={{ uri: post.image_url }} style={styles.postImage} contentFit="cover" />
        )}

        {/* Poll */}
        {post.is_poll && post.poll && (
          <View style={styles.pollContainer}>
            {post.poll.options.map((opt) => {
              const voted = post.poll.userVote;
              const isSelected = voted === opt.id;
              const showResults = !!voted || post.poll.isClosed;

              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.pollOption, isSelected && styles.pollOptionSelected]}
                  onPress={() => handlePollVote(opt.id)}
                  disabled={!!voted || post.poll.isClosed}
                >
                  <Text style={[styles.pollOptionText, isSelected && styles.pollOptionTextSelected]}>
                    {opt.option_text}
                  </Text>
                  {showResults && (
                    <View style={styles.pollResultRow}>
                      <View style={[styles.pollBar, { width: `${opt.percentage}%` }]} />
                      <Text style={styles.pollPercent}>{opt.percentage}%</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            <Text style={styles.pollMeta}>
              {post.poll.totalVotes} vote{post.poll.totalVotes !== 1 ? 's' : ''}
              {post.poll.isClosed ? ' · Closed' : ''}
            </Text>
          </View>
        )}

        {/* Vote Row */}
        <View style={styles.voteRow}>
          <TouchableOpacity onPress={() => handleVote('up')} style={styles.voteBtn}>
            <Ionicons
              name={post.user_vote === 'up' ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
              size={26}
              color={post.user_vote === 'up' ? COLORS.secondary : COLORS.textMuted}
            />
          </TouchableOpacity>
          <Text style={[styles.scoreText, score > 0 && styles.scorePositive, score < 0 && styles.scoreNegative]}>
            {score}
          </Text>
          <TouchableOpacity onPress={() => handleVote('down')} style={styles.voteBtn}>
            <Ionicons
              name={post.user_vote === 'down' ? 'arrow-down-circle' : 'arrow-down-circle-outline'}
              size={26}
              color={post.user_vote === 'down' ? '#FF4444' : COLORS.textMuted}
            />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <Ionicons name="chatbubble-outline" size={18} color={COLORS.textMuted} />
          <Text style={styles.commentCountText}>{post.comment_count || 0} comments</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Comments */}
        <Text style={styles.sectionTitle}>Comments</Text>

        {comments.length === 0 && (
          <Text style={styles.noComments}>No comments yet. Be the first!</Text>
        )}

        {comments.map((c) => {
          const cScore = (c.upvotes || 0) - (c.downvotes || 0);
          const canDelete = c.member_id === currentUserId || isAuthor;
          return (
            <View key={c.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                {c.author_avatar ? (
                  <Image source={{ uri: c.author_avatar }} style={styles.commentAvatar} />
                ) : (
                  <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={10} color={COLORS.textMuted} />
                  </View>
                )}
                <Text style={styles.commentAuthor}>{c.author_name || '[Deleted Member]'}</Text>
                <Text style={styles.commentTime}>{timeAgo(c.created_at)}</Text>
                {canDelete && (
                  <TouchableOpacity
                    onPress={() => handleDeleteComment(c.id)}
                    style={styles.commentDeleteBtn}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={14} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.commentBody}>{c.body}</Text>
              <View style={styles.commentVoteRow}>
                <TouchableOpacity onPress={() => handleCommentVote(c.id, 'up')} hitSlop={6}>
                  <Ionicons
                    name={c.user_vote === 'up' ? 'arrow-up' : 'arrow-up-outline'}
                    size={16}
                    color={c.user_vote === 'up' ? COLORS.secondary : COLORS.textMuted}
                  />
                </TouchableOpacity>
                <Text style={styles.commentScore}>{cScore}</Text>
                <TouchableOpacity onPress={() => handleCommentVote(c.id, 'down')} hitSlop={6}>
                  <Ionicons
                    name={c.user_vote === 'down' ? 'arrow-down' : 'arrow-down-outline'}
                    size={16}
                    color={c.user_vote === 'down' ? '#FF4444' : COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Comment Input */}
      <View style={styles.commentInputBar}>
        <TextInput
          style={styles.commentInput}
          placeholder="Write a comment..."
          placeholderTextColor={COLORS.textMuted}
          value={commentText}
          onChangeText={setCommentText}
          maxLength={200}
        />
        <TouchableOpacity
          onPress={handleAddComment}
          disabled={!commentText.trim() || submitting}
          style={[styles.sendBtn, (!commentText.trim() || submitting) && { opacity: 0.4 }]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={COLORS.secondary} />
          ) : (
            <Ionicons name="send" size={20} color={COLORS.secondary} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  content: { padding: 16, paddingBottom: 100 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    backgroundColor: COLORS.surface2, justifyContent: 'center', alignItems: 'center',
  },
  authorName: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  timestamp: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  postBody: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 14 },
  postImage: {
    width: '100%', height: 250, borderRadius: 14, marginBottom: 14,
    backgroundColor: COLORS.surface2,
  },
  // Poll
  pollContainer: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginBottom: 14,
  },
  pollOption: {
    backgroundColor: COLORS.surface2, borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  pollOptionSelected: { borderColor: COLORS.secondary },
  pollOptionText: { fontSize: 14, color: COLORS.white, fontWeight: '500' },
  pollOptionTextSelected: { color: COLORS.secondary },
  pollResultRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8,
  },
  pollBar: {
    height: 4, backgroundColor: COLORS.secondary, borderRadius: 2, minWidth: 4,
  },
  pollPercent: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  pollMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  // Votes
  voteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8,
  },
  voteBtn: { padding: 2 },
  scoreText: { fontSize: 16, fontWeight: '700', color: COLORS.textMuted, minWidth: 24, textAlign: 'center' },
  scorePositive: { color: COLORS.secondary },
  scoreNegative: { color: '#FF4444' },
  commentCountText: { fontSize: 13, color: COLORS.textMuted, marginLeft: 4 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white, marginBottom: 12 },
  noComments: { fontSize: 14, color: COLORS.textMuted, fontStyle: 'italic' },
  // Comment card
  commentCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, marginBottom: 10,
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  commentAvatar: { width: 24, height: 24, borderRadius: 12 },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: COLORS.white, flex: 1 },
  commentTime: { fontSize: 11, color: COLORS.textMuted },
  commentDeleteBtn: { padding: 4 },
  commentBody: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 19, marginBottom: 6 },
  commentVoteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentScore: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, minWidth: 16, textAlign: 'center' },
  // Input bar
  commentInputBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 34,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  commentInput: {
    flex: 1, backgroundColor: COLORS.surface2, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: COLORS.white,
  },
  sendBtn: { padding: 8 },
  errorText: { fontSize: 14, color: COLORS.error, textAlign: 'center', marginBottom: 12 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.surface },
  retryText: { fontSize: 14, fontWeight: '600', color: COLORS.secondary },
});
