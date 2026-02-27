// User types
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'doctor' | 'admin' | 'staff';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: string;
}

// Patient types
export interface Patient {
  id: number;
  name: string;
  age: number;
  gender: string;
  diabetesType: string;
  phone: string;
  email: string;
  createdAt: string;
}

export interface PatientFormData {
  name: string;
  age: number;
  gender: string;
  diabetesType: string;
  phone: string;
  email: string;
}

// Scan types
export interface RetinalScan {
  imageId: number;
  patientId: number;
  patientName: string;
  imagePath: string;
  uploadDate: string;
  status: 'pending' | 'analyzed' | 'failed';
}

// Diagnosis types
export type DRStage = 'No DR' | 'Mild' | 'Moderate' | 'Severe' | 'Proliferative DR';

export interface Diagnosis {
  reportId: number;
  imageId: number;
  patientId: number;
  patientName: string;
  drStage: DRStage;
  confidence: number;
  findings: string[];
  recommendations: string;
  heatmapPath?: string;
  createdDate: string;
}

// Dashboard
export interface DashboardStats {
  totalPatients: number;
  totalScans: number;
  scansToday: number;
  criticalCases: number;
  drDistribution: { stage: string; count: number }[];
  recentScans: RetinalScan[];
  monthlyScans: { month: string; count: number }[];
}
