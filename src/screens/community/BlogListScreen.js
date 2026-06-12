import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { fetchPublishedBlogs } from '../../services/blogService';

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

// Local search bar (mirrors the Community Blog-tab pattern)
function SearchBar({ value, onChangeText, onClear }) {
  return (
    <View style={styles.searchBar}>
      <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder="Search articles, topics, authors…"
        placeholderTextColor={COLORS.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        autoFocus
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={onClear} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.primaryLight} />
        </TouchableOpacity>
        <Text style={styles.title}>Blogs</Text>
        <TouchableOpacity
          style={[styles.searchIconBtn, searchActive && styles.searchIconBtnActive]}
          onPress={toggleSearch}
          hitSlop={8}
        >
          <Ionicons
            name={searchActive ? 'close' : 'search-outline'}
            size={20}
            color={searchActive ? COLORS.primaryLight : COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Search bar (toggle) */}
      {searchActive && (
        <View style={styles.searchWrap}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
          {searchQuery.trim().length > 0 && (
            <Text style={styles.searchResultCount}>
              {filteredPosts.length} result{filteredPosts.length !== 1 ? 's' : ''}{' '}
              for <Text style={{ color: COLORS.primaryLight }}>"{searchQuery.trim()}"</Text>
            </Text>
          )}
        </View>
      )}

      {/* Category filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: FONTS.headline, fontSize: 20, color: COLORS.white },
  searchIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  searchIconBtnActive: { borderColor: COLORS.primaryBorder, backgroundColor: COLORS.primarySoft },

  searchWrap: { paddingHorizontal: 20, paddingBottom: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surfaceLow, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.primaryBorder,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontFamily: FONTS.body, fontSize: 14, color: COLORS.white, padding: 0 },
  searchResultCount: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted, marginTop: 8, marginLeft: 2 },

  filterScroll: { flexGrow: 0 },
  filterRow: { paddingHorizontal: 20, paddingBottom: 18, gap: 10 },
  chip: {
    height: 36, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  chipActive: { backgroundColor: COLORS.primary },
  chipInactive: { backgroundColor: COLORS.surfaceLow, borderWidth: 1, borderColor: COLORS.border },
  chipText: { fontFamily: FONTS.bodyMedium, fontSize: 13 },
  chipTextActive: { color: COLORS.white, fontFamily: FONTS.bodyBold },
  chipTextInactive: { color: COLORS.textMuted },

  list: { paddingHorizontal: 20, paddingBottom: 100 },

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

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
});
