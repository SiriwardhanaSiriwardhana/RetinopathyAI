import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Calendar, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/profile.css';

export default function ProfilePage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const profileFields = [
        { label: 'Full Name', value: user?.name || '—', icon: User },
        { label: 'Email Address', value: user?.email || '—', icon: Mail },
        { label: 'Role', value: user?.role || '—', icon: Shield },
        {
            label: 'Member Since',
            value: user?.created_at
                ? new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                })
                : '—',
            icon: Calendar,
        },
    ];

    return (
        <div className="profile-page">
            <div className="page-header">
                <div>
                    <h1>My Profile</h1>
                    <p>View your account information</p>
                </div>
                <button className="btn btn-outline" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} />
                    Back
                </button>
            </div>

            <div className="profile-layout">
                {/* Profile Card */}
                <div className="profile-card profile-identity">
                    <div className="profile-avatar-lg">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <h2 className="profile-display-name">{user?.name || 'User'}</h2>
                    <span className={`badge badge-info`}>
                        {user?.role || 'doctor'}
                    </span>
                    <p className="profile-email-sub">{user?.email}</p>
                </div>

                {/* Details Card */}
                <div className="profile-card profile-details">
                    <h3>Account Details</h3>
                    <div className="profile-fields">
                        {profileFields.map(({ label, value, icon: Icon }) => (
                            <div className="profile-field" key={label}>
                                <div className="profile-field-icon">
                                    <Icon size={18} />
                                </div>
                                <div className="profile-field-text">
                                    <span className="profile-field-label">{label}</span>
                                    <span className="profile-field-value">{value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
