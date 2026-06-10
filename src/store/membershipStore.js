import { create } from 'zustand';
import { fetchMyMembership } from '../services/membershipService';
import { setUserProperty } from '../services/analyticsService';

/** Map membership status + plan tenure → GA4 membership_type (monthly/quarterly/annual/expired). */
function membershipTypeFrom(data) {
  const status = data?.membership?.status;
  if (!data?.membership || status === 'expired' || status === 'cancelled') return 'expired';
  const months = data?.plan?.tenureMonths;
  if (months === 1) return 'monthly';
  if (months === 3) return 'quarterly';
  if (months === 12) return 'annual';
  return months ? `${months}_month` : 'active';
}

/**
 * membershipStore — lightweight global mirror of the member's membership status.
 *
 * Used by the navigation root to hard-lock the app when the membership is
 * `frozen` (admin- or member-initiated pause). The FCM handler calls refresh()
 * when a MEMBERSHIP_* push arrives so the lock flips live without a relaunch.
 */
export const useMembershipStore = create((set) => ({
  status: null,        // member_memberships.status: 'active' | 'frozen' | 'expired' | 'cancelled' | null
  currentPause: null,  // { id, initiatedByRole, ... } when a pause is scheduled/active
  loaded: false,       // has refresh() completed at least once?

  /** Re-fetch membership status from the API. Best-effort; never throws. */
  refresh: async () => {
    try {
      const data = await fetchMyMembership();
      set({
        status: data?.membership?.status ?? null,
        currentPause: data?.pause?.currentPause ?? null,
        loaded: true,
      });
      // GA4 user property — segment all analytics by membership plan.
      setUserProperty('membership_type', membershipTypeFrom(data)).catch(() => {});
    } catch {
      set({ loaded: true });
    }
  },

  /** Clear on logout. */
  reset: () => set({ status: null, currentPause: null, loaded: false }),
}));
