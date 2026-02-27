import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Upload,
  History,
  LogOut,
  Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/sidebar.css';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/patients', label: 'Patients', icon: Users },
  { path: '/scan/upload', label: 'Upload Scan', icon: Upload },
  { path: '/scan/history', label: 'Scan History', icon: History },
];

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Eye size={28} />
        <span>RetinopathyAI</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-link logout-btn" onClick={logout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
