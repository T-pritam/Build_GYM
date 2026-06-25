import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../theme';
import GradientIcon from '../../components/GradientIcon';
import {
  fetchPublishedBlogs,
  toggleBlogBookmark,
  fetchBookmarkedBlogs,
} from '../../services/blogService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TAG_COLORS = {
  Fitness: COLORS.primaryLight,
  Training: COLORS.primaryLight,
  Nutrition: '#4ADE80',
  Recovery: '#A855F7',
  Motivation: '#F5B041',
};

const CATEGORIES = ['All', 'Fitness', 'Training', 'Nutrition', 'Recovery', 'Motivation'];

function tagColor(tag) {
  return TAG_COLORS[tag] || COLORS.primaryLight;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getInitials(name) {
  if (!name) return 'BG';
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function BlogListScreen({ navigation }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);

  // "Saved Articles" bottom sheet
  const [savedVisible, setSavedVisible] = useState(false);
  const [savedItems, setSavedItems] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);

  const fetchBlogs = useCallback(async (cursor = null, isRefresh = false) => {
    try {
      setError(null);
      const tag = activeCategory === 'All' ? undefined : activeCategory;
      const result = await fetchPublishedBlogs({ cursor, limit: 20, tag });
      if (cursor && !isRefresh) {
        setPosts((prev) => [...prev, ...result.data]);
      } else {
        setPosts(result.data);
      }
      setNextCursor(result.nextCursor);
    } catch (err) {
      console.warn('fetchBlogs error:', err);
      if (!cursor) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load blogs');
      }
    }
  }, [activeCategory]);

  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setNextCursor(null);
    setError(null);
    fetchBlogs().finally(() => setLoading(false));
  }, [fetchBlogs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBlogs(null, true);
    setRefreshing(false);
  }, [fetchBlogs]);

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || searchQuery.trim()) return;
    setLoadingMore(true);
    await fetchBlogs(nextCursor);
    setLoadingMore(false);
  }, [nextCursor, loadingMore, fetchBlogs, searchQuery]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setPosts([]);
    setError(null);
    fetchBlogs().finally(() => setLoading(false));
  }, [fetchBlogs]);

  const toggleSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (searchActive) setSearchQuery('');
    setSearchActive((v) => !v);
  };

  // Optimistically flip a post's bookmark state, then sync with the API.
  const applyBookmark = useCallback((blogId, value) => {
    setPosts((prev) => prev.map((p) => (p.id === blogId ? { ...p, isBookmarked: value } : p)));
  }, []);

  const handleToggleBookmark = useCallback(async (post) => {
    const next = !post.isBookmarked;
    applyBookmark(post.id, next);
    try {
      const res = await toggleBlogBookmark(post.id);
      // Reconcile with the server's authoritative value
      if (typeof res?.bookmarked === 'boolean' && res.bookmarked !== next) {
        applyBookmark(post.id, res.bookmarked);
      }
    } catch (err) {
      console.warn('toggleBlogBookmark error:', err);
      applyBookmark(post.id, post.isBookmarked); // roll back
    }
  }, [applyBookmark]);

  const loadSavedArticles = useCallback(async () => {
    setSavedLoading(true);
    try {
      const items = await fetchBookmarkedBlogs();
      setSavedItems(items || []);
    } catch (err) {
      console.warn('fetchBookmarkedBlogs error:', err);
      setSavedItems([]);
    } finally {
      setSavedLoading(false);
    }
  }, []);

  const openSaved = useCallback(() => {
    setSavedVisible(true);
    loadSavedArticles();
  }, [loadSavedArticles]);

  const handleRemoveSaved = useCallback(async (item) => {
    setSavedItems((prev) => prev.filter((s) => s.id !== item.id));
    applyBookmark(item.id, false);
    try {
      await toggleBlogBookmark(item.id);
    } catch (err) {
      console.warn('toggleBlogBookmark error:', err);
      // Re-sync the sheet if the unsave failed
      applyBookmark(item.id, true);
      loadSavedArticles();
    }
  }, [applyBookmark, loadSavedArticles]);

  const openSavedArticle = useCallback((item) => {
    setSavedVisible(false);
    navigation.navigate('BlogFeed', { postId: item.id, slug: item.slug });
  }, [navigation]);

  // Client-side filter on the loaded list (title / tags / author)
  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return posts;
    const tokens = q.split(/\s+/);
    return posts.filter((post) => {
      const hay = [
        post.title || '',
        (post.tags || []).join(' '),
        post.authorName || '',
      ].join(' ').toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [posts, searchQuery]);

  function renderCard({ item: post }) {
    const primaryTag = post.tags?.[0] || 'Fitness';
    const color = tagColor(primaryTag);
    const readTime = post.estimatedReadTime || 1;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('BlogFeed', { postId: post.id, slug: post.slug })}
      >
        {/* Cover + category pill overlay */}
        <View style={[styles.cover, !post.coverImageUrl && { backgroundColor: color }]}>
          {post.coverImageUrl ? (
            <Image source={{ uri: post.coverImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : null}
          <LinearGradient colors={['transparent', 'rgba(8,6,8,0.85)']} style={StyleSheet.absoluteFill} />
          <View style={styles.coverPill}>
            <Text style={styles.coverPillText}>{primaryTag.toUpperCase()}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={styles.postTitle} numberOfLines={2}>{post.title}</Text>

          <View style={styles.authorRow}>
            <View style={styles.authorAvatar}>
              <Text style={styles.authorInitials}>{getInitials(post.authorName)}</Text>
            </View>
            <Text style={styles.authorText} numberOfLines={1}>
              By {post.authorName || 'Build Gym'}
              <Text style={styles.authorDim}>  ·  {readTime} min read</Text>
            </Text>
            <Text style={styles.authorDate}>{formatDate(post.publishedAt)}</Text>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Footer: comment count + bookmark toggle */}
          <View style={styles.cardFooter}>
            <View style={styles.commentMeta}>
              <Ionicons name="chatbubble-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.commentCount}>{post.commentCount ?? 0}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleToggleBookmark(post)}
              hitSlop={10}
              activeOpacity={0.7}
            >
              <Ionicons
                name={post.isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={post.isBookmarked ? COLORS.primaryLight : COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.root}>
      {/* Purple glow */}
      <LinearGradient
        colors={['rgba(127,41,130,0.15)', 'transparent']}
        style={styles.glow}
        pointerEvents="none"
      />

      {/* Sticky floating buttons (back · search · bookmark). The centered "Blogs"
          title lives in the scrolling list header, so it scrolls away on scroll. */}
      {!searchActive && (
        <>
          <TouchableOpacity style={styles.floatBack} onPress={() => navigation.goBack()} hitSlop={10} activeOpacity={0.7}>
            <GradientIcon name="arrow-back" set="ionicons" size={24} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.floatSearch} onPress={toggleSearch} hitSlop={10} activeOpacity={0.7}>
            <GradientIcon name="search" set="ionicons" size={22} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.floatBookmark} onPress={openSaved} hitSlop={10} activeOpacity={0.7}>
            <GradientIcon name="bookmark" set="ionicons" size={22} />
          </TouchableOpacity>
        </>
      )}

      {/* Search overlay (fixed top) */}
      {searchActive && (
        <View style={styles.searchOverlay}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search articles…"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={toggleSearch} hitSlop={8}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
          {searchQuery.trim().length > 0 && (
            <Text style={styles.searchResultCount}>
              {filteredPosts.length} result{filteredPosts.length !== 1 ? 's' : ''}{' '}
              for <Text style={{ color: COLORS.primaryLight }}>"{searchQuery.trim()}"</Text>
            </Text>
          )}
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryLight} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.errorTitle}>Couldn't load blogs</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.85}>
            <Ionicons name="refresh" size={16} color={COLORS.white} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={(a) => a.id}
          renderItem={renderCard}
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={(
            <View style={styles.listHeader}>
              <Text style={styles.title}>Blogs</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, activeCategory === cat ? styles.chipActive : styles.chipInactive]}
                    onPress={() => setActiveCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        activeCategory === cat ? styles.chipTextActive : styles.chipTextInactive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primaryLight}
              colors={[COLORS.primaryLight]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.primaryLight} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name={searchQuery.trim() ? 'search-outline' : 'newspaper-outline'}
                size={40}
                color={COLORS.textMuted}
              />
              <Text style={styles.emptyText}>
                {searchQuery.trim()
                  ? `No articles match "${searchQuery.trim()}"`
                  : 'No articles in this category.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Saved Articles bottom sheet */}
      <Modal
        visible={savedVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSavedVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setSavedVisible(false)}
        >
          <TouchableOpacity style={styles.sheet} activeOpacity={1}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Saved Articles</Text>

            {savedLoading ? (
              <View style={styles.sheetLoading}>
                <ActivityIndicator size="small" color={COLORS.primaryLight} />
              </View>
            ) : savedItems.length === 0 ? (
              <Text style={styles.sheetEmpty}>No saved articles yet.</Text>
            ) : (
              <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                {savedItems.map((item) => (
                  <View key={item.id} style={styles.savedRow}>
                    <TouchableOpacity
                      style={styles.savedRowInfo}
                      activeOpacity={0.7}
                      onPress={() => openSavedArticle(item)}
                    >
                      <Text style={styles.savedRowTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.savedRowMeta} numberOfLines={1}>
                        By {item.authorName || 'Build Gym'} · {item.estimatedReadTime || 1} min read
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveSaved(item)}
                      hitSlop={10}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="bookmark" size={20} color={COLORS.primaryLight} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },

  // Sticky floating gradient buttons (back · search · bookmark)
  floatBack: { position: 'absolute', top: 52, left: 20, zIndex: 100, padding: 4 },
  floatSearch: { position: 'absolute', top: 52, right: 60, zIndex: 100, padding: 4 },
  floatBookmark: { position: 'absolute', top: 52, right: 20, zIndex: 100, padding: 4 },

  // Scrolling header block (centered title + pills)
  listHeader: {},
  title: {
    fontFamily: FONTS.bodyBold, fontSize: 18, color: COLORS.white,
    textAlign: 'center', marginBottom: 20,
  },

  // Search overlay (fixed top)
  searchOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200,
    backgroundColor: COLORS.background, paddingTop: 48, paddingHorizontal: 20, paddingBottom: 12,
  },
  cancelText: { fontFamily: FONTS.label, fontSize: 12, color: COLORS.primaryLight, letterSpacing: 1 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1A1A2E', borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.primaryBorder,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontFamily: FONTS.body, fontSize: 14, color: COLORS.white, padding: 0 },
  searchResultCount: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted, marginTop: 8, marginLeft: 2 },

  filterRow: { paddingBottom: 8, gap: 10 },
  chip: {
    height: 36, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  chipActive: { backgroundColor: COLORS.primary },
  chipInactive: { backgroundColor: COLORS.surfaceLow, borderWidth: 1, borderColor: COLORS.border },
  chipText: { fontFamily: FONTS.bodyMedium, fontSize: 13 },
  chipTextActive: { color: COLORS.white, fontFamily: FONTS.bodyBold },
  chipTextInactive: { color: COLORS.textMuted },

  list: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 100 },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },

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

  card: {
    backgroundColor: COLORS.surfaceLow,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 16, overflow: 'hidden', marginBottom: 16,
  },
  cover: { width: '100%', height: 180 },
  coverPill: {
    position: 'absolute', top: 14, left: 14,
    backgroundColor: 'rgba(8,6,8,0.6)', borderWidth: 1, borderColor: COLORS.borderStrong,
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5,
  },
  coverPillText: { fontFamily: FONTS.label, fontSize: 9, color: COLORS.primaryLight, letterSpacing: 1.5 },

  cardContent: { padding: 18, gap: 14 },
  postTitle: { fontFamily: FONTS.headline, fontSize: 19, color: COLORS.white, lineHeight: 25 },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorAvatar: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.surface3,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  authorInitials: { fontFamily: FONTS.label, fontSize: 9, color: COLORS.textSecondary },
  authorText: { flex: 1, fontFamily: FONTS.bodyMedium, fontSize: 12, color: COLORS.textSecondary },
  authorDim: { color: COLORS.textMuted },
  authorDate: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted },

  cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', width: '100%' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentCount: { fontFamily: FONTS.label, fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1 },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },

  // Saved Articles sheet
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surfaceLow,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 36,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 48, height: 5, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontFamily: FONTS.headline, fontSize: 18, color: COLORS.white, marginBottom: 18 },
  sheetLoading: { paddingVertical: 30, alignItems: 'center' },
  sheetEmpty: {
    fontFamily: FONTS.body, fontSize: 14, color: COLORS.textMuted,
    textAlign: 'center', paddingVertical: 30,
  },
  sheetScroll: { flexGrow: 0 },
  savedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  savedRowInfo: { flex: 1, gap: 4 },
  savedRowTitle: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white },
  savedRowMeta: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },
});
