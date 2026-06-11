import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS } from '../../theme';

const LEN = 6;

/**
 * 6-cell OTP entry. Controlled via `value` (array of 6 strings) + `onChange`.
 * Calls `onComplete(code)` once all cells are filled. Handles auto-advance and
 * backspace navigation. Parent can imperatively refocus via ref.focus(index).
 *
 * Props:
 *   value      (string[6])
 *   onChange   (fn) -> next array
 *   onComplete (fn) -> joined code  (optional)
 *   editable   (bool, default true)
 */
const OtpInput = forwardRef(function OtpInput(
  { value, onChange, onComplete, editable = true },
  ref,
) {
  const inputs = useRef([]);

  useImperativeHandle(ref, () => ({
    focus: (index = 0) => inputs.current[index]?.focus(),
  }));

  const activeIndex = value.findIndex((d) => d === '');

  const handleChange = (text, index) => {
    const next = [...value];
    next[index] = text.slice(-1);
    onChange(next);
    if (text && index < LEN - 1) inputs.current[index + 1]?.focus();
    if (next.every((d) => d !== '')) onComplete?.(next.join(''));
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {value.map((digit, i) => (
        <TextInput
          key={i}
          ref={(r) => { inputs.current[i] = r; }}
          style={[
            styles.box,
            digit ? styles.boxFilled : styles.boxEmpty,
            i === activeIndex && styles.boxActive,
          ]}
          value={digit}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          keyboardType="number-pad"
          maxLength={1}
          textAlign="center"
          textAlignVertical="center"
          selectTextOnFocus
          editable={editable}
          includeFontPadding={false}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  // Cells flex to share the available width so all six always fit — no
  // overflow on narrow screens.
  row: { flexDirection: 'row', gap: 8 },
  box: {
    flex: 1,
    minWidth: 0,
    height: 56,
    textAlign: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    backgroundColor: COLORS.backgroundAlt,
    fontFamily: FONTS.headline,
    fontSize: 22,
    color: COLORS.textPrimary,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  boxEmpty: { borderColor: COLORS.borderStrong },
  boxFilled: { borderColor: COLORS.primaryNeon, color: COLORS.primaryLight },
  boxActive: { borderColor: COLORS.cyan },
});

export default OtpInput;
