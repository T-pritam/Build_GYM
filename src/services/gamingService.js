/**
 * gamingService.js — API calls for the Gaming Zone (GZSM).
 * Mirrors activityService.js. All endpoints are member-scoped (JWT).
 */
import api from './apiService';

export const fetchGamingPcs = () =>
  api.get('/gaming/pcs');

export const startGamingSession = ({ pcCode, qrToken }) =>
  api.post('/gaming/sessions/start', { pcCode, qrToken });

export const fetchGamingSession = (id) =>
  api.get(`/gaming/sessions/${id}`);

export const setSessionAway = (id) =>
  api.post(`/gaming/sessions/${id}/away`);

export const resumeSession = (id) =>
  api.post(`/gaming/sessions/${id}/resume`);

export const endGamingSession = (id) =>
  api.post(`/gaming/sessions/${id}/end`);

export const reportGamingProblem = (id, { category, text }) =>
  api.post(`/gaming/sessions/${id}/report`, { category, text });
