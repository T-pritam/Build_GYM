// ─────────────────────────────────────────────────────────────────────────
// BUILD · "Elite Noir / Holographic" palette
// Source of truth for the NewUi redesign. Distilled from /NewUi HTML mockups.
//
// Signature: deep void-black canvas, frosted-glass surfaces, and a holographic
// purple → cyan accent gradient. Replaces the legacy black + orange theme.
//
// NOTE: legacy screens still import from src/constants/colors.js. Migrate a
// screen by switching its import to this module, then delete the old file once
// every screen is converted.
// ─────────────────────────────────────────────────────────────────────────

export const COLORS = {
  // ── Canvas / backgrounds ────────────────────────────────────────────────
  background: '#080608',      // deep void black (body)
  backgroundAlt: '#100D10',   // surface-container-lowest (inputs, sunken)
  surface: '#151215',         // base surface
  surfaceLow: '#1E1B1D',      // surface-container-low
  surface2: '#221F21',        // surface-container
  surface3: '#2C292C',        // surface-container-high
  surfaceBright: '#3C383B',   // surface-bright

  // Frosted-glass fills (use over the background with a blur layer)
  glass: 'rgba(255,255,255,0.05)',
  glassDim: 'rgba(255,255,255,0.03)',
  glassBright: 'rgba(255,255,255,0.08)',

  // ── Accent · holographic purple → cyan ──────────────────────────────────
  primary: '#7F2982',         // brand purple (primary-container)
  primaryBright: '#7C3AED',   // vivid violet
  primaryNeon: '#7F29FF',     // neon edge / focus glow
  primaryLight: '#A78BFA',    // soft lavender (chips, secondary text accents)
  primaryDeep: '#5A005F',     // on-primary deep plum

  cyan: '#06B6D4',            // holographic cyan
  cyanNeon: '#00F2FF',        // neon cyan highlight

  // Translucent accent washes
  primarySoft: 'rgba(127,41,130,0.15)',
  primaryBorder: 'rgba(127,41,130,0.40)',
  primaryGlow: 'rgba(127,41,130,0.30)',
  primaryNeonGlow: 'rgba(127,41,255,0.80)',

  // ── Text ────────────────────────────────────────────────────────────────
  textPrimary: '#E8E0E4',     // on-surface / on-background
  textSecondary: '#D4C1CF',   // on-surface-variant
  textMuted: '#9D8C99',       // outline
  textDim: '#50434E',         // outline-variant

  // ── Status ──────────────────────────────────────────────────────────────
  success: '#4CAF50',
  successSoft: 'rgba(76,175,80,0.15)',
  error: '#F44336',
  errorBright: '#FFB4AB',     // on dark (Material error)
  errorSoft: 'rgba(244,67,54,0.12)',
  warning: '#FFC107',
  warningSoft: 'rgba(255,193,7,0.15)',

  // ── Borders ─────────────────────────────────────────────────────────────
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.20)',
  divider: '#50434E',

  // ── Overlays ────────────────────────────────────────────────────────────
  overlay: 'rgba(8,6,8,0.80)',
  overlayLight: 'rgba(8,6,8,0.40)',

  // ── Absolutes ───────────────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// Gradient stop arrays — ready to spread into <LinearGradient colors={...} />.
export const GRADIENTS = {
  // Animated CTA / holographic button (purple → cyan → purple)
  holographic: ['#7F2982', '#00F2FF', '#7F2982'],
  // Headline / number gradient text (violet → cyan)
  violetCyan: ['#7C3AED', '#06B6D4'],
  // Subtle purple radial wash for backgrounds
  purpleWash: ['rgba(127,41,130,0.30)', 'transparent'],
  // Divider sheen (transparent → purple → transparent)
  divider: ['transparent', '#7F2982', 'transparent'],
};

export default COLORS;
