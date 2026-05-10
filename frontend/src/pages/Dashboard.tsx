import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ScanLine,
  AlertTriangle,
  Activity,
  TrendingUp,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { dashboardAPI } from '../api';
import type { DashboardStats } from '../types';
import '../styles/dashboard.css';

// Mock data for demonstration (will be replaced by API calls)
const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(mockStats);
  const navigate = useNavigate();

  // Uncomment when backend is ready:
  // useEffect(() => {
  //   dashboardAPI.getStats().then(setStats).catch(console.error);
  // }, []);

  const statCards = [
    {
      label: 'Total Patients',
      value: stats.totalPatients.toLocaleString(),
      icon: Users,
      color: '#3b82f6',
      bg: '#eff6ff',
    },
    {
      label: 'Total Scans',
      value: stats.totalScans.toLocaleString(),
      icon: ScanLine,
      color: '#10b981',
      bg: '#ecfdf5',
    },
    {
      label: 'Scans Today',
      value: stats.scansToday,
      icon: Activity,
      color: '#f59e0b',
      bg: '#fffbeb',
    },
    {
      label: 'Critical Cases',
      value: stats.criticalCases,
      icon: AlertTriangle,
      color: '#ef4444',
      bg: '#fef2f2',
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      analyzed: 'badge-success',
      pending: 'badge-warning',
      failed: 'badge-error',
    };
    return styles[status] || 'badge-default';
  };

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of retinopathy screening activity</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/scan/upload')}
        >
          <TrendingUp size={18} />
          New Scan
        </button>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div className="stat-card" key={label}>
            <div className="stat-icon" style={{ backgroundColor: bg }}>
              <Icon size={24} style={{ color }} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{value}</span>
              <span className="stat-label">{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="dashboard-charts">
        <div className="chart-card">
          <h3>Monthly Scans</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.monthlyScans}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>DR Severity Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={stats.drDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="count"
                nameKey="stage"
                label={({ name, percent }: any) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {stats.drDistribution.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Scans Table */}
      <div className="table-card">
        <div className="table-header">
          <h3>Recent Scans</h3>
          <button
            className="btn btn-outline"
            onClick={() => navigate('/scan/history')}
          >
            View All
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Scan ID</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentScans.map((scan) => (
              <tr key={scan.imageId}>
                <td className="td-patient">
                  <div className="patient-avatar">
                    {scan.patientName.charAt(0)}
                  </div>
                  <span>{scan.patientName}</span>
                </td>
                <td>#{scan.imageId.toString().padStart(4, '0')}</td>
                <td>
                  <Clock size={14} />
                  {new Date(scan.uploadDate).toLocaleDateString()}
                </td>
                <td>
                  <span className={`badge ${getStatusBadge(scan.status)}`}>
                    {scan.status}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => navigate(`/diagnosis/${scan.imageId}`)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
