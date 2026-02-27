import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Edit, Trash2, Eye } from 'lucide-react';
import type { Patient, PatientFormData } from '../types';
import '../styles/patients.css';

// Mock data – replace with patientsAPI calls
const mockPatients: Patient[] = [
  {
    id: 1,
    name: 'Sarah Johnson',
    age: 54,
    gender: 'Female',
    diabetesType: 'Type 2',
    phone: '+1 (555) 123-4567',
    email: 'sarah.j@email.com',
    createdAt: '2025-10-15',
  },
  {
    id: 2,
    name: 'James Wilson',
    age: 67,
    gender: 'Male',
    diabetesType: 'Type 1',
    phone: '+1 (555) 987-6543',
    email: 'james.w@email.com',
    createdAt: '2025-11-20',
  },
  {
    id: 3,
    name: 'Maria Garcia',
    age: 45,
    gender: 'Female',
    diabetesType: 'Type 2',
    phone: '+1 (555) 456-7890',
    email: 'maria.g@email.com',
    createdAt: '2025-12-05',
  },
  {
    id: 4,
    name: 'Robert Brown',
    age: 72,
    gender: 'Male',
    diabetesType: 'Type 2',
    phone: '+1 (555) 321-6549',
    email: 'robert.b@email.com',
    createdAt: '2026-01-10',
  },
  {
    id: 5,
    name: 'Emily Chen',
    age: 38,
    gender: 'Female',
    diabetesType: 'Type 1',
    phone: '+1 (555) 654-3210',
    email: 'emily.c@email.com',
    createdAt: '2026-02-01',
  },
];

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<PatientFormData>({
    name: '',
    age: 0,
    gender: 'Male',
    diabetesType: 'Type 2',
    phone: '',
    email: '',
  });
  const navigate = useNavigate();

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newPatient: Patient = {
      ...formData,
      id: patients.length + 1,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setPatients([newPatient, ...patients]);
    setShowModal(false);
    setFormData({ name: '', age: 0, gender: 'Male', diabetesType: 'Type 2', phone: '', email: '' });
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to remove this patient?')) {
      setPatients(patients.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="patients-page">
      <div className="page-header">
        <div>
          <h1>Patients</h1>
          <p>Manage patient records</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <UserPlus size={18} />
          Add Patient
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search patients by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Patients Table */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Diabetes Type</th>
              <th>Phone</th>
              <th>Added</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((patient) => (
              <tr key={patient.id}>
                <td className="td-patient">
                  <div className="patient-avatar">
                    {patient.name.charAt(0)}
                  </div>
                  <div className="patient-info">
                    <span className="patient-name">{patient.name}</span>
                    <span className="patient-email">{patient.email}</span>
                  </div>
                </td>
                <td>{patient.age}</td>
                <td>{patient.gender}</td>
                <td>
                  <span className="badge badge-info">{patient.diabetesType}</span>
                </td>
                <td>{patient.phone}</td>
                <td>{new Date(patient.createdAt).toLocaleDateString()}</td>
                <td className="td-actions">
                  <button
                    className="icon-btn"
                    title="View"
                    onClick={() => navigate(`/patients/${patient.id}`)}
                  >
                    <Eye size={16} />
                  </button>
                  <button className="icon-btn" title="Edit">
                    <Edit size={16} />
                  </button>
                  <button
                    className="icon-btn icon-btn-danger"
                    title="Delete"
                    onClick={() => handleDelete(patient.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="empty-state">
            <p>No patients found</p>
          </div>
        )}
      </div>

      {/* Add Patient Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Patient</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Age</label>
                  <input
                    type="number"
                    value={formData.age || ''}
                    onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                    required
                    min={1}
                    max={120}
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Diabetes Type</label>
                  <select
                    value={formData.diabetesType}
                    onChange={(e) => setFormData({ ...formData, diabetesType: e.target.value })}
                  >
                    <option value="Type 1">Type 1</option>
                    <option value="Type 2">Type 2</option>
                    <option value="Gestational">Gestational</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
