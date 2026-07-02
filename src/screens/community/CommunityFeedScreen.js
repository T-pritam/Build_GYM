import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { fetchCommunityPosts, votePost } from '../../services/communityService';

const SORT_TABS = [
  { key: 'hot', label: 'Hot', icon: 'flame-outline' },
  { key: 'new', label: 'New', icon: 'time-outline' },
  { key: 'top', label: 'Top', icon: 'trending-up-outline' },
];

const CATEGORY_COLORS = {
  transformation: '#A855F7',
  workout: COLORS.secondary,
  nutrition: '#22C55E',
  question: '#3B82F6',
  motivation: '#F59E0B',
  achievement: '#EC4899',
  poll: '#06B6D4',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

export default function CommunityFeedScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const [sort, setSort] = useState('hot');
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  // Tracks whether the initial load has completed so the focus listener
  // doesn't trigger a second fetch on first mount.
  const initialLoadDone = useRef(false);

  const loadPosts = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      setError(null);
      const result = await fetchCommunityPosts({ sort, page: pageNum });
      const newPosts = result.data || [];
      if (pageNum === 1 || isRefresh) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }
      setHasMore(newPosts.length >= 20);
      setPage(pageNum);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load posts');
    }
  }, [sort]);

  useEffect(() => {
    setLoading(true);
    loadPosts(1).finally(() => { setLoading(false); initialLoadDone.current = true; });
  }, [loadPosts]);

  // Reload when returning from CreatePost so new posts appear immediately.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!initialLoadDone.current) return;
      loadPosts(1, true);
    });
    return unsubscribe;
  }, [navigation, loadPosts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts(1, true);
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadPosts(page + 1);
    setLoadingMore(false);
  };

  const voteTimersRef = useRef({});
  const prevPostsRef = useRef({});

  const handleVote = (postId, type) => {
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx === -1) return;
    const post = posts[idx];

    // Capture pre-optimistic state only at start of each debounce sequence
    if (!voteTimersRef.current[postId]) {
      prevPostsRef.current[postId] = { upvotes: post.upvotes, downvotes: post.downvotes, user_vote: post.user_vote };
    }

    // Optimistic update (immediate)
    const updated = [...posts];
    if (post.user_vote === type) {
      updated[idx] = {
        ...post,
        user_vote: null,
        upvotes: type === 'up' ? post.upvotes - 1 : post.upvotes,
        downvotes: type === 'down' ? post.downvotes - 1 : post.downvotes,
      };
    } else {
      updated[idx] = {
        ...post,
        user_vote: type,
        upvotes: type === 'up' ? post.upvotes + 1 : post.upvotes - (post.user_vote === 'up' ? 1 : 0),
        downvotes: type === 'down' ? post.downvotes + 1 : post.downvotes - (post.user_vote === 'down' ? 1 : 0),
      };
    }
    setPosts(updated);

    // Debounce the API call — only the last click within 1 s fires
    clearTimeout(voteTimersRef.current[postId]);
    voteTimersRef.current[postId] = setTimeout(async () => {
      delete voteTimersRef.current[postId];
      try {
        await votePost(postId, type);
      } catch {
        const prev = prevPostsRef.current[postId];
        if (prev) {
          setPosts((cur) => cur.map((p) => (p.id === postId ? { ...p, ...prev } : p)));
        }
      }
      delete prevPostsRef.current[postId];
    }, 1000);
  };

  const renderPost = ({ item: post }) => {
    const score = (post.upvotes || 0) - (post.downvotes || 0);

    return (
      <TouchableOpacity
        style={styles.postCard}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
      >
        {/* Header */}
        <View style={styles.postHeader}>
          <View style={styles.authorRow}>
            {post.author_avatar ? (
              <Image source={{ uri: post.author_avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={14} color={COLORS.textMuted} />
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
        </View>

        {/* Body */}
        <Text style={styles.postBody} numberOfLines={4}>{post.body}</Text>

        {/* Image */}
        {post.image_url && (
          <Image source={{ uri: post.image_url }} style={styles.postImage} contentFit="cover" />
        )}

        {/* Poll indicator */}
        {post.is_poll && (
          <View style={styles.pollBadge}>
            <Ionicons name="bar-chart-outline" size={14} color={COLORS.secondary} />
            <Text style={styles.pollBadgeText}>Poll — Tap to vote</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.postFooter}>
          <View style={styles.voteRow}>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); handleVote(post.id, 'up'); }}
              style={styles.voteBtn}
              hitSlop={8}
            >
              <Ionicons
                name={post.user_vote === 'up' ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
                size={22}
                color={post.user_vote === 'up' ? COLORS.secondary : COLORS.textMuted}
              />
            </TouchableOpacity>
            <Text style={[styles.scoreText, score > 0 && styles.scorePositive, score < 0 && styles.scoreNegative]}>
              {score}
            </Text>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); handleVote(post.id, 'down'); }}
              style={styles.voteBtn}
              hitSlop={8}
            >
              <Ionicons
                name={post.user_vote === 'down' ? 'arrow-down-circle' : 'arrow-down-circle-outline'}
                size={22}
                color={post.user_vote === 'down' ? '#FF4444' : COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.commentBtn}
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
          >
            <Ionicons name="chatbubble-outline" size={18} color={COLORS.textMuted} />
            <Text style={styles.commentCount}>{post.comment_count || 0}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="chatbubbles-outline" size={56} color={COLORS.textMuted} />
        <Text style={styles.emptyTitle}>Be the first to post in the community!</Text>
        <Text style={styles.emptySubtitle}>Share your progress, ask questions, or motivate others.</Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Text style={styles.emptyBtnText}>Create Post</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreatePost')}
          style={styles.createBtn}
          hitSlop={8}
        >
          <Ionicons name="add-circle" size={28} color={COLORS.secondary} />
        </TouchableOpacity>
      </View>

      {/* Sort Tabs */}
      <View style={styles.sortRow}>
        {SORT_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.sortTab, sort === tab.key && styles.sortTabActive]}
            onPress={() => setSort(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={sort === tab.key ? COLORS.secondary : COLORS.textMuted}
            />
            <Text style={[styles.sortLabel, sort === tab.key && styles.sortLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Feed */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
        </View>
      ) : error ? (
        <View style={styles.errorState}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.secondary}
              colors={[COLORS.secondary]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.secondary} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12,
    backgroundColor: COLORS.background,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.white },
  createBtn: { padding: 4 },
  sortRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 8,
  },
  sortTab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: COLORS.surface,
  },
  sortTabActive: { backgroundColor: COLORS.secondary + '22' },
  sortLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  sortLabelActive: { color: COLORS.secondary },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  postCard: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 14, marginBottom: 12,
  },
  postHeader: { marginBottom: 10 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  avatarPlaceholder: {
    backgroundColor: COLORS.surface2, justifyContent: 'center', alignItems: 'center',
  },
  authorName: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  timestamp: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  categoryBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  categoryText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  postBody: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 10 },
  postImage: {
    width: '100%', height: 200, borderRadius: 10, marginBottom: 10,
    backgroundColor: COLORS.surface2,
  },
  pollBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.secondary + '15', paddingHorizontal: 10,
    paddingVertical: 6, borderRadius: 8, marginBottom: 10, alignSelf: 'flex-start',
  },
  pollBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.secondary },
  postFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  voteRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  voteBtn: { padding: 2 },
  scoreText: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted, minWidth: 20, textAlign: 'center' },
  scorePositive: { color: COLORS.secondary },
  scoreNegative: { color: '#FF4444' },
  commentBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentCount: { fontSize: 13, color: COLORS.textMuted },
  emptyState: {
    alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white, marginTop: 16, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 8, textAlign: 'center' },
  emptyBtn: {
    marginTop: 20, backgroundColor: COLORS.secondary,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  errorState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { fontSize: 14, color: COLORS.error, textAlign: 'center', marginBottom: 12 },
  retryBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  retryText: { fontSize: 14, fontWeight: '600', color: COLORS.secondary },
  footerLoader: { paddingVertical: 16 },
});
