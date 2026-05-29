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

/** POST /api/customer/profile/email-change/request — send OTP to new email */
export const requestEmailChange = async (newEmail) => {
  const { data } = await api.post('/customer/profile/email-change/request', { newEmail });
  return data;
};

/** POST /api/customer/profile/email-change/verify — verify OTP and commit email change */
export const verifyEmailChange = async (code) => {
  const { data } = await api.post('/customer/profile/email-change/verify', { code });
  return data;
};

/** POST /api/auth/set-password — first-time password set (no current password needed) */
export const setPassword = async (newPassword, confirmPassword) => {
  const { data } = await api.post('/auth/set-password', { newPassword, confirmPassword });
  return data;
};

/** POST /api/auth/change-password — change existing password */
export const changePassword = async (currentPassword, newPassword, confirmPassword) => {
  const { data } = await api.post('/auth/change-password', { currentPassword, newPassword, confirmPassword });
  return data;
};
