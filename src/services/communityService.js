/**
 * communityService.js
 *
 * All community API calls. Uses the authenticated `api` instance
 * so the JWT refresh interceptor applies automatically.
 */

import api from './apiService';

// ── Posts ────────────────────────────────────────────────────────────────────

/** GET /api/community/posts — paginated feed. */
export const fetchCommunityPosts = async ({ sort = 'new', page = 1 } = {}) => {
  const { data } = await api.get('/community/posts', { params: { sort, page } });
  return data; // { success, data: [], page }
};

/** GET /api/community/posts/:id — single post with poll data. */
export const fetchCommunityPost = async (postId) => {
  const { data } = await api.get(`/community/posts/${postId}`);
  return data.data;
};

/** POST /api/community/posts — create a text/image post. */
export const createCommunityPost = async ({ body, category, image, isPoll, options }) => {
  if (image) {
    const formData = new FormData();
    formData.append('body', body);
    formData.append('category', category);
    if (isPoll) {
      formData.append('is_poll', 'true');
      formData.append('options', JSON.stringify(options));
    }
    formData.append('image', {
      uri: image.uri,
      // expo-image-picker returns `mimeType` (e.g. 'image/jpeg').
      // `image.type` is just the asset category ('image'), not a MIME type.
      type: image.mimeType || 'image/jpeg',
      name: image.fileName || image.uri.split('/').pop() || 'photo.jpg',
    });
    // Explicit 'multipart/form-data' overrides the Axios instance default
    // ('application/json'). React Native's XHR appends the boundary automatically.
    const { data } = await api.post('/community/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  }

  const payload = { body, category };
  if (isPoll) {
    payload.is_poll = true;
    payload.options = options;
  }
  const { data } = await api.post('/community/posts', payload);
  return data.data;
};

/** DELETE /api/community/posts/:id */
export const deleteCommunityPost = async (postId) => {
  const { data } = await api.delete(`/community/posts/${postId}`);
  return data;
};

// ── Voting ───────────────────────────────────────────────────────────────────

/** POST /api/community/posts/:id/vote — upvote or downvote. */
export const votePost = async (postId, type) => {
  const { data } = await api.post(`/community/posts/${postId}/vote`, { type });
  return data.data; // { upvotes, downvotes }
};

/** DELETE /api/community/posts/:id/vote — remove vote. */
export const removePostVote = async (postId) => {
  const { data } = await api.delete(`/community/posts/${postId}/vote`);
  return data;
};

/** POST /api/community/comments/:id/vote — vote on comment. */
export const voteComment = async (commentId, type) => {
  const { data } = await api.post(`/community/comments/${commentId}/vote`, { type });
  return data.data;
};

// ── Comments ─────────────────────────────────────────────────────────────────

/** GET /api/community/posts/:id/comments */
export const fetchComments = async (postId) => {
  const { data } = await api.get(`/community/posts/${postId}/comments`);
  return data.data;
};

/** POST /api/community/posts/:id/comments */
export const addComment = async (postId, body) => {
  const { data } = await api.post(`/community/posts/${postId}/comments`, { body });
  return data.data;
};

/** DELETE /api/community/comments/:id */
export const deleteComment = async (commentId) => {
  const { data } = await api.delete(`/community/comments/${commentId}`);
  return data;
};

// ── Reports ──────────────────────────────────────────────────────────────────

/** POST /api/community/posts/:id/report */
export const reportPost = async (postId, reason) => {
  const { data } = await api.post(`/community/posts/${postId}/report`, { reason });
  return data;
};

// ── Members ──────────────────────────────────────────────────────────────────

/** GET /api/community/members — all opted-in members */
export const fetchCommunityMembers = async () => {
  const { data } = await api.get('/community/members');
  return data.data;
};

// ── Polls ────────────────────────────────────────────────────────────────────

/** POST /api/community/polls/:postId/vote */
export const votePoll = async (postId, optionId) => {
  const { data } = await api.post(`/community/polls/${postId}/vote`, { optionId });
  return data.data;
};
