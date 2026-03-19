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

/**
 * Upload images for an existing complaint (multipart/form-data).
 * @param {string} complaintId
 * @param {Array<{ uri: string, fileName?: string, mimeType?: string }>} imageAssets
 */
export const uploadComplaintImages = (complaintId, imageAssets) => {
  const formData = new FormData();
  imageAssets.forEach((asset, index) => {
    const uri = asset.uri;
    const ext = (uri.split('.').pop() || 'jpg').toLowerCase();
    const mimeMap = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      webp: 'image/webp', gif: 'image/gif', avif: 'image/avif',
      heic: 'image/heic', heif: 'image/heif',
    };
    formData.append('images', {
      uri,
      name: asset.fileName || `image_${index}.${ext}`,
      type: asset.mimeType || mimeMap[ext] || 'image/jpeg',
    });
  });
  return api.post(`/complaints/${complaintId}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
