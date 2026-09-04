/**
 * MediaAlbumViewer — full-screen swipeable viewer over a set of images.
 * Replaces the old single-image ImageViewer: a single image is just an
 * "album of 1" (images=[m], initialIndex=0), so one component covers both.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, Dimensions, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';

import { COLORS } from '../../theme/colors';
import { getOrFetch } from '../../services/chat/chatMediaUrlCache';

const { width: SCREEN_W } = Dimensions.get('window');

const AnimatedImage = Animated.createAnimatedComponent(Image);
const MAX_SCALE = 4;

/**
 * One page of the viewer: pinch to zoom, drag to pan while zoomed, double-tap to
 * toggle. Paging is handed back to the parent list only at 1x — otherwise a pan
 * while zoomed would swipe to the next image instead of moving the picture.
 */
function Page({ threadId, message, getMedia, onZoomChange }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getOrFetch(threadId, message.id, getMedia).then((entry) => { if (!cancelled) setUrl(entry.url); }).catch(() => {});
    return () => { cancelled = true; };
  }, [threadId, message.id]);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const reset = () => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    tx.value = withTiming(0); ty.value = withTiming(0);
    savedTx.value = 0; savedTy.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(1, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.01) {
        scale.value = withTiming(1); savedScale.value = 1;
        tx.value = withTiming(0); ty.value = withTiming(0);
        savedTx.value = 0; savedTy.value = 0;
      }
      runOnJS(onZoomChange)(savedScale.value > 1.01);
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      if (savedScale.value <= 1.01) return; // at 1x the list owns horizontal drags
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    })
    .onEnd(() => { savedTx.value = tx.value; savedTy.value = ty.value; });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const zoomed = savedScale.value > 1.01;
      if (zoomed) {
        scale.value = withTiming(1); savedScale.value = 1;
        tx.value = withTiming(0); ty.value = withTiming(0);
        savedTx.value = 0; savedTy.value = 0;
      } else {
        scale.value = withTiming(2); savedScale.value = 2;
      }
      runOnJS(onZoomChange)(!zoomed);
    });

  // Pinch and pan run together; the double-tap only wins when neither is active.
  const gesture = Gesture.Exclusive(Gesture.Simultaneous(pinch, pan), doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  // A new image scrolling into place should never inherit the previous zoom.
  useEffect(() => reset, [message.id]);

  return (
    <View style={styles.page}>
      {url ? (
        <GestureDetector gesture={gesture}>
          <AnimatedImage source={{ uri: url }} style={[styles.image, animatedStyle]} contentFit="contain" />
        </GestureDetector>
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
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => { if (visible) { setIndex(initialIndex); setZoomed(false); } }, [visible, initialIndex]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.backdrop}>
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
            scrollEnabled={!zoomed}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
            onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
            renderItem={({ item }) => <Page threadId={threadId} message={item} getMedia={getMedia} onZoomChange={setZoomed} />}
          />
        ) : null}
      </GestureHandlerRootView>
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
