import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { FiCheck, FiSave } from 'react-icons/fi';
import Layout from '../../components/Layout';

export default function TakeAttendance() {
  const { userData } = useAuth();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const [tSnap, cSnap, sSnap] = await Promise.all([
          getDocs(collection(db, 'teachers')),
          getDocs(collection(db, 'classes')),
          getDocs(collection(db, 'students'))
        ]);
        const teachers = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const allClasses = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const allStudents = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log('TakeAttendance | userData:', JSON.stringify(userData));
        console.log('TakeAttendance | teachers:', JSON.stringify(teachers.map(t => ({ id: t.id, name: t.name, classes: t.classes }))));
        console.log('TakeAttendance | allClasses:', JSON.stringify(allClasses.map(c => ({ id: c.id, name: c.name }))));
        const me = teachers.find(t => t.id === userData?.uid || t.name === userData?.name);
        console.log('TakeAttendance | matched teacher:', me ? JSON.stringify({ id: me.id, name: me.name, classes: me.classes }) : 'NOT FOUND');
        let myClasses = me ? allClasses.filter(c => (me.classes || []).includes(c.id)) : allClasses;
        if (me && (me.classes || []).length > 0 && myClasses.length === 0) {
          console.warn('Teacher has assigned class IDs but no matching classes found. Showing all classes.');
          myClasses = allClasses;
        }
        setClasses(myClasses);
        setStudents(allStudents);
      } catch (err) { console.error(err); }
      setLoading(false);
    }
    fetch();
  }, [userData]);

  useEffect(() => {
    if (selectedClass && date) loadExisting();
  }, [selectedClass, date]);

  async function loadExisting() {
    try {
      const docId = `${selectedClass}_${date}`;
      const snap = await getDoc(doc(db, 'attendance', docId));
      if (snap.exists()) {
        const data = snap.data();
        const rec = {};
        (data.records || []).forEach(r => { rec[r.studentId] = r.status; });
        setRecords(rec);
      } else {
        setRecords({});
      }
    } catch (err) { console.error(err); }
  }

  const classStudents = students.filter(s => s.classId === selectedClass);

  const setStatus = (studentId, status) => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const docId = `${selectedClass}_${date}`;
      const recs = Object.entries(records).map(([studentId, status]) => ({ studentId, status }));
      await setDoc(doc(db, 'attendance', docId), {
        classId: selectedClass,
        date,
        records: recs,
        takenBy: userData?.name || 'Unknown'
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  if (loading) return <Layout><div className="loading-spinner"><div className="spinner"></div></div></Layout>;

  return (
    <Layout>
      <div className="content-card">
        <div className="content-card-header"><h3>Take Attendance</h3></div>
        <div className="content-card-body">
          <div className="form-row" style={{ marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">Select Class</label>
              <select className="form-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                <option value="">Choose a class...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {selectedClass && (
        <div className="content-card">
          <div className="content-card-header">
            <h3>Students ({classStudents.length})</h3>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              <FiSave /> {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
          <div className="content-card-body">
            {classStudents.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">👨‍🎓</div><h3>No Students in this Class</h3></div>
            ) : (
              <div className="attendance-grid">
                {classStudents.map(s => (
                  <div className="attendance-row" key={s.id}>
                    <div className="name-cell">
                      <div className="avatar-sm">{s.name?.[0]}</div>
                      <div>
                        <strong style={{ color: 'var(--text)', fontSize: 14 }}>{s.name}</strong>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.studentId || ''}</div>
                      </div>
                    </div>
                    <div className="attendance-actions">
                      <button className={`att-btn present ${records[s.id] === 'present' ? 'selected' : ''}`} onClick={() => setStatus(s.id, 'present')}>Present</button>
                      <button className={`att-btn absent ${records[s.id] === 'absent' ? 'selected' : ''}`} onClick={() => setStatus(s.id, 'absent')}>Absent</button>
                      <button className={`att-btn late ${records[s.id] === 'late' ? 'selected' : ''}`} onClick={() => setStatus(s.id, 'late')}>Late</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {saved && <div className="toast toast-success"><FiCheck /> Attendance saved successfully!</div>}
    </Layout>
  );
}
