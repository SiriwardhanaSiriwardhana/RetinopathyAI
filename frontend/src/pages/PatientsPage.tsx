import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Edit, Trash2, Eye } from 'lucide-react';
import type { Patient, PatientFormData } from '../types';
import '../styles/patients.css';

import { patientsAPI } from '../api';

// Mock data – replace with patientsAPI calls
export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PatientFormData>({
    name: '',
    age: 0,
    gender: 'Male',
    diabetesType: 'Type 2',
    phone: '',
    email: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    patientsAPI.getAll().then(setPatients).catch(console.error);
  }, []);

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const updated = await patientsAPI.update(editingId, formData);
        setPatients(patients.map((p) => p.id === editingId ? updated : p));
      } else {
        const newPatient = await patientsAPI.create(formData);
        setPatients([newPatient, ...patients]);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ name: '', age: 0, gender: 'Male', diabetesType: 'Type 2', phone: '', email: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (patient: Patient) => {
    setEditingId(patient.id as string);
    setFormData({
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      diabetesType: patient.diabetesType,
      phone: patient.phone,
      email: patient.email,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this patient?')) {
      try {
        await patientsAPI.delete(id);
        setPatients(patients.filter((p) => p.id !== id));
      } catch (err) {
        console.error(err);
      }
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
                  <button className="icon-btn" title="Edit" onClick={() => handleEdit(patient)}>
                    <Edit size={16} />
                  </button>
                  <button
                    className="icon-btn icon-btn-danger"
                    title="Delete"
                    onClick={() => handleDelete(patient.id as string)}
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
            <h2>{editingId ? 'Edit Patient' : 'Add New Patient'}</h2>
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
                <button type="button" className="btn btn-outline" onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                  setFormData({ name: '', age: 0, gender: 'Male', diabetesType: 'Type 2', phone: '', email: '' });
                }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Save Changes' : 'Add Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
