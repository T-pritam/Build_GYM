import { create } from 'zustand';
import { fetchMyMembership } from '../services/membershipService';

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
    } catch {
      set({ loaded: true });
    }
  },

  /** Clear on logout. */
  reset: () => set({ status: null, currentPause: null, loaded: false }),
}));
