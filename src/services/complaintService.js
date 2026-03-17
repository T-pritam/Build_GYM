import api from './apiService';

/**
 * Complaint / Ticket service for the Member (BuildGym) app.
 * All requests use the shared Axios instance which auto-attaches
 * the Authorization bearer token and handles 401 token refresh.
 */

/**
 * Submit a new complaint ticket.
 * @param {{ category: string, description: string, imageUrls?: string[] }} data
 */
export const submitComplaint = (data) =>
  api.post('/complaints', {
    category:   data.category,
    description: data.description,
    imageUrls:  data.imageUrls ?? [],
  });

/**
 * Fetch the authenticated member's own complaints, newest first (paginated).
 * @param {{ page?: number, limit?: number }} params
 */
export const getMyComplaints = ({ page = 1, limit = 15 } = {}) =>
  api.get('/complaints/my', { params: { page, limit } });

/**
 * Fetch a single complaint by ID.
 * Members can only retrieve their own complaints.
 * @param {string} id
 */
export const getComplaintById = (id) => api.get(`/complaints/${id}`);
