import { api } from './api';

type Id = number | string;

export const mealAnalysisService = {
  async analyzePhoto(formData: FormData) {
    const response = await api.post('/v1/meals/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  async analyzeManual(data: object) {
    const response = await api.post('/v1/meals/analyze/manual', data);
    return response.data;
  },
  async getAnalysis(analysisId: Id) {
    const response = await api.get(`/v1/meals/analyze/${analysisId}`);
    return response.data;
  },
};
