/**
 * gamingService.js — API calls for the Gaming Zone (GZSM).
 * Mirrors activityService.js. All endpoints are member-scoped (JWT).
 */
import api from './apiService';

export const fetchGamingPcs = () =>
  api.get('/gaming/pcs');

export const startGamingSession = ({ pcCode, qrToken }) =>
  api.post('/gaming/sessions/start', { pcCode, qrToken });

export const fetchCurrentGamingSession = () =>
  api.get('/gaming/sessions/current');

export const fetchGamingSession = (id) =>
  api.get(`/gaming/sessions/${id}`);

/** Freeze the paid clock while stepping away. Limited per session — see canPause on the card. */
export const pauseGamingSession = (id) =>
  api.post(`/gaming/sessions/${id}/pause`);

/** Come back: the backend hands the banked time back by extending paidUntil. */
export const resumeGamingSession = (id) =>
  api.post(`/gaming/sessions/${id}/resume`);

export const endGamingSession = (id) =>
  api.post(`/gaming/sessions/${id}/end`);

export const reportGamingProblem = (id, { category, text }) =>
  api.post(`/gaming/sessions/${id}/report`, { category, text });
