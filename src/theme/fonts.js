// ─────────────────────────────────────────────────────────────────────────
// Font family registry for the NewUi redesign.
//
//   Anybody        → display & headlines (uppercase, wide tracking)
//   Hanken Grotesk → body text & all-caps labels
//   EB Garamond    → italic taglines / editorial accents
//
// `FONT_ASSETS` is fed straight into expo-font's useFonts() in App.js. The keys
// here are the family names you reference in styles via FONTS.*.
// ─────────────────────────────────────────────────────────────────────────

import {
  Anybody_700Bold,
  Anybody_800ExtraBold,
} from '@expo-google-fonts/anybody';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import {
  EBGaramond_400Regular_Italic,
} from '@expo-google-fonts/eb-garamond';
// Stitch "Forge Tokyo" typography — used ONLY by the V3 re-skinned screens via
// src/theme/stitchKit (KF). The app-wide FONTS below stay Anybody/Hanken.
import {
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

// Map passed to useFonts(). Key = the string you set as fontFamily.
export const FONT_ASSETS = {
  Anybody_700Bold,
  Anybody_800ExtraBold,
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  EBGaramond_400Regular_Italic,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
};

// Semantic family names — use these in StyleSheet, never the raw strings.
export const FONTS = {
  // Display / headline (Anybody)
  display: 'Anybody_800ExtraBold',
  headline: 'Anybody_700Bold',

  // Body & labels (Hanken Grotesk)
  body: 'HankenGrotesk_400Regular',
  bodyMedium: 'HankenGrotesk_500Medium',
  label: 'HankenGrotesk_600SemiBold',
  bodyBold: 'HankenGrotesk_700Bold',

  // Editorial accent (EB Garamond)
  taglineItalic: 'EBGaramond_400Regular_Italic',
};

export default FONTS;
