import axios from 'axios';
import type {
  LoginCredentials,
  RegisterData,
  User,
  Patient,
  PatientFormData,
  RetinalScan,
  Diagnosis,
  DashboardStats,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────
export const authAPI = {
  login: async (credentials: LoginCredentials) => {
    const { data } = await api.post<{ token: string; user: User }>('/auth/login', credentials);
    return data;
  },

  register: async (userData: RegisterData) => {
    const { data } = await api.post<{ token: string; user: User }>('/auth/register', userData);
    return data;
  },

  getMe: async () => {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },
};

// ─── Patients ────────────────────────────────────────────
export const patientsAPI = {
  getAll: async () => {
    const { data } = await api.get<Patient[]>('/patients');
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get<Patient>(`/patients/${id}`);
    return data;
  },

  create: async (patient: PatientFormData) => {
    const { data } = await api.post<Patient>('/patients', patient);
    return data;
  },

  update: async (id: number, patient: Partial<PatientFormData>) => {
    const { data } = await api.put<Patient>(`/patients/${id}`, patient);
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/patients/${id}`);
  },
};

// ─── Scans ───────────────────────────────────────────────
export const scansAPI = {
  upload: async (patientId: number, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('patientId', String(patientId));
    const { data } = await api.post<RetinalScan>('/scans/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get<RetinalScan>(`/scans/${id}`);
    return data;
  },

  getAll: async () => {
    const { data } = await api.get<RetinalScan[]>('/scans');
    return data;
  },

  getByPatient: async (patientId: number) => {
    const { data } = await api.get<RetinalScan[]>(`/scans?patientId=${patientId}`);
    return data;
  },
};

// ─── AI Prediction ───────────────────────────────────────
export const predictionAPI = {
  predict: async (imageId: number) => {
    const { data } = await api.post<Diagnosis>('/predict', { imageId });
    return data;
  },

  getReport: async (reportId: number) => {
    const { data } = await api.get<Diagnosis>(`/diagnosis/${reportId}`);
    return data;
  },

  getByPatient: async (patientId: number) => {
    const { data } = await api.get<Diagnosis[]>(`/diagnosis?patientId=${patientId}`);
    return data;
  },
};

// ─── Dashboard ───────────────────────────────────────────
export const dashboardAPI = {
  getStats: async () => {
    const { data } = await api.get<DashboardStats>('/dashboard/stats');
    return data;
  },
};

export default api;
