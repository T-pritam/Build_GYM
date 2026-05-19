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

/** GET /menu — returns categories with items + modifiers. */
export const fetchMenu = (category) =>
  withAuth(() => cafeApi.get('/menu', { params: category ? { category } : {} }));

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

/** GET /orders/mine — current customer's order history. */
export const fetchMyOrders = () => withAuth(() => cafeApi.get('/orders/mine'));

/** GET /orders/:id — enriched order detail. */
export const fetchOrderById = (id) => withAuth(() => cafeApi.get(`/orders/${id}`));
