import { useState, useEffect } from 'react';
import { scansAPI } from '../api';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Clock, Eye } from 'lucide-react';
import type { RetinalScan } from '../types';
import '../styles/scan-history.css';

export default function ScanHistoryPage() {
  const [scans, setScans] = useState<RetinalScan[]>([]);
  useEffect(() => {
    scansAPI.getAll().then(setScans).catch(console.error);
  }, []);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();

  const filtered = scans.filter((s) => {
    const matchSearch = s.patientName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      analyzed: 'badge-success',
      pending: 'badge-warning',
      failed: 'badge-error',
    };
    return map[status] || 'badge-default';
  };

  return (
    <div className="scan-history-page">
      <div className="page-header">
        <div>
          <h1>Scan History</h1>
          <p>View all retinal scan records</p>
        </div>
      </div>

      <div className="filters-row">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by patient name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={16} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="analyzed">Analyzed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Scan ID</th>
              <th>Patient</th>
              <th>Upload Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((scan) => (
              <tr key={scan.imageId}>
                <td>#{scan.imageId.toString().padStart(4, '0')}</td>
                <td className="td-patient">
                  <div className="patient-avatar">
                    {scan.patientName.charAt(0)}
                  </div>
                  <span>{scan.patientName}</span>
                </td>
                <td>
                  <Clock size={14} />
                  {new Date(scan.uploadDate).toLocaleString()}
                </td>
                <td>
                  <span className={`badge ${getStatusBadge(scan.status)}`}>
                    {scan.status}
                  </span>
                </td>
                <td>
                  {scan.status === 'analyzed' ? (
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => navigate(`/diagnosis/${scan.imageId}`)}
                    >
                      <Eye size={14} />
                      View Report
                    </button>
                  ) : scan.status === 'pending' ? (
                    <span className="text-muted">Processing...</span>
                  ) : (
                    <button className="btn btn-sm btn-outline">Retry</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="empty-state">
            <p>No scans found</p>
          </div>
        )}
      </div>
    </div>
  );
}
