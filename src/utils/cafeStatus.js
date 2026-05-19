/**
 * cafeStatus.js
 *
 * Maps the cafe backend's full order-status enum onto the gym customer app's
 * existing 5-step timeline: placed → accepted → preparing → ready → complete.
 *
 * Cafe statuses:
 *   PAYMENT_PENDING, KOT_GENERATED, NEW, PREPARING, READY,
 *   PICKUP_CLAIMED, OUT_FOR_DELIVERY, DELIVERED, COMPLETED, CANCELLED
 */

export const GYM_STEPS = ['placed', 'accepted', 'preparing', 'ready', 'complete'];

const MAP = {
  PAYMENT_PENDING:  { step: 'placed',     label: 'Confirming payment' },
  KOT_GENERATED:    { step: 'placed',     label: 'Order received' },
  NEW:              { step: 'accepted',   label: 'Accepted by kitchen' },
  PREPARING:        { step: 'preparing',  label: 'Being prepared' },
  READY:            { step: 'ready',      label: 'Ready for pickup' },
  PICKUP_CLAIMED:   { step: 'ready',      label: 'Captain assigned' },
  OUT_FOR_DELIVERY: { step: 'ready',      label: 'On the way' },
  DELIVERED:        { step: 'complete',   label: 'Delivered' },
  COMPLETED:        { step: 'complete',   label: 'Completed' },
  CANCELLED:        { step: 'cancelled',  label: 'Cancelled' },
};

export function mapCafeStatus(cafeStatus) {
  return MAP[cafeStatus] || { step: 'placed', label: cafeStatus };
}

export function isTerminalCafeStatus(cafeStatus) {
  return ['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(cafeStatus);
}

export const STATUS_COLOR = {
  placed:    '#3B82F6',
  accepted:  '#3B82F6',
  preparing: '#F59E0B',
  ready:     '#16A34A',
  complete:  '#6B7280',
  cancelled: '#DC2626',
};
