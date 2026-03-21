import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Linking, LayoutAnimation, UIManager, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { communityArticles, faqs, reviews } from '../../constants/dummyData';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TABS = [
  { key: 'community', label: 'Community', icon: 'document-text-outline' },
  { key: 'reviews', label: 'Reviews', icon: 'star-outline' },
  { key: 'blog', label: 'Blog', icon: 'newspaper-outline' },
  { key: 'faq', label: 'FAQ', icon: 'help-circle-outline' },
];

const ARTICLE_CATEGORIES = ['All', 'Training', 'Nutrition', 'Update', 'Recovery'];

const CATEGORY_COLORS = {
  Training: COLORS.secondary,
  Nutrition: '#22C55E',
  Update: '#3B82F6',
  Recovery: '#A855F7',
  Pinned: COLORS.secondary,
};

// Article card component
function ArticleCard({ article, onPress }) {
  const catColor = CATEGORY_COLORS[article.category] || COLORS.secondary;
  return (
    <TouchableOpacity style={styles.articleCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.articleAccent, { backgroundColor: catColor }]} />
      <View style={styles.articleBody}>
        <View style={styles.articleBadgeRow}>
          <View style={[styles.badge, { backgroundColor: catColor + '22' }]}>
            <Text style={[styles.badgeText, { color: catColor }]}>{article.category?.toUpperCase()}</Text>
          </View>
          {article.pinned && (
            <View style={[styles.badge, { backgroundColor: COLORS.secondaryGlow }]}>
              <Text style={[styles.badgeText, { color: COLORS.secondary }]}>📌 PINNED</Text>
            </View>
          )}
        </View>
        <View style={styles.articleRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.articleTitle} numberOfLines={2}>{article.title}</Text>
            <Text style={styles.articleExcerpt} numberOfLines={2}>{article.summary || article.excerpt}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} style={{ marginTop: 2 }} />
        </View>
        <View style={styles.articleMeta}>
          <Text style={styles.articleMetaText}>
            {article.author} · {article.date} ·{' '}
            <Text style={{ color: catColor }}>{article.readTime} read</Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
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

export default function CommunityScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('community');
  const [activeCategory, setActiveCategory] = useState('All');

  const pinnedArticles = (communityArticles || []).filter((a) => a.pinned);
  const latestArticles = (communityArticles || []).filter((a) => {
    const matchCat = activeCategory === 'All' || a.category === activeCategory;
    return !a.pinned && matchCat;
  });

  const handleArticlePress = (article) => {
    navigation.navigate('ArticleReader', { article });
  };

  return (
    <View style={styles.container}>
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
      {activeTab === 'community' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {/* Category filter pills */}
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryPills}
          >
            {ARTICLE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPill, activeCategory === cat && styles.categoryPillActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.categoryPillText, activeCategory === cat && styles.categoryPillTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Pinned articles */}
          {activeCategory === 'All' && pinnedArticles.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>📌 PINNED</Text>
              {pinnedArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onPress={() => handleArticlePress(article)}
                />
              ))}
            </View>
          )}

          {/* Latest articles */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {activeCategory === 'All' ? 'LATEST' : activeCategory.toUpperCase()}
            </Text>
            {latestArticles.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="newspaper-outline" size={40} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No articles in this category</Text>
              </View>
            ) : (
              latestArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onPress={() => handleArticlePress(article)}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}

      {activeTab === 'reviews' && <ReviewsTab />}

      {activeTab === 'blog' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {communityArticles.map((article) => {
            const catColor = CATEGORY_COLORS[article.category] || COLORS.secondary;
            return (
              <TouchableOpacity
                key={article.id}
                style={styles.blogCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('BlogFeed', { articleId: article.id })}
              >
                <View style={[styles.blogCover, { backgroundColor: catColor }]} />
                <View style={styles.blogBody}>
                  <View style={styles.blogBadgeRow}>
                    <View style={[styles.badge, { backgroundColor: catColor + '22' }]}>
                      <Text style={[styles.badgeText, { color: catColor }]}>{article.category?.toUpperCase()}</Text>
                    </View>
                    {article.pinned && (
                      <View style={[styles.badge, { backgroundColor: COLORS.secondaryGlow }]}>
                        <Text style={[styles.badgeText, { color: COLORS.secondary }]}>📌 PINNED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.blogTitle} numberOfLines={2}>{article.title}</Text>
                  <Text style={styles.blogExcerpt} numberOfLines={2}>{article.summary}</Text>
                  <View style={styles.blogMeta}>
                    <Text style={styles.blogMetaText}>
                      {article.author} · {article.date} ·{' '}
                      <Text style={{ color: catColor }}>{article.readTime}</Text>
                    </Text>
                    <View style={styles.blogReadBtn}>
                      <Ionicons name="book-outline" size={12} color={COLORS.secondary} />
                      <Text style={styles.blogReadBtnText}>Read</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 20 }} />
        </ScrollView>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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

  // Category pills
  categoryPills: { gap: 8, paddingBottom: 16 },
  categoryPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: 'transparent',
  },
  categoryPillActive: { borderColor: COLORS.secondary, backgroundColor: COLORS.secondaryGlow },
  categoryPillText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  categoryPillTextActive: { color: COLORS.secondary, fontWeight: '800' },

  // Section
  section: { gap: 12, marginBottom: 20 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 3 },

  // Article card
  articleCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden', flexDirection: 'row',
  },
  articleAccent: { width: 4 },
  articleBody: { flex: 1, padding: 14, gap: 8 },
  articleBadgeRow: { flexDirection: 'row', gap: 6 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  articleRow: { flexDirection: 'row', gap: 8 },
  articleTitle: { fontSize: 14, fontWeight: '800', color: COLORS.white, lineHeight: 20 },
  articleExcerpt: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },
  articleMeta: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 8 },
  articleMetaText: { fontSize: 10, color: COLORS.textMuted },

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
  blogCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden', marginBottom: 12,
  },
  blogCover: { width: '100%', height: 90 },
  blogBody: { padding: 14, gap: 6 },
  blogBadgeRow: { flexDirection: 'row', gap: 6 },
  blogTitle: { fontSize: 14, fontWeight: '800', color: COLORS.white, lineHeight: 20 },
  blogExcerpt: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },
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
