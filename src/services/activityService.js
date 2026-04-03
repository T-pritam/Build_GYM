/**
 * activityService.js — API calls for activities, slots, and bookings.
 */
import api from './apiService';

export const fetchActivities = () =>
  api.get('/activities');

export const fetchActivityDetail = (id) =>
  api.get(`/activities/${id}`);

export const fetchSlots = (activityId, date) =>
  api.get(`/activities/${activityId}/slots`, { params: { date } });

export const createBooking = ({ slotId, activityId }) =>
  api.post('/activities/book', { slotId, activityId });

export const fetchMyBookings = ({ status, limit = 20, cursor } = {}) =>
  api.get('/bookings/my', { params: { status, limit, cursor } });

export const fetchBookingDetail = (id) =>
  api.get(`/bookings/${id}`);

export const cancelBooking = (id) =>
  api.post(`/bookings/${id}/cancel`);
