import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { FiUsers, FiSearch, FiCheck, FiX } from 'react-icons/fi';
import Layout from '../../components/Layout';

const ROLES = ['admin', 'teacher', 'accountant'];

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    try {
      const snap = await getDocs(collection(db, 'users'));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRoleChange = async (userId, newRole) => {
    setSavingId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showToast('success', `Role updated to ${newRole}`);
    } catch (err) {
      console.error(err);
      showToast('error', err.message);
    }
    setSavingId(null);
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Layout><div className="loading-spinner"><div className="spinner"></div></div></Layout>;

  return (
    <Layout>
      <div className="search-bar">
        <div className="search-input-wrapper">
          <FiSearch className="search-icon" />
          <input className="search-input" placeholder="Search users by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} user{filtered.length !== 1 ? 's' : ''}</div>
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <h3><FiUsers style={{ marginRight: 8 }} /> User Roles</h3>
        </div>
        <div className="content-card-body" style={{ overflowX: 'auto' }}>
          {filtered.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">👤</div><h3>No Users Found</h3></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Current Role</th><th>Change Role</th></tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="name-cell">
                        <div className="avatar-sm">{u.name?.[0] || '?'}</div>
                        <strong style={{ color: 'var(--text)' }}>{u.name || '—'}</strong>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.email || '—'}</td>
                    <td>
                      <span className={`badge badge-${u.role === 'admin' ? 'admin' : u.role === 'teacher' ? 'teacher' : 'student'}`}>
                        {u.role || '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select
                          className="form-select"
                          style={{ width: 'auto', minWidth: 130, padding: '6px 10px', fontSize: 13 }}
                          value={u.role || 'teacher'}
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                          disabled={savingId === u.id}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                        </select>
                        {savingId === u.id && <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`} style={{ animation: 'slideUp 0.3s ease' }}>
          {toast.type === 'success' ? <FiCheck /> : <FiX />}
          {toast.message}
        </div>
      )}
    </Layout>
  );
}
