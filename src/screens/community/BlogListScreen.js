import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { fetchPublishedBlogs } from '../../services/blogService';

const TAG_COLORS = {
  Fitness: COLORS.secondary,
  Training: COLORS.secondary,
  Nutrition: '#22C55E',
  Recovery: '#A855F7',
  Motivation: '#F59E0B',
};

const CATEGORIES = ['All', 'Fitness', 'Training', 'Nutrition', 'Recovery', 'Motivation'];

function tagColor(tag) {
  return TAG_COLORS[tag] || COLORS.secondary;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BlogListScreen({ navigation }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

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
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await fetchBlogs(nextCursor);
    setLoadingMore(false);
  }, [nextCursor, loadingMore, fetchBlogs]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setPosts([]);
    setError(null);
    fetchBlogs().finally(() => setLoading(false));
  }, [fetchBlogs]);

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
        {/* Cover */}
        {post.coverImageUrl ? (
          <View style={styles.cover}>
            <Image
              source={{ uri: post.coverImageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.5)']}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ) : (
          <View style={[styles.cover, { backgroundColor: color }]}>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.5)']}
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.topRow}>
            <View style={[styles.categoryBadge, { backgroundColor: color + '22' }]}>
              <Text style={[styles.categoryBadgeText, { color }]}>
                {primaryTag.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.readTime}>{readTime} min</Text>
          </View>

          <Text style={styles.postTitle} numberOfLines={2}>{post.title}</Text>
          <Text style={styles.postMeta}>
            {post.authorName || 'Build Gym'} · {formatDate(post.publishedAt)}
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.readBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('BlogFeed', { postId: post.id, slug: post.slug })}
            >
              <Ionicons name="book-outline" size={13} color={COLORS.secondary} />
              <Text style={styles.readBtnText}>Read Article</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.root}>
      {/* Orange glow */}
      <LinearGradient
        colors={['rgba(233,99,22,0.12)', 'transparent']}
        style={styles.glow}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View>
          <Text style={styles.eyebrow}>Build Gym</Text>
          <Text style={styles.title}>Blog & Updates</Text>
        </View>
      </View>

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
          <ActivityIndicator size="large" color={COLORS.secondary} />
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
          data={posts}
          keyExtractor={(a) => a.id}
          renderItem={renderCard}
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
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
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.secondary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="newspaper-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No articles in this category.</Text>
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
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10, fontWeight: '700', color: COLORS.secondary,
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.white, letterSpacing: -0.3 },

  filterScroll: { flexGrow: 0 },
  filterRow: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  chip: {
    height: 36, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  chipActive: { backgroundColor: COLORS.secondary },
  chipInactive: {
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipText: { fontSize: 13 },
  chipTextActive: { color: COLORS.white, fontWeight: '700' },
  chipTextInactive: { color: COLORS.textMuted, fontWeight: '500' },

  list: { paddingHorizontal: 20, paddingBottom: 100 },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },

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

  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, overflow: 'hidden', marginBottom: 16,
  },
  cover: { width: '100%', height: 160 },

  cardContent: { padding: 16 },

  topRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  categoryBadge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  categoryBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  readTime: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },

  postTitle: {
    fontSize: 15, fontWeight: '800', color: COLORS.white,
    lineHeight: 21, marginBottom: 4,
  },
  postMeta: { fontSize: 11, color: COLORS.textMuted },

  actionsRow: { marginTop: 12 },
  readBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.secondaryBorder,
    backgroundColor: COLORS.secondaryGlow,
  },
  readBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.secondary },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});
