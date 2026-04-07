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
