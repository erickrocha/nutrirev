import { api } from './api';

export const authService = {
  async login(email, password) {
    const formData = new URLSearchParams();
    formData.append('email', email);
    formData.append('password', password);

    const response = await api.post('/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  async refreshToken(refreshToken) {
    const response = await api.post('/refresh', { refreshToken });
    return response.data;
  },
};
