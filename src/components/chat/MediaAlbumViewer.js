/**
 * MediaAlbumViewer — full-screen swipeable viewer over a set of images.
 * Replaces the old single-image ImageViewer: a single image is just an
 * "album of 1" (images=[m], initialIndex=0), so one component covers both.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, Dimensions, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../theme/colors';
import { getOrFetch } from '../../services/chat/chatMediaUrlCache';

const { width: SCREEN_W } = Dimensions.get('window');

function Page({ threadId, message, getMedia }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getOrFetch(threadId, message.id, getMedia).then((entry) => { if (!cancelled) setUrl(entry.url); }).catch(() => {});
    return () => { cancelled = true; };
  }, [threadId, message.id]);

  return (
    <View style={styles.page}>
      {url ? (
        <Image source={{ uri: url }} style={styles.image} contentFit="contain" />
      ) : (
        <ActivityIndicator size="small" color={COLORS.primaryLight} />
      )}
    </View>
  );
}

export default function MediaAlbumViewer({ threadId, images, initialIndex = 0, getMedia, onClose }) {
  const visible = !!images && images.length > 0;
  const listRef = useRef(null);
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => { if (visible) setIndex(initialIndex); }, [visible, initialIndex]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.close} onPress={onClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        {images && images.length > 1 ? (
          <View style={styles.counter}><Text style={styles.counterTxt}>{index + 1} / {images.length}</Text></View>
        ) : null}
        {visible ? (
          <FlatList
            ref={listRef}
            data={images}
            keyExtractor={(m) => m.id}
            horizontal
            pagingEnabled
            initialScrollIndex={initialIndex}
            getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
            onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
            renderItem={({ item }) => <Page threadId={threadId} message={item} getMedia={getMedia} />}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  close: { position: 'absolute', top: 44, right: 20, zIndex: 2, padding: 6 },
  counter: { position: 'absolute', top: 48, left: 0, right: 0, alignItems: 'center', zIndex: 2 },
  counterTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },
  page: { width: SCREEN_W, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
});
