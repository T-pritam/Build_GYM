import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar, KeyboardAvoidingView, Platform,
  Modal, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS as THEME, FONTS } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import {
  fetchCommunityPost, votePost, fetchComments, addComment,
  deleteComment, voteComment, reportPost, deleteCommunityPost, votePoll,
} from '../../services/communityService';

// Theme-compat: legacy colour keys → new "Holographic Noir" palette.
const COLORS = {
  background: THEME.background, surface: '#1B191E', surface2: THEME.surface2,
  secondary: THEME.primaryLight, primary: THEME.primary, cyan: THEME.cyan, primaryBright: THEME.primaryBright,
  textPrimary: THEME.textPrimary, textSecondary: THEME.textSecondary, textMuted: THEME.textMuted,
  border: THEME.border, glass: 'rgba(255,255,255,0.03)', glassBorder: 'rgba(255,255,255,0.08)',
  white: THEME.white, error: THEME.error,
};

const CATEGORY_COLORS = {
  transformation: '#A855F7',
  workout: THEME.primaryLight,
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

  const safeDateStr = dateStr
    .replace(' ', 'T')
    .replace(/(\.\d{3})\d+/, '$1')
    .replace('+00', 'Z');

  const time = new Date(safeDateStr).getTime();
  if (isNaN(time)) return 'Invalid date';

  const diff = Date.now() - time;
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
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);

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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadPost(), loadComments()]);
    setRefreshing(false);
  }, [loadPost, loadComments]);

  // ── Voting ─────────────────────────────────────────────────────────────────

  const postVoteTimerRef = useRef(null);
  const prevPostVoteRef = useRef(null);

  const handleVote = (type) => {
    if (!post) return;

    if (!postVoteTimerRef.current) {
      prevPostVoteRef.current = { upvotes: post.upvotes, downvotes: post.downvotes, user_vote: post.user_vote };
    }

    // Optimistic update (immediate)
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

    // Debounce the API call — only the last click within 1 s fires
    clearTimeout(postVoteTimerRef.current);
    postVoteTimerRef.current = setTimeout(async () => {
      postVoteTimerRef.current = null;
      try {
        await votePost(postId, type);
      } catch {
        const prev = prevPostVoteRef.current;
        if (prev) setPost((p) => ({ ...p, ...prev }));
      }
      prevPostVoteRef.current = null;
    }, 1000);
  };

  const commentVoteTimersRef = useRef({});

  const handleCommentVote = (commentId, type) => {
    // Debounce per-comment — only the last click within 1 s fires the API call
    clearTimeout(commentVoteTimersRef.current[commentId]);
    commentVoteTimersRef.current[commentId] = setTimeout(async () => {
      delete commentVoteTimersRef.current[commentId];
      try {
        const result = await voteComment(commentId, type);
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, ...result } : c)),
        );
      } catch {
        // silent
      }
    }, 1000);
  };

  // ── Comments ───────────────────────────────────────────────────────────────

  const handleAddComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const newComment = await addComment(postId, commentText.trim());
      // Inject the current user's display data so the comment renders correctly
      // without needing a reload (the raw DB row doesn't include the JOIN fields).
      setComments((prev) => [{
        ...newComment,
        author_name: user?.fullName || 'You',
        author_avatar: user?.profilePhotoUrl || null,
      }, ...prev]);
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

  const handleReport = async (reason) => {
    try {
      await reportPost(postId, reason);
      Alert.alert('Reported', 'Thank you for your report.');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to report');
    }
  };

  // ── Poll Voting ────────────────────────────────────────────────────────────

  const handlePollVote = async (optionId) => {
    if (!post?.poll || post.poll.isClosed) return;
    // Tapping the already-selected option is a no-op
    if (post.poll.userVote === optionId) return;

    const prevPoll = post.poll;
    const oldOptionId = post.poll.userVote;

    // Optimistic update: transfer count from old → new option
    setPost((p) => {
      if (!p?.poll) return p;
      const updatedOptions = p.poll.options.map((o) => {
        if (o.id === optionId) return { ...o, vote_count: (o.vote_count || 0) + 1 };
        if (o.id === oldOptionId) return { ...o, vote_count: Math.max((o.vote_count || 0) - 1, 0) };
        return o;
      });
      const totalVotes = updatedOptions.reduce((sum, o) => sum + (o.vote_count || 0), 0);
      return {
        ...p,
        poll: {
          ...p.poll,
          userVote: optionId,
          totalVotes,
          options: updatedOptions.map((o) => ({
            ...o,
            percentage: totalVotes > 0 ? Math.round((o.vote_count / totalVotes) * 100) : 0,
          })),
        },
      };
    });

    try {
      const result = await votePoll(postId, optionId);
      // Sync with server's authoritative counts
      setPost((p) => ({ ...p, poll: { ...p.poll, ...result } }));
    } catch (err) {
      // Revert optimistic update on failure
      setPost((p) => ({ ...p, poll: prevPoll }));
      Alert.alert('Error', err?.response?.data?.message || 'Failed to vote');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <Text style={styles.errorText}>{error || 'Post not found'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const score = (post.upvotes || 0) - (post.downvotes || 0);
  const isAuthor = post.member_id === currentUserId;
  const badgeColor = CATEGORY_COLORS[post.category] || COLORS.secondary;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.glowTop} pointerEvents="none" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={COLORS.cyan} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          style={styles.headerIconBtn}
          hitSlop={8}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={COLORS.cyan} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.secondary}
            colors={[COLORS.secondary]}
          />
        }
      >
        {/* Post card */}
        <View style={styles.postCard}>
          {/* Author */}
          <View style={styles.authorRow}>
            {post.author_avatar ? (
              <Image source={{ uri: post.author_avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={18} color={COLORS.textMuted} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.authorName}>{post.author_name || '[Deleted Member]'}</Text>
              <Text style={styles.timestamp}>{timeAgo(post.created_at).toUpperCase()}</Text>
            </View>
            <View style={[styles.categoryBadge, { borderColor: badgeColor + '80', backgroundColor: badgeColor + '0D' }]}>
              <Text style={[styles.categoryText, { color: badgeColor }]}>
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
                // Lock only the currently selected option and closed polls;
                // other options stay tappable so the user can switch their vote.
                const isDisabled = post.poll.isClosed || isSelected;

                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.pollOption, isSelected && styles.pollOptionSelected]}
                    onPress={() => handlePollVote(opt.id)}
                    disabled={isDisabled}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pollOptionText, isSelected && styles.pollOptionTextSelected]}>
                      {opt.option_text}
                    </Text>
                    {showResults && (
                      <View style={styles.pollResultRow}>
                        <View style={styles.pollBarTrack}>
                          <View style={[styles.pollBar, { width: `${opt.percentage}%` }]} />
                        </View>
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
            <TouchableOpacity
              onPress={() => handleVote('up')}
              style={[styles.voteChip, post.user_vote === 'up' && styles.voteChipUpActive]}
            >
              <Ionicons
                name="arrow-up"
                size={16}
                color={post.user_vote === 'up' ? COLORS.secondary : COLORS.textMuted}
              />
              <Text style={[styles.voteChipCount, post.user_vote === 'up' && { color: COLORS.secondary }]}>
                {post.upvotes || 0}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleVote('down')}
              style={[styles.voteChip, post.user_vote === 'down' && styles.voteChipDownActive]}
            >
              <Ionicons
                name="arrow-down"
                size={16}
                color={post.user_vote === 'down' ? '#FF4444' : COLORS.textMuted}
              />
              <Text style={[styles.voteChipCount, post.user_vote === 'down' && { color: '#FF4444' }]}>
                {post.downvotes || 0}
              </Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <Ionicons name="chatbubble-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.commentCountText}>{post.comment_count || 0} COMMENTS</Text>
          </View>
        </View>

        {/* Comments */}
        <View style={styles.commentsHeaderRow}>
          <Text style={styles.sectionTitle}>Comments</Text>
          <Text style={styles.commentsHeaderCount}>{post.comment_count || 0} COMMENTS</Text>
        </View>

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
                    <Ionicons name="person" size={12} color={COLORS.textMuted} />
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
        <View style={styles.commentInputWrap}>
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
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="arrow-up" size={18} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Action Menu Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuSheet}>
            {isAuthor ? (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => { setMenuVisible(false); handleDeletePost(); }}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: '#FF444420' }]}>
                  <Ionicons name="trash-outline" size={20} color="#FF4444" />
                </View>
                <Text style={[styles.menuItemText, { color: '#FF4444' }]}>Delete Post</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => { setMenuVisible(false); setReportVisible(true); }}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: COLORS.secondary + '20' }]}>
                  <Ionicons name="flag-outline" size={20} color={COLORS.secondary} />
                </View>
                <Text style={styles.menuItemText}>Report Post</Text>
              </TouchableOpacity>
            )}
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuCancelItem}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Report Reason Modal ───────────────────────────────────────────── */}
      <Modal
        visible={reportVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReportVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setReportVisible(false)}
        >
          <View style={styles.menuSheet}>
            <View style={styles.reportHeader}>
              <Ionicons name="flag" size={18} color={COLORS.secondary} />
              <Text style={styles.reportTitle}>Report Post</Text>
            </View>
            <Text style={styles.reportSubtitle}>Select a reason</Text>

            {REPORT_REASONS.map((r, i) => (
              <TouchableOpacity
                key={r.key}
                style={[
                  styles.menuItem,
                  i < REPORT_REASONS.length - 1 && styles.menuItemBorder,
                ]}
                onPress={() => { setReportVisible(false); handleReport(r.key); }}
              >
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                <Text style={styles.menuItemText}>{r.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuCancelItem}
              onPress={() => setReportVisible(false)}
            >
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  glowTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 240,
    backgroundColor: 'rgba(127,41,130,0.06)',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 10,
  },
  headerIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, color: COLORS.white, fontFamily: FONTS.bodyBold },
  content: { padding: 20, paddingBottom: 110 },

  // Post card (glass)
  postCard: {
    backgroundColor: COLORS.glass, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    padding: 18, marginBottom: 20,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    backgroundColor: COLORS.surface2, justifyContent: 'center', alignItems: 'center',
  },
  authorName: { fontSize: 15, color: COLORS.white, fontFamily: FONTS.bodyBold },
  timestamp: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.label, letterSpacing: 0.5 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  categoryText: { fontSize: 9, fontFamily: FONTS.label, textTransform: 'uppercase', letterSpacing: 1 },
  postBody: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 24, marginBottom: 16, fontFamily: FONTS.body },
  postImage: {
    width: '100%', height: 250, borderRadius: 14, marginBottom: 16,
    backgroundColor: COLORS.surface2,
  },

  // Poll
  pollContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.glassBorder,
  },
  pollOption: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.glassBorder,
  },
  pollOptionSelected: { borderColor: COLORS.secondary },
  pollOptionText: { fontSize: 14, color: COLORS.white, fontFamily: FONTS.bodyMedium },
  pollOptionTextSelected: { color: COLORS.secondary },
  pollResultRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8,
  },
  pollBarTrack: {
    flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden',
  },
  pollBar: {
    height: 4, backgroundColor: COLORS.secondary, borderRadius: 2,
  },
  pollPercent: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.bodyBold },
  pollMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, fontFamily: FONTS.body },

  // Votes
  voteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  voteChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  voteChipUpActive: { backgroundColor: 'rgba(167,139,250,0.12)' },
  voteChipDownActive: { backgroundColor: 'rgba(255,68,68,0.12)' },
  voteChipCount: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.bodyBold },
  commentCountText: { fontSize: 10, color: COLORS.textMuted, marginLeft: 4, fontFamily: FONTS.label, letterSpacing: 0.5 },

  // Comments
  commentsHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, color: COLORS.white, fontFamily: FONTS.bodyBold },
  commentsHeaderCount: { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.label, letterSpacing: 0.5 },
  noComments: { fontSize: 14, color: COLORS.textMuted, fontStyle: 'italic', fontFamily: FONTS.body },

  // Comment card
  commentCard: {
    backgroundColor: COLORS.glass, borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.glassBorder,
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14 },
  commentAuthor: { fontSize: 13, color: COLORS.white, flex: 1, fontFamily: FONTS.bodyBold },
  commentTime: { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.body },
  commentDeleteBtn: { padding: 4 },
  commentBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 8, fontFamily: FONTS.body },
  commentVoteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentScore: { fontSize: 12, color: COLORS.textMuted, minWidth: 16, textAlign: 'center', fontFamily: FONTS.bodyBold },

  // Input bar
  commentInputBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 30,
    backgroundColor: '#1A1A2E', borderTopWidth: 1, borderTopColor: COLORS.glassBorder,
  },
  commentInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0D0D0F', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(127,41,130,0.40)',
    paddingLeft: 14, paddingRight: 4, paddingVertical: 4,
  },
  commentInput: {
    flex: 1, fontSize: 14, color: COLORS.white, paddingVertical: 8, fontFamily: FONTS.body,
  },
  sendBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  errorText: { fontSize: 14, color: COLORS.error, textAlign: 'center', marginBottom: 12, fontFamily: FONTS.body },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.surface },
  retryText: { fontSize: 14, color: COLORS.secondary, fontFamily: FONTS.bodyBold },

  // Modal / Menu
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 8, paddingBottom: 34,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder,
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  menuItemText: { fontSize: 16, color: COLORS.white, fontFamily: FONTS.bodyMedium },
  menuDivider: { height: 1, backgroundColor: COLORS.glassBorder, marginVertical: 4 },
  menuCancelItem: {
    alignItems: 'center', paddingVertical: 14,
  },
  menuCancelText: { fontSize: 16, color: COLORS.textMuted, fontFamily: FONTS.bodyBold },
  reportHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 8, paddingBottom: 4,
  },
  reportTitle: { fontSize: 17, color: COLORS.white, fontFamily: FONTS.bodyBold },
  reportSubtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 8, fontFamily: FONTS.body },
});
