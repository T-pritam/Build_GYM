import api from './apiService';

/**
 * GET /api/axtrax/my/events?limit=
 * Returns the caller's own gate events from AxTraxPro.
 * @param {number} limit - max events to return (default 20)
 * @returns {Promise<Array>}
 */
export async function fetchMyGateEvents(limit = 20) {
  const { data } = await api.get('/axtrax/my/events', { params: { limit } });
  return data.data ?? [];
}
