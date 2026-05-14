import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiUser, FiMail, FiLock, FiCheck } from 'react-icons/fi';
import Layout from '../../components/Layout';

export default function Profile() {
  const { userData, changePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);
    setError('');
    try {
      await changePassword(password);
      setSuccess('Password updated successfully');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update password');
    }
    setLoading(false);
  };

  const initials = userData?.name ? userData.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';

  return (
    <Layout>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="content-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent-purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 800, color: '#fff',
            margin: '0 auto 20px', boxShadow: 'var(--shadow-md)'
          }}>
            {initials}
          </div>
          <h2 style={{ fontSize: 24, marginBottom: 4 }}>{userData?.name}</h2>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'var(--primary-50)', color: 'var(--primary-dark)', borderRadius: 20, fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>
            {userData?.role}
          </div>
        </div>

        <div className="content-card">
          <div className="content-card-header"><h3>Security</h3></div>
          <div className="content-card-body">
            {error && <div className="toast toast-error" style={{ position: 'relative', bottom: 'auto', right: 'auto', marginBottom: 20, width: '100%' }}>{error}</div>}
            {success && <div className="toast toast-success" style={{ position: 'relative', bottom: 'auto', right: 'auto', marginBottom: 20, width: '100%' }}><FiCheck /> {success}</div>}

            <form onSubmit={handlePasswordChange}>
              <div className="form-group" style={{ maxWidth: 400 }}>
                <label className="form-label">New Password</label>
                <div className="search-input-wrapper">
                  <FiLock className="search-icon" />
                  <input type="password" className="search-input" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
              </div>
              <div className="form-group" style={{ maxWidth: 400 }}>
                <label className="form-label">Confirm New Password</label>
                <div className="search-input-wrapper">
                  <FiLock className="search-icon" />
                  <input type="password" className="search-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
