import { api } from './api';

export const mealAnalysisService = {
  async analyzePhoto(formData) {
    const response = await api.post('/v1/meals/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  async analyzeManual(data) {
    const response = await api.post('/v1/meals/analyze/manual', data);
    return response.data;
  },
  async getAnalysis(analysisId) {
    const response = await api.get(`/v1/meals/analyze/${analysisId}`);
    return response.data;
  },
};
