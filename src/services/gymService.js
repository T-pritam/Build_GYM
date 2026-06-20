/**
 * gymService.js
 *
 * API calls for gym-wide live data (e.g. live occupancy count).
 * Uses the authenticated `api` instance (JWT auto-refresh included).
 */

import api from './apiService';

/**
 * GET /api/gym/occupancy
 * Returns the approximate "users in the gym now" count (FCM-based).
 * { count, capacity, nextRefreshAt }
 */
export const fetchGymOccupancy = async () => {
  const { data } = await api.get('/gym/occupancy');
  return data.data;
};

/**
 * GET /api/gym/presence
 * Returns tap-based check-in count and caller's own status.
 * { count, myStatus: 'in' | 'out' }
 */
export const fetchGymPresence = async () => {
  const { data } = await api.get('/gym/presence');
  return data.data;
};

/**
 * POST /api/gym/presence/checkin
 * Marks the caller as IN for today. Returns { count, myStatus: 'in' }.
 */
export const gymCheckIn = async () => {
  const { data } = await api.post('/gym/presence/checkin');
  return data.data;
};

/**
 * POST /api/gym/presence/checkout
 * Marks the caller as OUT for today. Returns { count, myStatus: 'out' }.
 */
export const gymCheckOut = async () => {
  const { data } = await api.post('/gym/presence/checkout');
  return data.data;
};

/**
 * GET /api/gym/attendance/me
 * My check-in history. Returns { logs: [{ date, status }], last7Count, monthCount, totalCount }.
 */
export const fetchMyAttendance = async (limit = 30) => {
  const { data } = await api.get('/gym/attendance/me', { params: { limit } });
  return data.data;
};
