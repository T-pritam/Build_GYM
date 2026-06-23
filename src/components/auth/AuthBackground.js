import React from 'react';
import {
  ImageBackground, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
  StatusBar, View,
} from 'react-native';
import { COLORS } from '../../theme';

const BG = require('../../../assets/auth-bg.png');

/**
 * Full-screen auth backdrop — the demo's textured dark background (auth-bg.png)
 * covering the whole screen, with the content layered on top. Keyboard-aware
 * and optionally scrollable.
 *
 * Props:
 *   scroll        (bool)  wrap children in a ScrollView (default true)
 *   contentStyle  (style) extra style for the scroll/content container
 */
export default function AuthBackground({ children, scroll = true, contentStyle }) {
  const Inner = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scroll, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flexContent, contentStyle]}>{children}</View>
  );

  return (
    <ImageBackground source={BG} style={styles.container} resizeMode="cover">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {Inner}
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07060A', height: '1100%', width: '100%' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  flexContent: { flex: 1, paddingHorizontal: 24 },
});
