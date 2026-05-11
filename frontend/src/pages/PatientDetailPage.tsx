import { useState, useEffect } from 'react';
import { patientsAPI } from '../api';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Calendar,
  Phone,
  Mail,
  Activity,
} from 'lucide-react';
import type { Patient, RetinalScan, Diagnosis } from '../types';
import '../styles/patient-detail.css';

// Mock data
export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'scans' | 'diagnoses'>('scans');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [scans, setScans] = useState<RetinalScan[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);

  useEffect(() => {
    if (id) {
      patientsAPI.getById(id).then(setPatient).catch(console.error);
    }
  }, [id]);

  if (!patient) return <div className="patient-detail">Loading...</div>;

  const getSeverityColor = (stage: string) => {
    const colors: Record<string, string> = {
      'No DR': 'badge-success',
      Mild: 'badge-info',
      Moderate: 'badge-warning',
      Severe: 'badge-error',
      'Proliferative DR': 'badge-critical',
    };
    return colors[stage] || 'badge-default';
  };

  return (
    <div className="patient-detail">
      <button className="btn btn-outline back-btn" onClick={() => navigate('/patients')}>
        <ArrowLeft size={18} />
        Back to Patients
      </button>

      {/* Patient Info Card */}
      <div className="patient-info-card">
        <div className="patient-header">
          <div className="patient-avatar-lg">{patient.name.charAt(0)}</div>
          <div className="patient-header-info">
            <h1>{patient.name}</h1>
            <div className="patient-meta">
              <span>
                <Activity size={14} /> {patient.diabetesType}
              </span>
              <span>{patient.age} years old • {patient.gender}</span>
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/scan/upload')}
          >
            <Upload size={18} />
            New Scan
          </button>
        </div>

        <div className="patient-contact-row">
          <div className="contact-item">
            <Phone size={16} />
            <span>{patient.phone}</span>
          </div>
          <div className="contact-item">
            <Mail size={16} />
            <span>{patient.email}</span>
          </div>
          <div className="contact-item">
            <Calendar size={16} />
            <span>Registered: {new Date(patient.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'scans' ? 'active' : ''}`}
          onClick={() => setActiveTab('scans')}
        >
          Retinal Scans ({scans.length})
        </button>
        <button
          className={`tab ${activeTab === 'diagnoses' ? 'active' : ''}`}
          onClick={() => setActiveTab('diagnoses')}
        >
          Diagnosis Reports ({diagnoses.length})
        </button>
      </div>

      {/* Scans Tab */}
      {activeTab === 'scans' && (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Scan ID</th>
                <th>Upload Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.imageId}>
                  <td>#{scan.imageId.toString().padStart(4, '0')}</td>
                  <td>{new Date(scan.uploadDate).toLocaleDateString()}</td>
                  <td>
                    <span
                      className={`badge ${
                        scan.status === 'analyzed' ? 'badge-success' : 'badge-warning'
                      }`}
                    >
                      {scan.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => navigate(`/diagnosis/${scan.imageId}`)}
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Diagnoses Tab */}
      {activeTab === 'diagnoses' && (
        <div className="diagnoses-list">
          {diagnoses.map((d) => (
            <div key={d.reportId} className="diagnosis-card">
              <div className="diagnosis-card-header">
                <div>
                  <span className={`badge ${getSeverityColor(d.drStage)}`}>
                    {d.drStage}
                  </span>
                  <span className="confidence">
                    Confidence: {(d.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <span className="diagnosis-date">
                  {new Date(d.createdDate).toLocaleDateString()}
                </span>
              </div>
              <div className="diagnosis-findings">
                <strong>Findings:</strong>
                <ul>
                  {d.findings.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
              <p className="diagnosis-recommendations">
                <strong>Recommendation:</strong> {d.recommendations}
              </p>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => navigate(`/diagnosis/${d.reportId}`)}
              >
                Full Report
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
