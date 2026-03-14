import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const CATEGORY_COLORS = {
  Training: '#E96316',
  Nutrition: '#22C55E',
  Update: '#3B82F6',
  Recovery: '#A855F7',
};

export default function ArticleReaderScreen({ navigation, route }) {
  const { article } = route?.params || {};

  if (!article) return null;

  const catColor = CATEGORY_COLORS[article.category] || COLORS.secondary;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.surface} />

      {/* Sheet header */}
      <View style={styles.sheetHeader}>
        <View style={styles.dragHandle} />
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Category badge */}
        <View style={[styles.categoryBadge, { borderColor: catColor }]}>
          <Text style={[styles.categoryText, { color: catColor }]}>
            {article.category?.toUpperCase() || 'ARTICLE'}
          </Text>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>{article.title}</Text>

        {/* Metadata */}
        <Text style={styles.metadata}>
          {article.author || 'Build Gym Team'} · {article.date} · {article.readTime || '3 min read'}
        </Text>

        {/* Article body */}
        <View style={styles.articleBody}>
          {article.content ? (
            (Array.isArray(article.content)
              ? article.content
              : article.content.split('\n\n').filter(Boolean)
            ).map((paragraph, i) => (
              <Text key={i} style={styles.paragraph}>{paragraph}</Text>
            ))
          ) : (
            <>
              <Text style={styles.paragraph}>
                {article.excerpt || 'No content available for this article. Please check back later.'}
              </Text>
              {article.category === 'Training' && (
                <>
                  <Text style={styles.paragraph}>
                    When performed correctly, this exercise translates directly to real-world strength and improves athletic performance. Always prioritize form over weight to avoid injury.
                  </Text>
                  <Text style={styles.paragraph}>
                    Before you start, ensure you have the proper equipment and have warmed up sufficiently. Begin with lighter weights to dial in the correct technique.
                  </Text>
                </>
              )}
              {article.category === 'Nutrition' && (
                <>
                  <Text style={styles.paragraph}>
                    Fueling your body correctly before a session can make the difference between a mediocre and explosive workout. What you eat in the hours before training affects your energy, strength, and focus.
                  </Text>
                  <Text style={styles.paragraph}>
                    A balanced pre-workout meal should include easily digestible carbohydrates for quick energy, some protein to start muscle protein synthesis, and minimal fat to avoid slowing digestion.
                  </Text>
                </>
              )}
            </>
          )}

          {/* Key Takeaways card */}
          {article.keyTakeaways && article.keyTakeaways.length > 0 && (
            <View style={styles.takeawaysCard}>
              <Text style={styles.takeawaysHeading}>Key Takeaways:</Text>
              {article.keyTakeaways.map((point, i) => (
                <View key={i} style={styles.takeawayRow}>
                  <View style={[styles.takeawayDot, { backgroundColor: catColor }]} />
                  <Text style={styles.takeawayText}>{point}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Default takeaways if not in data */}
          {(!article.keyTakeaways || article.keyTakeaways.length === 0) && (
            <View style={styles.takeawaysCard}>
              <Text style={styles.takeawaysHeading}>Key Takeaways:</Text>
              <View style={styles.takeawayRow}>
                <View style={[styles.takeawayDot, { backgroundColor: catColor }]} />
                <Text style={styles.takeawayText}>Stay consistent with your routine.</Text>
              </View>
              <View style={styles.takeawayRow}>
                <View style={[styles.takeawayDot, { backgroundColor: catColor }]} />
                <Text style={styles.takeawayText}>Focus on proper form before increasing intensity.</Text>
              </View>
              <View style={styles.takeawayRow}>
                <View style={[styles.takeawayDot, { backgroundColor: catColor }]} />
                <Text style={styles.takeawayText}>Recovery is just as important as training.</Text>
              </View>
            </View>
          )}

          <Text style={styles.paragraph}>
            Progress only when you feel completely stable and in control. Remember to listen to your body and consult with your trainer at Build Gym for personalized guidance.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  sheetHeader: {
    paddingTop: 12, paddingBottom: 8, alignItems: 'center',
    position: 'relative',
  },
  dragHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: 16,
  },
  closeBtn: {
    position: 'absolute', right: 20, top: 16,
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 18, color: COLORS.white, fontWeight: '300' },

  scrollContent: { paddingHorizontal: 24, paddingBottom: 48 },

  categoryBadge: {
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 12,
  },
  categoryText: { fontSize: 9, fontWeight: '900', letterSpacing: 2 },

  headline: {
    fontSize: 22, fontWeight: '800', color: COLORS.white, lineHeight: 30, marginBottom: 8,
  },
  metadata: { fontSize: 11, color: COLORS.textMuted, marginBottom: 24 },

  articleBody: { gap: 16 },
  paragraph: { fontSize: 15, color: '#D1D1D1', lineHeight: 26 },

  takeawaysCard: {
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 20, gap: 12,
  },
  takeawaysHeading: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  takeawayRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  takeawayDot: {
    width: 6, height: 6, borderRadius: 3, marginTop: 8, flexShrink: 0,
  },
  takeawayText: { flex: 1, fontSize: 14, color: '#D1D1D1', lineHeight: 22 },
});
