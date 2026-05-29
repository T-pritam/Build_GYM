/**
 * authService.js
 *
 * Functions that communicate with the public auth endpoints.
 * These do NOT go through the authenticated `api` instance —
 * they use plain axios so that the refresh interceptor never touches them.
 *
 * Exported helpers:
 *  · sendOTP(phone)          → POST /api/otp/send
 *  · verifyOTP(phone, code)  → POST /api/otp/verify  (returns tokens + user)
 *  · resendOTP(phone)        → POST /api/otp/resend
 */

import axios from 'axios';
import * as Application from 'expo-application';
import { BASE_API_URL } from '@env';

const getBleCredentialId = () => {
  try {
    return Application.getAndroidId() ?? null;
  } catch {
    return null;
  }
};

// Plain public client (no auth interceptors)
const publicClient = axios.create({
  baseURL: BASE_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * POST /api/otp/send
 * Sends OTP to the given phone.
 * @param {string} phone - E.164 formatted phone number
 * @returns {Promise<object>} API response data
 */
export const sendOTP = async (phone, context = 'member') => {
    console.log('Requesting OTP for:', phone);
  const { data } = await publicClient.post('/otp/send', { phone, context });
  return data;
};

/**
 * POST /api/otp/verify
 * Verifies OTP and returns tokens + user on success.
 * @param {string} phone - E.164 formatted phone number
 * @param {string} code  - 6-digit OTP string
 * @returns {{ accessToken, refreshToken, user }}
 */
export const verifyOTP = async (phone, code) => {
  const bleCredentialId = getBleCredentialId();
  console.log('[RosslareSDK] BLE Credential ID:', bleCredentialId);
  console.log(BASE_API_URL, 'Verifying OTP for:', phone);
  const { data } = await publicClient.post('/otp/verify', { phone, code, bleCredentialId });
  console.log('verifyOTP response:', data);
  return data.data; // { accessToken, refreshToken, user }
};

/**
 * POST /api/otp/resend
 * Invalidates current OTP and sends a new one.
 * @param {string} phone - E.164 formatted phone number
 */
export const resendOTP = async (phone, context = 'member') => {
  const { data } = await publicClient.post('/otp/resend', { phone, context });
  return data;
};

/**
 * POST /api/auth/password-login
 * Login with phone/email + password. Returns same shape as verifyOTP.
 * @param {string} identifier - 10-digit phone or email address
 * @param {string} password
 */
export const passwordLogin = async (identifier, password) => {
  const { data } = await publicClient.post('/auth/password-login', { identifier, password });
  return data.data; // { accessToken, refreshToken, user }
};

/**
 * POST /api/auth/forgot-password/send
 * Sends a password-reset OTP to the user's registered phone + email.
 * @param {string} identifier - phone or email
 */
export const forgotPasswordSend = async (identifier) => {
  const { data } = await publicClient.post('/auth/forgot-password/send', { identifier });
  return data;
};

/**
 * POST /api/auth/forgot-password/verify
 * Verifies OTP and sets the new password.
 * @param {string} identifier - same phone/email used in send
 * @param {string} code       - 6-digit OTP
 * @param {string} newPassword
 */
export const forgotPasswordVerify = async (identifier, code, newPassword) => {
  const { data } = await publicClient.post('/auth/forgot-password/verify', { identifier, code, newPassword });
  return data;
};
