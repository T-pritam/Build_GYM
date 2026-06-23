import React from 'react';
import { View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

/**
 * Gradient-filled vector icon — the Stitch "Obsidian Pulse" purple→cyan icon
 * treatment (`background: linear-gradient(#7C3AED,#00BCD4); -webkit-background-clip: text`).
 *
 * Renders the glyph as a MaskedView mask over a LinearGradient so the icon
 * shape is filled with the gradient.
 *
 * Props:
 *   name    (string)  icon name
 *   size    (number)  glyph size (default 22)
 *   set     ('ionicons' | 'material')  icon family (default 'material')
 *   colors  (string[]) gradient stops (default purple→cyan)
 *   start/end (point)  gradient direction
 */
export default function GradientIcon({
  name,
  size = 22,
  set = 'material',
  colors = ['#7C3AED', '#00BCD4'],
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
  style,
}) {
  const IconSet = set === 'ionicons' ? Ionicons : MaterialIcons;
  return (
    <MaskedView
      style={[{ width: size, height: size }, style]}
      maskElement={(
        <View style={{ backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          <IconSet name={name} size={size} color="#000" />
        </View>
      )}
    >
      <LinearGradient colors={colors} start={start} end={end} style={{ width: size, height: size }} />
    </MaskedView>
  );
}
