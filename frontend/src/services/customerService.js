import { api } from './api';
import axios from 'axios';

export const customerService = {
  async getPaginated(params = {}) {
    const response = await api.get('/customer/page', { params });
    return response.data;
  },
  async getAll() {
    const response = await api.get('/customer');
    return response.data;
  },
  async getById(id) {
    const response = await api.get(`/customer/${id}`);
    return response.data;
  },
  async getByUuid(uuid) {
    const response = await api.get(`/customer/uuid/${uuid}`);
    return response.data;
  },
  async create(data) {
    const response = await api.post('/customer', data);
    return response.data;
  },
  async update(id, data) {
    const response = await api.put(`/customer/${id}`, data);
    return response.data;
  },
  async delete(id) {
    const response = await api.delete(`/customer/${id}`);
    return response.data;
  },
  async enableMobile(id) {
    const response = await api.post(`/customer/${id}/enable-mobile`);
    return response.data;
  },
  async getMe() {
    const response = await api.get('/customer/me');
    return response.data;
  },
  async getPhotoPresignedUrl(id, fileExtension, contentType) {
    const response = await api.post(`/customer/${id}/photo/presigned-url`, {
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
    const response = await api.post(`/customer/${id}/photo/confirm`, {
      objectKey,
    });
    return response.data; // { customer, signedUrl }
  },
  async uploadPhoto(id, imageBase64, extension, contentType) {
    const response = await api.post(`/customer/${id}/photo`, {
      imageBase64,
      extension,
      contentType,
    });
    return response.data;
  },
};
