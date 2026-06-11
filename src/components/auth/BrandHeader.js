import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { TYPE } from '../../theme';

const LOGO_SOLID = require('../../../assets/build-logo.png');          // square, black bg
const LOGO_OUTLINE = require('../../../assets/build-logo-outline.png'); // 634x394, transparent line-art
const OUTLINE_RATIO = 634 / 394;

/**
 * BUILD wordmark + optional title / subtitle.
 *
 * Props:
 *   variant  ('solid' | 'outline')  logo treatment. 'outline' = holographic
 *            line-art used on the login hero (default 'solid').
 *   logoSize (number)  for 'solid' = square side; for 'outline' = width.
 *   title, subtitle (string)  optional copy below the logo.
 *   style    (style)   wrapper override.
 */
export default function BrandHeader({
  variant = 'solid', logoSize = 88, title, subtitle, style,
}) {
  const isOutline = variant === 'outline';
  const dims = isOutline
    ? { width: logoSize, height: logoSize / OUTLINE_RATIO }
    : { width: logoSize, height: logoSize };

  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={isOutline ? LOGO_OUTLINE : LOGO_SOLID}
        style={{ ...dims, marginBottom: title ? 12 : 0 }}
        resizeMode="contain"
      />
      {!!title && <Text style={[TYPE.headlineMd, styles.title]}>{title}</Text>}
      {!!subtitle && <Text style={[TYPE.bodySm, styles.subtitle]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  title: { textAlign: 'center', marginBottom: 6 },
  subtitle: { textAlign: 'center', maxWidth: 300 },
});
