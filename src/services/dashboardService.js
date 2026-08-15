/**
 * dashboardService.js — B.1/B.6 member Activity Dashboard.
 */
import api from './apiService';

const localIsoDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const fetchDashboard = async (period = 'month') => {
  const { data } = await api.get('/member/dashboard', { params: { period, date: localIsoDate() } });
  return data.data;
};
