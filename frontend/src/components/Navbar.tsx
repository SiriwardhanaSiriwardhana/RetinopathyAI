import { useAuth } from '../context/AuthContext';
import { Bell, Search } from 'lucide-react';
import '../styles/navbar.css';

export default function Navbar() {
  const { user } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-search">
        <Search size={18} />
        <input type="text" placeholder="Search patients, scans..." />
      </div>

      <div className="navbar-right">
        <button className="navbar-icon-btn">
          <Bell size={20} />
          <span className="notification-badge">3</span>
        </button>

        <div className="navbar-user">
          <div className="navbar-avatar">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="navbar-user-info">
            <span className="navbar-user-name">{user?.name || 'User'}</span>
            <span className="navbar-user-role">{user?.role || 'Doctor'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
