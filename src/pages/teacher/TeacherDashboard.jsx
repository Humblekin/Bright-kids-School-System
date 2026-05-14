import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { FiUsers, FiCalendar, FiClipboard } from 'react-icons/fi';
import Layout from '../../components/Layout';

export default function TeacherDashboard() {
  const { userData } = useAuth();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const [tSnap, cSnap, sSnap] = await Promise.all([
          getDocs(collection(db, 'teachers')),
          getDocs(collection(db, 'classes')),
          getDocs(collection(db, 'subjects'))
        ]);
        const allTeachers = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const allClasses = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const allSubjects = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const me = allTeachers.find(t => t.id === userData?.uid || t.name === userData?.name);
        setTeacher(me || null);
        if (me) {
          let myClasses = allClasses.filter(c => (me.classes || []).includes(c.id));
          let mySubjects = allSubjects.filter(s => (me.subjects || []).includes(s.id));
          if ((me.classes || []).length > 0 && myClasses.length === 0) {
            console.warn('Teacher has assigned class IDs but no matching classes found.');
            myClasses = allClasses;
          }
          if ((me.subjects || []).length > 0 && mySubjects.length === 0) {
            console.warn('Teacher has assigned subject IDs but no matching subjects found.');
            mySubjects = allSubjects;
          }
          setClasses(myClasses);
          setSubjects(mySubjects);
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    }
    fetch();
  }, [userData]);

  if (loading) return <Layout><div className="loading-spinner"><div className="spinner"></div></div></Layout>;

  return (
    <Layout>
      <div style={{ marginBottom: 24, padding: '24px', background: 'linear-gradient(135deg, var(--primary), var(--accent-purple))', borderRadius: 'var(--radius-lg)', color: '#fff' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Welcome, {userData?.name || 'Teacher'} 👋</h2>
        <p style={{ opacity: 0.8, fontSize: 14 }}>Here's an overview of your assigned classes and subjects.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon blue"><FiUsers /></div>
          <div className="stat-card-value">{classes.length}</div>
          <div className="stat-card-label">Assigned Classes</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><FiClipboard /></div>
          <div className="stat-card-value">{subjects.length}</div>
          <div className="stat-card-label">Assigned Subjects</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon orange"><FiCalendar /></div>
          <div className="stat-card-value">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          <div className="stat-card-label">Today's Date</div>
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-header"><h3>My Classes</h3></div>
        <div className="content-card-body">
          {classes.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📚</div><h3>No Classes Assigned</h3><p>Contact admin to assign classes.</p></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {classes.map(c => (
                <div key={c.id} style={{ padding: 20, background: 'var(--primary-50)', borderRadius: 'var(--radius)', border: '1px solid var(--primary-200)' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(c.subjects || []).length} subjects</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-header"><h3>My Subjects</h3></div>
        <div className="content-card-body">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {subjects.map(s => <span key={s.id} className="badge badge-teacher" style={{ padding: '8px 16px', fontSize: 13 }}>{s.name}</span>)}
            {subjects.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>No subjects assigned yet.</span>}
          </div>
        </div>
      </div>
    </Layout>
  );
}
