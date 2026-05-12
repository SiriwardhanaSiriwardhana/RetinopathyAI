import { useState, useEffect } from 'react';
import { patientsAPI, scansAPI } from '../api';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Calendar,
  Phone,
  Mail,
  Activity,
  Clock,
  Eye,
  FileText,
} from 'lucide-react';
import type { Patient, RetinalScan } from '../types';
import '../styles/patient-detail.css';

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [scans, setScans] = useState<RetinalScan[]>([]);

  useEffect(() => {
    if (id) {
      patientsAPI.getById(id).then(setPatient).catch(console.error);
      scansAPI.getByPatientId(id).then((data) => {
        // Normalize field names
        const normalized = data.map((s: any) => ({
          ...s,
          imageId: s.imageId || s.id,
          imagePath: s.imagePath || s.image_path || '',
          uploadDate: s.uploadDate || s.upload_date || '',
          patientId: s.patientId || s.patient_id || id,
          status: s.status || 'pending',
        }));
        setScans(normalized);
      }).catch(console.error);
    }
  }, [id]);

  if (!patient) return (
    <div className="patient-detail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
      <p>Loading patient...</p>
    </div>
  );

  const getStatusBadge = (status: string) => {
    if (status === 'analyzed') return 'badge-success';
    if (status === 'failed') return 'badge-error';
    return 'badge-warning';
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
            onClick={() => navigate('/scan/upload', { state: { patientId: id, patientName: patient.name } })}
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

      {/* Scans Table */}
      <div className="table-card">
        {scans.length === 0 ? (
          <div className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
            <Eye size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ color: '#9ca3af' }}>No scans uploaded yet</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 12 }}
              onClick={() => navigate('/scan/upload', { state: { patientId: id, patientName: patient.name } })}
            >
              <Upload size={16} /> Upload First Scan
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Scan ID</th>
                <th>Upload Date &amp; Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.imageId}>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>#{scan.imageId?.toString().slice(0, 8)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} style={{ color: '#6b7280' }} />
                      {scan.uploadDate ? (
                        <span>
                          {new Date(scan.uploadDate).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                          <span style={{ color: '#9ca3af', marginLeft: 8, fontSize: '0.85em' }}>
                            {new Date(scan.uploadDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </span>
                      ) : '—'}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(scan.status || '')}`}>
                      {scan.status || 'pending'}
                    </span>
                  </td>
                  <td>
                    {scan.status === 'analyzed' ? (
                      <button
                        className="btn btn-sm btn-outline"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => navigate(`/diagnosis/${scan.imageId}`)}
                      >
                        <FileText size={14} /> View Report
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>Pending analysis</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
