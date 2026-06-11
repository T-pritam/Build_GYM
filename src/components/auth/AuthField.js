import React, { useState, forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, TYPE } from '../../theme';

/**
 * Underline-style auth input: caps label, sunken fill, bottom border that
 * lights up neon-purple on focus. Forwards all TextInput props via ref.
 *
 * Props:
 *   label        (string)  caps label above the field (optional)
 *   leftIcon     (string)  Ionicons name shown on the left (optional)
 *   leftAccessory(node)    custom left node, overrides leftIcon (e.g. "+91")
 *   rightAccessory(node)   node on the right (e.g. eye toggle) (optional)
 *   containerStyle(style)
 *   ...rest      forwarded to TextInput
 */
const AuthField = forwardRef(function AuthField(
  { label, leftIcon, leftAccessory, rightAccessory, containerStyle, onFocus, onBlur, style, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={containerStyle}>
      {!!label && <Text style={[TYPE.labelCaps, styles.label]}>{label}</Text>}
      <View style={[styles.row, focused && styles.rowFocused]}>
        {leftAccessory
          ? leftAccessory
          : !!leftIcon && (
            <Ionicons name={leftIcon} size={18} color={COLORS.textMuted} style={styles.leftIcon} />
          )}
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={COLORS.textMuted}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...rest}
        />
        {rightAccessory}
      </View>
      {/* Focus glow line */}
      <View style={[styles.glowLine, focused && styles.glowLineActive]} />
    </View>
  );
});

const styles = StyleSheet.create({
  label: { color: COLORS.textSecondary, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundAlt,   // bg-surface-container-lowest #100d10
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderStrong,  // border-white/20
    height: 56,
    paddingHorizontal: 16,                   // p-4
  },
  rowFocused: { borderBottomColor: COLORS.primary }, // focus:border-primary-container
  leftIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 16,
    color: COLORS.textPrimary,
    height: '100%',
    paddingVertical: 0,
  },
  glowLine: {
    height: 1,
    backgroundColor: 'transparent',
  },
  glowLineActive: {
    backgroundColor: COLORS.primaryNeon,
    shadowColor: COLORS.primaryNeon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
});

export default AuthField;
