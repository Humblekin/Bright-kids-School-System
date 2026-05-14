import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import Layout from '../../components/Layout';

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '' });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [sSnap, cSnap, tSnap] = await Promise.all([
        getDocs(collection(db, 'subjects')),
        getDocs(collection(db, 'classes')),
        getDocs(collection(db, 'teachers'))
      ]);
      setSubjects(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setClasses(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTeachers(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'subjects'), { name: form.name });
      setShowModal(false);
      setForm({ name: '' });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subject?')) return;
    try { await deleteDoc(doc(db, 'subjects', id)); fetchData(); } catch (err) { console.error(err); }
  };

  const getAssignedClasses = (subId) => classes.filter(c => (c.subjects || []).includes(subId)).map(c => c.name);
  const getAssignedTeachers = (subId) => teachers.filter(t => (t.subjects || []).includes(subId)).map(t => t.name);

  if (loading) return <Layout><div className="loading-spinner"><div className="spinner"></div></div></Layout>;

  return (
    <Layout>
      <div className="search-bar">
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><FiPlus /> Add Subject</button>
      </div>

      <div className="content-card">
        <div className="content-card-header"><h3>All Subjects ({subjects.length})</h3></div>
        <div className="content-card-body" style={{ overflowX: 'auto' }}>
          {subjects.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📚</div><h3>No Subjects Yet</h3><p>Create subjects like Math, English, Science.</p></div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Subject</th><th>Assigned Classes</th><th>Assigned Teachers</th><th>Actions</th></tr></thead>
              <tbody>
                {subjects.map(s => (
                  <tr key={s.id}>
                    <td><strong style={{ color: 'var(--text)' }}>{s.name}</strong></td>
                    <td>{getAssignedClasses(s.id).map(n => <span key={n} className="badge badge-student" style={{ marginRight: 4 }}>{n}</span>)}{getAssignedClasses(s.id).length === 0 && '—'}</td>
                    <td>{getAssignedTeachers(s.id).map(n => <span key={n} className="badge badge-teacher" style={{ marginRight: 4 }}>{n}</span>)}{getAssignedTeachers(s.id).length === 0 && '—'}</td>
                    <td><button className="btn btn-icon btn-sm" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(s.id)}><FiTrash2 /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Add Subject</h3><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Subject Name</label>
                  <input className="form-input" placeholder="e.g. Mathematics" value={form.name} onChange={e => setForm({ name: e.target.value })} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
