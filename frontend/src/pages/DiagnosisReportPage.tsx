import { useState, useEffect } from 'react';
import { predictionAPI, scansAPI } from '../api';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Printer,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
} from 'lucide-react';
import type { Diagnosis } from '../types';
import '../styles/diagnosis-report.css';

// Mock diagnosis data
const mockDiagnosis: Diagnosis = {
  reportId: 1,
  imageId: 1,
  patientId: 1,
  patientName: 'Sarah Johnson',
  drStage: 'Moderate',
  confidence: 0.89,
  findings: [
    'Multiple microaneurysms detected in the macular region',
    'Hard exudates present near the fovea',
    'Dot and blot hemorrhages observed in the temporal quadrant',
    'No evidence of neovascularization',
  ],
  recommendations:
    'Schedule follow-up examination within 3 months. Consider referral for focal/grid laser treatment. Monitor blood glucose levels closely. Patient should maintain regular ophthalmologic visits.',
  heatmapPath: '',
  createdDate: '2026-02-27',
};

export default function DiagnosisReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { prediction, scan } = location.state || {};

  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [actualScan, setActualScan] = useState<any>(scan);

  useEffect(() => {
    if (id) {
      predictionAPI.getDiagnosisByScanId(id)
        .then((data) => {
          let stage = data.dr_stage || '';
          if (stage.includes('Mild')) stage = 'Mild';
          else if (stage.includes('Moderate')) stage = 'Moderate';
          else if (stage.includes('Severe')) stage = 'Severe';
          else if (stage.includes('Proliferative')) stage = 'Proliferative DR';
          else stage = 'No DR';

          setDiagnosis({
            reportId: data.id,
            imageId: id,
            patientId: data.patient_id || 1,
            patientName: 'Patient',
            drStage: stage,
            confidence: data.confidence,
            findings: data.details ? data.details.split('\n') : [],
            recommendations: 'Follow up according to clinical guidelines.',
            createdDate: data.created_at || new Date().toISOString().split('T')[0]
          });
        })
        .catch(console.error);
        
      if (!actualScan) {
        scansAPI.getById(id).then(setActualScan).catch(console.error);
      }
    }
  }, [id, actualScan]);

  if (!diagnosis) return <div className="diagnosis-report">Loading report...</div>;

  const getSeverityInfo = (stage: string) => {
    const info: Record<string, { color: string; bgColor: string; level: string; icon: any }> = {
      'No DR': { color: '#10b981', bgColor: '#ecfdf5', level: '0 - Normal', icon: CheckCircle },
      Mild: { color: '#3b82f6', bgColor: '#eff6ff', level: '1 - Mild NPDR', icon: Info },
      Moderate: { color: '#f59e0b', bgColor: '#fffbeb', level: '2 - Moderate NPDR', icon: AlertTriangle },
      Severe: { color: '#ef4444', bgColor: '#fef2f2', level: '3 - Severe NPDR', icon: AlertTriangle },
      'Proliferative DR': { color: '#7c3aed', bgColor: '#f5f3ff', level: '4 - PDR', icon: AlertTriangle },
    };
    return info[stage] || info['No DR'];
  };

  const severity = getSeverityInfo(diagnosis.drStage);
  const SeverityIcon = severity.icon;

  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/reports/${id}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Diagnostic_Report_${diagnosis.reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Failed to download PDF report.');
    }
  };

  const handleViewPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/reports/${id}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      alert('Failed to view PDF report.');
    }
  };

  return (
    <div className="diagnosis-report">
      <div className="report-top-bar">
        <button className="btn btn-outline" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Back
        </button>
        <div className="report-actions">
          <button className="btn btn-outline" onClick={handleViewPDF}>
            <Eye size={18} />
            View PDF
          </button>
          <button className="btn btn-primary" onClick={handleDownloadPDF}>
            <Download size={18} />
            Download PDF
          </button>
        </div>
      </div>

      {/* Report Header */}
      <div className="report-card report-header-card">
        <div className="report-title-section">
          <div className="report-icon">
            <Eye size={32} />
          </div>
          <div>
            <h1>Diagnostic Report</h1>
            <p>Report #{diagnosis.reportId.toString().padStart(4, '0')} • {new Date(diagnosis.createdDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        <div className="report-meta-grid">
          <div className="meta-item">
            <span className="meta-label">Patient</span>
            <span className="meta-value">{diagnosis.patientName}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Patient ID</span>
            <span className="meta-value">#{diagnosis.patientId.toString().padStart(4, '0')}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Image ID</span>
            <span className="meta-value">#{diagnosis.imageId.toString().padStart(4, '0')}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Analysis Date</span>
            <span className="meta-value">{new Date(diagnosis.createdDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="report-body">
        {/* Severity Card */}
        <div className="report-card severity-card" style={{ borderLeftColor: severity.color }}>
          <div className="severity-header">
            <SeverityIcon size={28} style={{ color: severity.color }} />
            <div>
              <h2 style={{ color: severity.color }}>{diagnosis.drStage}</h2>
              <span className="severity-level">{severity.level}</span>
            </div>
          </div>
          <div className="confidence-bar-container">
            <div className="confidence-label">
              <span>AI Confidence</span>
              <span>{(diagnosis.confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{
                  width: `${diagnosis.confidence * 100}%`,
                  backgroundColor: severity.color,
                }}
              />
            </div>
          </div>
        </div>

        {/* Two-column: Findings & Scan */}
        <div className="report-columns">
          <div className="report-card">
            <h3>Clinical Findings</h3>
            <ul className="findings-list">
              {diagnosis.findings.map((finding, i) => (
                <li key={i}>
                  <span className="finding-dot" style={{ backgroundColor: severity.color }} />
                  {finding}
                </li>
              ))}
            </ul>
          </div>

          <div className="report-card scan-image-card">
            <h3>Retinal Scan</h3>
            {actualScan?.imagePath ? (
              <img 
                src={`http://localhost:8000/uploads/${actualScan.imagePath.split(/[/\\\\]/).pop()}`} 
                alt="Retinal Scan" 
                style={{ width: '100%', borderRadius: '8px', border: '1px solid #e5e7eb' }} 
              />
            ) : (
              <div className="scan-image-placeholder">
                <Eye size={48} />
                <p>Retinal fundus image</p>
                <span className="text-muted">Heatmap overlay will appear here</span>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        <div className="report-card">
          <h3>Recommendations</h3>
          <p className="recommendations-text">{diagnosis.recommendations}</p>
        </div>

        {/* Severity Scale */}
        <div className="report-card">
          <h3>DR Severity Scale Reference</h3>
          <div className="severity-scale">
            {[
              { stage: 'No DR', color: '#10b981', desc: 'No abnormalities detected' },
              { stage: 'Mild', color: '#3b82f6', desc: 'Microaneurysms only' },
              { stage: 'Moderate', color: '#f59e0b', desc: 'More than just microaneurysms' },
              { stage: 'Severe', color: '#ef4444', desc: 'Extensive hemorrhages/abnormalities' },
              { stage: 'Proliferative', color: '#7c3aed', desc: 'Neovascularization detected' },
            ].map(({ stage, color, desc }) => (
              <div
                key={stage}
                className={`scale-item ${diagnosis.drStage === stage ? 'scale-active' : ''}`}
              >
                <div className="scale-dot" style={{ backgroundColor: color }} />
                <div>
                  <strong>{stage}</strong>
                  <span>{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="report-disclaimer">
        <Info size={16} />
        <p>
          This report is generated by an AI system and is intended to assist medical professionals. 
          It should not be used as the sole basis for clinical decisions. Always consult with a 
          qualified ophthalmologist for final diagnosis and treatment plans.
        </p>
      </div>
    </div>
  );
}
