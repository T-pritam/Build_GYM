/**
 * gymService.js
 *
 * API calls for gym-wide live data (e.g. live occupancy count).
 * Uses the authenticated `api` instance (JWT auto-refresh included).
 */

import api from './apiService';

/**
 * GET /api/gym/occupancy
 * Returns the current "users in the gym now" count.
 * { count, capacity, nextRefreshAt }
 */
export const fetchGymOccupancy = async () => {
  const { data } = await api.get('/gym/occupancy');
  return data.data; // { count, capacity, nextRefreshAt }
};
