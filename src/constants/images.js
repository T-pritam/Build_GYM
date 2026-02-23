// =====================================================
// IMAGES – Replace require paths with actual assets
// All images should live in assets/images/
// =====================================================

// Placeholder: using online URLs. Replace with require() once images are added.
// Example: export const LOGO = require('../../assets/images/logo.png');

// For now, using placeholder image base URLs
const BASE_PLACEHOLDER = 'https://picsum.photos/seed';

export const IMAGES = {
  // App Logo
  logo: null, // replace: require('../../assets/images/logo.png')

  // Auth / Onboarding
  splash_bg: null, // replace: require('../../assets/images/splash_bg.png')
  gym_interior: null, // replace: require('../../assets/images/gym_interior.png')

  // Default Avatar placeholder color
  avatarPlaceholder: `${BASE_PLACEHOLDER}/avatar/200/200`,

  // Trainer Photos – replace with local requires
  trainer: {
    tr1: `${BASE_PLACEHOLDER}/karan/200/200`,
    tr2: `${BASE_PLACEHOLDER}/sneha/200/200`,
    tr3: `${BASE_PLACEHOLDER}/rahul/200/200`,
    tr4: `${BASE_PLACEHOLDER}/anjali/200/200`,
  },

  // Cafe Items – replace with local requires
  cafe: {
    wheyShake: `${BASE_PLACEHOLDER}/whey/300/200`,
    massGainer: `${BASE_PLACEHOLDER}/mass/300/200`,
    greenShake: `${BASE_PLACEHOLDER}/green/300/200`,
    mangoLassi: `${BASE_PLACEHOLDER}/mango/300/200`,
    chickenBowl: `${BASE_PLACEHOLDER}/chicken/300/200`,
    eggOmelette: `${BASE_PLACEHOLDER}/egg/300/200`,
    paneerBowl: `${BASE_PLACEHOLDER}/paneer/300/200`,
    tunaWrap: `${BASE_PLACEHOLDER}/tuna/300/200`,
    proteinBar: `${BASE_PLACEHOLDER}/bar/300/200`,
    makhana: `${BASE_PLACEHOLDER}/makhana/300/200`,
    boiledEgg: `${BASE_PLACEHOLDER}/boiledegg/300/200`,
    creatine: `${BASE_PLACEHOLDER}/creatine/300/200`,
    bcaa: `${BASE_PLACEHOLDER}/bcaa/300/200`,
    preworkout: `${BASE_PLACEHOLDER}/preworkout/300/200`,
  },

  // Announcement banners
  banner1: `${BASE_PLACEHOLDER}/gym1/800/300`,
  banner2: `${BASE_PLACEHOLDER}/gym2/800/300`,
};

export default IMAGES;
