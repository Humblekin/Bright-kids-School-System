import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import { sanitize } from '../../utils/sanitize';

export default function Announcements({ readOnly = false }) {
  const { userData } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', target: 'all' });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [aSnap, cSnap] = await Promise.all([
        getDocs(query(collection(db, 'announcements'), orderBy('date', 'desc'))),
        getDocs(collection(db, 'classes'))
      ]);
      setAnnouncements(aSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setClasses(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'announcements'), {
        title: sanitize(form.title),
        message: sanitize(form.message),
        target: form.target,
        date: new Date().toISOString().split('T')[0],
        author: userData?.name || 'Unknown',
        authorRole: userData?.role || 'admin'
      });
      setShowModal(false);
      setForm({ title: '', message: '', target: 'all' });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try { await deleteDoc(doc(db, 'announcements', id)); fetchData(); } catch (err) { console.error(err); }
  };

  const canPost = userData?.role === 'admin' || userData?.role === 'teacher';
  const getClassName = (id) => classes.find(c => c.id === id)?.name || id;

  if (loading) return <Layout><div className="loading-spinner"><div className="spinner"></div></div></Layout>;

  return (
    <Layout>
      {canPost && !readOnly && (
        <div className="search-bar">
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><FiPlus /> New Announcement</button>
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="content-card"><div className="content-card-body">
          <div className="empty-state"><div className="empty-state-icon">📢</div><h3>No Announcements</h3><p>Nothing to show yet.</p></div>
        </div></div>
      ) : (
        announcements.map(a => (
          <div className="content-card" key={a.id}>
            <div className="content-card-header">
              <div>
                <h3>{a.title}</h3>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.date}</span>
                  <span className="badge badge-teacher">{a.author || 'Admin'}</span>
                  {a.target && a.target !== 'all' && <span className="badge badge-student">{getClassName(a.target)}</span>}
                  {a.target === 'all' && <span className="badge badge-present">All</span>}
                </div>
              </div>
              {canPost && !readOnly && (
                <button className="btn btn-icon btn-sm" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(a.id)}><FiTrash2 /></button>
              )}
            </div>
            <div className="content-card-body">
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{a.message}</p>
            </div>
          </div>
        ))
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>New Announcement</h3><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea className="form-input" rows={4} value={form.message} onChange={e => setForm({...form, message: e.target.value})} required style={{ resize: 'vertical' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Audience</label>
                  <select className="form-select" value={form.target} onChange={e => setForm({...form, target: e.target.value})}>
                    <option value="all">All</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Post Announcement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
