/**
 * chatService.js — REST calls for the in-app chat (member app).
 * Uses the shared authenticated axios instance (auto Bearer + 401 refresh).
 * Response envelope is { success, data, ... }.
 */
import api from '../apiService';

export const listThreads = async () => {
  const { data } = await api.get('/chat/threads');
  return data.data; // [{ id, memberId, trainerId, state, unread, muted, lastMessagePreview, ... }]
};

export const getThread = async (threadId) => {
  const { data } = await api.get(`/chat/threads/${threadId}`);
  return data.data; // { thread, reads }
};

export const getMessages = async (threadId, { before, after, limit = 30 } = {}) => {
  const params = {};
  if (before) params.before = before;
  if (after) params.after = after;
  if (limit) params.limit = limit;
  const { data } = await api.get(`/chat/threads/${threadId}/messages`, { params });
  return data; // { success, messages, nextBefore, hasMore }
};

export const sendMessage = async (threadId, payload) => {
  // payload: { type, body?, objectKey?, clientMsgUuid }
  const { data } = await api.post(`/chat/threads/${threadId}/messages`, payload);
  return data.data; // the message
};

export const attachIntent = async (threadId, { mime, size, kind }) => {
  const { data } = await api.post(`/chat/threads/${threadId}/attachments/intent`, { mime, size, kind });
  return data.data; // { uploadUrl, objectKey, type }
};

export const getMedia = async (threadId, messageId) => {
  const { data } = await api.get(`/chat/threads/${threadId}/media/${messageId}`);
  return data.data; // { url, mime, size }
};

export const markRead = async (threadId, upToMessageId) => {
  await api.post(`/chat/threads/${threadId}/read`, { upToMessageId });
};

export const reportMessage = async (messageId, reason) => {
  const { data } = await api.post(`/chat/messages/${messageId}/report`, { reason });
  return data.data;
};

export const muteThread = async (threadId, duration) => {
  // duration: '8h' | '1w' | 'forever'
  const { data } = await api.post(`/chat/threads/${threadId}/mute`, { duration });
  return data.data;
};

export const unmuteThread = async (threadId) => {
  const { data } = await api.post(`/chat/threads/${threadId}/unmute`, {});
  return data.data;
};

export const getDisclosure = async () => {
  const { data } = await api.get('/chat/disclosure');
  return data.data.acked;
};

export const ackDisclosure = async () => {
  await api.post('/chat/disclosure/ack', {});
};
