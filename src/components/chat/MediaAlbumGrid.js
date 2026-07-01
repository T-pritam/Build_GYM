/**
 * MediaAlbumGrid — WhatsApp-style preview for a run of images sent together.
 * 1 image → a single inline thumb (not a grid). 2-4 → a 2x2/2x1 grid. >4 →
 * first 3 tiles normal, 4th tile dimmed with a "+N" overlay; tapping it still
 * opens the pager at index 3 so the rest stay swipe-reachable.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { COLORS } from '../../theme/colors';
import ChatImageThumb from './ChatImageThumb';

const TILE = 104;
const GAP = 3;
const SINGLE = 220;

export default function MediaAlbumGrid({ threadId, images, getMedia, onOpenAt }) {
  if (images.length === 1) {
    return (
      <ChatImageThumb
        threadId={threadId} messageId={images[0].id} getMedia={getMedia}
        style={styles.single} onPress={() => onOpenAt(0)}
      />
    );
  }

  const visible = images.slice(0, 4);
  const overflow = images.length - 4;

  return (
    <View style={styles.grid}>
      {visible.map((img, idx) => (
        <View key={img.id} style={styles.tile}>
          <ChatImageThumb
            threadId={threadId} messageId={img.id} getMedia={getMedia}
            style={StyleSheet.absoluteFill} onPress={() => onOpenAt(idx)}
          />
          {idx === 3 && overflow > 0 ? (
            <View style={styles.overlay} pointerEvents="none">
              <Text style={styles.overlayTxt}>+{overflow}</Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  single: { width: SINGLE, height: SINGLE, borderRadius: 12 },
  grid: {
    width: TILE * 2 + GAP, height: TILE * 2 + GAP, flexDirection: 'row', flexWrap: 'wrap',
    gap: GAP, borderRadius: 12, overflow: 'hidden',
  },
  tile: { width: TILE, height: TILE, backgroundColor: COLORS.surface2 },
  overlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  overlayTxt: { color: COLORS.white, fontSize: 20, fontWeight: '800' },
});
