/**
 * nutritionService.js — A.8 member nutrition plan + per-meal adherence (PT only).
 */
import api from './apiService';

export const fetchNutritionPlan = async (date) => {
  const { data } = await api.get('/nutrition/plan', { params: date ? { date } : {} });
  return data.data; // plan (with meals[].adherence) or null when no active plan
};

export const postMealAdherence = async ({ mealId, date, status }) => {
  const { data } = await api.post('/nutrition/adherence', { mealId, date, status });
  return data;
};
