import { api } from './api';
import axios from 'axios';

export const eatService = {
  async getPaginated(params = {}) {
    const response = await api.get('/eat/page', { params });
    return response.data;
  },
  async getAll() {
    const response = await api.get('/eat');
    return response.data;
  },
  async getById(id) {
    const response = await api.get(`/eat/${id}`);
    return response.data;
  },
  async create(data) {
    const response = await api.post('/eat', data);
    return response.data;
  },
  async update(id, data) {
    const response = await api.put(`/eat/${id}`, data);
    return response.data;
  },
  async delete(id) {
    const response = await api.delete(`/eat/${id}`);
    return response.data;
  },
  async incrementViews(id) {
    const response = await api.post(`/eat/${id}/view`);
    return response.data;
  },
  async incrementAdditions(id) {
    const response = await api.post(`/eat/${id}/add`);
    return response.data;
  },
  async getPhotoPresignedUrl(id, fileExtension, contentType) {
    const response = await api.post(`/eat/${id}/photo/presigned-url`, {
      fileExtension,
      contentType,
    });
    return response.data; // { uploadUrl, objectKey }
  },
  async uploadPhotoDirect(uploadUrl, file, contentType) {
    // Perform raw binary PUT directly to S3 / LocalStack
    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': contentType || file.type || 'image/jpeg',
      },
    });
  },
  async confirmPhotoUpload(id, objectKey) {
    const response = await api.post(`/eat/${id}/photo/confirm`, {
      objectKey,
    });
    return response.data; // { eat, signedUrl }
  },
  async uploadPhoto(id, data) {
    const response = await api.post(`/eat/${id}/photo`, data);
    return response.data;
  },
};
