import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Linking, LayoutAnimation, UIManager, Platform,
  ActivityIndicator, FlatList, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import SafeBottomBar from '../../components/SafeBottomBar';
import { faqs, reviews } from '../../constants/dummyData';
import { fetchPublishedBlogs } from '../../services/blogService';
import { fetchCommunityPosts, votePost } from '../../services/communityService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TABS = [
  { key: 'community', label: 'Community', icon: 'document-text-outline' },
  { key: 'reviews', label: 'Reviews', icon: 'star-outline' },
  { key: 'blog', label: 'Blog', icon: 'newspaper-outline' },
  { key: 'faq', label: 'FAQ', icon: 'help-circle-outline' },
];

const COMMUNITY_SORT_TABS = [
  { key: 'hot', label: 'Hot', icon: 'flame-outline' },
  { key: 'new', label: 'New', icon: 'time-outline' },
  { key: 'top', label: 'Top', icon: 'trending-up-outline' },
];

const COMMUNITY_CATEGORY_COLORS = {
  transformation: '#A855F7',
  workout: COLORS.secondary,
  nutrition: '#22C55E',
  question: '#3B82F6',
  motivation: '#F59E0B',
  achievement: '#EC4899',
  poll: '#06B6D4',
};

function communityTimeAgo(dateStr) {
  if (!dateStr) return '';

  // Normalize format
  const safeDateStr = dateStr
    .replace(' ', 'T')                 // fix ISO format
    .replace(/(\.\d{3})\d+/, '$1')     // trim microseconds → milliseconds
    .replace('+00', 'Z');              // ensure UTC

  const time = new Date(safeDateStr).getTime();

  if (isNaN(time)) return 'Invalid date'; // safety check

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

function CommunityFeedTab({ navigation }) {
  const [sort, setSort] = useState('hot');
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

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
    loadPosts(1).finally(() => setLoading(false));
  }, [loadPosts]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts(1, true);
    setRefreshing(false);
  }, [loadPosts]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadPosts(page + 1);
    setLoadingMore(false);
  }, [hasMore, loadingMore, loadPosts, page]);

  const handleVote = useCallback(async (postId, type) => {
    const prevPost = posts.find((post) => post.id === postId);
    if (!prevPost) return;

    const currentVote = prevPost.user_vote;
    const nextVote = currentVote === type ? null : type;

    setPosts((prev) => prev.map((post) => {
      if (post.id !== postId) return post;
      const upvotes = post.upvotes || 0;
      const downvotes = post.downvotes || 0;

      if (nextVote === 'up') {
        return {
          ...post,
          user_vote: 'up',
          upvotes: upvotes + (currentVote === 'up' ? 0 : 1),
          downvotes: downvotes - (currentVote === 'down' ? 1 : 0),
        };
      }
      if (nextVote === 'down') {
        return {
          ...post,
          user_vote: 'down',
          upvotes: upvotes - (currentVote === 'up' ? 1 : 0),
          downvotes: downvotes + (currentVote === 'down' ? 0 : 1),
        };
      }
      return {
        ...post,
        user_vote: null,
        upvotes: upvotes - (currentVote === 'up' ? 1 : 0),
        downvotes: downvotes - (currentVote === 'down' ? 1 : 0),
      };
    }));

    try {
      const result = await votePost(postId, type);
      setPosts((prev) => prev.map((post) => (
        post.id === postId ? { ...post, ...result } : post
      )));
    } catch {
      setPosts((prev) => prev.map((post) => (
        post.id === postId ? prevPost : post
      )));
    }
  }, [posts]);

  const renderPost = ({ item: post }) => {
    const score = (post.upvotes || 0) - (post.downvotes || 0);
    const badgeColor = COMMUNITY_CATEGORY_COLORS[post.category] || COLORS.secondary;

    return (
      <TouchableOpacity
        style={styles.communityPostCard}
        activeOpacity={0.82}
        onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
      >
        <View style={styles.communityPostHeader}>
          <View style={styles.communityAuthorRow}>
            {post.author_avatar ? (
              <Image source={{ uri: post.author_avatar }} style={styles.communityAvatar} />
            ) : (
              <View style={[styles.communityAvatar, styles.communityAvatarPlaceholder]}>
                <Ionicons name="person" size={14} color={COLORS.textMuted} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.communityAuthorName}>{post.author_name || '[Deleted Member]'}</Text>
              <Text style={styles.communityTimestamp}>{communityTimeAgo(post.created_at)}</Text>
            </View>
            <View style={[styles.communityCategoryBadge, { backgroundColor: badgeColor + '22' }]}>
              <Text style={[styles.communityCategoryText, { color: badgeColor }]}>{post.category}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.communityPostBody} numberOfLines={4}>{post.body}</Text>

        {post.image_url ? (
          <Image source={{ uri: post.image_url }} style={styles.communityPostImage} contentFit="cover" />
        ) : null}

        {post.is_poll && (
          <View style={styles.communityPollBadge}>
            <Ionicons name="bar-chart-outline" size={14} color={COLORS.secondary} />
            <Text style={styles.communityPollBadgeText}>Poll — Tap to vote</Text>
          </View>
        )}

        <View style={styles.communityPostFooter}>
          <View style={styles.communityVoteRow}>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); handleVote(post.id, 'up'); }}
              style={styles.communityVoteBtn}
              hitSlop={8}
            >
              <Ionicons
                name={post.user_vote === 'up' ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
                size={22}
                color={post.user_vote === 'up' ? COLORS.secondary : COLORS.textMuted}
              />
            </TouchableOpacity>
            <Text
              style={[
                styles.communityScoreText,
                score > 0 && styles.communityScorePositive,
                score < 0 && styles.communityScoreNegative,
              ]}
            >
              {score}
            </Text>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); handleVote(post.id, 'down'); }}
              style={styles.communityVoteBtn}
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
            style={styles.communityCommentBtn}
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
          >
            <Ionicons name="chatbubble-outline" size={18} color={COLORS.textMuted} />
            <Text style={styles.communityCommentCount}>{post.comment_count || 0}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.blogLoadingContainer}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.blogLoadingContainer}>
        <Ionicons name="cloud-offline-outline" size={40} color={COLORS.textMuted} />
        <Text style={styles.blogErrorTitle}>Couldn't load community feed</Text>
        <Text style={styles.blogErrorMsg}>{error}</Text>
        <TouchableOpacity style={styles.blogRetryBtn} activeOpacity={0.85} onPress={handleRefresh}>
          <Ionicons name="refresh" size={14} color={COLORS.white} />
          <Text style={styles.blogRetryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.communityFeedContainer}>
      <View style={styles.communitySortRow}>
        {COMMUNITY_SORT_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.communitySortTab, sort === tab.key && styles.communitySortTabActive]}
            onPress={() => setSort(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={15}
              color={sort === tab.key ? COLORS.secondary : COLORS.textMuted}
            />
            <Text style={[styles.communitySortLabel, sort === tab.key && styles.communitySortLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={styles.communityListContent}
        showsVerticalScrollIndicator={false}
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
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.communityCreateField}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CreatePost')}
          >
            <Ionicons name="create-outline" size={18} color={COLORS.secondary} />
            <Text style={styles.communityCreateFieldText}>Share with community...</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.secondary} />
          </TouchableOpacity>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color={COLORS.secondary} style={{ paddingVertical: 16 }} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.communityEmptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Be the first to post in the community</Text>
          </View>
        }
      />
    </View>
  );
}

// Reviews tab
function ReviewsTab() {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.tabScrollContent}
    >
      {/* Rate on Play Store card */}
      <View style={styles.rateCard}>
        <View style={styles.rateIconWrap}>
          <Ionicons name="star" size={28} color={COLORS.secondary} />
        </View>
        <Text style={styles.rateTitle}>Enjoying Build Gym?</Text>
        <Text style={styles.rateSub}>Your review helps us grow. Takes just 30 seconds!</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Ionicons key={i} name="star" size={28} color={COLORS.secondary} />
          ))}
        </View>
        <TouchableOpacity
          style={styles.rateBtn}
          onPress={() => Linking.openURL('https://play.google.com/store')}
          activeOpacity={0.85}
        >
          <Ionicons name="play" size={14} color={COLORS.white} />
          <Text style={styles.rateBtnText}>RATE ON PLAY STORE</Text>
          <Ionicons name="arrow-forward" size={14} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Reviews list */}
      <View>
        <Text style={styles.reviewsHeading}>What people say</Text>
        <Text style={styles.reviewsSub}>Reviews from the Play Store</Text>
        {(reviews || []).map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={[styles.reviewAvatar, { backgroundColor: COLORS.secondary }]}>
                <Text style={styles.reviewAvatarText}>{review.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewName}>{review.name}</Text>
                <View style={styles.reviewMeta}>
                  <Text style={styles.reviewStars}>{'★'.repeat(review.rating)}</Text>
                  <Text style={styles.reviewDate}>{review.date}</Text>
                </View>
              </View>
              <Ionicons name="logo-google-playstore" size={16} color={COLORS.textMuted} />
            </View>
            <Text style={styles.reviewText}>{review.text}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// FAQ accordion item
function FAQItem({ faq }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <TouchableOpacity
      style={[styles.faqItem, expanded && styles.faqItemExpanded]}
      onPress={toggle}
      activeOpacity={0.85}
    >
      <View style={styles.faqHeader}>
        <Text style={[styles.faqQuestion, expanded && styles.faqQuestionExpanded]} numberOfLines={expanded ? 0 : 2}>
          {faq.question}
        </Text>
        <View style={[styles.faqToggle, expanded && styles.faqToggleExpanded]}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={expanded ? COLORS.secondary : COLORS.textMuted}
          />
        </View>
      </View>
      {expanded && (
        <View style={styles.faqAnswer}>
          <Text style={styles.faqAnswerText}>{faq.answer}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const BLOG_TAG_COLORS = {
  Fitness: COLORS.secondary,
  Training: COLORS.secondary,
  Nutrition: '#22C55E',
  Recovery: '#A855F7',
  Motivation: '#F59E0B',
};

function blogTagColor(tag) {
  return BLOG_TAG_COLORS[tag] || COLORS.secondary;
}

function formatBlogDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Blog tab — inline blog list fetched from API
function BlogTab({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const loadBlogs = useCallback(async (cursor = null, isRefresh = false) => {
    try {
      if (!cursor) setError(null);
      const result = await fetchPublishedBlogs({ cursor, limit: 20 });
      if (cursor && !isRefresh) {
        setPosts((prev) => [...prev, ...result.data]);
      } else {
        setPosts(result.data);
      }
      setNextCursor(result.nextCursor);
    } catch (err) {
      if (!cursor) setError(err?.response?.data?.message || err?.message || 'Failed to load blogs');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadBlogs().finally(() => setLoading(false));
  }, [loadBlogs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBlogs(null, true);
    setRefreshing(false);
  }, [loadBlogs]);

  const handleLoadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    loadBlogs(nextCursor).finally(() => setLoadingMore(false));
  }, [nextCursor, loadingMore, loadBlogs]);

  if (loading) {
    return (
      <View style={styles.blogLoadingContainer}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.blogLoadingContainer}>
        <Ionicons name="cloud-offline-outline" size={40} color={COLORS.textMuted} />
        <Text style={styles.blogErrorTitle}>Couldn't load blogs</Text>
        <Text style={styles.blogErrorMsg}>{error}</Text>
        <TouchableOpacity
          style={styles.blogRetryBtn}
          activeOpacity={0.85}
          onPress={() => { setLoading(true); loadBlogs().finally(() => setLoading(false)); }}
        >
          <Ionicons name="refresh" size={14} color={COLORS.white} />
          <Text style={styles.blogRetryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderBlogCard = ({ item: post }) => {
    const primaryTag = post.tags?.[0] || 'Fitness';
    const color = blogTagColor(primaryTag);
    return (
      <TouchableOpacity
        style={styles.blogCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('BlogFeed', { postId: post.id, slug: post.slug })}
      >
        {post.coverImageUrl ? (
          <View style={styles.blogCover}>
            <Image source={{ uri: post.coverImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFill} />
          </View>
        ) : (
          <View style={[styles.blogCover, { backgroundColor: color }]}>
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFill} />
          </View>
        )}
        <View style={styles.blogBody}>
          <View style={styles.blogBadgeRow}>
            <View style={[styles.badge, { backgroundColor: color + '22' }]}>
              <Text style={[styles.badgeText, { color }]}>{primaryTag.toUpperCase()}</Text>
            </View>
            <Text style={styles.blogMetaText}>{post.estimatedReadTime || 1} min read</Text>
          </View>
          <Text style={styles.blogTitle} numberOfLines={2}>{post.title}</Text>
          <View style={styles.blogMeta}>
            <Text style={styles.blogMetaText}>{post.authorName || 'Build Gym'} · {formatBlogDate(post.publishedAt)}</Text>
            <View style={styles.blogReadBtn}>
              <Ionicons name="book-outline" size={11} color={COLORS.secondary} />
              <Text style={styles.blogReadBtnText}>Read</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={posts}
      keyExtractor={(p) => p.id}
      renderItem={renderBlogCard}
      contentContainerStyle={styles.blogListContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.secondary} colors={[COLORS.secondary]} />
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        <TouchableOpacity style={styles.blogViewAllBtn} activeOpacity={0.85} onPress={() => navigation.navigate('BlogList')}>
          <Text style={styles.blogViewAllText}>View All with Filters</Text>
          <Ionicons name="arrow-forward" size={14} color={COLORS.secondary} />
        </TouchableOpacity>
      }
      ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={COLORS.secondary} style={{ paddingVertical: 16 }} /> : null}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="newspaper-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No blog posts yet.</Text>
        </View>
      }
    />
  );
}

export default function CommunityScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('community');

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.glowTop} pointerEvents="none" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Community</Text>
          <Text style={styles.headerSub}>Articles & updates from Build Gym</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={24} color={COLORS.white} />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === 'community' && <CommunityFeedTab navigation={navigation} />}

      {activeTab === 'reviews' && <ReviewsTab />}

      {activeTab === 'blog' && (
        <BlogTab navigation={navigation} />
      )}

      {activeTab === 'faq' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          <View style={styles.faqHeadingRow}>
            <View>
              <Text style={styles.faqMainHeading}>FAQs</Text>
              <Text style={styles.faqMainSub}>Common questions answered</Text>
            </View>
            <View style={styles.faqHelpIcon}>
              <Ionicons name="help-circle-outline" size={22} color={COLORS.textMuted} />
            </View>
          </View>
          {(faqs || []).map((faq) => (
            <FAQItem key={faq.id} faq={faq} />
          ))}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </SafeBottomBar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  communityFeedContainer: { flex: 1 },
  communitySortRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  communitySortTab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 18, backgroundColor: COLORS.surface,
  },
  communitySortTabActive: { backgroundColor: COLORS.secondaryGlow },
  communitySortLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  communitySortLabelActive: { color: COLORS.secondary },
  communityListContent: { paddingHorizontal: 20, paddingBottom: 100 },
  communityCreateField: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.secondaryBorder,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  communityCreateFieldText: { flex: 1, marginLeft: 10, color: COLORS.textMuted, fontSize: 13 },
  communityPostCard: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 14, marginBottom: 12,
  },
  communityPostHeader: { marginBottom: 10 },
  communityAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  communityAvatar: { width: 34, height: 34, borderRadius: 17 },
  communityAvatarPlaceholder: {
    backgroundColor: COLORS.surface2, justifyContent: 'center', alignItems: 'center',
  },
  communityAuthorName: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  communityTimestamp: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  communityCategoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  communityCategoryText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  communityPostBody: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 10 },
  communityPostImage: {
    width: '100%', height: 200, borderRadius: 10, marginBottom: 10,
    backgroundColor: COLORS.surface2,
  },
  communityPollBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.secondary + '15', paddingHorizontal: 10,
    paddingVertical: 6, borderRadius: 8, marginBottom: 10, alignSelf: 'flex-start',
  },
  communityPollBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.secondary },
  communityPostFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  communityVoteRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  communityVoteBtn: { padding: 2 },
  communityScoreText: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted, minWidth: 20, textAlign: 'center' },
  communityScorePositive: { color: COLORS.secondary },
  communityScoreNegative: { color: '#FF4444' },
  communityCommentBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  communityCommentCount: { fontSize: 13, color: COLORS.textMuted },
  communityEmptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  glowTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 260,
    backgroundColor: 'rgba(233,99,22,0.08)',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.white },
  headerSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  notifDot: {
    position: 'absolute', top: 0, right: 0, width: 8, height: 8,
    borderRadius: 4, backgroundColor: COLORS.secondary, borderWidth: 1.5, borderColor: COLORS.background,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 20,
  },
  tabItem: {
    paddingBottom: 12, paddingTop: 4, marginRight: 28,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: COLORS.secondary },
  tabLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  tabLabelActive: { color: COLORS.secondary },

  // Scroll content
  tabScrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },

  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  // Reviews
  rateCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.secondaryBorder,
    padding: 24, alignItems: 'center', gap: 10, marginBottom: 20,
  },
  rateIconWrap: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.secondaryGlow,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  rateTitle: { fontSize: 20, fontWeight: '800', color: COLORS.white },
  rateSub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  starsRow: { flexDirection: 'row', gap: 4 },
  rateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%',
    paddingVertical: 14, borderRadius: 14, justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.secondaryBorder, backgroundColor: 'transparent',
  },
  rateBtnText: { fontSize: 12, fontWeight: '900', color: COLORS.white, letterSpacing: 1.5 },
  reviewsHeading: { fontSize: 20, fontWeight: '800', color: COLORS.white, marginBottom: 2 },
  reviewsSub: { fontSize: 13, color: COLORS.textMuted, marginBottom: 14 },
  reviewCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: 20, marginBottom: 10, gap: 10,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  reviewAvatar: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  reviewName: { fontSize: 14, fontWeight: '700', color: COLORS.white, marginBottom: 2 },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewStars: { fontSize: 12, fontWeight: '800', color: COLORS.secondary },
  reviewDate: { fontSize: 10, fontWeight: '600', color: COLORS.secondary + 'BB', letterSpacing: 0.5 },
  reviewText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  // FAQ
  faqHeadingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  faqMainHeading: { fontSize: 22, fontWeight: '800', color: COLORS.white },
  faqMainSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  faqHelpIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  faqItem: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: 16, marginBottom: 10,
  },
  faqItemExpanded: { borderColor: COLORS.secondaryBorder },
  faqHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.white },
  faqQuestionExpanded: { color: COLORS.secondary },
  faqToggle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  faqToggleExpanded: { backgroundColor: COLORS.secondaryGlow },
  faqAnswer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  faqAnswerText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20 },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },

  // Blog tab
  blogListContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100 },
  blogLoadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  blogErrorTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white, marginTop: 4 },
  blogErrorMsg: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  blogRetryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.secondary, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10, marginTop: 6,
  },
  blogRetryText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  blogViewAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.secondaryBorder, borderRadius: 10,
    backgroundColor: COLORS.secondaryGlow,
  },
  blogViewAllText: { fontSize: 12, fontWeight: '700', color: COLORS.secondary },
  blogCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden', marginBottom: 12,
  },
  blogCover: { width: '100%', height: 130 },
  blogBody: { padding: 14, gap: 6 },
  blogBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  blogTitle: { fontSize: 14, fontWeight: '800', color: COLORS.white, lineHeight: 20 },
  blogMeta: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 8, marginTop: 2,
  },
  blogMetaText: { fontSize: 10, color: COLORS.textMuted },
  blogReadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 7, borderWidth: 1, borderColor: COLORS.secondaryBorder,
    backgroundColor: COLORS.secondaryGlow,
  },
  blogReadBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.secondary },
});
