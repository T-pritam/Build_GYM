// Single entry point for the NewUi design system.
//   import { COLORS, GRADIENTS, FONTS, TYPE } from '../theme';
export { COLORS, GRADIENTS, default as colors } from './colors';
export { FONTS, FONT_ASSETS } from './fonts';
export { TYPE } from './typography';

// Shared radii & spacing tokens from the mockups (8px base unit).
export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  stackLg: 80,
};
