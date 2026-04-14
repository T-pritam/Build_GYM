/**
 * membershipGate.js
 *
 * canAccess(tier, feature) — returns true/false based on the tier access matrix
 * defined in the membership spec.
 *
 * Usage:
 *   import { canAccess } from '../utils/membershipGate';
 *   if (canAccess(memberTier, 'trainer_chat')) { ... }
 */

// ─── Access matrix ────────────────────────────────────────────────────────────
// Keys are feature identifiers. Values are the minimum tier required.
// Tiers in ascending order: basic < pro < elite
const TIER_RANK = { basic: 1, pro: 2, elite: 3 };

const FEATURE_MIN_TIER = {
  // Available to all tiers
  gym_access:           'basic',
  app_access:           'basic',
  activity_rings:       'basic',
  streaks:              'basic',
  attendance:           'basic',
  buildcoin_wallet:     'basic',
  workout_self_log:     'basic',
  community:            'basic',
  leaderboard:          'basic',

  // Pro and above
  personal_trainer:     'pro',
  trainer_workouts:     'pro',
  trainer_chat:         'pro',
  progressive_overload: 'pro',
  weekly_reports:       'pro',

  // Elite only
  custom_diet_plan:     'elite',
  body_composition:     'elite',
  vip_badge:            'elite',
  priority_booking:     'elite',

  // PT upsell nudges — shown ONLY to basic tier (inverted logic)
  // Use canShowPTNudge() for this specific case
};

/**
 * Returns true if the given tier has access to the feature.
 * Returns false if tier is null/undefined (no active membership).
 */
export function canAccess(tier, feature) {
  if (!tier) return false;
  const minTier = FEATURE_MIN_TIER[feature];
  if (!minTier) return false; // unknown feature — deny by default
  return TIER_RANK[tier] >= TIER_RANK[minTier];
}

/**
 * PT upsell nudges should only appear for basic tier members.
 * Pro and Elite already have trainers assigned.
 */
export function canShowPTNudge(tier) {
  return tier === 'basic';
}

/**
 * Returns true if the tier qualifies for a cafe discount (discount > 0).
 */
export function hasCafeDiscount(tier, tenureMonths) {
  if (tier === 'elite') return true;
  if (tier === 'pro' && tenureMonths >= 6) return true;
  return false;
}
