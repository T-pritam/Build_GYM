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
import { BASE_API_URL } from '@env';

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
  console.log(BASE_API_URL, 'Verifying OTP for:', phone);
  const { data } = await publicClient.post('/otp/verify', { phone, code });
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
