import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPE, RADIUS } from '../../theme';

/**
 * Translucent purple-bordered notice row (icon + text). `children` is the body
 * so callers can mix bold / linked spans.
 *
 * Props:
 *   icon         (string)  Ionicons name (default information-circle-outline)
 *   tone         ('info' | 'success' | 'error')  accent color (default info)
 *   actionLabel  (string)  optional CTA rendered under the text
 *   onAction     (fn)      pressed handler for the CTA
 *   onDismiss    (fn)      when set, renders a × in the top-right corner
 */
const TONES = {
  info: { color: COLORS.primaryLight, border: COLORS.primaryBorder, bg: COLORS.primarySoft },
  success: { color: COLORS.success, border: 'rgba(76,175,80,0.30)', bg: COLORS.successSoft },
  error: { color: COLORS.error, border: 'rgba(244,67,54,0.30)', bg: COLORS.errorSoft },
};

export default function InfoBanner({
  icon = 'information-circle-outline',
  tone = 'info',
  children,
  style,
  actionLabel,
  onAction,
  onDismiss,
}) {
  const t = TONES[tone] || TONES.info;
  return (
    <View style={[styles.banner, { borderColor: t.border, backgroundColor: t.bg }, style]}>
      <Ionicons name={icon} size={20} color={t.color} />
      <View style={styles.body}>
        <Text style={[TYPE.bodySm, styles.text]}>{children}</Text>
        {!!actionLabel && (
          <Pressable
            onPress={onAction}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text style={[TYPE.bodySm, styles.action, { color: t.color }]}>{actionLabel}</Text>
          </Pressable>
        )}
      </View>
      {!!onDismiss && (
        <Pressable
          onPress={onDismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Ionicons name="close" size={18} color={COLORS.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 16,
  },
  body: { flex: 1, gap: 8 },
  text: { color: COLORS.textSecondary },
  action: { fontWeight: '700' },
});
