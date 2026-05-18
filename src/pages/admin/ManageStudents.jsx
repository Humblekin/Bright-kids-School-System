import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, updateDoc, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import Layout from '../../components/Layout';
import { sanitize, sortClasses } from '../../utils/sanitize';

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', classId: '', studentId: '', parentContact: '', gender: 'Male', dob: '' });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [studSnap, classSnap] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'classes'))
      ]);
      setStudents(studSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setClasses(sortClasses(classSnap.docs.map(d => ({ id: d.id, ...d.data() }))));
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  const generateStudentId = () => {
    const year = new Date().getFullYear();
    const existing = students
      .map(s => s.studentId)
      .filter(id => id?.startsWith(`BK-${year}`))
      .map(id => parseInt(id.split('-')[2], 10))
      .filter(n => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `BK-${year}-${String(next).padStart(3, '0')}`;
  };

  const openAdd = () => {
    setEditingStudent(null);
    setError('');
    setForm({ name: '', classId: '', studentId: generateStudentId(), parentContact: '', gender: 'Male', dob: '' });
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditingStudent(s);
    setError('');
    setForm({ name: s.name, classId: s.classId || '', studentId: s.studentId || '', parentContact: s.parentContact || '', gender: s.gender || 'Male', dob: s.dob || '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const name = sanitize(form.name);
    if (!name) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const data = { name, classId: form.classId, studentId: form.studentId, parentContact: sanitize(form.parentContact), gender: form.gender, dob: form.dob };
      if (editingStudent) {
        await updateDoc(doc(db, 'students', editingStudent.id), data);
      } else {
        await addDoc(collection(db, 'students'), data);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this student?')) return;
    try {
      await deleteDoc(doc(db, 'students', id));
      fetchData();
    } catch (err) { console.error(err); }
  };

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.studentId?.toLowerCase().includes(search.toLowerCase())
  );

  const getClassName = (classId) => classes.find(c => c.id === classId)?.name || '—';

  const classCounts = classes.map(c => ({
    ...c,
    count: students.filter(s => s.classId === c.id).length
  }));

  if (loading) return <Layout><div className="loading-spinner"><div className="spinner"></div></div></Layout>;

  return (
    <Layout>
      <div className="stats-grid" style={{ marginBottom: 16 }}>
        {classCounts.map(c => (
          <div key={c.id} className="stat-card" style={{ padding: '12px 16px' }}>
            <div className="stat-card-value" style={{ fontSize: 20 }}>{c.count}</div>
            <div className="stat-card-label">{c.name}</div>
          </div>
        ))}
      </div>

      <div className="search-bar">
        <div className="search-input-wrapper">
          <FiSearch className="search-icon" />
          <input className="search-input" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openAdd}><FiPlus /> Add Student</button>
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <h3>All Students ({filtered.length})</h3>
        </div>
        <div className="content-card-body" style={{ overflowX: 'auto' }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👨‍🎓</div>
              <h3>No Students Found</h3>
              <p>Add your first student to get started.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Student ID</th><th>Class</th><th>Gender</th><th>Parent Contact</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="name-cell">
                        <div className="avatar-sm">{s.name?.[0]}</div>
                        <strong style={{ color: 'var(--text)' }}>{s.name}</strong>
                      </div>
                    </td>
                    <td>{s.studentId || '—'}</td>
                    <td><span className="badge badge-student">{getClassName(s.classId)}</span></td>
                    <td>{s.gender || '—'}</td>
                    <td>{s.parentContact || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-icon btn-sm" onClick={() => openEdit(s)}><FiEdit2 /></button>
                        <button className="btn btn-icon btn-sm" onClick={() => handleDelete(s.id)} style={{ color: 'var(--accent-red)' }}><FiTrash2 /></button>
                      </div>
                    </td>
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
            <div className="modal-header">
              <h3>{editingStudent ? 'Edit Student' : 'Add Student'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div style={{ color: 'var(--accent-red)', fontSize: 13, marginBottom: 12, padding: 8, background: 'rgba(255,0,0,0.05)', borderRadius: 4 }}>{error}</div>}
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Student ID</label>
                    <input className="form-input" value={form.studentId} disabled style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Class</label>
                    <select className="form-select" value={form.classId} onChange={e => setForm({...form, classId: e.target.value})}>
                      <option value="">Select class</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select className="form-select" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-input" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Parent Contact</label>
                  <input className="form-input" value={form.parentContact} onChange={e => setForm({...form, parentContact: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editingStudent ? 'Update' : 'Add Student'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
