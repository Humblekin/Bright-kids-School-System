import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</p>
      </div>
    );
  }

  if (!userData) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(userData.role)) {
    return <Navigate to={`/${userData.role}`} />;
  }

  return children;
}
