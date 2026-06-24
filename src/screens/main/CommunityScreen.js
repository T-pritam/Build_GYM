import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Linking, LayoutAnimation, UIManager, Platform,
  ActivityIndicator, FlatList, RefreshControl, TextInput, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS as THEME, FONTS } from '../../theme';
import SafeBottomBar from '../../components/SafeBottomBar';
import GradientIcon from '../../components/GradientIcon';
import { useAuthStore } from '../../store/authStore';
import { faqs, reviews } from '../../constants/dummyData';
import { fetchCommunityPosts, votePost, fetchCommunityMembers } from '../../services/communityService';

// Theme-compat: legacy colour keys → new "Holographic Noir" palette.
const COLORS = {
  background: THEME.background, surface: '#1B191E', surface2: THEME.surface2, card: '#1B191E',
  secondary: '#FFA9FA', secondaryGlow: THEME.primarySoft, secondaryBorder: THEME.primaryBorder,
  primary: THEME.primary, primaryBright: THEME.primaryBright, cyan: THEME.cyan, cyanNeon: THEME.cyanNeon,
  textPrimary: THEME.textPrimary, textSecondary: THEME.textSecondary, textMuted: THEME.textMuted,
  border: THEME.border, glass: 'rgba(255,255,255,0.03)', glassBorder: 'rgba(255,255,255,0.08)',
  white: THEME.white, warning: THEME.warning,
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Smart search bar ──────────────────────────────────────────────────────────
function SearchBar({ value, onChangeText, onClear, placeholder }) {
  return (
    <View style={styles.searchBar}>
      <Ionicons name="search-outline" size={15} color={COLORS.textMuted} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || 'Search...'}
        placeholderTextColor={COLORS.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        autoFocus
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={onClear} hitSlop={8}>
          <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const TABS = [
  { key: 'community', label: 'POSTS', icon: 'document-text-outline' },
  { key: 'reviews', label: 'REVIEWS', icon: 'star-outline' },
  { key: 'faq', label: 'FAQ', icon: 'help-circle-outline' },
];

const COMMUNITY_SORT_TABS = [
  { key: 'hot', label: 'HOT' },
  { key: 'new', label: 'NEW' },
  { key: 'top', label: 'TOP' },
];

const COMMUNITY_CATEGORY_COLORS = {
  transformation: '#A855F7',
  workout: THEME.primaryLight,
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

function CommunityFeedTab({ navigation, searchQuery = '' }) {
  const [sort, setSort] = useState('new');
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return posts;
    const tokens = q.split(/\s+/);
    return posts.filter((post) => {
      const hay = [post.body || '', post.author_name || '', post.category || ''].join(' ').toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [posts, searchQuery]);

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

  const [membersVisible, setMembersVisible] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const handleOpenMembers = useCallback(async () => {
    setMembersVisible(true);
    if (members.length > 0) return;
    setMembersLoading(true);
    try {
      const result = await fetchCommunityMembers();
      setMembers(result || []);
    } catch { /* silent fail */ } finally {
      setMembersLoading(false);
    }
  }, [members.length]);

  const voteTimersRef = useRef({});
  const prevPostsRef = useRef({});

  const handleVote = useCallback((postId, type) => {
    const prevPost = posts.find((post) => post.id === postId);
    if (!prevPost) return;

    // Capture pre-optimistic state only at the start of each debounce sequence
    if (!voteTimersRef.current[postId]) {
      prevPostsRef.current[postId] = prevPost;
    }

    const currentVote = prevPost.user_vote;
    const nextVote = currentVote === type ? null : type;

    // Optimistic update (immediate)
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

    // Debounce the API call — only the last click within 1 s fires
    clearTimeout(voteTimersRef.current[postId]);
    voteTimersRef.current[postId] = setTimeout(async () => {
      delete voteTimersRef.current[postId];
      try {
        const result = await votePost(postId, type);
        setPosts((prev) => prev.map((post) => (
          post.id === postId ? { ...post, ...result } : post
        )));
      } catch {
        const orig = prevPostsRef.current[postId];
        if (orig) {
          setPosts((prev) => prev.map((post) => (post.id === postId ? orig : post)));
        }
      }
      delete prevPostsRef.current[postId];
    }, 1000);
  }, [posts]);

  const renderPost = ({ item: post }) => {
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
                <Ionicons name="person" size={16} color={COLORS.textMuted} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.communityAuthorName}>{post.author_name || '[Deleted Member]'}</Text>
              <Text style={styles.communityTimestamp}>{communityTimeAgo(post.created_at).toUpperCase()}</Text>
            </View>
            <View style={[styles.communityCategoryBadge, { borderColor: badgeColor + '80', backgroundColor: badgeColor + '0D' }]}>
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
            <Ionicons name="bar-chart-outline" size={14} color={COLORS.cyan} />
            <Text style={styles.communityPollBadgeText}>Poll — Tap to vote</Text>
          </View>
        )}

        <View style={styles.communityPostFooter}>
          <View style={styles.communityVoteRow}>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); handleVote(post.id, 'up'); }}
              style={[styles.voteChip, post.user_vote === 'up' && styles.voteChipUpActive]}
              hitSlop={6}
            >
              <MaterialIcons
                name="north"
                size={15}
                color={post.user_vote === 'up' ? COLORS.secondary : COLORS.white}
              />
              <Text style={[styles.voteChipCount, { color: COLORS.secondary }]}>
                {post.upvotes || 0}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); handleVote(post.id, 'down'); }}
              style={[styles.voteChip, post.user_vote === 'down' && styles.voteChipDownActive]}
              hitSlop={6}
            >
              <MaterialIcons
                name="south"
                size={15}
                color={post.user_vote === 'down' ? '#FF4444' : COLORS.textMuted}
              />
              <Text style={[styles.voteChipCount, post.user_vote === 'down' && { color: '#FF4444' }]}>
                {post.downvotes || 0}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.communityCommentBtn}
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
          >
            <MaterialIcons name="chat-bubble-outline" size={15} color={COLORS.textMuted} />
            <Text style={styles.communityCommentCount}>{post.comment_count || 0} COMMENTS</Text>
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
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {COMMUNITY_SORT_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterPill, sort === tab.key && styles.filterPillActive]}
              onPress={() => setSort(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, sort === tab.key && styles.filterPillTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.toolbarIconBtn}
          onPress={handleOpenMembers}
          hitSlop={8}
        >
          <Ionicons name="people-outline" size={17} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredPosts}
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
            <View style={styles.composerAvatar}>
              <Ionicons name="person" size={16} color={COLORS.textMuted} />
            </View>
            <Text style={styles.communityCreateFieldText}>What's on your mind?</Text>
            <View style={styles.composerSendChip}>
              <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
            </View>
          </TouchableOpacity>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color={COLORS.secondary} style={{ paddingVertical: 16 }} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.communityEmptyState}>
            <Ionicons
              name={searchQuery.trim() ? 'search-outline' : 'chatbubbles-outline'}
              size={48}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyText}>
              {searchQuery.trim()
                ? `No posts match "${searchQuery.trim()}"`
                : 'Be the first to post in the community'}
            </Text>
          </View>
        }
      />

      <Modal
        visible={membersVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMembersVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMembersVisible(false)}
        >
          <View style={styles.membersSheet}>
            <View style={styles.membersSheetHandle} />
            <Text style={styles.membersSheetTitle}>Community Members</Text>
            {membersLoading ? (
              <ActivityIndicator size="small" color={COLORS.secondary} style={{ marginTop: 20 }} />
            ) : members.length === 0 ? (
              <View style={styles.membersEmptyState}>
                <Ionicons name="people-outline" size={36} color={COLORS.textMuted} />
                <Text style={styles.emptyStateText}>No members yet</Text>
              </View>
            ) : (
              <FlatList
                data={members}
                keyExtractor={(m) => m.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: m }) => (
                  <View style={styles.memberRow}>
                    {m.profile_photo_url ? (
                      <Image source={{ uri: m.profile_photo_url }} style={styles.memberAvatar} />
                    ) : (
                      <View style={[styles.memberAvatar, styles.memberAvatarPlaceholder]}>
                        <Ionicons name="person" size={16} color={COLORS.textMuted} />
                      </View>
                    )}
                    <Text style={styles.memberName}>{m.full_name || 'Member'}</Text>
                  </View>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
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
              <View style={[styles.reviewAvatar, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
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
    <View style={[styles.faqItem, expanded && styles.faqItemExpanded]}>
      <TouchableOpacity style={styles.faqHeader} onPress={toggle} activeOpacity={0.85}>
        <Text style={[styles.faqQuestion, expanded && styles.faqQuestionExpanded]} numberOfLines={expanded ? 0 : 2}>
          {faq.question}
        </Text>
        <Ionicons
          name={expanded ? 'remove' : 'add'}
          size={20}
          color={expanded ? COLORS.secondary : COLORS.white}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.faqAnswer}>
          <Text style={styles.faqAnswerText}>{faq.answer}</Text>
        </View>
      )}
    </View>
  );
}

export default function CommunityScreen({ navigation }) {
  const optCommunity = useAuthStore((s) => s.user?.optCommunity ?? false);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const visibleTabs = TABS.filter((t) => t.key !== 'community' || optCommunity);
  const [activeTab, setActiveTab] = useState(optCommunity ? 'community' : 'reviews');
  const userPickedTab = useRef(false);

  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (searchActive) setSearchQuery('');
    setSearchActive((v) => !v);
  };

  const selectTab = (key) => {
    userPickedTab.current = true;
    setActiveTab(key);
    if (key !== 'community') { setSearchActive(false); setSearchQuery(''); }
  };

  // Refresh consent on focus so the Community tab appears promptly after login.
  useFocusEffect(useCallback(() => { refreshUser(); }, [refreshUser]));

  // Once consent resolves to true, auto-select community — unless the user
  // has already chosen a tab manually.
  useEffect(() => {
    if (optCommunity && !userPickedTab.current) setActiveTab('community');
  }, [optCommunity]);

  return (
    <SafeBottomBar style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.glowTop} pointerEvents="none" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <GradientIcon name="arrow-back" set="ionicons" size={24} colors={['#7F2982', '#00F2FF']} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community</Text>
        {activeTab === 'community' ? (
          <TouchableOpacity style={styles.headerIconBtn} onPress={toggleSearch} hitSlop={8}>
            <GradientIcon
              name={searchActive ? 'close' : 'search'}
              set="ionicons"
              size={searchActive ? 22 : 23}
              colors={['#7F2982', '#00F2FF']}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerIconBtn} />
        )}
      </View>

      {/* Search bar (posts tab) */}
      {activeTab === 'community' && searchActive && (
        <View style={styles.parentSearchWrap}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="Search posts, members..."
          />
        </View>
      )}

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {visibleTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
            onPress={() => selectTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === 'community' && (
        <CommunityFeedTab navigation={navigation} searchQuery={searchActive ? searchQuery : ''} />
      )}

      {activeTab === 'reviews' && <ReviewsTab />}

      {activeTab === 'faq' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          <View style={styles.faqHeadingRow}>
            <View>
              <Text style={styles.faqMainHeading}>FAQs</Text>
              <Text style={styles.faqMainSub}>Common questions answered</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8,
  },

  // Search
  toolbarIconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  toolbarIconBtnActive: { borderColor: COLORS.secondaryBorder, backgroundColor: COLORS.secondaryGlow },
  parentSearchWrap: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1A1A2E', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.40)',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.white, padding: 0, fontFamily: FONTS.body },
  searchResultCount: { fontSize: 11, color: COLORS.textMuted, marginTop: 6, marginLeft: 2, fontFamily: FONTS.body },

  // Filter pills
  filterPill: {
    paddingHorizontal: 20, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  filterPillActive: {
    borderColor: '#FFA9FA',
    shadowColor: '#FFA9FA', shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 }, elevation: 4,
  },
  filterPillText: {
    fontSize: 10, color: COLORS.textSecondary, fontFamily: FONTS.label,
    letterSpacing: 1.5, lineHeight: 14, includeFontPadding: false,
  },
  filterPillTextActive: { color: '#FFA9FA' },

  communityListContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // Composer
  communityCreateField: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.glass, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14,
  },
  composerAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.glassBorder,
  },
  communityCreateFieldText: { flex: 1, color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.body },
  composerSendChip: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  // Post card (glass)
  communityPostCard: {
    backgroundColor: COLORS.glass, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    padding: 20, marginBottom: 16,
  },
  communityPostHeader: { marginBottom: 12 },
  communityAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  communityAvatar: { width: 40, height: 40, borderRadius: 20 },
  communityAvatarPlaceholder: {
    backgroundColor: COLORS.surface2, justifyContent: 'center', alignItems: 'center',
  },
  communityAuthorName: { fontSize: 14, color: COLORS.white, fontFamily: FONTS.bodyBold },
  communityTimestamp: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.label, letterSpacing: 0.5 },
  communityCategoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  communityCategoryText: { fontSize: 9, fontFamily: FONTS.label, textTransform: 'uppercase', letterSpacing: 1 },
  communityPostBody: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21, marginBottom: 14, fontFamily: FONTS.body },
  communityPostImage: {
    width: '100%', height: 200, borderRadius: 10, marginBottom: 14,
    backgroundColor: COLORS.surface2,
  },
  communityPollBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(6,182,212,0.10)', paddingHorizontal: 10,
    paddingVertical: 6, borderRadius: 8, marginBottom: 14, alignSelf: 'flex-start',
  },
  communityPollBadgeText: { fontSize: 12, color: COLORS.cyan, fontFamily: FONTS.label },
  communityPostFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  communityVoteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voteChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  voteChipUpActive: { backgroundColor: 'rgba(167,139,250,0.12)' },
  voteChipDownActive: { backgroundColor: 'rgba(255,68,68,0.12)' },
  voteChipCount: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.bodyBold },
  communityCommentBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  communityCommentCount: { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.label, letterSpacing: 0.5 },
  communityEmptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },

  glowTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 260,
    backgroundColor: 'rgba(127,41,130,0.06)',
  },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 10,
  },
  headerIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, color: COLORS.white, fontFamily: FONTS.bodyBold },
  notifBadge: {
    position: 'absolute', top: 4, right: 4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.primaryBright,
    borderWidth: 1.5, borderColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: { fontSize: 9, color: '#fff', fontFamily: FONTS.bodyBold },

  // Tab bar
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 20,
  },
  tabItem: {
    flex: 1, paddingBottom: 12, paddingTop: 4,
    borderBottomWidth: 2, borderBottomColor: 'transparent', alignItems: 'center',
  },
  tabItemActive: { borderBottomColor: '#FFA9FA' },
  tabLabel: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.label, letterSpacing: 1.5 },
  tabLabelActive: { color: COLORS.white },

  // Scroll content
  tabScrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },

  // Reviews
  rateCard: {
    backgroundColor: COLORS.glass, borderRadius: 14, borderWidth: 1, borderColor: COLORS.secondaryBorder,
    padding: 24, alignItems: 'center', gap: 10, marginBottom: 20,
  },
  rateIconWrap: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.secondaryGlow,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  rateTitle: { fontSize: 20, color: COLORS.white, fontFamily: FONTS.headline },
  rateSub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', fontFamily: FONTS.body },
  starsRow: { flexDirection: 'row', gap: 4 },
  rateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%',
    paddingVertical: 14, borderRadius: 14, justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.secondaryBorder, backgroundColor: 'transparent',
  },
  rateBtnText: { fontSize: 12, color: COLORS.white, fontFamily: FONTS.bodyBold, letterSpacing: 1.5 },
  reviewsHeading: { fontSize: 20, color: COLORS.white, marginBottom: 2, fontFamily: FONTS.headline },
  reviewsSub: { fontSize: 13, color: COLORS.textMuted, marginBottom: 14, fontFamily: FONTS.body },
  reviewCard: {
    backgroundColor: COLORS.glass, borderRadius: 14, borderWidth: 1, borderColor: COLORS.glassBorder,
    padding: 20, marginBottom: 10, gap: 10,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  reviewAvatar: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: 18, color: COLORS.white, fontFamily: FONTS.bodyBold },
  reviewName: { fontSize: 14, color: COLORS.white, marginBottom: 2, fontFamily: FONTS.bodyBold },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewStars: { fontSize: 12, color: COLORS.secondary, fontFamily: FONTS.bodyBold },
  reviewDate: { fontSize: 10, color: COLORS.secondary + 'BB', letterSpacing: 0.5, fontFamily: FONTS.label },
  reviewText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, fontFamily: FONTS.body },

  // FAQ
  faqHeadingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  faqMainHeading: { fontSize: 22, color: COLORS.white, fontFamily: FONTS.headline },
  faqMainSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.body },
  faqItem: {
    backgroundColor: COLORS.glass, borderRadius: 14, borderWidth: 1, borderColor: COLORS.glassBorder,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
  },
  faqItemExpanded: { borderColor: COLORS.secondaryBorder },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  faqQuestion: { flex: 1, fontSize: 14, color: COLORS.white, fontFamily: FONTS.bodyBold },
  faqQuestionExpanded: { color: COLORS.white },
  faqAnswer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  faqAnswerText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, fontFamily: FONTS.body },

  emptyText: { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.body },

  // Loading / error
  blogLoadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  blogErrorTitle: { fontSize: 16, color: COLORS.white, marginTop: 4, fontFamily: FONTS.bodyBold },
  blogErrorMsg: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontFamily: FONTS.body },
  blogRetryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primaryBright, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10, marginTop: 6,
  },
  blogRetryText: { fontSize: 13, color: COLORS.white, fontFamily: FONTS.bodyBold },

  // Members sheet
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  membersSheet: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '70%',
  },
  membersSheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 14,
  },
  membersSheetTitle: {
    fontSize: 16, color: COLORS.white, marginBottom: 16, fontFamily: FONTS.bodyBold,
  },
  membersEmptyState: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyStateText: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.body },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  memberAvatar: { width: 38, height: 38, borderRadius: 19 },
  memberAvatarPlaceholder: {
    backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  memberName: { fontSize: 14, color: COLORS.white, flex: 1, fontFamily: FONTS.body },
});
