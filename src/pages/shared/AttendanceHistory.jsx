import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Layout from '../../components/Layout';
import { FiCalendar, FiCheck, FiX, FiClock, FiUser } from 'react-icons/fi';

const statusColors = {
  present: { bg: 'var(--accent-green-50, #e6f7e6)', color: 'var(--accent-green, #22c55e)', label: 'Present' },
  absent: { bg: 'var(--accent-red-50, #fde8e8)', color: 'var(--accent-red, #ef4444)', label: 'Absent' },
  late: { bg: 'var(--accent-orange-50, #fff3e0)', color: 'var(--accent-orange, #f97316)', label: 'Late' },
};

export default function AttendanceHistory() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    async function fetch() {
      try {
        const [cSnap, sSnap] = await Promise.all([
          getDocs(collection(db, 'classes')),
          getDocs(collection(db, 'students'))
        ]);
        setClasses(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error(err); }
      setLoading(false);
    }
    fetch();
  }, []);

  useEffect(() => {
    if (!selectedClass || !selectedStudent) { setRecords([]); return; }
    async function load() {
      setLoadingRecords(true);
      try {
        const q = query(collection(db, 'attendance'), where('classId', '==', selectedClass));
        const snap = await getDocs(q);
        const all = [];
        snap.forEach(doc => {
          const data = doc.data();
          const studentRecord = (data.records || []).find(r => r.studentId === selectedStudent);
          if (studentRecord) all.push({ date: data.date, status: studentRecord.status });
        });
        all.sort((a, b) => b.date.localeCompare(a.date));
        setRecords(all);
      } catch (err) { console.error(err); setRecords([]); }
      setLoadingRecords(false);
    }
    load();
  }, [selectedClass, selectedStudent]);

  const classStudents = students.filter(s => s.classId === selectedClass);
  const selectedStudentData = students.find(s => s.id === selectedStudent);
  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const late = records.filter(r => r.status === 'late').length;

  if (loading) return <Layout><div className="loading-spinner"><div className="spinner"></div></div></Layout>;

  return (
    <Layout>
      <div className="content-card">
        <div className="content-card-header"><h3>Attendance History</h3></div>
        <div className="content-card-body">
          <div className="filters-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Select Class</label>
              <select className="form-select" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedStudent(''); }}>
                <option value="">Choose a class...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Select Student</label>
              <select className="form-select" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} disabled={!selectedClass}>
                <option value="">Choose a student...</option>
                {classStudents.map(s => <option key={s.id} value={s.id}>{s.name} ({s.studentId || ''})</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {selectedClass && selectedStudent && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-icon green"><FiCheck /></div>
              <div className="stat-card-value">{present}</div>
              <div className="stat-card-label">Present</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon red"><FiX /></div>
              <div className="stat-card-value">{absent}</div>
              <div className="stat-card-label">Absent</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon orange"><FiClock /></div>
              <div className="stat-card-value">{late}</div>
              <div className="stat-card-label">Late</div>
            </div>
          </div>

          <div className="content-card">
            <div className="content-card-header">
              <h3><FiUser style={{ marginRight: 8 }} />{selectedStudentData?.name || ''}</h3>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{records.length} day{records.length !== 1 ? 's' : ''} recorded</span>
            </div>
            <div className="content-card-body" style={{ overflowX: 'auto' }}>
              {loadingRecords ? (
                <div className="loading-spinner"><div className="spinner"></div></div>
              ) : records.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><FiCalendar /></div>
                  <h3>No Attendance Records Found</h3>
                  <p>Attendance hasn't been taken for this student yet.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => {
                      const sc = statusColors[r.status] || {};
                      const dateObj = new Date(r.date + 'T00:00:00');
                      const formatted = dateObj.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                      return (
                        <tr key={r.date}>
                          <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                          <td><strong style={{ color: 'var(--text)' }}>{formatted}</strong></td>
                          <td>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              padding: '4px 12px', borderRadius: '20px',
                              fontSize: 13, fontWeight: 600,
                              background: sc.bg || '#eee', color: sc.color || '#666'
                            }}>
                              {r.status === 'present' ? <FiCheck /> : r.status === 'absent' ? <FiX /> : <FiClock />}
                              {sc.label || r.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
