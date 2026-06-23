/**
 * blogService.js
 *
 * All blog API calls. Uses the authenticated `api` instance
 * so the JWT refresh interceptor applies automatically.
 */

import api from './apiService';

/**
 * GET /api/blogs
 * Paginated list of published blogs, optionally filtered by tag.
 * @param {{ cursor?: string, limit?: number, tag?: string }} opts
 */
export const fetchPublishedBlogs = async ({ cursor, limit = 20, tag } = {}) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  if (tag) params.tag = tag;
  const { data } = await api.get('/blogs', { params });
  return data; // { success, count, nextCursor, data: [] }
};

/**
 * GET /api/blogs/:slugOrId
 * Fetch a single published blog by slug or UUID.
 */
export const fetchBlogBySlug = async (slugOrId) => {
  const { data } = await api.get(`/blogs/${slugOrId}`);
  return data.data;
};

/**
 * POST /api/blogs/:id/vote
 * Toggle upvote/downvote on a blog.
 * @param {string} blogId
 * @param {'upvote'|'downvote'} type
 */
export const voteBlog = async (blogId, type) => {
  const { data } = await api.post(`/blogs/${blogId}/vote`, { type });
  return data.data; // { upvotes, downvotes, userVote }
};

/**
 * GET /api/blogs/:id/comments
 * Paginated comment list for a blog.
 * @param {string} blogId
 * @param {{ page?: number, limit?: number }} opts
 */
export const fetchBlogComments = async (blogId, { page = 1, limit = 20 } = {}) => {
  const { data } = await api.get(`/blogs/${blogId}/comments`, { params: { page, limit } });
  return data; // { success, data: [], pagination }
};

/**
 * POST /api/blogs/:id/comments
 * Post a comment on a blog.
 * @param {string} blogId
 * @param {string} content
 */
export const postBlogComment = async (blogId, content) => {
  const { data } = await api.post(`/blogs/${blogId}/comments`, { content });
  return data.data;
};

/**
 * POST /api/blogs/:id/bookmark
 * Toggle a blog bookmark (save/unsave) for the current user.
 * @param {string} blogId
 * @returns {Promise<{ bookmarked: boolean }>}
 */
export const toggleBlogBookmark = async (blogId) => {
  const { data } = await api.post(`/blogs/${blogId}/bookmark`);
  return data.data; // { bookmarked }
};

/**
 * GET /api/blogs/bookmarks
 * List the current user's saved blogs (for the "Saved Articles" sheet).
 * @returns {Promise<Array>} array of saved blog items
 */
export const fetchBookmarkedBlogs = async () => {
  const { data } = await api.get('/blogs/bookmarks');
  return data.data; // [ ... ]
};
