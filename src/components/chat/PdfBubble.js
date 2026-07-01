/**
 * PdfBubble — first-page thumbnail (server-generated, see
 * BuildGymBackend/src/utils/pdfThumbnail.js) + a bottom info bar with the
 * filename and size. Falls back to a generic document icon if no thumbnail
 * is available (generation failed, or the PDF predates this feature).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../theme/colors';
import { getOrFetch } from '../../services/chat/chatMediaUrlCache';

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PdfBubble({ threadId, message, getMedia, onPress }) {
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getOrFetch(threadId, message.id, getMedia)
      .then((entry) => { if (!cancelled) setThumbnailUrl(entry.thumbnailUrl || null); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [threadId, message.id]);

  const fileName = message.fileName || 'Document.pdf';
  const size = formatBytes(message.mediaSize);

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.wrap}>
      <View style={styles.thumbWrap}>
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.thumbImg} contentFit="cover" contentPosition="top" />
        ) : loading ? (
          <ActivityIndicator size="small" color={COLORS.primaryLight} />
        ) : (
          <Ionicons name="document-text" size={36} color={COLORS.textMuted} />
        )}
      </View>
      <View style={styles.infoBar}>
        <Ionicons name="document-text" size={16} color={COLORS.textPrimary} />
        <View style={styles.infoTextWrap}>
          <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
          {size ? <Text style={styles.fileSize}>{size}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 220, borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.surface2 },
  thumbWrap: { width: '100%', height: 150, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  infoBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, backgroundColor: COLORS.surface3 },
  infoTextWrap: { flex: 1 },
  fileName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  fileSize: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
});
