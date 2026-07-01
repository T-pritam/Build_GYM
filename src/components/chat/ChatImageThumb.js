/**
 * ChatImageThumb — one lazily-loaded, presigned-URL chat image tile.
 * Used both standalone (single-image messages) and inside MediaAlbumGrid/
 * MediaAlbumViewer. `getMedia` is injected so this works for both the
 * member/trainer thread (chatService.getMedia) and the read-only SA/Admin
 * transcript (adminChatService.getMedia) without forking the component.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../theme/colors';
import { getOrFetch, invalidate } from '../../services/chat/chatMediaUrlCache';

export default function ChatImageThumb({ threadId, messageId, getMedia, style, resizeMode = 'cover', onPress, timeLabel, tick }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const retriedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    retriedRef.current = false;
    getOrFetch(threadId, messageId, getMedia)
      .then((entry) => { if (!cancelled) setUrl(entry.url); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [threadId, messageId]);

  const onError = () => {
    if (retriedRef.current) { setFailed(true); return; }
    retriedRef.current = true;
    invalidate(threadId, messageId);
    getOrFetch(threadId, messageId, getMedia)
      .then((entry) => setUrl(entry.url))
      .catch(() => setFailed(true));
  };

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.wrap, style]}>
      {url ? (
        <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit={resizeMode} onError={onError} />
      ) : failed ? (
        <View style={styles.center}><Ionicons name="image-outline" size={22} color={COLORS.textMuted} /></View>
      ) : (
        <View style={styles.center}><ActivityIndicator size="small" color={COLORS.primaryLight} /></View>
      )}
      {timeLabel ? (
        <View style={styles.timeBadge} pointerEvents="none">
          <Text style={styles.timeBadgeTxt}>{timeLabel}</Text>
          {tick?.icon ? <Ionicons name={tick.icon} size={11} color={tick.color || '#fff'} style={{ marginLeft: 2 }} /> : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: COLORS.surface2, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  timeBadge: {
    position: 'absolute', bottom: 4, right: 4, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  timeBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '600' },
});
