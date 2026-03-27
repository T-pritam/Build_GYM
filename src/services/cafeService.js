/**
 * cafeService.js — Cafe API calls for the customer (member) app.
 */
import api from './apiService';

/** Fetch all non-deleted menu items (includes unavailable ones for UI greying). */
export const fetchMenu = (category) =>
  api.get('/cafe/menu', { params: category ? { category } : {} });

/**
 * Place an order.
 * body: { items: [{ menuItemId, itemName, itemPriceCoins, qty }], note? }
 */
export const placeOrder = (body) => api.post('/cafe/orders', body);

/** Fetch the current member's own orders (cursor-based pagination). */
export const fetchMyOrders = ({ limit = 10, cursor } = {}) =>
  api.get('/cafe/orders', { params: { limit, ...(cursor ? { cursor } : {}) } });

/** Fetch a single order by ID. */
export const fetchOrderById = (id) => api.get(`/cafe/orders/${id}`);
