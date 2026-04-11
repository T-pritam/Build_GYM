/**
 * trainerService.js
 * API calls for the trainers directory (customer-facing).
 */
import api from './apiService';

/**
 * GET /api/customer/trainers
 * Returns all approved trainers.
 */
export const fetchTrainers = async () => {
  const { data } = await api.get('/customer/trainers');
  return data.data; // array of trainer objects
};

/**
 * GET /api/customer/my-trainer
 * Returns the logged-in member's currently assigned trainer, or null.
 */
export const fetchMyTrainer = async () => {
  const { data } = await api.get('/customer/my-trainer');
  return data.data; // trainer object or null
};

/**
 * POST /api/member/trial-request
 * Submits a trial session request for the given trainer.
 */
export const requestTrialSession = async (trainerId, memberNote = '') => {
  const { data } = await api.post('/member/trial-request', { trainer_id: trainerId, member_note: memberNote });
  return data;
};

/**
 * GET /api/member/trial-sessions
 * Returns all upcoming accepted/confirmed trial sessions for this member.
 */
export const fetchTrialSessions = async () => {
  const { data } = await api.get('/member/trial-sessions');
  return data.data ?? [];
};

/** @deprecated use fetchTrialSessions */
export const fetchTrialSession = async () => {
  const sessions = await fetchTrialSessions();
  return sessions[0] ?? null;
};

/**
 * GET /api/member/trial-request/check?trainer_id=X
 * Returns { hasActive, status, requestId } for the given trainer.
 * Used to gate the "Request Trial" button on TrainerDetailScreen.
 */
export const checkTrainerTrialStatus = async (trainerId) => {
  const { data } = await api.get(`/member/trial-request/check?trainer_id=${trainerId}`);
  return data.data; // { hasActive, status, requestId }
};

/**
 * GET /api/member/trial-requests/:id
 * Fetch a single trial request by id (member must own it).
 */
export const fetchTrialRequest = async (requestId) => {
  const { data } = await api.get(`/member/trial-requests/${requestId}`);
  return data.data;
};

/**
 * POST /api/member/trial-requests/:id/confirm
 * Member confirms an accepted trial session.
 */
export const confirmTrialSession = async (requestId) => {
  const { data } = await api.post(`/member/trial-requests/${requestId}/confirm`);
  return data;
};

/**
 * POST /api/member/trial-requests/:id/reject
 * Member declines an accepted trial session.
 */
export const rejectTrialSession = async (requestId) => {
  const { data } = await api.post(`/member/trial-requests/${requestId}/reject`);
  return data;
};
