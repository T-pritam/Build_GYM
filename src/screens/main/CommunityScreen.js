import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Pressable,
  Linking,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { communityArticles, faqs } from '../../constants/dummyData';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORY_COLORS = {
  Training: '#FF6B00',
  Nutrition: '#4CAF50',
  Update: '#2196F3',
  Recovery: '#9C27B0',
  Events: '#FFB400',
};

const STORE_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/app/idYOUR_APP_ID'
    : 'https://play.google.com/store/apps/details?id=com.buildgym.app';

const TABS = [
  { key: 'community', label: 'Community', icon: 'newspaper-outline' },
  { key: 'reviews',   label: 'Reviews',   icon: 'star-outline'       },
  { key: 'faq',       label: 'FAQ',        icon: 'help-circle-outline' },
];

const STORE_REVIEWS = [
  {
    id: 1,
    name: 'Arjun Mehta',
    rating: 5,
    date: 'Feb 18, 2026',
    platform: 'android',
    text: 'Absolutely love this app! Tracking my workouts and gym access from one place is super convenient. The UI is clean and snappy.',
  },
  {
    id: 2,
    name: 'Sneha Rajan',
    rating: 5,
    date: 'Feb 10, 2026',
    platform: 'android',
    text: "Best gym app I've used. The QR access for lockers is a game changer. Customer support is also very responsive.",
  },
  {
    id: 3,
    name: 'Rahul Desai',
    rating: 4,
    date: 'Jan 29, 2026',
    platform: 'android',
    text: 'Really good app overall. Would love to see a class booking feature added soon. Build Gym team keeps improving it!',
  },
  {
    id: 4,
    name: 'Priya Nair',
    rating: 5,
    date: 'Jan 20, 2026',
    platform: 'android',
    text: 'Love the leaderboard and streak tracking. Keeps me motivated every single day. Highly recommend to every gym goer.',
  },
];

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState('community');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [filterCat, setFilterCat] = useState('All');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const categories = ['All', ...new Set(communityArticles.map((a) => a.category))];

  const filtered =
    filterCat === 'All'
      ? communityArticles
      : communityArticles.filter((a) => a.category === filterCat);

  const pinnedArticles = filtered.filter((a) => a.pinned);
  const regularArticles = filtered.filter((a) => !a.pinned);

  const switchTab = (key) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(key);
  };

  const toggleFaq = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const handleReview = async () => {
    const supported = await Linking.canOpenURL(STORE_URL);
    if (supported) Linking.openURL(STORE_URL);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── FIXED HEADER ── */}
      <LinearGradient colors={['#1A0800', '#0D0D0D']} style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <Text style={styles.headerSub}>Articles & updates from Build Gym</Text>
      </LinearGradient>

      {/* ── FIXED TAB BAR ── */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, active && styles.tabItemActive]}
              onPress={() => switchTab(tab.key)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={active ? tab.icon.replace('-outline', '') : tab.icon}
                size={16}
                color={active ? COLORS.secondary : COLORS.textMuted}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              {active && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── ARTICLE CATEGORY FILTER (Community tab only) ── */}
      {activeTab === 'community' && (
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, filterCat === cat && styles.filterChipActive]}
                onPress={() => setFilterCat(cat)}
                activeOpacity={0.75}
              >
                {filterCat === cat && <View style={styles.filterDot} />}
                <Text style={[styles.filterChipText, filterCat === cat && styles.filterChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── SCROLLABLE CONTENT ── */}
      <ScrollView showsVerticalScrollIndicator={false} key={activeTab}>

        {/* ── COMMUNITY TAB ── */}
        {activeTab === 'community' && (
          <>
            <View style={styles.section}>
              {pinnedArticles.length > 0 && (
                <>
                  <View style={styles.sectionRow}>
                    <Ionicons name="pin" size={12} color={COLORS.secondary} />
                    <Text style={styles.sectionLabel}>PINNED</Text>
                  </View>
                  {pinnedArticles.map((a) => (
                    <ArticleCard key={a.id} article={a} onPress={() => setSelectedArticle(a)} featured />
                  ))}
                </>
              )}
              {regularArticles.length > 0 && (
                <>
                  {pinnedArticles.length > 0 && (
                    <View style={[styles.sectionRow, { marginTop: 8 }]}>
                      <Text style={styles.sectionLabel}>LATEST</Text>
                    </View>
                  )}
                  {regularArticles.map((a) => (
                    <ArticleCard key={a.id} article={a} onPress={() => setSelectedArticle(a)} />
                  ))}
                </>
              )}
            </View>
          </>
        )}

        {/* ── REVIEWS TAB ── */}
        {activeTab === 'reviews' && (
          <View style={styles.section}>

            {/* Rate Us CTA */}
            <TouchableOpacity style={styles.rateUsCard} onPress={handleReview} activeOpacity={0.85}>
              <LinearGradient
                colors={['rgba(255,107,0,0.18)', 'rgba(255,107,0,0.04)']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.rateUsTop}>
                <View style={styles.rateUsIconWrap}>
                  <Ionicons name="star" size={26} color={COLORS.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rateUsTitle}>Enjoying Build Gym?</Text>
                  <Text style={styles.rateUsSub}>Your review helps us grow. Takes just 30 seconds!</Text>
                </View>
              </View>
              <View style={styles.rateUsStarsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons key={s} name="star" size={26} color={COLORS.secondary} />
                ))}
              </View>
              <View style={styles.rateUsBtn}>
                <Ionicons
                  name={Platform.OS === 'ios' ? 'logo-apple' : 'logo-google-playstore'}
                  size={15}
                  color={COLORS.secondary}
                />
                <Text style={styles.rateUsBtnText}>
                  Rate on {Platform.OS === 'ios' ? 'App Store' : 'Play Store'}
                </Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.secondary} />
              </View>
            </TouchableOpacity>

            {/* Store Reviews */}
            <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
              <View>
                <Text style={styles.sectionTitle}>What people say</Text>
                <Text style={styles.sectionSubtitle}>Reviews from the Play Store</Text>
              </View>
              <Ionicons name="logo-google-playstore" size={18} color='#01875F' />
            </View>

            {STORE_REVIEWS.map((r) => (
              <View key={r.id} style={styles.storeReviewCard}>
                <View style={styles.storeReviewHeader}>
                  <View style={styles.storeReviewAvatar}>
                    <Text style={styles.storeReviewAvatarText}>{r.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.storeReviewName}>{r.name}</Text>
                    <View style={styles.storeReviewMeta}>
                      <View style={styles.storeReviewStars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons
                            key={s}
                            name={s <= r.rating ? 'star' : 'star-outline'}
                            size={11}
                            color='#FBBC04'
                          />
                        ))}
                      </View>
                      <Text style={styles.storeReviewDate}>{r.date}</Text>
                    </View>
                  </View>
                  <Ionicons
                    name={r.platform === 'ios' ? 'logo-apple' : 'logo-google-playstore'}
                    size={14}
                    color={COLORS.textMuted}
                  />
                </View>
                <Text style={styles.storeReviewText}>{r.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── FAQ TAB ── */}
        {activeTab === 'faq' && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>FAQs</Text>
                <Text style={styles.sectionSubtitle}>Common questions answered</Text>
              </View>
              <Ionicons name="help-circle-outline" size={22} color={COLORS.textMuted} />
            </View>
            {faqs.map((faq) => (
              <TouchableOpacity
                key={faq.id}
                style={[styles.faqCard, expandedFaq === faq.id && styles.faqCardOpen]}
                onPress={() => toggleFaq(faq.id)}
                activeOpacity={0.8}
              >
                <View style={styles.faqRow}>
                  <Text style={[styles.faqQuestion, expandedFaq === faq.id && styles.faqQuestionOpen]}>
                    {faq.question}
                  </Text>
                  <View style={[styles.faqChevronWrap, expandedFaq === faq.id && styles.faqChevronOpen]}>
                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={expandedFaq === faq.id ? COLORS.secondary : COLORS.textMuted}
                    />
                  </View>
                </View>
                {expandedFaq === faq.id && (
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── ARTICLE MODAL ── */}
      <Modal
        visible={!!selectedArticle}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedArticle(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedArticle(null)}>
          <Pressable style={styles.modalSheet} onPress={() => { }}>
            {selectedArticle && (
              <>
                <View style={styles.modalHandle} />
                <View style={styles.modalTopRow}>
                  <View
                    style={[
                      styles.catChip,
                      { backgroundColor: `${CATEGORY_COLORS[selectedArticle.category] || COLORS.secondary}20` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        { color: CATEGORY_COLORS[selectedArticle.category] || COLORS.secondary },
                      ]}
                    >
                      {selectedArticle.category}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedArticle(null)}>
                    <Ionicons name="close" size={22} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalTitle}>{selectedArticle.title}</Text>
                  <View style={styles.modalMeta}>
                    <Ionicons name="person-circle-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.modalMetaText}>{selectedArticle.author}</Text>
                    <Text style={styles.modalMetaDot}>·</Text>
                    <Text style={styles.modalMetaText}>{selectedArticle.date}</Text>
                    <Text style={styles.modalMetaDot}>·</Text>
                    <Text style={styles.modalMetaText}>{selectedArticle.readTime}</Text>
                  </View>
                  <Text style={styles.modalBody}>{selectedArticle.content}</Text>
                  <View style={{ height: 40 }} />
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Article Card ──────────────────────────────────────────────────────────────
function ArticleCard({ article, onPress, featured }) {
  const accentColor = CATEGORY_COLORS[article.category] || COLORS.secondary;
  return (
    <TouchableOpacity
      style={[styles.articleCard, featured && styles.articleCardFeatured]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.articleAccent, { backgroundColor: accentColor }]} />
      <View style={styles.articleBody}>
        <View style={styles.articleTopRow}>
          <View style={[styles.catChip, { backgroundColor: `${accentColor}18` }]}>
            <Text style={[styles.catChipText, { color: accentColor }]}>{article.category}</Text>
          </View>
          {article.pinned && (
            <View style={styles.pinnedBadge}>
              <Ionicons name="pin" size={10} color={COLORS.secondary} />
              <Text style={styles.pinnedBadgeText}>Pinned</Text>
            </View>
          )}
        </View>
        <Text style={styles.articleTitle}>{article.title}</Text>
        <Text style={styles.articleSummary} numberOfLines={2}>{article.summary}</Text>
        <View style={styles.articleFooter}>
          <Text style={styles.articleMeta}>{article.author}</Text>
          <View style={styles.articleDot} />
          <Text style={styles.articleMeta}>{article.date}</Text>
          <View style={styles.articleDot} />
          <Text style={[styles.articleMeta, { color: COLORS.secondary }]}>{article.readTime}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginTop: 2 }} />
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 18 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: COLORS.white, marginBottom: 4 },
  headerSub: { fontSize: 13, color: COLORS.textSecondary },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
    position: 'relative',
  },
  tabItemActive: {},
  tabLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  tabLabelActive: { color: COLORS.secondary },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.secondary,
  },

  // Category filter (community tab)
  filterContainer: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
  },
  filterRow: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  filterChipActive: { backgroundColor: COLORS.secondaryGlow, borderColor: COLORS.secondary },
  filterDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.secondary },
  filterChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  filterChipTextActive: { color: COLORS.secondary },

  // Section
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionPadded: { paddingHorizontal: 20, paddingTop: 8 },
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14,
  },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: COLORS.white, marginBottom: 2 },
  sectionSubtitle: { fontSize: 12, color: COLORS.textMuted },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1.5 },

  // Article card
  articleCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.surface,
    borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden', padding: 14,
  },
  articleCardFeatured: { borderColor: `${COLORS.secondary}50`, backgroundColor: `${COLORS.secondary}07` },
  articleAccent: { width: 3, borderRadius: 2, alignSelf: 'stretch', marginRight: 12, minHeight: 40 },
  articleBody: { flex: 1 },
  articleTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' },
  catChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  pinnedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 5, backgroundColor: COLORS.secondaryGlow, borderWidth: 1, borderColor: COLORS.secondaryBorder,
  },
  pinnedBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.secondary },
  articleTitle: { fontSize: 15, fontWeight: '800', color: COLORS.white, marginBottom: 5, lineHeight: 21 },
  articleSummary: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 10 },
  articleFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  articleDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.textMuted },
  articleMeta: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },

  // Testimonials
  testimonialCard: {
    backgroundColor: COLORS.surface, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 14,
  },
  testimonialHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  testimonialAvatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  testimonialAvatarText: { fontSize: 20, fontWeight: '900', color: COLORS.white },
  testimonialName: { fontSize: 15, fontWeight: '800', color: COLORS.white, marginBottom: 2 },
  testimonialMeta: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginBottom: 4 },
  testimonialStars: { flexDirection: 'row', gap: 2 },
  testimonialText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 12 },
  testimonialHighlight: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.secondaryGlow,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: COLORS.secondaryBorder, alignSelf: 'flex-start',
  },
  testimonialHighlightText: { fontSize: 11, fontWeight: '700', color: COLORS.secondary },

  // Rate Us card
  rateUsCard: {
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.secondaryBorder,
    padding: 20, overflow: 'hidden', gap: 16, marginBottom: 4,
  },
  rateUsTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rateUsIconWrap: {
    width: 50, height: 50, borderRadius: 15, backgroundColor: COLORS.secondaryGlow,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.secondaryBorder, flexShrink: 0,
  },
  rateUsTitle: { fontSize: 15, fontWeight: '900', color: COLORS.white, marginBottom: 3 },
  rateUsSub: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  rateUsStarsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  rateUsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.secondary, backgroundColor: COLORS.secondaryGlow,
  },
  rateUsBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.secondary },

  // Store review cards
  storeReviewCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.border, padding: 14, marginBottom: 12,
  },
  storeReviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  storeReviewAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.secondaryGlow,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.secondaryBorder,
  },
  storeReviewAvatarText: { fontSize: 15, fontWeight: '900', color: COLORS.secondary },
  storeReviewName: { fontSize: 13, fontWeight: '800', color: COLORS.white, marginBottom: 3 },
  storeReviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  storeReviewStars: { flexDirection: 'row', gap: 2 },
  storeReviewDate: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  storeReviewText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  // FAQ
  faqCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.border, marginBottom: 10, padding: 15,
  },
  faqCardOpen: { borderColor: `${COLORS.secondary}55`, backgroundColor: `${COLORS.secondary}06` },
  faqRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.white, lineHeight: 20 },
  faqQuestionOpen: { color: COLORS.secondary },
  faqChevronWrap: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  faqChevronOpen: { backgroundColor: COLORS.secondaryGlow, transform: [{ rotate: '180deg' }] },
  faqAnswer: {
    fontSize: 13, color: COLORS.textSecondary, lineHeight: 20,
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '85%', borderWidth: 1, borderColor: COLORS.border, paddingBottom: 0,
  },
  modalHandle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, marginBottom: 16,
  },
  modalTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.white, lineHeight: 28, marginBottom: 10 },
  modalMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  modalMetaText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  modalMetaDot: { fontSize: 11, color: COLORS.textMuted },
  modalBody: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 23 },
});
