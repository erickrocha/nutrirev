import { api } from './api';
import type { StoredSession } from '../utils/authStorage';

export const authService = {
  async login(email: string, password: string): Promise<StoredSession> {
    const form = new URLSearchParams();
    form.append('email', email);
    form.append('password', password);
    const response = await api.post('/login', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return response.data;
  },

  async refreshToken(refreshToken: string): Promise<StoredSession> {
    const response = await api.post('/refresh', { refreshToken });
    return response.data;
  },
};
