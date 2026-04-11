/**
 * walletService.js
 *
 * API calls for the Build Coins wallet.
 * Uses the authenticated `api` instance (JWT auto-refresh included).
 */

import api from './apiService';

/**
 * GET /api/wallet/balance
 * Returns { balance, updatedAt }.
 */
export const fetchBalance = async () => {
  const { data } = await api.get('/wallet/balance');
  return data.data; // { balance, updatedAt }
};

/**
 * GET /api/wallet/transactions?limit=&cursor=
 * Returns { data: [], nextCursor, hasMore }.
 */
export const fetchTransactions = async ({ limit = 20, cursor } = {}) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  const { data } = await api.get('/wallet/transactions', { params });
  return data; // { success, data, nextCursor, hasMore }
};

/**
 * GET /api/economy/packages
 * Public — returns active coin purchase packages.
 */
export const fetchPackages = async () => {
  const { data } = await api.get('/economy/packages');
  return data.data; // []
};

/**
 * POST /api/wallet/purchase
 * Member buys a coin package (paid cash at counter).
 * Returns { balance, coinsAdded, package }.
 */
export const purchasePackage = async (packageId) => {
  const { data } = await api.post('/wallet/purchase', { packageId });
  return data.data; // { balance, coinsAdded, package }
};

/**
 * POST /api/payments/razorpay/create-order
 * Creates a Razorpay order for the given package.
 * Returns { razorpayOrderId, amountPaise, currency, keyId }.
 */
export const createRazorpayOrder = async (packageId) => {
  const { data } = await api.post('/payments/razorpay/create-order', { packageId });
  return data.data;
};

/**
 * POST /api/payments/razorpay/verify
 * Verifies a completed Razorpay payment server-side and credits coins.
 * Returns { newBalance, coinsAdded }.
 */
export const verifyRazorpayPayment = async ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  const { data } = await api.post('/payments/razorpay/verify', {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });
  return data.data;
};
