/**
 * stitchKit.js — shared visual language for the V3 member screens, matching the
 * Stitch "Forge Tokyo" mockups but expressed with the app's own theme tokens
 * (COLORS/FONTS/GRADIENTS). Purely presentational — import these fragments into a
 * screen's StyleSheet so all re-skinned screens share the exact same card,
 * section-header, chip, pill and accent treatment. No behaviour lives here.
 */
import { COLORS, GRADIENTS, FONTS } from './index';

// Stitch "Forge Tokyo" fonts (loaded via FONT_ASSETS) — Montserrat headings,
// Inter body. Used ONLY by the V3 re-skinned screens (the rest of the app keeps
// FONTS = Anybody/Hanken).
export const KF = {
  heading: 'Montserrat_700Bold',
  headingExtra: 'Montserrat_800ExtraBold',
  headingSemi: 'Montserrat_600SemiBold',
  body: 'Inter_400Regular',
  bodyMed: 'Inter_500Medium',
  label: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
};

// Stitch surfaces mapped to the app's dark holographic palette.
export const KC = {
  bg: COLORS.background,          // #080608
  card: '#151217',               // neutral dark card (≈ Stitch surface #151218)
  cardHigh: '#1C1922',           // raised / nested
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.10)',
  primary: COLORS.primaryBright, // #7C3AED
  cyan: COLORS.cyan,             // #06B6D4
  gold: COLORS.warning,          // #FFC107 (streak flame etc.)
  gradient: GRADIENTS.violetCyan,
};

export const KIT = {
  // Sticky-style header row (back · centered title) with a hairline underline.
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: KC.border },
  headerTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: COLORS.textPrimary, letterSpacing: 0.3 },

  // Standard card — rounded, neutral-dark, hairline border.
  card: { backgroundColor: KC.card, borderRadius: 20, borderWidth: 1, borderColor: KC.border, padding: 18 },
  cardTight: { backgroundColor: KC.card, borderRadius: 16, borderWidth: 1, borderColor: KC.border, padding: 14 },

  // Uppercase, letter-spaced section labels (Stitch signature).
  sectionLabel: { fontFamily: FONTS.label, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: COLORS.textMuted },
  sectionTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.textPrimary, letterSpacing: 0.2 },

  // Big accent value (KPIs, hero numbers).
  statValue: { fontFamily: FONTS.headline, fontSize: 24, color: COLORS.textPrimary },
  statValueAccent: { fontFamily: FONTS.headline, fontSize: 24, color: COLORS.primaryBright },

  // Pill / chip.
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: KC.cardHigh, borderWidth: 1, borderColor: KC.border },
  pillOn: { backgroundColor: COLORS.primaryBright, borderColor: 'transparent' },
  pillText: { fontFamily: FONTS.label, fontSize: 12, color: COLORS.textSecondary, letterSpacing: 0.3 },
  pillTextOn: { color: '#fff', fontFamily: FONTS.bodyBold },

  // Primary gradient CTA (used with a LinearGradient wrapper).
  ctaText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: '#fff', letterSpacing: 0.5 },
};
