import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { fetchBlogBySlug, voteBlog, fetchBlogComments, postBlogComment } from '../../services/blogService';
import { renderMarkdown } from '../../utils/markdownRenderer';

const TAG_COLORS = {
  Fitness: COLORS.secondary,
  Training: COLORS.secondary,
  Nutrition: '#22C55E',
  Recovery: '#A855F7',
  Motivation: '#F59E0B',
};

function tagColor(tag) {
  return TAG_COLORS[tag] || COLORS.secondary;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const past = new Date(dateStr).getTime();
  const diffMs = now - past;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function BlogFeedScreen({ navigation, route }) {
  const { postId, slug, articleId } = route.params ?? {};
  const user = useAuthStore((s) => s.user);

  // The identifier to fetch blog — prefer slug, fall back to postId or articleId
  const blogIdentifier = slug || postId || articleId;

  const [blog, setBlog] = useState(null);
  const [comments, setComments] = useState([]);
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [userVote, setUserVote] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadBlog = useCallback(async () => {
    if (!blogIdentifier) {
      setError('No blog identifier provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchBlogBySlug(blogIdentifier);
      setBlog(data);
      setUpvotes(data.upvotes || 0);
      setDownvotes(data.downvotes || 0);
      setUserVote(data.userVote || null);

      // Fetch comments using blog id
      try {
        const result = await fetchBlogComments(data.id);
        if (result?.data) setComments(result.data);
      } catch (commentErr) {
        console.warn('Comments load error:', commentErr);
        // Non-fatal — blog still displays
      }
    } catch (err) {
      console.warn('BlogFeed load error:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load blog');
    } finally {
      setLoading(false);
    }
  }, [blogIdentifier]);

  useEffect(() => {
    loadBlog();
  }, [loadBlog]);

  async function handleVote(type) {
    if (!blog) return;

    // Optimistic update
    const prevUpvotes = upvotes;
    const prevDownvotes = downvotes;
    const prevUserVote = userVote;

    if (userVote === type) {
      // Toggle off
      setUserVote(null);
      if (type === 'upvote') setUpvotes((c) => c - 1);
      else setDownvotes((c) => c - 1);
    } else {
      // Switch or new vote
      setUserVote(type);
      if (type === 'upvote') {
        setUpvotes((c) => c + 1);
        if (userVote === 'downvote') setDownvotes((c) => c - 1);
      } else {
        setDownvotes((c) => c + 1);
        if (userVote === 'upvote') setUpvotes((c) => c - 1);
      }
    }

    try {
      const result = await voteBlog(blog.id, type);
      setUpvotes(result.upvotes);
      setDownvotes(result.downvotes);
      setUserVote(result.userVote);
    } catch {
      // Revert on error
      setUpvotes(prevUpvotes);
      setDownvotes(prevDownvotes);
      setUserVote(prevUserVote);
    }
  }

  async function handleSendComment() {
    const text = comment.trim();
    if (!text || !blog || submitting) return;
    setSubmitting(true);
    try {
      const newComment = await postBlogComment(blog.id, text);
      setComments((prev) => [newComment, ...prev]);
      setComment('');
    } catch (err) {
      console.warn('Comment post error:', err);
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  // Error state
  if (error || !blog) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Blog</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.errorTitle}>Couldn't load this article</Text>
          <Text style={styles.errorMessage}>{error || 'Blog not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadBlog} activeOpacity={0.85}>
            <Ionicons name="refresh" size={16} color={COLORS.white} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const primaryTag = blog.tags?.[0] || 'Fitness';
  const catColor = tagColor(primaryTag);
  const upvoted = userVote === 'upvote';
  const downvoted = userVote === 'downvote';
  const readTime = blog.estimatedReadTime || 1;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{blog.title}</Text>
        </View>
        <Text style={styles.brand}>BUILD GYM</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero block */}
        {blog.coverImageUrl ? (
          <View style={styles.hero}>
            <Image
              source={{ uri: blog.coverImageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)', COLORS.background]}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ) : (
          <View style={[styles.hero, { backgroundColor: catColor }]}>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)', COLORS.background]}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}

        {/* Article card overlapping hero */}
        <View style={styles.articleCard}>
          {/* Category badges */}
          <View style={styles.badgesRow}>
            {(blog.tags || []).map((t) => (
              <View key={t} style={[styles.catBadge, { backgroundColor: tagColor(t) + '22' }]}>
                <Text style={[styles.catBadgeText, { color: tagColor(t) }]}>
                  {t.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>

          {/* Title */}
          <Text style={styles.articleTitle}>{blog.title}</Text>

          {/* Meta */}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{blog.authorName || 'Build Gym'}</Text>
            <Text style={[styles.metaDot, { color: catColor }]}>{'\u2022'}</Text>
            <Text style={styles.metaText}>{formatDate(blog.publishedAt)}</Text>
            <Text style={[styles.metaDot, { color: catColor }]}>{'\u2022'}</Text>
            <Text style={[styles.metaText, { color: catColor }]}>{readTime} min read</Text>
          </View>

          <View style={styles.divider} />

          {/* Body content — rendered markdown */}
          <View>{renderMarkdown(blog.content || '')}</View>

          {/* Engagement — votes */}
          <View style={styles.engagementRow}>
            <TouchableOpacity style={styles.voteBtn} onPress={() => handleVote('upvote')} activeOpacity={0.8}>
              <View style={[styles.voteBtnBox, upvoted && { backgroundColor: COLORS.secondaryGlow, borderColor: COLORS.secondaryBorder }]}>
                <Ionicons name={upvoted ? 'thumbs-up' : 'thumbs-up-outline'} size={18} color={upvoted ? COLORS.secondary : COLORS.textMuted} />
              </View>
              <Text style={[styles.voteCount, upvoted && { color: COLORS.secondary }]}>{upvotes}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.voteBtn} onPress={() => handleVote('downvote')} activeOpacity={0.8}>
              <View style={[styles.voteBtnBox, downvoted && { backgroundColor: 'rgba(255,68,68,0.12)', borderColor: 'rgba(255,68,68,0.3)' }]}>
                <Ionicons name={downvoted ? 'thumbs-down' : 'thumbs-down-outline'} size={18} color={downvoted ? COLORS.error : COLORS.textMuted} />
              </View>
              <Text style={[styles.voteCount, downvoted && { color: COLORS.error }]}>{downvotes}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments section */}
        <View style={styles.commentsSection}>
          <View style={styles.commentsSectionHeader}>
            <View style={[styles.commentsAccent, { backgroundColor: catColor }]} />
            <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
          </View>

          {/* Comment input */}
          <View style={styles.commentInputRow}>
            {user?.profilePhotoUrl ? (
              <Image
                source={{ uri: user.profilePhotoUrl }}
                style={styles.commentAvatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.commentAvatar}>
                <Ionicons name="person" size={16} color={COLORS.textMuted} />
              </View>
            )}
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor={COLORS.textMuted}
              value={comment}
              onChangeText={setComment}
              returnKeyType="send"
              onSubmitEditing={handleSendComment}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendComment} activeOpacity={0.8} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size={16} color={COLORS.secondary} />
              ) : (
                <Ionicons name="send" size={16} color={COLORS.secondary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Comment list */}
          {comments.map((c) => (
            <View key={c.id} style={styles.commentCard}>
              {c.userProfilePhotoUrl ? (
                <Image
                  source={{ uri: c.userProfilePhotoUrl }}
                  style={[styles.commentAvatarSmall, { borderColor: catColor }]}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.commentAvatarSmall, { borderColor: catColor }]}>
                  <Text style={[styles.commentInitials, { color: catColor }]}>
                    {getInitials(c.userName)}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.commentHeaderRow}>
                  <Text style={styles.commentName}>{c.userName || 'User'}</Text>
                  <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                </View>
                <Text style={styles.commentText}>{c.content}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: COLORS.white, flex: 1 },
  brand: {
    fontSize: 11, fontWeight: '900', color: COLORS.secondary,
    letterSpacing: 2, flexShrink: 0,
  },

  hero: { width: '100%', height: 220 },

  articleCard: {
    marginTop: -44, marginHorizontal: 16,
    backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 20,
  },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  catBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  catBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  articleTitle: {
    fontSize: 22, fontWeight: '800', color: COLORS.white,
    lineHeight: 30, marginBottom: 10,
  },

  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  metaText: {
    fontSize: 10, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  metaDot: { fontSize: 10, fontWeight: '900' },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20 },

  engagementRow: {
    flexDirection: 'row', gap: 20, marginTop: 24, paddingTop: 20,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  voteBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voteBtnBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  voteCount: { fontSize: 16, fontWeight: '700', color: COLORS.textMuted },

  errorContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 10,
  },
  errorTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white, marginTop: 8 },
  errorMessage: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.secondary, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 10,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.white },

  commentsSection: { marginTop: 24, paddingHorizontal: 16, paddingBottom: 40 },
  commentsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  commentsAccent: { width: 3, height: 20, borderRadius: 2 },
  commentsTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white },

  commentInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 10, marginBottom: 20,
  },
  commentAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  commentInput: {
    flex: 1, fontSize: 14, color: COLORS.white,
    backgroundColor: COLORS.surface2, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  sendBtn: { paddingHorizontal: 6, paddingVertical: 4 },

  commentCard: {
    flexDirection: 'row', gap: 12, padding: 14,
    backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 12,
  },
  commentAvatarSmall: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.surface2, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  commentInitials: { fontSize: 12, fontWeight: '800' },
  commentHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  commentName: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  commentTime: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  commentText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
});
