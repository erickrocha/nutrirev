import { api } from './api';

export const userService = {
  async getUsers() {
    const response = await api.get('/user');
    return response.data;
  },

  async getUserById(id) {
    const response = await api.get(`/user/${id}`);
    return response.data;
  },

  async createUser(userData) {
    const response = await api.post('/user', userData);
    return response.data;
  },

  async updateUser(id, userData) {
    const response = await api.put(`/user/${id}`, userData);
    return response.data;
  },
};
