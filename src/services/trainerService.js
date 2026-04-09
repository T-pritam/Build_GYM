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
 * Returns the most upcoming accepted/confirmed trial session for this member, or null.
 */
export const fetchTrialSession = async () => {
  const { data } = await api.get('/member/trial-sessions');
  return (data.data || [])[0] ?? null;
};
