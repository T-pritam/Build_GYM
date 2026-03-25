/**
 * socketService.js
 *
 * Singleton Socket.io client for BuildGym.
 * Manages both café order and wallet real-time subscriptions.
 *
 * Usage:
 *   import { getSocket } from './socketService';
 *   const socket = getSocket();
 *   socket.emit('join:wallet', userId);
 *   socket.on('wallet:balance_updated', ({ balance, delta }) => { ... });
 */

import { io } from 'socket.io-client';
import { BASE_API_URL } from '@env';

// Strip /api suffix to get the base server URL
const SOCKET_URL = BASE_API_URL.replace(/\/api\/?$/, '');

let socket = null;

/**
 * Returns the singleton Socket.io instance.
 * Creates and connects on first call.
 */
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] Disconnected:', reason);
    });
  }
  return socket;
}

/**
 * Disconnect and destroy the socket.
 * Call on logout.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
