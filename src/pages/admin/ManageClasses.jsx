import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import Layout from '../../components/Layout';

export default function ManageClasses() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', subjects: [] });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [cSnap, sSnap, stSnap] = await Promise.all([
        getDocs(collection(db, 'classes')),
        getDocs(collection(db, 'subjects')),
        getDocs(collection(db, 'students'))
      ]);
      setClasses(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSubjects(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setStudents(stSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  const openAdd = () => { setEditing(null); setForm({ name: '', subjects: [] }); setShowModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, subjects: c.subjects || [] }); setShowModal(true); };

  const toggleSubject = (id) => {
    setForm(prev => ({
      ...prev,
      subjects: prev.subjects.includes(id) ? prev.subjects.filter(x => x !== id) : [...prev.subjects, id]
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await updateDoc(doc(db, 'classes', editing.id), form); }
      else { await addDoc(collection(db, 'classes'), form); }
      setShowModal(false); fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this class?')) return;
    try { await deleteDoc(doc(db, 'classes', id)); fetchData(); } catch (err) { console.error(err); }
  };

  const getStudentCount = (classId) => students.filter(s => s.classId === classId).length;
  const getSubjectNames = (ids) => ids?.map(id => subjects.find(s => s.id === id)?.name).filter(Boolean).join(', ') || '—';
  
  const filtered = classes.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <Layout><div className="loading-spinner"><div className="spinner"></div></div></Layout>;

  return (
    <Layout>
      <div className="search-bar">
        <div className="search-input-wrapper">
          <FiSearch className="search-icon" />
          <input className="search-input" placeholder="Search classes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openAdd}><FiPlus /> Add Class</button>
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <h3>All Classes ({filtered.length})</h3>
        </div>
        <div className="content-card-body" style={{ overflowX: 'auto' }}>
          {filtered.length === 0 ? (
             <div className="empty-state"><div className="empty-state-icon">🏫</div><h3>No Classes Found</h3><p>Create your first class to organize students.</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Class Name</th>
                  <th>Students Enrolled</th>
                  <th>Assigned Subjects</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <strong style={{ color: 'var(--text)', fontSize: 15 }}>{c.name}</strong>
                    </td>
                    <td>
                      <span className="badge badge-student">{getStudentCount(c.id)} students</span>
                    </td>
                    <td style={{ maxWidth: 300 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(c.subjects || []).map(sid => {
                          const subj = subjects.find(s => s.id === sid);
                          return subj ? <span key={sid} className="badge badge-teacher" style={{ fontSize: 11 }}>{subj.name}</span> : null;
                        })}
                        {(!c.subjects || c.subjects.length === 0) && <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-icon btn-sm" onClick={() => openEdit(c)}><FiEdit2 /></button>
                        <button className="btn btn-icon btn-sm" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(c.id)}><FiTrash2 /></button>
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
            <div className="modal-header"><h3>{editing ? 'Edit Class' : 'Add Class'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Class Name</label>
                  <input className="form-input" placeholder="e.g. JHS 1" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Assign Subjects</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {subjects.map(s => (
                      <button type="button" key={s.id} className={`att-btn ${form.subjects.includes(s.id) ? 'present selected' : ''}`} onClick={() => toggleSubject(s.id)}>{s.name}</button>
                    ))}
                    {subjects.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Create subjects first</span>}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create Class'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
