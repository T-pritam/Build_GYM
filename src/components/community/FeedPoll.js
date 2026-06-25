import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS as THEME, FONTS } from '../../theme';
import { fetchCommunityPost, votePoll } from '../../services/communityService';

const COLORS = {
  secondary: THEME.primaryLight, white: THEME.white,
  textMuted: THEME.textMuted, glassBorder: 'rgba(255,255,255,0.08)',
};

/**
 * FeedPoll — inline poll for a feed card. The feed list API returns only
 * `is_poll`, so we lazy-fetch the single post to get poll options/percent/vote,
 * then render bars + handle voting (optimistic) via votePoll.
 *
 * Props: postId
 */
export default function FeedPoll({ postId }) {
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!postId) return;
    try {
      const data = await fetchCommunityPost(postId);
      setPoll(data?.poll || null);
      if (!data?.poll) setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { load(); }, [load]);

  const handleVote = async (optionId) => {
    if (!poll || poll.isClosed || poll.userVote === optionId) return;

    const prevPoll = poll;
    const oldOptionId = poll.userVote;

    // Optimistic: transfer count old → new
    setPoll((p) => {
      if (!p) return p;
      const updatedOptions = p.options.map((o) => {
        if (o.id === optionId) return { ...o, vote_count: (o.vote_count || 0) + 1 };
        if (o.id === oldOptionId) return { ...o, vote_count: Math.max((o.vote_count || 0) - 1, 0) };
        return o;
      });
      const totalVotes = updatedOptions.reduce((s, o) => s + (o.vote_count || 0), 0);
      return {
        ...p,
        userVote: optionId,
        totalVotes,
        options: updatedOptions.map((o) => ({
          ...o,
          percentage: totalVotes > 0 ? Math.round((o.vote_count / totalVotes) * 100) : 0,
        })),
      };
    });

    try {
      const result = await votePoll(postId, optionId);
      setPoll((p) => ({ ...p, ...result }));
    } catch {
      setPoll(prevPoll);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={COLORS.secondary} />
      </View>
    );
  }

  if (failed || !poll) return null;

  const voted = poll.userVote;

  return (
    <View style={styles.container}>
      {poll.options.map((opt) => {
        const isSelected = voted === opt.id;
        const showResults = !!voted || poll.isClosed;
        const isDisabled = poll.isClosed || isSelected;
        return (
          <TouchableOpacity
            key={opt.id}
            style={styles.option}
            onPress={() => handleVote(opt.id)}
            disabled={isDisabled}
            activeOpacity={0.75}
          >
            {showResults && (
              <View style={[styles.fill, isSelected && styles.fillSelected, { width: `${opt.percentage || 0}%` }]} />
            )}
            <View style={styles.optionContent}>
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]} numberOfLines={1}>
                {opt.option_text}
              </Text>
              {showResults && <Text style={styles.percent}>{opt.percentage || 0}%</Text>}
            </View>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.meta}>
        {poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}{poll.isClosed ? ' · Closed' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 24, alignItems: 'center' },
  container: { gap: 8, marginBottom: 16 },
  option: {
    height: 40, borderRadius: 8, overflow: 'hidden', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.06)' },
  fillSelected: { backgroundColor: 'rgba(127,41,130,0.30)' },
  optionContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  optionText: { flex: 1, fontSize: 11, color: COLORS.white, fontFamily: FONTS.label, letterSpacing: 0.5 },
  optionTextSelected: { color: COLORS.secondary },
  percent: { fontSize: 11, color: COLORS.white, fontFamily: FONTS.bodyBold, marginLeft: 8 },
  meta: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body, marginTop: 2 },
});
