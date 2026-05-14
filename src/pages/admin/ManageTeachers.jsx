import { useState, useEffect } from 'react';
import { db, secondaryAuth } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import Layout from '../../components/Layout';

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', subjects: [], classes: [] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [tSnap, cSnap, sSnap] = await Promise.all([
        getDocs(collection(db, 'teachers')),
        getDocs(collection(db, 'classes')),
        getDocs(collection(db, 'subjects'))
      ]);
      setTeachers(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setClasses(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSubjects(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  const openAdd = () => { 
    setEditing(null); 
    setError('');
    setForm({ name: '', email: '', password: '', subjects: [], classes: [] }); 
    setShowModal(true); 
  };
  
  const openEdit = (t) => { 
    setEditing(t); 
    setError('');
    setForm({ name: t.name, email: '', password: '', subjects: t.subjects || [], classes: t.classes || [] }); 
    setShowModal(true); 
  };

  const toggleItem = (field, id) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(id) ? prev[field].filter(x => x !== id) : [...prev[field], id]
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) { 
        // Editing existing teacher (does not update email/password)
        await updateDoc(doc(db, 'teachers', editing.id), {
          name: form.name,
          subjects: form.subjects,
          classes: form.classes
        }); 
      }
      else { 
        // Create new teacher Auth account
        if (!form.email || !form.password) {
          setError("Email and Password are required for new teachers.");
          setSaving(false);
          return;
        }
        
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password);
        const uid = userCred.user.uid;
        
        // Register role in users collection
        await setDoc(doc(db, 'users', uid), {
          name: form.name,
          role: 'teacher'
        });

        // Add to teachers collection
        await setDoc(doc(db, 'teachers', uid), {
          name: form.name,
          subjects: form.subjects,
          classes: form.classes,
          email: form.email
        });
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
    if (!window.confirm('Delete this teacher? NOTE: This does not delete their login account from Authentication.')) return;
    try { await deleteDoc(doc(db, 'teachers', id)); fetchData(); } catch (err) { console.error(err); }
  };

  const filtered = teachers.filter(t => t.name?.toLowerCase().includes(search.toLowerCase()));
  const getNames = (ids, list) => ids?.map(id => list.find(x => x.id === id)?.name).filter(Boolean).join(', ') || '—';

  if (loading) return <Layout><div className="loading-spinner"><div className="spinner"></div></div></Layout>;

  return (
    <Layout>
      <div className="search-bar">
        <div className="search-input-wrapper">
          <FiSearch className="search-icon" />
          <input className="search-input" placeholder="Search teachers..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openAdd}><FiPlus /> Add Teacher</button>
      </div>
      <div className="content-card">
        <div className="content-card-header"><h3>All Teachers ({filtered.length})</h3></div>
        <div className="content-card-body" style={{ overflowX: 'auto' }}>
          {filtered.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">👩‍🏫</div><h3>No Teachers Found</h3><p>Add your first teacher.</p></div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Subjects</th><th>Classes</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td><div className="name-cell"><div className="avatar-sm">{t.name?.[0]}</div><strong style={{ color: 'var(--text)' }}>{t.name}</strong></div></td>
                    <td>{t.email || '—'}</td>
                    <td style={{ maxWidth: 200 }}>{getNames(t.subjects, subjects)}</td>
                    <td>{getNames(t.classes, classes)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-icon btn-sm" onClick={() => openEdit(t)}><FiEdit2 /></button>
                        <button className="btn btn-icon btn-sm" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(t.id)}><FiTrash2 /></button>
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
            <div className="modal-header"><h3>{editing ? 'Edit Teacher' : 'Add Teacher'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div style={{ color: 'var(--accent-red)', fontSize: 13, marginBottom: 12, padding: 8, background: 'rgba(255,0,0,0.05)', borderRadius: 4 }}>{error}</div>}
                
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                
                {!editing && (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Email Address (Login)</label>
                      <input type="email" className="form-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required={!editing} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <input type="password" minLength="6" className="form-input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editing} />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Assign Subjects</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {subjects.map(s => (
                      <button type="button" key={s.id} className={`att-btn ${form.subjects.includes(s.id) ? 'present selected' : ''}`} onClick={() => toggleItem('subjects', s.id)}>{s.name}</button>
                    ))}
                    {subjects.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No subjects created yet</span>}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Assign Classes</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {classes.map(c => (
                      <button type="button" key={c.id} className={`att-btn ${form.classes.includes(c.id) ? 'present selected' : ''}`} onClick={() => toggleItem('classes', c.id)}>{c.name}</button>
                    ))}
                    {classes.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No classes created yet</span>}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Add Teacher'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
