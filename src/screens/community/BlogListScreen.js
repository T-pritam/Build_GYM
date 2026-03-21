import React, { useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { communityArticles } from '../../constants/dummyData';

const CATEGORY_COLORS = {
  Training: COLORS.secondary,
  Nutrition: '#22C55E',
  Update: '#3B82F6',
  Recovery: '#A855F7',
  Events: '#F59E0B',
};

const ALL_CATEGORIES = ['All', ...Array.from(new Set(communityArticles.map((a) => a.category)))];

function coverColorForCategory(cat) {
  return CATEGORY_COLORS[cat] || COLORS.secondary;
}

export default function BlogListScreen({ navigation }) {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = communityArticles.filter(
    (a) => activeCategory === 'All' || a.category === activeCategory
  );

  function renderCard({ item: article }) {
    const catColor = coverColorForCategory(article.category);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('BlogFeed', { articleId: article.id })}
      >
        {/* Cover strip */}
        <View style={[styles.cover, { backgroundColor: catColor }]}>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)']}
            style={StyleSheet.absoluteFill}
          />
          {article.pinned && (
            <View style={styles.pinnedBadge}>
              <Ionicons name="pin" size={10} color={COLORS.secondary} />
              <Text style={styles.pinnedText}>PINNED</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.topRow}>
            <View style={[styles.categoryBadge, { backgroundColor: catColor + '22' }]}>
              <Text style={[styles.categoryBadgeText, { color: catColor }]}>
                {article.category?.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.readTime}>{article.readTime}</Text>
          </View>

          <Text style={styles.postTitle} numberOfLines={2}>{article.title}</Text>
          <Text style={styles.postExcerpt} numberOfLines={2}>{article.summary}</Text>
          <Text style={styles.postMeta}>{article.author} · {article.date}</Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.readBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('BlogFeed', { articleId: article.id })}
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
        {ALL_CATEGORIES.map((cat) => (
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
      <FlatList
        data={filtered}
        keyExtractor={(a) => a.id}
        renderItem={renderCard}
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No articles in this category.</Text>
          </View>
        }
      />
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

  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, overflow: 'hidden', marginBottom: 16,
  },
  cover: { width: '100%', height: 160 },

  pinnedBadge: {
    position: 'absolute', bottom: 8, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  pinnedText: { fontSize: 9, fontWeight: '800', color: COLORS.secondary },

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
  postExcerpt: {
    fontSize: 12, color: COLORS.textMuted, lineHeight: 17, marginBottom: 6,
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
