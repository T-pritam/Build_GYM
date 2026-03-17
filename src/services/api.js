/**
 * api.js — Centralised API helpers for BuildGym Member App.
 */
import axios from 'axios';
import { BASE_API_URL } from '@env';

const client = axios.create({
  baseURL: BASE_API_URL,
  timeout: 10000,
});

// ─── Auth / OTP ───────────────────────────────────────────────────────────────

/** Verify a 6-digit OTP. Returns { user: { id, role, firstName, … , onboardingCompleted } } */
export const verifyOTP = (phone, code) =>
  client.post('/otp/verify', { phone, code }).then(r => r.data.data);

// ─── User ─────────────────────────────────────────────────────────────────────

export const fetchUser = (userId) =>
  client.get(`/users/${userId}`).then(r => r.data.data);

/**
 * Submit all 6 onboarding steps and mark onboardingCompleted = true.
 * Returns the updated user_profiles row.
 */
export const completeOnboarding = (userId, data) =>
  client.patch(`/users/${userId}/onboarding`, data).then(r => r.data.data);

// ─── Coin Wallet ──────────────────────────────────────────────────────────────

export const fetchWallet = (userId) =>
  client.get(`/coins/wallet/${userId}`).then(r => r.data.data);

// ─── Trainer Mapping ──────────────────────────────────────────────────────────

export const fetchTrainerForMember = (memberId) =>
  client.get(`/trainer-mapping/member/${memberId}`).then(r => r.data.data);

// ─── Café ─────────────────────────────────────────────────────────────────────

export const fetchCafeMenu = () =>
  client.get('/cafe/menu?available=true').then(r => r.data.data);

export const placeOrder = (memberId, items) =>
  client.post('/cafe/orders', { memberId, items }).then(r => r.data.data);

export const fetchOrder = (orderId) =>
  client.get(`/cafe/orders/${orderId}`).then(r => r.data.data);

export const fetchMemberOrders = (memberId) =>
  client.get(`/cafe/orders/member/${memberId}`).then(r => r.data.data);

// ─── Complaints ───────────────────────────────────────────────────────────────

export const submitComplaint = (memberId, category, description, photoUrl) =>
  client.post('/complaints', { memberId, category, description, photoUrl }).then(r => r.data.data);

export const fetchMemberComplaints = (memberId) =>
  client.get(`/complaints/member/${memberId}`).then(r => r.data.data);

// ─── Notifications ────────────────────────────────────────────────────────────

export const fetchMemberNotifications = (userId) =>
  client.get(`/member-notifications/${userId}`).then(r => r.data);

export const markNotificationRead = (notifId) =>
  client.patch(`/member-notifications/${notifId}/read`).then(r => r.data.data);

export const markAllNotificationsRead = (userId) =>
  client.post(`/member-notifications/mark-all-read/${userId}`).then(r => r.data);

// ─── Activities ───────────────────────────────────────────────────────────────

export const fetchActivitySessions = () =>
  client.get('/activities/sessions').then(r => r.data.data);

export const bookActivitySession = (sessionId, memberId) =>
  client.post('/activities/bookings', { sessionId, memberId }).then(r => r.data.data);

export const fetchMemberBookings = (memberId) =>
  client.get(`/activities/bookings/member/${memberId}`).then(r => r.data.data);

export const cancelBooking = (bookingId) =>
  client.delete(`/activities/bookings/${bookingId}`).then(r => r.data);

// ─── Memberships ──────────────────────────────────────────────────────────────

export const fetchMemberMembership = (memberId) =>
  client.get(`/memberships/member/${memberId}`).then(r => r.data.data);
