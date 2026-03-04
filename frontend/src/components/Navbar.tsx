import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, Search, ChevronDown, UserCircle, Settings, LogOut } from 'lucide-react';
import '../styles/navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setDropdownOpen(false);
    navigate('/profile');
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
  };

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

        <div className="navbar-user-wrapper" ref={dropdownRef}>
          <button
            className="navbar-user-btn"
            onClick={() => setDropdownOpen((prev) => !prev)}
          >
            <div className="navbar-avatar">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="navbar-user-info">
              <span className="navbar-user-name">{user?.name || 'User'}</span>
              <span className="navbar-user-role">{user?.role || 'Doctor'}</span>
            </div>
            <ChevronDown
              size={16}
              className={`navbar-chevron ${dropdownOpen ? 'open' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                <div className="dropdown-avatar">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="dropdown-name">{user?.name}</div>
                  <div className="dropdown-email">{user?.email}</div>
                </div>
              </div>

              <div className="dropdown-divider" />

              <button className="dropdown-item" onClick={handleProfileClick}>
                <UserCircle size={18} />
                My Profile
              </button>
              <button className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                <Settings size={18} />
                Settings
              </button>

              <div className="dropdown-divider" />

              <button className="dropdown-item dropdown-item-danger" onClick={handleLogout}>
                <LogOut size={18} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
