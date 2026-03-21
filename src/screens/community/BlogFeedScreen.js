import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

function coverColorForCategory(cat) {
  return CATEGORY_COLORS[cat] || COLORS.secondary;
}

const DUMMY_COMMENTS = [
  { id: 'c1', name: 'Amith Naik',   initials: 'AN', time: '2 hours ago', text: 'Great tips, really helped with my soreness!' },
  { id: 'c2', name: 'Priya Sharma', initials: 'PS', time: '4 hours ago', text: 'Is the foam rolling video coming soon?' },
  { id: 'c3', name: 'Rahul Desai',  initials: 'RD', time: '1 day ago',   text: "I've been using these techniques for a week now." },
  { id: 'c4', name: 'Amith Naik',   initials: 'AN', time: '1 day ago',   text: "Also, don't forget the importance of sleep!" },
];

export default function BlogFeedScreen({ navigation, route }) {
  const { articleId } = route.params ?? {};
  const article = communityArticles.find((a) => a.id === articleId) ?? communityArticles[0];
  const catColor = coverColorForCategory(article.category);
  const [upvoted, setUpvoted] = useState(false);
  const [downvoted, setDownvoted] = useState(false);
  const [upCount, setUpCount] = useState(24);
  const [downCount, setDownCount] = useState(3);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState(DUMMY_COMMENTS);

  function handleUpvote() {
    if (upvoted) {
      setUpvoted(false);
      setUpCount(c => c - 1);
    } else {
      setUpvoted(true);
      setUpCount(c => c + 1);
      if (downvoted) { setDownvoted(false); setDownCount(c => c - 1); }
    }
  }

  function handleDownvote() {
    if (downvoted) {
      setDownvoted(false);
      setDownCount(c => c - 1);
    } else {
      setDownvoted(true);
      setDownCount(c => c + 1);
      if (upvoted) { setUpvoted(false); setUpCount(c => c - 1); }
    }
  }

  function handleSendComment() {
    const text = comment.trim();
    if (!text) return;
    setComments(prev => [
      { id: String(Date.now()), name: 'You', initials: 'YO', time: 'Just now', text },
      ...prev,
    ]);
    setComment('');
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{article.title}</Text>
        </View>
        <Text style={styles.brand}>BUILD GYM</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero block */}
        <View style={[styles.hero, { backgroundColor: catColor }]}>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', COLORS.background]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Article card overlapping hero */}
        <View style={styles.articleCard}>
          {/* Category + pinned badges */}
          <View style={styles.badgesRow}>
            <View style={[styles.catBadge, { backgroundColor: catColor + '22' }]}>
              <Text style={[styles.catBadgeText, { color: catColor }]}>
                {article.category?.toUpperCase()}
              </Text>
            </View>
            {article.pinned && (
              <View style={[styles.catBadge, { backgroundColor: COLORS.secondaryGlow }]}>
                <Text style={[styles.catBadgeText, { color: COLORS.secondary }]}>📌 PINNED</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.articleTitle}>{article.title}</Text>

          {/* Meta */}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{article.author}</Text>
            <Text style={[styles.metaDot, { color: catColor }]}>•</Text>
            <Text style={styles.metaText}>{article.date}</Text>
            <Text style={[styles.metaDot, { color: catColor }]}>•</Text>
            <Text style={[styles.metaText, { color: catColor }]}>{article.readTime}</Text>
          </View>

          <View style={styles.divider} />

          {/* Summary */}
          {article.summary ? (
            <Text style={styles.summaryText}>{article.summary}</Text>
          ) : null}

          {/* Body content */}
          <Text style={styles.bodyText}>{article.content}</Text>

          {/* Engagement — votes */}
          <View style={styles.engagementRow}>
            <TouchableOpacity style={styles.voteBtn} onPress={handleUpvote} activeOpacity={0.8}>
              <View style={[styles.voteBtnBox, upvoted && { backgroundColor: COLORS.secondaryGlow, borderColor: COLORS.secondaryBorder }]}>
                <Ionicons name={upvoted ? 'thumbs-up' : 'thumbs-up-outline'} size={18} color={upvoted ? COLORS.secondary : COLORS.textMuted} />
              </View>
              <Text style={[styles.voteCount, upvoted && { color: COLORS.secondary }]}>{upCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.voteBtn} onPress={handleDownvote} activeOpacity={0.8}>
              <View style={[styles.voteBtnBox, downvoted && { backgroundColor: 'rgba(255,68,68,0.12)', borderColor: 'rgba(255,68,68,0.3)' }]}>
                <Ionicons name={downvoted ? 'thumbs-down' : 'thumbs-down-outline'} size={18} color={downvoted ? COLORS.error : COLORS.textMuted} />
              </View>
              <Text style={[styles.voteCount, downvoted && { color: COLORS.error }]}>{downCount}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments section */}
        <View style={styles.commentsSection}>
          <View style={styles.commentsSectionHeader}>
            <View style={[styles.commentsAccent, { backgroundColor: catColor }]} />
            <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
          </View>

          {/* Comment input */}
          <View style={styles.commentInputRow}>
            <View style={styles.commentAvatar}>
              <Ionicons name="person" size={16} color={COLORS.textMuted} />
            </View>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor={COLORS.textMuted}
              value={comment}
              onChangeText={setComment}
              returnKeyType="send"
              onSubmitEditing={handleSendComment}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendComment} activeOpacity={0.8}>
              <Ionicons name="send" size={16} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>

          {/* Comment list */}
          {comments.map(c => (
            <View key={c.id} style={styles.commentCard}>
              <View style={[styles.commentAvatarSmall, { borderColor: catColor }]}>
                <Text style={[styles.commentInitials, { color: catColor }]}>{c.initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.commentHeaderRow}>
                  <Text style={styles.commentName}>{c.name}</Text>
                  <Text style={styles.commentTime}>{c.time}</Text>
                </View>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: COLORS.white, flex: 1 },
  brand: {
    fontSize: 11, fontWeight: '900', color: COLORS.secondary,
    letterSpacing: 2, flexShrink: 0,
  },

  hero: { width: '100%', height: 220 },

  articleCard: {
    marginTop: -44, marginHorizontal: 16,
    backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 20,
  },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  catBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  catBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  articleTitle: {
    fontSize: 22, fontWeight: '800', color: COLORS.white,
    lineHeight: 30, marginBottom: 10,
  },

  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  metaText: {
    fontSize: 10, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  metaDot: { fontSize: 10, fontWeight: '900' },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20 },

  summaryText: {
    fontSize: 14, color: COLORS.white, fontWeight: '600',
    lineHeight: 22, marginBottom: 16,
    paddingLeft: 12,
    borderLeftWidth: 3, borderLeftColor: COLORS.secondary,
  },
  bodyText: {
    fontSize: 14, color: COLORS.textSecondary, lineHeight: 24,
  },

  engagementRow: {
    flexDirection: 'row', gap: 20, marginTop: 24, paddingTop: 20,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  voteBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voteBtnBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  voteCount: { fontSize: 16, fontWeight: '700', color: COLORS.textMuted },

  commentsSection: { marginTop: 24, paddingHorizontal: 16, paddingBottom: 40 },
  commentsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  commentsAccent: { width: 3, height: 20, borderRadius: 2 },
  commentsTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white },

  commentInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 10, marginBottom: 20,
  },
  commentAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  commentInput: {
    flex: 1, fontSize: 14, color: COLORS.white,
    backgroundColor: COLORS.surface2, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  sendBtn: { paddingHorizontal: 6, paddingVertical: 4 },

  commentCard: {
    flexDirection: 'row', gap: 12, padding: 14,
    backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 12,
  },
  commentAvatarSmall: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.surface2, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  commentInitials: { fontSize: 12, fontWeight: '800' },
  commentHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  commentName: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  commentTime: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  commentText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
});
