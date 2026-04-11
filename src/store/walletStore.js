/**
 * walletStore.js
 *
 * Zustand store for the Build Coins wallet.
 *
 * State:
 *   balance      — current coin balance (number)
 *   transactions — loaded transaction history (array)
 *   nextCursor   — cursor for the next page of transactions
 *   hasMore      — whether more transaction pages exist
 *   isLoading    — balance fetch in flight
 *   isTxnLoading — transactions fetch in flight
 *
 * Actions:
 *   fetchBalance()       — load/refresh current balance from API
 *   setBalance(n)        — set balance directly (used by real-time socket updates)
 *   applyDelta(delta)    — increment or decrement balance (optimistic / socket-driven)
 *   fetchTransactions()  — load first page of transactions
 *   fetchMoreTransactions() — append next page
 *   reset()              — clear state on logout
 */

import { create } from 'zustand';
import RazorpayCheckout from 'react-native-razorpay';
import {
  fetchBalance as apiFetchBalance,
  fetchTransactions as apiFetchTransactions,
  purchasePackage as apiPurchasePackage,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from '../services/walletService';

export const useWalletStore = create((set, get) => ({
  balance: 0,
  transactions: [],
  nextCursor: null,
  hasMore: false,
  isLoading: false,
  isTxnLoading: false,
  error: null,

  /**
   * Fetch current balance from API and update store.
   */
  fetchBalance: async () => {
    set({ isLoading: true, error: null });
    try {
      const wallet = await apiFetchBalance();
      set({ balance: wallet.balance, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err?.response?.data?.message ?? 'Failed to load balance' });
    }
  },

  /**
   * Directly set balance (called from socket event handler).
   */
  setBalance: (balance) => set({ balance }),

  /**
   * Apply a signed delta to the balance (positive = credit, negative = debit).
   */
  applyDelta: (delta) => set((state) => ({ balance: Math.max(0, state.balance + delta) })),

  /**
   * Load the first page of transaction history.
   */
  fetchTransactions: async () => {
    set({ isTxnLoading: true, error: null });
    try {
      const result = await apiFetchTransactions({ limit: 20 });
      set({
        transactions: result.data,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
        isTxnLoading: false,
      });
    } catch (err) {
      set({ isTxnLoading: false, error: err?.response?.data?.message ?? 'Failed to load transactions' });
    }
  },

  /**
   * Append the next page of transactions (infinite scroll).
   */
  fetchMoreTransactions: async () => {
    const { nextCursor, hasMore, isTxnLoading } = get();
    if (!hasMore || isTxnLoading) return;

    set({ isTxnLoading: true });
    try {
      const result = await apiFetchTransactions({ limit: 20, cursor: nextCursor });
      set((state) => ({
        transactions: [...state.transactions, ...result.data],
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
        isTxnLoading: false,
      }));
    } catch {
      set({ isTxnLoading: false });
    }
  },

  /**
   * Buy a coin package (cash at gym counter).
   * Updates balance immediately and resets transaction history
   * so the next scroll loads the fresh CREDIT row from the top.
   * Returns { balance, coinsAdded, package } — caller shows receipt.
   */
  purchasePackage: async (packageId) => {
    const result = await apiPurchasePackage(packageId);
    set({ balance: result.balance, transactions: [], nextCursor: null, hasMore: false });
    return result;
  },

  /**
   * Buy a coin package via Razorpay online payment.
   * Orchestrates the full flow:
   *   1. Backend creates a Razorpay order
   *   2. Native Razorpay checkout sheet opens
   *   3. Backend verifies the HMAC signature and credits coins
   *
   * @param {string} packageId
   * @param {{ phone?: string, name?: string }} userInfo - pre-fills Razorpay checkout
   * @returns {{ newBalance: number, coinsAdded: number }}
   * @throws Razorpay SDK throws { code: 'PAYMENT_CANCELLED' } on dismiss
   */
  purchaseWithRazorpay: async (packageId, userInfo = {}) => {
    // 1. Create order on backend
    const orderData = await createRazorpayOrder(packageId);

    // 2. Open Razorpay checkout (native UI)
    const paymentData = await RazorpayCheckout.open({
      description: 'Build Coins Purchase',
      currency:    orderData.currency,
      key:         orderData.keyId,
      amount:      String(orderData.amountPaise),
      order_id:    orderData.razorpayOrderId,
      name:        'BuildGym',
      prefill: {
        contact: userInfo.phone ?? '',
        name:    userInfo.name  ?? '',
      },
      theme: { color: '#E96316' },
    });
    // paymentData = { razorpay_payment_id, razorpay_order_id, razorpay_signature }

    // 3. Verify on backend — coins credited here
    const result = await verifyRazorpayPayment({
      razorpayOrderId:   paymentData.razorpay_order_id,
      razorpayPaymentId: paymentData.razorpay_payment_id,
      razorpaySignature: paymentData.razorpay_signature,
    });

    set({ balance: result.newBalance, transactions: [], nextCursor: null, hasMore: false });
    return result;
  },

  /**
   * Reset all wallet state. Called on logout.
   */
  reset: () => set({
    balance: 0,
    transactions: [],
    nextCursor: null,
    hasMore: false,
    isLoading: false,
    isTxnLoading: false,
    error: null,
  }),
}));
