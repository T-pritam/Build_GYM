/**
 * membershipService.js
 *
 * API calls for membership packages and perks.
 * Uses the authenticated `api` instance (JWT auto-refresh included).
 */

import api from './apiService';

/**
 * GET /api/membership-plans
 * Returns all plans with their perks.
 */
export const fetchMembershipPlans = async () => {
  const { data } = await api.get('/membership-plans');
  return data.data; // []
};

/**
 * GET /api/memberships/my
 * Returns the calling member's active membership + plan + perks with usage.
 * Also includes a `pause` block: { isPaused, pausesUsed, permittedPauseCount,
 * pausesRemaining, maxPauseDays, currentPause, history }.
 * Returns null if no active membership.
 */
export const fetchMyMembership = async () => {
  const { data } = await api.get('/memberships/my');
  return data.data; // { membership, plan, totalDays, daysLeft, pause } | null
};

/**
 * POST /api/memberships/razorpay/create-order
 * Body: { planId }
 * Returns Razorpay order details to open the checkout sheet.
 */
export const createMembershipOrder = async (planId) => {
  const { data } = await api.post('/memberships/razorpay/create-order', { planId });
  return data.data; // { razorpayOrderId, amountPaise, currency, keyId, plan }
};

/**
 * POST /api/memberships/razorpay/verify
 * Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature }
 * Activates membership after successful payment.
 */
export const verifyMembershipPayment = async ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  const { data } = await api.post('/memberships/razorpay/verify', {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });
  return data.data; // { membership }
};

/**
 * POST /api/memberships/pause
 * Body: { startDate, endDate, reason? }  (dates as YYYY-MM-DD)
 * Schedules / starts a membership pause for the calling member.
 */
export const pauseMembership = async ({ startDate, endDate, reason }) => {
  const { data } = await api.post('/memberships/pause', { startDate, endDate, reason });
  return data.data; // { pause }
};

/**
 * POST /api/memberships/pauses/:pauseId/resume
 * Ends an active pause immediately.
 */
export const resumeMembershipPause = async (pauseId) => {
  const { data } = await api.post(`/memberships/pauses/${pauseId}/resume`);
  return data.data; // { pause, membership }
};

/**
 * POST /api/memberships/pauses/:pauseId/cancel
 * Cancels a scheduled (not-yet-started) pause.
 */
export const cancelMembershipPause = async (pauseId) => {
  const { data } = await api.post(`/memberships/pauses/${pauseId}/cancel`);
  return data.data; // { pause }
};
