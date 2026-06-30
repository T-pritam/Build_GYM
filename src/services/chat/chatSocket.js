/**
 * chatSocket.js — singleton Socket.io client for the `/chat` namespace.
 *
 * Separate connection from the default-namespace socket (wallet/activity) so chat
 * auth/rooms stay isolated. JWT is supplied via the `auth` callback so it always
 * uses the CURRENT access token (survives token refresh on reconnect).
 *
 * Events (see backend src/sockets/chat.socket.js):
 *   emit  chat:join {threadId} / chat:leave {threadId} / chat:foreground {isForeground}
 *         chat:delivered {threadId, upToMessageId} / chat:read {threadId, upToMessageId}
 *   on    chat:message / chat:delivered / chat:read
 */
import { io } from 'socket.io-client';
import { BASE_API_URL } from '@env';
import { useAuthStore } from '../../store/authStore';

const SOCKET_URL = BASE_API_URL.replace(/\/api\/?$/, '');

let socket = null;

export function getChatSocket() {
  if (!socket) {
    socket = io(`${SOCKET_URL}/chat`, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      auth: (cb) => {
        const { accessToken } = useAuthStore.getState();
        cb({ token: accessToken ? `Bearer ${accessToken}` : '' });
      },
    });
    socket.on('connect', () => console.log('[chatSocket] connected', socket.id));
    socket.on('connect_error', (e) => console.log('[chatSocket] connect_error', e?.message));
    socket.on('disconnect', (r) => console.log('[chatSocket] disconnect', r));
  }
  return socket;
}

export function joinThread(threadId) { getChatSocket().emit('chat:join', { threadId }); }
export function leaveThread(threadId) { getChatSocket().emit('chat:leave', { threadId }); }
export function setForeground(isForeground) { getChatSocket().emit('chat:foreground', { isForeground }); }
export function emitDelivered(threadId, upToMessageId) { getChatSocket().emit('chat:delivered', { threadId, upToMessageId }); }
export function emitRead(threadId, upToMessageId) { getChatSocket().emit('chat:read', { threadId, upToMessageId }); }

export function disconnectChatSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}
