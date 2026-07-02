import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { fetchBlogBySlug, voteBlog, fetchBlogComments, postBlogComment } from '../../services/blogService';
import { renderMarkdown } from '../../utils/markdownRenderer';

const TAG_COLORS = {
  Fitness: COLORS.primaryLight,
  Training: COLORS.primaryLight,
  Nutrition: '#4ADE80',
  Recovery: '#A855F7',
  Motivation: '#F5B041',
};

function tagColor(tag) {
  return TAG_COLORS[tag] || COLORS.primaryLight;
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

  const scrollRef = useRef(null);
  const voteTimerRef = useRef(null);
  const prevVoteStateRef = useRef(null);

  function handleVote(type) {
    if (!blog) return;

    // Capture pre-optimistic state only at the start of each debounce sequence
    if (!voteTimerRef.current) {
      prevVoteStateRef.current = { upvotes, downvotes, userVote };
    }

    // Optimistic update (immediate)
    if (userVote === type) {
      setUserVote(null);
      if (type === 'upvote') setUpvotes((c) => c - 1);
      else setDownvotes((c) => c - 1);
    } else {
      setUserVote(type);
      if (type === 'upvote') {
        setUpvotes((c) => c + 1);
        if (userVote === 'downvote') setDownvotes((c) => c - 1);
      } else {
        setDownvotes((c) => c + 1);
        if (userVote === 'upvote') setUpvotes((c) => c - 1);
      }
    }

    // Debounce the API call — only the last click within 1 s fires
    clearTimeout(voteTimerRef.current);
    voteTimerRef.current = setTimeout(async () => {
      voteTimerRef.current = null;
      try {
        const result = await voteBlog(blog.id, type);
        setUpvotes(result.upvotes);
        setDownvotes(result.downvotes);
        setUserVote(result.userVote);
      } catch {
        const prev = prevVoteStateRef.current;
        if (prev) {
          setUpvotes(prev.upvotes);
          setDownvotes(prev.downvotes);
          setUserVote(prev.userVote);
        }
      }
      prevVoteStateRef.current = null;
    }, 1000);
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

  async function handleShare() {
    if (!blog) return;
    try {
      await Share.share({
        title: blog.title,
        message: blog.slug ? `${blog.title}\n\nRead on Build Gym` : blog.title,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  }

  // Loading state
  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
      </View>
    );
  }

  // Error state
  if (error || !blog) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={COLORS.primaryLight} />
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
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.primaryLight} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{blog.title}</Text>
        </View>
        <Text style={styles.brand}>BUILD GYM</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero block */}
        <View style={[styles.hero, !blog.coverImageUrl && { backgroundColor: catColor }]}>
          {blog.coverImageUrl ? (
            <Image source={{ uri: blog.coverImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : null}
          <LinearGradient
            colors={['transparent', 'rgba(8,6,8,0.4)', COLORS.background]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroBadge, { backgroundColor: catColor + 'CC' }]}>
            <Text style={styles.heroBadgeText}>{primaryTag.toUpperCase()}</Text>
          </View>
        </View>

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
            <Text style={[styles.metaDot, { color: catColor }]}>{'•'}</Text>
            <Text style={styles.metaText}>{formatDate(blog.publishedAt)}</Text>
            <Text style={[styles.metaDot, { color: COLORS.cyan }]}>{'•'}</Text>
            <Text style={[styles.metaText, { color: COLORS.cyan }]}>{readTime} min read</Text>
          </View>

          <View style={styles.divider} />

          {/* Body content — rendered markdown */}
          <View>{renderMarkdown(blog.content || '')}</View>

          {/* Engagement — votes (left) + share (right) */}
          <View style={styles.engagementRow}>
            <View style={styles.votesGroup}>
              <TouchableOpacity style={styles.voteBtn} onPress={() => handleVote('upvote')} activeOpacity={0.8}>
                <View style={[styles.voteBtnBox, upvoted && { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primaryBorder }]}>
                  <Ionicons name={upvoted ? 'thumbs-up' : 'thumbs-up-outline'} size={18} color={upvoted ? COLORS.primaryLight : COLORS.textMuted} />
                </View>
                <Text style={[styles.voteCount, upvoted && { color: COLORS.primaryLight }]}>{upvotes}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.voteBtn} onPress={() => handleVote('downvote')} activeOpacity={0.8}>
                <View style={[styles.voteBtnBox, downvoted && { backgroundColor: 'rgba(244,67,54,0.12)', borderColor: 'rgba(244,67,54,0.3)' }]}>
                  <Ionicons name={downvoted ? 'thumbs-down' : 'thumbs-down-outline'} size={18} color={downvoted ? COLORS.error : COLORS.textMuted} />
                </View>
                <Text style={[styles.voteCount, downvoted && { color: COLORS.error }]}>{downvotes}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-social-outline" size={18} color={COLORS.textSecondary} />
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
              onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendComment} activeOpacity={0.8} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size={16} color={COLORS.primaryLight} />
              ) : (
                <Ionicons name="send" size={16} color={COLORS.primaryLight} />
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
    </KeyboardAvoidingView>
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
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.white, flex: 1 },
  brand: { fontFamily: FONTS.label, fontSize: 11, color: COLORS.primaryLight, letterSpacing: 2, flexShrink: 0 },

  hero: { width: '100%', height: 220 },
  heroBadge: {
    position: 'absolute', top: 16, left: 16,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  heroBadgeText: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.white, letterSpacing: 1.5 },

  articleCard: {
    marginTop: -44, marginHorizontal: 16,
    backgroundColor: COLORS.surfaceLow, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 20,
  },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  catBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  catBadgeText: { fontFamily: FONTS.label, fontSize: 9, letterSpacing: 1 },

  articleTitle: { fontFamily: FONTS.headline, fontSize: 24, color: COLORS.white, lineHeight: 32, marginBottom: 10 },

  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  metaText: { fontFamily: FONTS.label, fontSize: 10, color: COLORS.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  metaDot: { fontSize: 10, fontFamily: FONTS.bodyBold },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20 },

  engagementRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 24, paddingTop: 20,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  votesGroup: { flexDirection: 'row', gap: 20 },
  voteBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voteBtnBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  voteCount: { fontFamily: FONTS.bodyBold, fontSize: 16, color: COLORS.textMuted },
  shareBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },

  errorContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 10,
  },
  errorTitle: { fontFamily: FONTS.headline, fontSize: 18, color: COLORS.white, marginTop: 8 },
  errorMessage: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 10,
  },
  retryBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white },

  commentsSection: { marginTop: 24, paddingHorizontal: 16, paddingBottom: 40 },
  commentsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  commentsAccent: { width: 3, height: 20, borderRadius: 2 },
  commentsTitle: { fontFamily: FONTS.headline, fontSize: 16, color: COLORS.white },

  commentInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surfaceLow, borderRadius: 14,
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
    flex: 1, fontFamily: FONTS.body, fontSize: 14, color: COLORS.white,
    backgroundColor: COLORS.surface2, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  sendBtn: { paddingHorizontal: 6, paddingVertical: 4 },

  commentCard: {
    flexDirection: 'row', gap: 12, padding: 14,
    backgroundColor: COLORS.surfaceLow, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 12,
  },
  commentAvatarSmall: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.surface2, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  commentInitials: { fontFamily: FONTS.bodyBold, fontSize: 12 },
  commentHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  commentName: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.white },
  commentTime: { fontFamily: FONTS.label, fontSize: 9, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  commentText: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
});
