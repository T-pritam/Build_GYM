import api from './apiService';

/**
 * Upload or replace the authenticated user's profile photo.
 *
 * @param {string} imageUri - Local file URI from ImagePicker result
 * @returns {Promise<{ profilePhotoUrl: string }>}
 */
export async function uploadProfilePhoto(imageUri) {
  const formData = new FormData();
  formData.append('photo', {
    uri: imageUri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  });

  const { data } = await api.post('/profile/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data.data; // { profilePhotoUrl }
}

/**
 * Remove the authenticated user's profile photo.
 */
export async function removeProfilePhoto() {
  await api.delete('/profile/photo');
}
