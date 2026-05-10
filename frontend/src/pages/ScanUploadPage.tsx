import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ImageIcon, X, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import { scansAPI, predictionAPI, patientsAPI } from '../api';
import type { Patient } from '../types';
import '../styles/scan-upload.css';

type UploadState = 'idle' | 'selected' | 'uploading' | 'analyzing' | 'done' | 'error';

export default function ScanUploadPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await patientsAPI.getAll();
        setPatients(data);
      } catch (err) {
        console.error('Failed to fetch patients:', err);
        toast.error('Failed to load patients');
      }
    };
    fetchPatients();
  }, []);

  const handleFileSelect = (f: File) => {
    if (!f.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setUploadState('selected');
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
  };

  const onDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    if (e.type === 'dragleave') setDragActive(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setUploadState('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadAndAnalyze = async () => {
    if (!file || !selectedPatient) {
      toast.error('Please select a patient and an image');
      return;
    }

    try {
      setUploadState('uploading');
      
      const scan = await scansAPI.upload(selectedPatient, file);

      setUploadState('analyzing');
      const prediction = await predictionAPI.predict(scan.imageId || scan.id);

      setUploadState('done');
      toast.success('Scan analyzed successfully!');

      navigate(`/diagnosis/${scan.imageId || scan.id}`, { state: { prediction, scan } });
    } catch (err: any) {
      console.error(err);
      setUploadState('error');
      toast.error('Analysis failed. Please try again.');
    }
  };

  return (
    <div className="scan-upload-page">
      <div className="page-header">
        <div>
          <h1>Upload Retinal Scan</h1>
          <p>Upload a fundus image for AI-powered diabetic retinopathy analysis</p>
        </div>
      </div>

      <div className="upload-container">
        {/* Left: Upload Area */}
        <div className="upload-left">
          {/* Patient Selection */}
          <div className="form-group">
            <label>Select Patient</label>
            <select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="patient-select"
            >
              <option value="">-- Choose a patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.age}y, {p.diabetesType || p.gender})
                </option>
              ))}
            </select>
          </div>

          {/* Drop Zone */}
          <div
            className={`drop-zone ${dragActive ? 'drag-active' : ''} ${
              preview ? 'has-preview' : ''
            }`}
            onDragEnter={onDrag}
            onDragLeave={onDrag}
            onDragOver={onDrag}
            onDrop={onDrop}
            onClick={() => !preview && fileInputRef.current?.click()}
          >
            {preview ? (
              <div className="preview-container">
                <img src={preview} alt="Retinal scan preview" className="scan-preview" />
                <button className="remove-btn" onClick={(e) => { e.stopPropagation(); removeFile(); }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="drop-content">
                <div className="drop-icon">
                  <ImageIcon size={48} />
                </div>
                <p className="drop-text">Drag & drop a retinal image here</p>
                <p className="drop-subtext">or click to browse files</p>
                <p className="drop-hint">Supports: JPG, PNG, TIFF — Max 10MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              hidden
            />
          </div>

          {/* Upload Button */}
          <button
            className="btn btn-primary btn-full btn-lg"
            disabled={!file || !selectedPatient || uploadState === 'uploading' || uploadState === 'analyzing'}
            onClick={handleUploadAndAnalyze}
          >
            {uploadState === 'uploading' && (
              <>
                <Upload size={20} className="spin" />
                Uploading...
              </>
            )}
            {uploadState === 'analyzing' && (
              <>
                <Eye size={20} className="pulse" />
                AI Analyzing...
              </>
            )}
            {(uploadState === 'idle' || uploadState === 'selected') && (
              <>
                <Upload size={20} />
                Upload & Analyze
              </>
            )}
            {uploadState === 'done' && (
              <>
                <CheckCircle size={20} />
                Analysis Complete
              </>
            )}
            {uploadState === 'error' && (
              <>
                <AlertCircle size={20} />
                Retry Analysis
              </>
            )}
          </button>
        </div>

        {/* Right: Status / Instructions */}
        <div className="upload-right">
          <div className="info-card">
            <h3>How It Works</h3>
            <div className="steps">
              <div className={`step ${selectedPatient ? 'completed' : 'active'}`}>
                <div className="step-number">1</div>
                <div>
                  <strong>Select Patient</strong>
                  <p>Choose the patient for this scan</p>
                </div>
              </div>
              <div className={`step ${file ? 'completed' : selectedPatient ? 'active' : ''}`}>
                <div className="step-number">2</div>
                <div>
                  <strong>Upload Image</strong>
                  <p>Upload a retinal fundus photograph</p>
                </div>
              </div>
              <div className={`step ${uploadState === 'analyzing' || uploadState === 'done' ? 'completed' : uploadState === 'uploading' ? 'active' : ''}`}>
                <div className="step-number">3</div>
                <div>
                  <strong>AI Analysis</strong>
                  <p>Our CNN model analyzes the image</p>
                </div>
              </div>
              <div className={`step ${uploadState === 'done' ? 'completed' : ''}`}>
                <div className="step-number">4</div>
                <div>
                  <strong>Get Results</strong>
                  <p>View diagnosis and recommendations</p>
                </div>
              </div>
            </div>
          </div>

          {uploadState === 'done' && (
            <div className="result-preview-card">
              <CheckCircle size={32} className="success-icon" />
              <h3>Analysis Complete!</h3>
              <p>The retinal scan has been analyzed successfully.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
