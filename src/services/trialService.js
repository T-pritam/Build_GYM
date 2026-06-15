/**
 * trialService.js — member-facing Trial Session API calls.
 */
import api from './apiService';

/** Upcoming or past trials for the logged-in member. */
export const fetchMyTrials = (status = 'upcoming') =>
  api.get('/customer/trials', { params: { status } });

/** Single trial detail (trainer mini-profile, status, cancel eligibility). */
export const fetchTrialDetail = (id) =>
  api.get(`/customer/trials/${id}`);

/** Member self-cancel (allowed only > cutoff hours before start). */
export const cancelMyTrial = (id) =>
  api.post(`/customer/trials/${id}/cancel`);

/** Status → { label, color } for badges. */
export const TRIAL_STATUS_META = {
  scheduled:           { label: 'UPCOMING',  color: '#00BCD4', bg: 'rgba(0,188,212,0.12)', border: 'rgba(0,188,212,0.4)' },
  confirmed:           { label: 'CONFIRMED', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.4)' },
  completed:           { label: 'COMPLETED', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.4)' },
  no_show:             { label: 'NO SHOW',   color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)' },
  cancelled_by_member: { label: 'CANCELLED', color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.4)' },
  cancelled_by_admin:  { label: 'CANCELLED', color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.4)' },
};
