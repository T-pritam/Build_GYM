// ─────────────────────────────────────────────────────────────────────────
// Type scale for the NewUi redesign — RN StyleSheet-ready presets.
//
// Mirrors the Tailwind tokens from the /NewUi mockups. Web em-based tracking
// and unit-less line-heights are pre-converted to React Native's absolute px
// (letterSpacing = fontSize × em, lineHeight = fontSize × ratio).
//
//   import { TYPE } from '../theme';
//   <Text style={TYPE.headlineLg}>...</Text>
// ─────────────────────────────────────────────────────────────────────────

import { FONTS } from './fonts';
import { COLORS } from './colors';

export const TYPE = {
  // Anybody · 72px ExtraBold — hero numbers / screen titles (uppercase)
  displayLg: {
    fontFamily: FONTS.display,
    fontSize: 72,
    lineHeight: 79,
    letterSpacing: 5.76,
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
  },

  // Anybody · 40px Bold — section headlines
  headlineLg: {
    fontFamily: FONTS.headline,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: 2,
    color: COLORS.textPrimary,
  },

  // Anybody · 32px Bold — mobile headline
  headlineMd: {
    fontFamily: FONTS.headline,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 1.6,
    color: COLORS.textPrimary,
  },

  // Anybody · 22px Bold — card / row titles
  headlineSm: {
    fontFamily: FONTS.headline,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 1,
    color: COLORS.textPrimary,
  },

  // Hanken Grotesk · 16px Regular — body copy
  bodyMd: {
    fontFamily: FONTS.body,
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: 0.16,
    color: COLORS.textPrimary,
  },

  // Hanken Grotesk · 14px Regular — secondary body
  bodySm: {
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.14,
    color: COLORS.textSecondary,
  },

  // Hanken Grotesk · 12px SemiBold — all-caps labels / tabs / buttons
  labelCaps: {
    fontFamily: FONTS.label,
    fontSize: 16,
    lineHeight: 14,
    letterSpacing: 2.4,
    fontWeight: '800',
    color: COLORS.white,
    textTransform: 'uppercase',
  },

  // EB Garamond · 20px Italic — editorial taglines
  taglineItalic: {
    fontFamily: FONTS.taglineItalic,
    fontSize: 20,
    lineHeight: 28,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
  },
};

export default TYPE;
