import axios from 'axios';
import { api } from './api';

type Id = number | string;

export const eatService = {
  async getPaginated(params: object = {}) {
    const response = await api.get('/eat/page', { params });
    return response.data;
  },
  async getAll() {
    const response = await api.get('/eat');
    return response.data;
  },
  async getById(id: Id) {
    const response = await api.get(`/eat/${id}`);
    return response.data;
  },
  async create(data: object) {
    const response = await api.post('/eat', data);
    return response.data;
  },
  async update(id: Id, data: object) {
    const response = await api.put(`/eat/${id}`, data);
    return response.data;
  },
  async delete(id: Id) {
    const response = await api.delete(`/eat/${id}`);
    return response.data;
  },
  async incrementViews(id: Id) {
    const response = await api.post(`/eat/${id}/view`);
    return response.data;
  },
  async incrementAdditions(id: Id) {
    const response = await api.post(`/eat/${id}/add`);
    return response.data;
  },
  async getPhotoPresignedUrl(id: Id, fileExtension: string, contentType?: string) {
    const response = await api.post(`/eat/${id}/photo/presigned-url`, {
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
    const response = await api.post(`/eat/${id}/photo/confirm`, {
      objectKey,
    });
    return response.data; // { eat, signedUrl }
  },
  async uploadPhoto(id: Id, data: object) {
    const response = await api.post(`/eat/${id}/photo`, data);
    return response.data;
  },
};
