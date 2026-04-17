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
  const { data } = await api.get('/api/leaderboard');
  return data.data;
}

/**
 * Fetch the current member's leaderboard stats.
 * @returns {{ month, year, optedIn, attendance, currentStreak, longestStreak, totalVolume, rank, score, totalParticipants }}
 */
export async function getMyLeaderboardStats() {
  const { data } = await api.get('/api/leaderboard/my-stats');
  return data.data;
}

/**
 * Fetch Hall of Fame — archived monthly winners.
 * @param {number} page
 * @returns {Array<{ month, year, winners }>}
 */
export async function getHallOfFame(page = 0) {
  const { data } = await api.get('/api/leaderboard/hall-of-fame', {
    params: { limit: 6, offset: page * 6 },
  });
  return data.data;
}
