/**
 * cafeSupabase.js
 *
 * Supabase client for the Cafe project (same project as the standalone Cafe
 * customer app). Used only for realtime broadcasts (e.g., menu availability);
 * we do not use Supabase auth — auth is via the cafe backend's JWT.
 */

import { createClient } from '@supabase/supabase-js';
import { CAFE_SUPABASE_URL, CAFE_SUPABASE_ANON_KEY } from '@env';

let _client = null;

export function getCafeSupabase() {
  if (_client) return _client;
  if (!CAFE_SUPABASE_URL || !CAFE_SUPABASE_ANON_KEY) {
    console.warn('[cafeSupabase] CAFE_SUPABASE_URL / CAFE_SUPABASE_ANON_KEY missing');
    return null;
  }
  _client = createClient(CAFE_SUPABASE_URL, CAFE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 5 } },
  });
  // Realtime Authorization is enabled on the cafe project; private channels
  // require a JWT on the websocket. The anon key is itself a valid anon-role
  // JWT and matches the RLS policy on realtime.messages (see backend SQL).
  _client.realtime.setAuth(CAFE_SUPABASE_ANON_KEY);
  return _client;
}

/**
 * Subscribe to live menu-availability events.
 * Callback shape: ({ type, itemIds?: string[], itemId?: string }) => void
 * Returns an unsubscribe function.
 */
export function subscribeMenuAvailability(onEvent) {
  const supa = getCafeSupabase();
  if (!supa) return () => {};
  const channel = supa
    .channel('menu:availability', { config: { private: true } })
    .on('broadcast', { event: 'ITEM_AVAILABLE' }, ({ payload }) =>
      onEvent?.({ type: 'AVAILABLE', itemId: payload?.itemId, itemIds: payload?.itemIds }))
    .on('broadcast', { event: 'ITEMS_UNAVAILABLE' }, ({ payload }) =>
      onEvent?.({ type: 'UNAVAILABLE', itemIds: payload?.itemIds }))
    .on('broadcast', { event: 'MENU_UPDATED' }, () =>
      onEvent?.({ type: 'REFRESH' }))
    .subscribe((status, err) => {
      if (status !== 'SUBSCRIBED') {
        console.warn('[realtime] menu:availability status:', status, err);
      }
    });
  return () => { try { supa.removeChannel(channel); } catch (_) {} };
}

/**
 * Subscribe to a specific order's status updates (used by the persistent
 * ActiveOrderBar once we know the orderId).
 * Callback: ({ status, cancelled?: true, reason? }) => void
 * Returns an unsubscribe function.
 */
export function subscribeOrderById(orderId, onEvent) {
  const supa = getCafeSupabase();
  if (!supa || !orderId) return () => {};
  const channel = supa
    .channel(`orders:order:${orderId}`, { config: { private: true } })
    .on('broadcast', { event: 'ORDER_STATUS' }, ({ payload }) =>
      onEvent?.({ status: payload?.status }))
    .on('broadcast', { event: 'ORDER_CANCELLED' }, ({ payload }) =>
      onEvent?.({ status: 'CANCELLED', cancelled: true, reason: payload?.reason }))
    .subscribe((status, err) => {
      if (status !== 'SUBSCRIBED') {
        console.warn('[realtime] orderById status:', status, err);
      }
    });
  return () => { try { supa.removeChannel(channel); } catch (_) {} };
}

/**
 * Discovery channel — fires for ANY order of this customer. Used by the
 * ActiveOrderBar only when no local active order is known (e.g. user placed
 * an order on another device). Once the bar learns an orderId from this
 * channel it should switch to subscribeOrderById.
 */
export function subscribeOrderCustomer(customerId, onEvent) {
  const supa = getCafeSupabase();
  if (!supa || !customerId) return () => {};
  const channel = supa
    .channel(`orders:customer:${customerId}`, { config: { private: true } })
    .on('broadcast', { event: 'ORDER_STATUS' }, ({ payload }) =>
      onEvent?.({ orderId: payload?.orderId, status: payload?.status }))
    .subscribe((status, err) => {
      if (status !== 'SUBSCRIBED') {
        console.warn('[realtime] orderCustomer status:', status, err);
      }
    });
  return () => { try { supa.removeChannel(channel); } catch (_) {} };
}
