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
