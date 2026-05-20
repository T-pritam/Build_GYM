/**
 * cafeService.js — Cafe API calls for the gym customer app.
 *
 * Previously these hit the gym backend's /cafe/* endpoints (coin-based).
 * Now they hit the standalone **Cafe backend** (INR + Razorpay) via
 * cafeApiService, with a silent gym→cafe auth bridge on first use.
 */

import cafeApi from './cafeApiService';
import { ensureCafeAuth } from './cafeAuthService';

async function withAuth(fn) {
  await ensureCafeAuth();
  return fn();
}

/**
 * GET /menu — public on the cafe backend; we deliberately skip the auth
 * bridge so the menu loads even before the first authenticated action.
 * If a logged-in token is already in storage cafeApi will attach it, but a
 * missing/expired token will not block the request.
 */
export const fetchMenu = (category) =>
  cafeApi.get('/menu', { params: category ? { category } : {} });

/**
 * POST /orders — place an order from the gym app (always TAKEAWAY, GYM_APP source).
 *
 * Caller passes `items: [{ menuItemId, quantity, unitPrice, modifiers?: [{name,price}], specialNote? }]`.
 * Returns { orderId, razorpayOrderId, amountPaise, keyId, deliveryPin }.
 */
export const placeOrder = (body) =>
  withAuth(() => cafeApi.post('/orders', {
    orderSource: 'GYM_APP',
    orderType: 'TAKEAWAY',
    items: body.items,
  }));

/** POST /orders/:id/retry-payment — for PAYMENT_PENDING orders. */
export const retryPayment = (orderId) =>
  withAuth(() => cafeApi.post(`/orders/${orderId}/retry-payment`));

/** GET /orders/mine — current customer's order history (paginated). */
export const fetchMyOrders = ({ limit = 15, offset = 0 } = {}) =>
  withAuth(() => cafeApi.get('/orders/mine', { params: { limit, offset } }));

/** GET /orders/:id — enriched order detail. */
export const fetchOrderById = (id) => withAuth(() => cafeApi.get(`/orders/${id}`));
