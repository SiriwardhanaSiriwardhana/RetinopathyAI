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
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import '../styles/settings.css';

// ─── Constants ─────────────────────────────────────────────────────────────
const COLOR_THEMES = [
  { id: 'blue', name: 'Ocean Blue', description: 'Classic professional look', primary: '#3b82f6' },
  { id: 'violet', name: 'Royal Violet', description: 'Premium deep purple', primary: '#7c3aed' },
  { id: 'emerald', name: 'Emerald Green', description: 'Fresh medical tone', primary: '#059669' },
  { id: 'rose', name: 'Rose Red', description: 'Bold & energetic', primary: '#e11d48' },
  { id: 'amber', name: 'Amber Gold', description: 'Warm & inviting', primary: '#d97706' },
  { id: 'cyan', name: 'Cyan Teal', description: 'Cool & clinical', primary: '#0891b2' },
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

// ─── Component ─────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, updateSettings } = useAuth();
  const [activeTab, setActiveTab] = useState<'appearance' | 'notifications' | 'privacy' | 'regional'>('appearance');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Local state for form management
  const [settings, setSettings] = useState({
    theme: 'blue',
    display_mode: 'light',
    font_size: 'medium',
    language: 'en',
    notif_email: true,
    notif_new_scan: true,
    notif_critical: true,
    notif_weekly: true,
    analytics_enabled: true,
    session_timeout: '30',
    date_format: 'DD / MM / YYYY',
    time_format: '12-hour (AM / PM)',
  });

  // Sync local state when user data arrives
  useEffect(() => {
    if (user?.settings) {
      setSettings(user.settings);
    }
  }, [user]);

  const handleUpdate = (field: string, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(settings);
      setSaved(true);
      toast.success('Settings updated successfully');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'privacy' as const, label: 'Privacy & Security', icon: Shield },
    { id: 'regional' as const, label: 'Regional', icon: Globe },
  ];

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Customize your RetinopathyAI experience</p>
        </div>
        <button 
          className={`btn ${saved ? 'btn-success' : 'btn-primary'}`} 
          onClick={handleSave}
          disabled={isSaving}
        >
          {saved ? <Check size={18} /> : (isSaving ? null : <Save size={18} />)}
          {isSaving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="settings-layout">
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

        <main className="settings-content">
          {/* Appearance Section */}
          {activeTab === 'appearance' && (
            <div className="settings-section">
              <div className="settings-card">
                <div className="settings-card-header">
                  <Palette size={20} />
                  <div>
                    <h3>Color Theme</h3>
                    <p>Choose the accent color for the interface</p>
                  </div>
                </div>
                <div className="theme-grid">
                  {COLOR_THEMES.map((t) => (
                    <button
                      key={t.id}
                      className={`theme-swatch ${settings.theme === t.id ? 'selected' : ''}`}
                      onClick={() => handleUpdate('theme', t.id)}
                    >
                      <div className="swatch-circle" style={{ background: t.primary }}>
                        {settings.theme === t.id && <Check size={14} color="white" />}
                      </div>
                      <span className="swatch-name">{t.name}</span>
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
                  {DISPLAY_MODES.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      className={`mode-btn ${settings.display_mode === id ? 'selected' : ''}`}
                      onClick={() => handleUpdate('display_mode', id)}
                    >
                      <Icon size={22} />
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
                    <p>Adjust the text scale for better readability</p>
                  </div>
                </div>
                <div className="font-size-row">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      className={`font-size-btn ${settings.font_size === size ? 'selected' : ''}`}
                      onClick={() => handleUpdate('font_size', size)}
                    >
                      <span style={{ fontSize: size === 'small' ? '12px' : size === 'large' ? '18px' : '14px' }}>Aa</span>
                      <span className="font-size-label">{size.charAt(0).toUpperCase() + size.slice(1)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <div className="settings-card">
                <div className="settings-card-header">
                  <Bell size={20} />
                  <div>
                    <h3>Notification Preferences</h3>
                    <p>Control which alerts you want to receive</p>
                  </div>
                </div>
                <div className="toggle-list">
                  <ToggleRow
                    label="Email Notifications"
                    description="Receive diagnosis updates via email"
                    checked={settings.notif_email}
                    onChange={(v) => handleUpdate('notif_email', v)}
                  />
                  <ToggleRow
                    label="New Scan Alerts"
                    description="Notify when a new scan is uploaded"
                    checked={settings.notif_new_scan}
                    onChange={(v) => handleUpdate('notif_new_scan', v)}
                  />
                  <ToggleRow
                    label="Critical Case Alerts"
                    description="Immediate alert for severe retinopathy findings"
                    checked={settings.notif_critical}
                    onChange={(v) => handleUpdate('notif_critical', v)}
                  />
                  <ToggleRow
                    label="Weekly Summary"
                    description="Receive a weekly report of all scans"
                    checked={settings.notif_weekly}
                    onChange={(v) => handleUpdate('notif_weekly', v)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Privacy Section */}
          {activeTab === 'privacy' && (
            <div className="settings-section">
              <div className="settings-card">
                <div className="settings-card-header">
                  <Shield size={20} />
                  <div>
                    <h3>Privacy & Security</h3>
                    <p>Manage data sharing and session security</p>
                  </div>
                </div>
                <div className="toggle-list">
                  <ToggleRow
                    label="Usage Analytics"
                    description="Share anonymous data to improve our AI models"
                    checked={settings.analytics_enabled}
                    onChange={(v) => handleUpdate('analytics_enabled', v)}
                  />
                </div>
                <div className="settings-field" style={{ marginTop: '20px' }}>
                  <label className="settings-label">Auto-logout Timeout</label>
                  <select
                    className="settings-select"
                    value={settings.session_timeout}
                    onChange={(e) => handleUpdate('session_timeout', e.target.value)}
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
                  <button className="btn btn-danger-outline" onClick={() => toast.info("Data cleared (Demo)")}>
                    Clear All Cached Data
                  </button>
                  <button className="btn btn-danger-outline" onClick={() => toast.info("Data exported (Demo)")}>
                    Export My Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Regional Section */}
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
                      className={`lang-btn ${settings.language === lang.code ? 'selected' : ''}`}
                      onClick={() => handleUpdate('language', lang.code)}
                    >
                      <span>{lang.label}</span>
                      {settings.language === lang.code && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <Globe size={20} />
                  <div>
                    <h3>Formats</h3>
                    <p>Set how dates and times are displayed</p>
                  </div>
                </div>
                <div className="settings-field">
                  <label className="settings-label">Date Format</label>
                  <select
                    className="settings-select"
                    value={settings.date_format}
                    onChange={(e) => handleUpdate('date_format', e.target.value)}
                  >
                    <option>DD / MM / YYYY</option>
                    <option>MM / DD / YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
                <div className="settings-field" style={{ marginTop: '16px' }}>
                  <label className="settings-label">Time Format</label>
                  <select
                    className="settings-select"
                    value={settings.time_format}
                    onChange={(e) => handleUpdate('time_format', e.target.value)}
                  >
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

function ToggleRow({ label, description, checked, onChange }: { 
  label: string; 
  description: string; 
  checked: boolean; 
  onChange: (v: boolean) => void 
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
      >
        <span className="toggle-thumb" />
      </button>
    </div>
  );
}
