import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye } from 'lucide-react';
import '../styles/auth.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch {
      // Error handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <Eye size={48} />
          <h1>RetinopathyAI</h1>
          <p>Automated Retinopathy Scanning & Diagnosis System</p>
        </div>
        <div className="auth-features">
          <div className="auth-feature-item">
            <span className="feature-dot" />
            <span>AI-powered diabetic retinopathy detection</span>
          </div>
          <div className="auth-feature-item">
            <span className="feature-dot" />
            <span>Automated diagnostic report generation</span>
          </div>
          <div className="auth-feature-item">
            <span className="feature-dot" />
            <span>Secure patient record management</span>
          </div>
          <div className="auth-feature-item">
            <span className="feature-dot" />
            <span>Real-time disease severity classification</span>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <h2>Welcome Back</h2>
          <p className="auth-subtitle">Sign in to continue to your dashboard</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="doctor@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
