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
const mapPatient = (data: any): Patient => ({
  id: data.id,
  name: data.name,
  age: data.age,
  gender: data.gender,
  diabetesType: data.diabetes_type,
  phone: data.phone,
  email: data.email,
  createdAt: data.created_at,
});

const mapPatientToBackend = (p: any) => ({
  name: p.name,
  age: p.age,
  gender: p.gender,
  diabetes_type: p.diabetesType,
  phone: p.phone,
  email: p.email,
});

export const patientsAPI = {
  getAll: async () => {
    const { data } = await api.get<any[]>('/patients/');
    return data.map(mapPatient);
  },

  getById: async (id: string) => {
    const { data } = await api.get<any>(`/patients/${id}`);
    return mapPatient(data);
  },

  create: async (patient: PatientFormData) => {
    const { data } = await api.post<any>('/patients/', mapPatientToBackend(patient));
    return mapPatient(data);
  },

  update: async (id: string, patient: Partial<PatientFormData>) => {
    const { data } = await api.put<any>(`/patients/${id}`, mapPatientToBackend(patient));
    return mapPatient(data);
  },

  delete: async (id: string) => {
    await api.delete(`/patients/${id}`);
  },
};

// ─── Scans ───────────────────────────────────────────────
export const scansAPI = {
  upload: async (patientId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<RetinalScan>(`/scans/upload?patient_id=${patientId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<any>(`/scans/${id}`);
    return {
      ...data,
      imagePath: data.image_path || data.imagePath,
      uploadDate: data.upload_date || data.uploadDate,
      patientId: data.patient_id || data.patientId,
    };
  },

  getAll: async () => {
    const { data } = await api.get<RetinalScan[]>('/scans/');
    return data;
  },

  getByPatient: async (patientId: number) => {
    const { data } = await api.get<RetinalScan[]>(`/scans?patientId=${patientId}`);
    return data;
  },

  getByPatientId: async (patientId: string) => {
    const { data } = await api.get<any[]>(`/scans/by-patient/${patientId}`);
    return data;
  },
};

// ─── AI Prediction ───────────────────────────────────────
export const predictionAPI = {
  predict: async (scanId: string) => {
    const { data } = await api.post<Diagnosis>(`/predict?scan_id=${scanId}`);
    return data;
  },

  getReport: async (reportId: string) => {
    const { data } = await api.get<Diagnosis>(`/diagnosis/${reportId}`);
    return data;
  },

  getDiagnosisByScanId: async (scanId: string) => {
    const { data } = await api.get<any>(`/diagnosis/scan/${scanId}`);
    return data;
  },

  getByPatient: async (patientId: number) => {
    const { data } = await api.get<Diagnosis[]>(`/diagnosis?patientId=${patientId}`);
    return data;
  },
};

// ─── Prescriptions ───────────────────────────────────────
export const prescriptionsAPI = {
  create: async (payload: {
    scan_id: string;
    diagnosis_id: string;
    doctor_notes: string;
    medicines: Array<{ name: string; dosage: string; frequency: string; duration: string; notes: string }>;
  }) => {
    const { data } = await api.post<any>('/prescriptions/', payload);
    return data;
  },

  getByDiagnosis: async (diagnosisId: string) => {
    const { data } = await api.get<any>(`/prescriptions/${diagnosisId}`);
    return data;
  },

  getAiSuggestion: async (scanId: string) => {
    const { data } = await api.get<any>(`/prescriptions/ai-suggestion/${scanId}`);
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
