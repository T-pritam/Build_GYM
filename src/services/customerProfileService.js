/**
 * customerProfileService.js
 * API calls for the logged-in member's own profile data.
 */
import api from './apiService';

/** GET /api/customer/me — full profile (user + member tables) */
export const fetchMyProfile = async () => {
  const { data } = await api.get('/customer/me');
  return data.data;
};

/** PATCH /api/customer/profile/personal — firstName, lastName, email, dob */
export const updatePersonalDetails = async (payload) => {
  const { data } = await api.patch('/customer/profile/personal', payload);
  return data.data;
};

/** PATCH /api/customer/profile/health — health + emergency contact */
export const updateHealthEmergency = async (payload) => {
  const { data } = await api.patch('/customer/profile/health', payload);
  return data;
};

/** POST /api/customer/request-deletion — GDPR account deletion request */
export const requestAccountDeletion = async () => {
  const { data } = await api.post('/customer/request-deletion');
  return data;
};
