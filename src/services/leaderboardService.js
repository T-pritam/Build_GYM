/**
 * leaderboardService.js
 *
 * API calls for the leaderboard feature (Section 4).
 */

import api from './apiService';

/**
 * Fetch the leaderboard — Top 10 + my rank.
 * @returns {{ month, year, top10, myRank, totalParticipants }}
 */
export async function getLeaderboard() {
  const { data } = await api.get('/leaderboard');
  return data.data;
}

/**
 * Fetch the current member's leaderboard stats.
 * @returns {{ month, year, optedIn, attendance, currentStreak, longestStreak, totalVolume, rank, score, totalParticipants }}
 */
export async function getMyLeaderboardStats() {
  const { data } = await api.get('/leaderboard/my-stats');
  return data.data;
}

/**
 * Fetch Hall of Fame — archived monthly winners.
 * @param {number} page
 * @returns {Array<{ month, year, winners }>}
 */
export async function getHallOfFame(page = 0) {
  const { data } = await api.get('/leaderboard/hall-of-fame', {
    params: { limit: 6, offset: page * 6 },
  });
  return data.data;
}

/**
 * Fetch a Top-10 member's public stat sheet (Doc 1 §7.6). 403 if not Top-10.
 */
export async function getMemberStatSheet(memberId) {
  const { data } = await api.get(`/leaderboard/member/${memberId}`);
  return data.data;
}

/**
 * Toggle leaderboard participation / Join (Doc 1 §5.2/§5.3).
 */
export async function setLeaderboardConsent(optIn) {
  const { data } = await api.put('/leaderboard/consent', { optIn });
  return data.data;
}
