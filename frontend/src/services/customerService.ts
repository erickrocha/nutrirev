import axios from 'axios';
import { api } from './api';

type Id = number | string;

export const customerService = {
  async getPaginated(params: object = {}) {
    const response = await api.get('/customer/page', { params });
    return response.data;
  },
  async getAll() {
    const response = await api.get('/customer');
    return response.data;
  },
  async getById(id: Id) {
    const response = await api.get(`/customer/${id}`);
    return response.data;
  },
  async getByUuid(uuid: string) {
    const response = await api.get(`/customer/uuid/${uuid}`);
    return response.data;
  },
  async create(data: object) {
    const response = await api.post('/customer', data);
    return response.data;
  },
  async update(id: Id, data: object) {
    const response = await api.put(`/customer/${id}`, data);
    return response.data;
  },
  async delete(id: Id) {
    const response = await api.delete(`/customer/${id}`);
    return response.data;
  },
  async enableMobile(id: Id) {
    const response = await api.post(`/customer/${id}/enable-mobile`);
    return response.data;
  },
  async getMe() {
    const response = await api.get('/customer/me');
    return response.data;
  },
  async getPhotoPresignedUrl(id: Id, fileExtension: string, contentType?: string) {
    const response = await api.post(`/customer/${id}/photo/presigned-url`, {
      fileExtension,
      contentType,
    });
    return response.data; // { uploadUrl, objectKey }
  },
  async uploadPhotoDirect(uploadUrl: string, file: File, contentType?: string) {
    // Perform raw binary PUT directly to S3 / LocalStack
    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': contentType || file.type || 'image/jpeg',
      },
    });
  },
  async confirmPhotoUpload(id: Id, objectKey: string) {
    const response = await api.post(`/customer/${id}/photo/confirm`, {
      objectKey,
    });
    return response.data; // { customer, signedUrl }
  },
  async uploadPhoto(id: Id, imageBase64: string, extension: string, contentType?: string) {
    const response = await api.post(`/customer/${id}/photo`, {
      imageBase64,
      extension,
      contentType,
    });
    return response.data;
  },
};
