import { useState, useEffect } from 'react';
import { predictionAPI, scansAPI, prescriptionsAPI } from '../api';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
  Plus,
  Trash2,
  Save,
  Sparkles,
  FlaskConical,
  Wand2,
  ClipboardCheck,
} from 'lucide-react';
import '../styles/diagnosis-report.css';

type MedicineRow = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string;
};

const emptyMed = (): MedicineRow => ({ name: '', dosage: '', frequency: '', duration: '', notes: '' });

export default function DiagnosisReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { scan } = location.state || {};

  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [actualScan, setActualScan] = useState<any>(scan);

  // Prescription state
  const [doctorNotes, setDoctorNotes] = useState('');
  const [medicines, setMedicines] = useState<MedicineRow[]>([emptyMed()]);
  const [savedPrescription, setSavedPrescription] = useState<any>(null);
  const [savingRx, setSavingRx] = useState(false);
  const [rxSaved, setRxSaved] = useState(false);

  // AI Suggestion state
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [suggestionApplied, setSuggestionApplied] = useState(false);

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

          const diagObj = {
            id: data.id,
            reportId: data.id,
            imageId: id,
            patientId: data.patient_id || '',
            patientName: 'Patient',
            drStage: stage,
            confidence: data.confidence,
            findings: data.details ? data.details.split('\n') : [],
            recommendations: 'Follow up according to clinical guidelines.',
            ai_recommendation: data.ai_recommendation || '',
            createdDate: data.created_at || new Date().toISOString().split('T')[0],
          };
          setDiagnosis(diagObj);

          // Load existing prescription
          prescriptionsAPI.getByDiagnosis(data.id)
            .then((presc) => {
              setSavedPrescription(presc);
              setDoctorNotes(presc.doctor_notes || '');
              setMedicines(presc.medicines?.length > 0 ? presc.medicines : [emptyMed()]);
              setRxSaved(true);
            })
            .catch(() => {
              // No saved prescription — fetch AI suggestion automatically
              setLoadingSuggestion(true);
              prescriptionsAPI.getAiSuggestion(id!)
                .then((suggestion) => {
                  setAiSuggestion(suggestion);
                })
                .catch(console.error)
                .finally(() => setLoadingSuggestion(false));
            });
        })
        .catch(console.error);

      if (!actualScan) {
        scansAPI.getById(id).then(setActualScan).catch(console.error);
      }
    }
  }, [id]);

  if (!diagnosis) return (
    <div className="diagnosis-report" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <Eye size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
        <p>Loading report...</p>
      </div>
    </div>
  );

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
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to generate PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Diagnostic_Report_${id}.pdf`;
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
        headers: { Authorization: `Bearer ${token}` }
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

  // ── Prescription handlers ──
  const updateMed = (i: number, field: keyof MedicineRow, val: string) => {
    setMedicines((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m));
    setRxSaved(false);
  };
  const addMed = () => { setMedicines((p) => [...p, emptyMed()]); setRxSaved(false); };
  const removeMed = (i: number) => { setMedicines((p) => p.filter((_, idx) => idx !== i)); setRxSaved(false); };

  const applySuggestion = () => {
    if (!aiSuggestion) return;
    setDoctorNotes(aiSuggestion.doctor_notes || '');
    setMedicines(
      aiSuggestion.medicines?.length > 0
        ? aiSuggestion.medicines.map((m: any) => ({
            name: m.name || '',
            dosage: m.dosage || '',
            frequency: m.frequency || '',
            duration: m.duration || '',
            notes: m.notes || '',
          }))
        : [emptyMed()]
    );
    setSuggestionApplied(true);
    setRxSaved(false);
  };

  const refreshSuggestion = () => {
    if (!id) return;
    setLoadingSuggestion(true);
    setSuggestionApplied(false);
    prescriptionsAPI.getAiSuggestion(id)
      .then(setAiSuggestion)
      .catch(console.error)
      .finally(() => setLoadingSuggestion(false));
  };

  const handleSavePrescription = async () => {
    if (!diagnosis?.id) return;
    setSavingRx(true);
    try {
      const validMeds = medicines.filter((m) => m.name.trim());
      const result = await prescriptionsAPI.create({
        scan_id: id!,
        diagnosis_id: diagnosis.id,
        doctor_notes: doctorNotes,
        medicines: validMeds,
      });
      setSavedPrescription(result);
      setRxSaved(true);
    } catch (err) {
      console.error(err);
      alert('Failed to save prescription.');
    } finally {
      setSavingRx(false);
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
            <p>Scan #{id?.slice(0, 8)} • {new Date(diagnosis.createdDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        <div className="report-meta-grid">
          <div className="meta-item">
            <span className="meta-label">Scan ID</span>
            <span className="meta-value">{id?.slice(0, 12)}…</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Patient ID</span>
            <span className="meta-value">{diagnosis.patientId?.slice(0, 8)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">DR Stage</span>
            <span className="meta-value" style={{ color: severity.color }}>{diagnosis.drStage}</span>
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
                style={{ width: `${diagnosis.confidence * 100}%`, backgroundColor: severity.color }}
              />
            </div>
          </div>
        </div>

        {/* Two-column: Findings & Scan */}
        <div className="report-columns">
          <div className="report-card">
            <h3>Clinical Findings</h3>
            <ul className="findings-list">
              {diagnosis.findings.map((finding: string, i: number) => (
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
                src={`http://localhost:8000/uploads/${actualScan.imagePath.split(/[/\\]/).pop()}`}
                alt="Retinal Scan"
                style={{ width: '100%', borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
            ) : (
              <div className="scan-image-placeholder">
                <Eye size={48} />
                <p>Retinal fundus image</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Clinical Recommendation */}
        {diagnosis.ai_recommendation && (
          <div className="report-card" style={{ borderLeft: '4px solid #7c3aed' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7c3aed' }}>
              <Sparkles size={20} />
              AI Clinical Recommendation
            </h3>
            <p style={{ lineHeight: 1.8, color: '#374151', marginTop: 8 }}>
              {diagnosis.ai_recommendation}
            </p>
          </div>
        )}

        {/* Recommendations */}
        <div className="report-card">
          <h3>Standard Recommendations</h3>
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
              <div key={stage} className={`scale-item ${diagnosis.drStage === stage ? 'scale-active' : ''}`}>
                <div className="scale-dot" style={{ backgroundColor: color }} />
                <div>
                  <strong>{stage}</strong>
                  <span>{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI PRESCRIPTION SUGGESTION ── */}
        {(aiSuggestion || loadingSuggestion) && (
          <div className="report-card" style={{
            borderTop: '3px solid #7c3aed',
            background: 'linear-gradient(135deg, #faf5ff 0%, #f0fdf4 100%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7c3aed', margin: 0 }}>
                <Wand2 size={20} />
                AI Prescription Suggestion
                <span style={{ fontSize: 11, background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                  GPT-4o
                </span>
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={refreshSuggestion}
                  disabled={loadingSuggestion}
                  style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Sparkles size={12} /> {loadingSuggestion ? 'Generating...' : 'Regenerate'}
                </button>
                {aiSuggestion && !suggestionApplied && (
                  <button
                    onClick={applySuggestion}
                    style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, border: 'none', background: '#7c3aed', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                  >
                    <ClipboardCheck size={12} /> Apply to Prescription
                  </button>
                )}
                {suggestionApplied && (
                  <span style={{ fontSize: 12, background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
                    ✓ Applied
                  </span>
                )}
              </div>
            </div>

            {loadingSuggestion ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#7c3aed', fontSize: 14 }}>
                <Wand2 size={24} style={{ animation: 'spin 1.5s linear infinite', marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                GPT-4o is generating a clinical prescription suggestion...
              </div>
            ) : aiSuggestion && (
              <>
                {aiSuggestion.doctor_notes && (
                  <div style={{ marginTop: 14, padding: 14, background: '#fff', borderRadius: 8, border: '1px solid #e9d5ff', fontSize: 14, lineHeight: 1.7, color: '#374151' }}>
                    <strong style={{ color: '#7c3aed', display: 'block', marginBottom: 4 }}>Suggested Notes:</strong>
                    {aiSuggestion.doctor_notes}
                  </div>
                )}
                {aiSuggestion.medicines?.length > 0 && (
                  <div style={{ marginTop: 12, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#7c3aed' }}>
                          {['#', 'Medicine', 'Dosage', 'Frequency', 'Duration', 'Notes'].map((h) => (
                            <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#fff' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {aiSuggestion.medicines.map((med: any, i: number) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? '#faf5ff' : '#fff' }}>
                            <td style={{ padding: '8px 10px', border: '1px solid #e9d5ff', color: '#7c3aed', fontWeight: 700 }}>{i + 1}</td>
                            <td style={{ padding: '8px 10px', border: '1px solid #e9d5ff', fontWeight: 600 }}>{med.name}</td>
                            <td style={{ padding: '8px 10px', border: '1px solid #e9d5ff' }}>{med.dosage}</td>
                            <td style={{ padding: '8px 10px', border: '1px solid #e9d5ff' }}>{med.frequency}</td>
                            <td style={{ padding: '8px 10px', border: '1px solid #e9d5ff' }}>{med.duration}</td>
                            <td style={{ padding: '8px 10px', border: '1px solid #e9d5ff', color: '#6b7280' }}>{med.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 10, fontStyle: 'italic' }}>
                  ⚠ AI-generated suggestion. Always review and adjust before prescribing.
                </p>
              </>
            )}
          </div>
        )}

        {/* ── PRESCRIPTION EDITOR ── */}
        <div className="report-card" style={{ borderTop: '3px solid #0891b2' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0891b2' }}>
            <FlaskConical size={20} />
            Prescription
            {rxSaved && <span style={{ fontSize: 12, background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>Saved ✓</span>}
          </h3>

          {/* Doctor notes */}
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Doctor's Observations / Notes
            </label>
            <textarea
              value={doctorNotes}
              onChange={(e) => { setDoctorNotes(e.target.value); setRxSaved(false); }}
              placeholder="Enter your clinical observations, diagnosis notes, or any additional information..."
              style={{
                width: '100%', minHeight: 100, padding: 12, borderRadius: 8,
                border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical',
                fontFamily: 'inherit', lineHeight: 1.6
              }}
            />
          </div>

          {/* Medicine table */}
          <div style={{ marginTop: 16, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Medicine Name', 'Dosage', 'Frequency', 'Duration', 'Notes', ''].map((h) => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', border: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {medicines.map((med, i) => (
                  <tr key={i}>
                    {(['name', 'dosage', 'frequency', 'duration', 'notes'] as (keyof MedicineRow)[]).map((field) => (
                      <td key={field} style={{ padding: 4, border: '1px solid #e5e7eb' }}>
                        <input
                          value={med[field]}
                          onChange={(e) => updateMed(i, field, e.target.value)}
                          placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                          style={{ width: '100%', border: 'none', padding: '6px 8px', fontSize: 13, outline: 'none', background: 'transparent' }}
                        />
                      </td>
                    ))}
                    <td style={{ padding: 4, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                      <button onClick={() => removeMed(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
            <button className="btn btn-outline" onClick={addMed} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} />
              Add Medicine
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSavePrescription}
              disabled={savingRx}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Save size={16} />
              {savingRx ? 'Saving...' : 'Save Prescription'}
            </button>
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
