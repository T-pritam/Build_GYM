import api from './apiService';

// ── Exercise Library ─────────────────────────────────────────────────────────

export const fetchExercises = async (muscleGroup) => {
  const params = muscleGroup ? { muscle_group: muscleGroup } : {};
  const { data } = await api.get('/exercises', { params });
  return data.data;
};

export const fetchExerciseById = async (id) => {
  const { data } = await api.get(`/exercises/${id}`);
  return data.data;
};

// ── Workout Plans (member endpoints) ─────────────────────────────────────────

export const fetchMyPlans = async () => {
  const { data } = await api.get('/member/plans');
  return data.data;
};

export const fetchTodaysPlan = async () => {
  const { data } = await api.get('/member/plans/today');
  return data.data;
};

// ── Workout Logs ─────────────────────────────────────────────────────────────

// Returns today's in_progress workout log (with preloaded sets), or null
export const fetchActiveWorkout = async (planId) => {
  const params = planId ? { planId } : {};
  const { data } = await api.get('/member/workouts/active', { params });
  return data.data; // null if no active session
};

export const startWorkout = async (body) => {
  // body: { planId } for Case A  OR  { muscleGroups: [...] } for Case B
  const { data } = await api.post('/member/workouts/start', body);
  return data.data;
};

export const logSet = async (workoutId, body) => {
  // body: { exerciseId, setNumber, actualWeight, actualReps, setType }
  const { data } = await api.post(`/member/workouts/${workoutId}/sets`, body);
  return data;
};

export const getWorkoutSets = async (workoutId) => {
  const { data } = await api.get(`/member/workouts/${workoutId}/sets`);
  return data.data;
};

export const completeWorkout = async (workoutId) => {
  const { data } = await api.patch(`/member/workouts/${workoutId}/complete`);
  return data;
};

export const fetchWorkoutHistory = async (params = {}) => {
  const { data } = await api.get('/member/workouts', { params });
  return data.data;
};

export const fetchWorkoutDetail = async (id) => {
  const { data } = await api.get(`/member/workouts/${id}`);
  return data.data;
};

export const fetchWeeklySummary = async () => {
  const { data } = await api.get('/member/workouts/summary/weekly');
  return data.data;
};

// ── Stats / KPIs ─────────────────────────────────────────────────────────────

export const fetchKPIs = async () => {
  const { data } = await api.get('/member/stats/kpis');
  return data.data;
};

export const fetchMuscleDistribution = async () => {
  const { data } = await api.get('/member/stats/muscle-distribution');
  return data.data;
};

export const fetchActivityRings = async () => {
  const { data } = await api.get('/member/stats/activity-rings');
  return data.data;
};

export const fetchPersonalRecords = async () => {
  const { data } = await api.get('/member/stats/prs');
  return data.data;
};

export const fetchExercisePRs = async (exerciseId) => {
  const { data } = await api.get(`/member/stats/prs/${exerciseId}`);
  return data.data;
};

export const fetchStreak = async () => {
  const { data } = await api.get('/member/streak');
  return data.data;
};

export const fetchRingGoals = async () => {
  const { data } = await api.get('/member/ring-goals');
  return data.data;
};

export const updateRingGoals = async (body) => {
  const { data } = await api.put('/member/ring-goals', body);
  return data.data;
};

// ── Nudges ───────────────────────────────────────────────────────────────────

export const fetchNudges = async (context) => {
  const { data } = await api.get('/member/nudges', { params: { context } });
  return data.data;
};

export const dismissNudge = async (type) => {
  await api.post(`/member/nudges/${type}/dismiss`);
};

export const convertNudge = async (type) => {
  await api.post(`/member/nudges/${type}/convert`);
};
