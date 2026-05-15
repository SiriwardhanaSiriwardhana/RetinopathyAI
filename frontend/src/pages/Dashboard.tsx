import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ScanLine,
  AlertTriangle,
  Activity,
  TrendingUp,
  Clock,
  RefreshCw,
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

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
const POLL_INTERVAL_MS = 30_000; // refresh stats every 30 s

/** Format a live Date → "Monday, 11 May 2026  •  08:34:22 PM" */
function formatLiveClock(d: Date): string {
  return d.toLocaleString('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [liveTime, setLiveTime] = useState(new Date());
  const navigate = useNavigate();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Live clock — ticks every second ──────────────────────
  useEffect(() => {
    const clockTimer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // ── Fetch & auto-poll stats ───────────────────────────────
  const fetchStats = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const data = await dashboardAPI.getStats();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    intervalRef.current = setInterval(() => fetchStats(), POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Loading skeleton ──────────────────────────────────────
  if (loading || !stats) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <div>
            <h1>Dashboard</h1>
            <p>Loading data from Firestore…</p>
          </div>
        </div>
        <div className="stat-cards">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card" style={{ opacity: 0.4, animation: 'pulse 1.5s infinite' }}>
              <div className="stat-icon" style={{ backgroundColor: '#f3f4f6' }} />
              <div className="stat-info">
                <span className="stat-value">—</span>
                <span className="stat-label">Loading…</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
      {/* Header with live clock */}
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
            <Clock size={14} style={{ color: '#3b82f6' }} />
            <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
              {formatLiveClock(liveTime)}
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              Stats updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            className="btn btn-outline"
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/scan/upload')}
          >
            <TrendingUp size={18} />
            New Scan
          </button>
        </div>
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
        {/* Monthly Scans Bar Chart */}
        <div className="chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Monthly Scans</h3>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>Last 12 months</span>
          </div>
          {stats.monthlyScans.every((m) => m.count === 0) ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>
              No scan data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.monthlyScans} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: any) => [v, 'Scans']}
                  contentStyle={{ borderRadius: 8, fontSize: 13 }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* DR Severity Pie Chart */}
        <div className="chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>DR Severity Distribution</h3>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>All diagnoses</span>
          </div>
          {stats.drDistribution.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>
              No diagnoses yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats.drDistribution}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={95}
                  dataKey="count"
                  nameKey="stage"
                  label={({ name, percent }: any) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {stats.drDistribution.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [v, 'Cases']} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
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
        {stats.recentScans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 14 }}>
            No scans yet. Upload your first retinal scan.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Scan ID</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentScans.map((scan) => {
                const uploadDt = scan.uploadDate ? new Date(scan.uploadDate) : null;
                return (
                  <tr key={scan.imageId}>
                    <td className="td-patient">
                      <div className="patient-avatar">
                        {scan.patientName.charAt(0)}
                      </div>
                      <span>{scan.patientName}</span>
                    </td>
                    <td>#{(scan.imageId as string).slice(0, 8)}</td>
                    <td style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={13} style={{ color: '#9ca3af' }} />
                      {uploadDt && !isNaN(uploadDt.getTime())
                        ? uploadDt.toLocaleString('en-US', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : '—'}
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
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
