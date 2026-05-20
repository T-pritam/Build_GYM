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
    .channel('menu:availability')
    .on('broadcast', { event: 'ITEM_AVAILABLE' }, ({ payload }) =>
      onEvent?.({ type: 'AVAILABLE', itemId: payload?.itemId, itemIds: payload?.itemIds }))
    .on('broadcast', { event: 'ITEMS_UNAVAILABLE' }, ({ payload }) =>
      onEvent?.({ type: 'UNAVAILABLE', itemIds: payload?.itemIds }))
    .on('broadcast', { event: 'MENU_UPDATED' }, () =>
      onEvent?.({ type: 'REFRESH' }))
    .subscribe();
  return () => { try { supa.removeChannel(channel); } catch (_) {} };
}
