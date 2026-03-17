/**
 * announcementService.js
 *
 * All announcement API calls. Uses the authenticated `api` instance
 * so the JWT refresh interceptor applies automatically.
 */

import api from './apiService';

/**
 * GET /api/announcements
 * Paginated list filtered by the caller's role.
 * @param {{ cursor?: string, limit?: number }} opts
 */
export const fetchAnnouncements = async ({ cursor, limit = 20 } = {}) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  const { data } = await api.get('/announcements', { params });
  return data; // { success, count, nextCursor, data: [] }
};

/**
 * GET /api/announcements/unread-count
 * Returns the number of visible unread announcements for the current user.
 */
export const getUnreadCount = async () => {
  const { data } = await api.get('/announcements/unread-count');
  return data.data.count;
};

/**
 * GET /api/announcements/:id
 * Fetch a single announcement (role-filtered).
 */
export const fetchAnnouncement = async (id) => {
  const { data } = await api.get(`/announcements/${id}`);
  return data.data;
};

/**
 * POST /api/announcements/:id/read
 * Mark an announcement as read. Idempotent.
 */
export const markAnnouncementRead = async (id) => {
  await api.post(`/announcements/${id}/read`);
};
