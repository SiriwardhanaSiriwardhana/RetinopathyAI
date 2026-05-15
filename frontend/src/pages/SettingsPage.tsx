import { useState, useEffect } from 'react';
import {
  Palette,
  Bell,
  Shield,
  Monitor,
  Globe,
  Save,
  Check,
  ChevronRight,
  Sun,
  Moon,
  Contrast,
} from 'lucide-react';
import '../styles/settings.css';

// ─── Theme Definitions ─────────────────────────────────────────────────────
const COLOR_THEMES = [
  {
    id: 'blue',
    name: 'Ocean Blue',
    description: 'Classic professional look',
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    primaryLight: '#eff6ff',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  {
    id: 'violet',
    name: 'Royal Violet',
    description: 'Premium deep purple',
    primary: '#7c3aed',
    primaryDark: '#6d28d9',
    primaryLight: '#f5f3ff',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    description: 'Fresh medical tone',
    primary: '#059669',
    primaryDark: '#047857',
    primaryLight: '#ecfdf5',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  {
    id: 'rose',
    name: 'Rose Red',
    description: 'Bold & energetic',
    primary: '#e11d48',
    primaryDark: '#be123c',
    primaryLight: '#fff1f2',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#dc2626',
  },
  {
    id: 'amber',
    name: 'Amber Gold',
    description: 'Warm & inviting',
    primary: '#d97706',
    primaryDark: '#b45309',
    primaryLight: '#fffbeb',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  {
    id: 'cyan',
    name: 'Cyan Teal',
    description: 'Cool & clinical',
    primary: '#0891b2',
    primaryDark: '#0e7490',
    primaryLight: '#ecfeff',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
];

const DISPLAY_MODES = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'high-contrast', label: 'High Contrast', icon: Contrast },
  { id: 'system', label: 'System', icon: Monitor },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'si', label: 'Sinhala (සිංහල)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
];

function applyTheme(themeId: string) {
  const theme = COLOR_THEMES.find((t) => t.id === themeId);
  if (!theme) return;
  const root = document.documentElement;
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--primary-dark', theme.primaryDark);
  root.style.setProperty('--primary-light', theme.primaryLight);
  root.style.setProperty('--success', theme.success);
  root.style.setProperty('--warning', theme.warning);
  root.style.setProperty('--error', theme.error);
  root.style.setProperty('--info', theme.primary);
  root.style.setProperty('--info-bg', theme.primaryLight);
}

function applyDisplayMode(mode: string) {
  const root = document.documentElement;
  root.setAttribute('data-display-mode', mode);

  if (mode === 'dark') {
    root.style.setProperty('--bg', '#0f172a');
    root.style.setProperty('--surface', '#1e293b');
    root.style.setProperty('--border', '#334155');
    root.style.setProperty('--border-light', '#1e293b');
    root.style.setProperty('--text', '#f1f5f9');
    root.style.setProperty('--text-secondary', '#94a3b8');
    root.style.setProperty('--text-muted', '#64748b');
  } else if (mode === 'high-contrast') {
    root.style.setProperty('--bg', '#000000');
    root.style.setProperty('--surface', '#111111');
    root.style.setProperty('--border', '#ffffff');
    root.style.setProperty('--border-light', '#333333');
    root.style.setProperty('--text', '#ffffff');
    root.style.setProperty('--text-secondary', '#e5e7eb');
    root.style.setProperty('--text-muted', '#d1d5db');
  } else {
    // light or system → restore defaults
    root.style.setProperty('--bg', '#f8fafc');
    root.style.setProperty('--surface', '#ffffff');
    root.style.setProperty('--border', '#e2e8f0');
    root.style.setProperty('--border-light', '#f1f5f9');
    root.style.setProperty('--text', '#1e293b');
    root.style.setProperty('--text-secondary', '#64748b');
    root.style.setProperty('--text-muted', '#94a3b8');
  }
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'appearance' | 'notifications' | 'privacy' | 'regional'>('appearance');
  const [selectedTheme, setSelectedTheme] = useState(() => localStorage.getItem('theme') || 'blue');
  const [displayMode, setDisplayMode] = useState(() => localStorage.getItem('displayMode') || 'light');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('fontSize') || 'medium');
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'en');
  const [saved, setSaved] = useState(false);

  // Notification prefs
  const [notifEmail, setNotifEmail] = useState(() => localStorage.getItem('notifEmail') !== 'false');
  const [notifNewScan, setNotifNewScan] = useState(() => localStorage.getItem('notifNewScan') !== 'false');
  const [notifCritical, setNotifCritical] = useState(() => localStorage.getItem('notifCritical') !== 'false');
  const [notifWeekly, setNotifWeekly] = useState(() => localStorage.getItem('notifWeekly') !== 'false');

  // Privacy prefs
  const [analyticsEnabled, setAnalyticsEnabled] = useState(() => localStorage.getItem('analytics') !== 'false');
  const [sessionTimeout, setSessionTimeout] = useState(() => localStorage.getItem('sessionTimeout') || '30');

  // Apply theme on mount
  useEffect(() => {
    applyTheme(selectedTheme);
    applyDisplayMode(displayMode);
  }, []);

  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId);
    applyTheme(themeId);
  };

  const handleDisplayModeSelect = (mode: string) => {
    setDisplayMode(mode);
    applyDisplayMode(mode);
  };

  const handleFontSize = (size: string) => {
    setFontSize(size);
    const map: Record<string, string> = { small: '13px', medium: '14px', large: '16px' };
    document.documentElement.style.fontSize = map[size] || '14px';
  };

  const handleSave = () => {
    localStorage.setItem('theme', selectedTheme);
    localStorage.setItem('displayMode', displayMode);
    localStorage.setItem('fontSize', fontSize);
    localStorage.setItem('language', language);
    localStorage.setItem('notifEmail', String(notifEmail));
    localStorage.setItem('notifNewScan', String(notifNewScan));
    localStorage.setItem('notifCritical', String(notifCritical));
    localStorage.setItem('notifWeekly', String(notifWeekly));
    localStorage.setItem('analytics', String(analyticsEnabled));
    localStorage.setItem('sessionTimeout', sessionTimeout);

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const tabs = [
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'privacy' as const, label: 'Privacy & Security', icon: Shield },
    { id: 'regional' as const, label: 'Regional', icon: Globe },
  ];

  return (
    <div className="settings-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Customize your RetinopathyAI experience</p>
        </div>
        <button className={`btn ${saved ? 'btn-success' : 'btn-primary'}`} onClick={handleSave}>
          {saved ? <Check size={18} /> : <Save size={18} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="settings-layout">
        {/* Sidebar Tabs */}
        <aside className="settings-sidebar">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`settings-tab ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
              <ChevronRight size={14} className="settings-tab-chevron" />
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <main className="settings-content">
          {/* ── Appearance ── */}
          {activeTab === 'appearance' && (
            <div className="settings-section">
              <div className="settings-card">
                <div className="settings-card-header">
                  <Palette size={20} />
                  <div>
                    <h3>Color Theme</h3>
                    <p>Choose the accent color throughout the application</p>
                  </div>
                </div>
                <div className="theme-grid">
                  {COLOR_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      className={`theme-swatch ${selectedTheme === theme.id ? 'selected' : ''}`}
                      onClick={() => handleThemeSelect(theme.id)}
                      style={{ '--swatch-color': theme.primary } as React.CSSProperties}
                    >
                      <div className="swatch-circle" style={{ background: theme.primary }}>
                        {selectedTheme === theme.id && <Check size={14} color="white" />}
                      </div>
                      <span className="swatch-name">{theme.name}</span>
                      <span className="swatch-desc">{theme.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <Monitor size={20} />
                  <div>
                    <h3>Display Mode</h3>
                    <p>Switch between light, dark, or high-contrast mode</p>
                  </div>
                </div>
                <div className="mode-grid">
                  {DISPLAY_MODES.map(({ id, label, icon: ModeIcon }) => (
                    <button
                      key={id}
                      className={`mode-btn ${displayMode === id ? 'selected' : ''}`}
                      onClick={() => handleDisplayModeSelect(id)}
                    >
                      <ModeIcon size={22} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <Monitor size={20} />
                  <div>
                    <h3>Font Size</h3>
                    <p>Adjust the base font size for better readability</p>
                  </div>
                </div>
                <div className="font-size-row">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      className={`font-size-btn ${fontSize === size ? 'selected' : ''}`}
                      onClick={() => handleFontSize(size)}
                    >
                      <span style={{ fontSize: size === 'small' ? '12px' : size === 'large' ? '18px' : '14px' }}>Aa</span>
                      <span className="font-size-label">{size.charAt(0).toUpperCase() + size.slice(1)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <div className="settings-card">
                <div className="settings-card-header">
                  <Bell size={20} />
                  <div>
                    <h3>Notification Preferences</h3>
                    <p>Control when and how you receive alerts</p>
                  </div>
                </div>
                <div className="toggle-list">
                  <ToggleRow
                    label="Email Notifications"
                    description="Receive updates via email"
                    checked={notifEmail}
                    onChange={setNotifEmail}
                  />
                  <ToggleRow
                    label="New Scan Alerts"
                    description="Notify when a new scan is uploaded"
                    checked={notifNewScan}
                    onChange={setNotifNewScan}
                  />
                  <ToggleRow
                    label="Critical Case Alerts"
                    description="Immediate alert for Severe NPDR or Proliferative DR"
                    checked={notifCritical}
                    onChange={setNotifCritical}
                  />
                  <ToggleRow
                    label="Weekly Summary Report"
                    description="Receive a weekly digest of patient activity"
                    checked={notifWeekly}
                    onChange={setNotifWeekly}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Privacy & Security ── */}
          {activeTab === 'privacy' && (
            <div className="settings-section">
              <div className="settings-card">
                <div className="settings-card-header">
                  <Shield size={20} />
                  <div>
                    <h3>Privacy Settings</h3>
                    <p>Control your data and session security</p>
                  </div>
                </div>
                <div className="toggle-list">
                  <ToggleRow
                    label="Usage Analytics"
                    description="Help improve the app by sharing anonymized usage data"
                    checked={analyticsEnabled}
                    onChange={setAnalyticsEnabled}
                  />
                </div>

                <div className="settings-field" style={{ marginTop: 20 }}>
                  <label className="settings-label">Session Timeout</label>
                  <p className="settings-hint">Auto-logout after inactivity</p>
                  <select
                    className="settings-select"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(e.target.value)}
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                    <option value="0">Never</option>
                  </select>
                </div>
              </div>

              <div className="settings-card settings-card-danger">
                <div className="settings-card-header">
                  <Shield size={20} style={{ color: 'var(--error)' }} />
                  <div>
                    <h3 style={{ color: 'var(--error)' }}>Danger Zone</h3>
                    <p>Irreversible actions — proceed with caution</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button className="btn btn-danger-outline">
                    Clear All Cached Data
                  </button>
                  <button className="btn btn-danger-outline">
                    Export My Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Regional ── */}
          {activeTab === 'regional' && (
            <div className="settings-section">
              <div className="settings-card">
                <div className="settings-card-header">
                  <Globe size={20} />
                  <div>
                    <h3>Language & Region</h3>
                    <p>Set your preferred display language</p>
                  </div>
                </div>
                <div className="lang-list">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      className={`lang-btn ${language === lang.code ? 'selected' : ''}`}
                      onClick={() => setLanguage(lang.code)}
                    >
                      <span>{lang.label}</span>
                      {language === lang.code && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <Globe size={20} />
                  <div>
                    <h3>Date & Time Format</h3>
                    <p>How dates are displayed across the app</p>
                  </div>
                </div>
                <div className="settings-field">
                  <label className="settings-label">Date Format</label>
                  <select className="settings-select">
                    <option>DD / MM / YYYY</option>
                    <option>MM / DD / YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
                <div className="settings-field" style={{ marginTop: 16 }}>
                  <label className="settings-label">Time Format</label>
                  <select className="settings-select">
                    <option>12-hour (AM / PM)</option>
                    <option>24-hour</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Toggle Row Helper ──────────────────────────────────────────────────────
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="toggle-row">
      <div className="toggle-info">
        <span className="toggle-label">{label}</span>
        <span className="toggle-desc">{description}</span>
      </div>
      <button
        className={`toggle-switch ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
        aria-label={label}
      >
        <span className="toggle-thumb" />
      </button>
    </div>
  );
}
