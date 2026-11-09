import { api } from './api';

type Id = number | string;

export const userService = {
  async getUsers() {
    const response = await api.get('/user');
    return response.data;
  },

  async getUserById(id: Id) {
    const response = await api.get(`/user/${id}`);
    return response.data;
  },

  async createUser(userData: object) {
    const response = await api.post('/user', userData);
    return response.data;
  },

  async updateUser(id: Id, userData: object) {
    const response = await api.put(`/user/${id}`, userData);
    return response.data;
  },
};
