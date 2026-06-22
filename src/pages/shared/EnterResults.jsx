import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { FiSave, FiCheck } from 'react-icons/fi';
import Layout from '../../components/Layout';
import { sortClasses } from '../../utils/sanitize';

export default function EnterResults() {
  const { userData } = useAuth();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [results, setResults] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const [tSnap, cSnap, sSnap, stSnap] = await Promise.all([
          getDocs(collection(db, 'teachers')),
          getDocs(collection(db, 'classes')),
          getDocs(collection(db, 'subjects')),
          getDocs(collection(db, 'students'))
        ]);
        const allClasses = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const allSubjects = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const allStudents = stSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (userData?.role === 'teacher') {
          const teachers = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          const me = teachers.find(t => t.id === userData?.uid || t.name === userData?.name);
          let myClasses = me ? allClasses.filter(c => (me.classes || []).includes(c.id)) : allClasses;
          let mySubjects = me ? allSubjects.filter(s => (me.subjects || []).includes(s.id)) : allSubjects;
          if (me && (me.classes || []).length > 0 && myClasses.length === 0) {
            myClasses = allClasses;
          }
          if (me && (me.subjects || []).length > 0 && mySubjects.length === 0) {
            mySubjects = allSubjects;
          }
          setClasses(sortClasses(myClasses));
          setSubjects(mySubjects);
        } else {
          setClasses(sortClasses(allClasses));
          setSubjects(allSubjects);
        }
        setStudents(allStudents);
      } catch (err) { console.error(err); }
      setLoading(false);
    }
    fetch();
  }, [userData]);

  useEffect(() => {
    if (selectedClass && selectedSubject && term) loadExistingResults();
  }, [selectedClass, selectedSubject, term]);

  async function loadExistingResults() {
    try {
      const snap = await getDocs(collection(db, 'results'));
      const existing = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const res = {};
      existing.forEach(r => {
        if (r.subject === selectedSubject && r.term === term) {
          res[r.studentId] = {
            classScore: r.classScore || 0,
            examScore: r.examScore || 0
          };
        }
      });
      setResults(res);
    } catch (err) { console.error(err); }
  }

  const classStudents = students.filter(s => s.classId === selectedClass);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const student of classStudents) {
        const data = results[student.id] || { classScore: 0, examScore: 0 };
        const docId = `${student.id}_${selectedSubject}_${term}`;
        await setDoc(doc(db, 'results', docId), {
          studentId: student.id,
          subject: selectedSubject,
          classScore: Number(data.classScore),
          examScore: Number(data.examScore),
          term,
          classId: selectedClass,
          enteredBy: userData?.name || 'Unknown'
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const getSubjectName = (id) => subjects.find(s => s.id === id)?.name || id;

  if (loading) return <Layout><div className="loading-spinner"><div className="spinner"></div></div></Layout>;

  return (
    <Layout>
      <div className="content-card">
        <div className="content-card-header"><h3>Enter Results</h3></div>
        <div className="content-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Class</label>
              <select className="form-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                <option value="">Select class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <select className="form-select" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Term</label>
              <select className="form-select" value={term} onChange={e => setTerm(e.target.value)}>
                <option>Term 1</option>
                <option>Term 2</option>
                <option>Term 3</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {selectedClass && selectedSubject && (
        <div className="content-card">
          <div className="content-card-header">
            <h3>Scores — {getSubjectName(selectedSubject)} ({term})</h3>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              <FiSave /> {saving ? 'Saving...' : 'Save Results'}
            </button>
          </div>
          <div className="content-card-body" style={{ overflowX: 'auto' }}>
            {classStudents.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">📝</div><h3>No Students</h3></div>
            ) : (
              <table className="data-table" style={{ minWidth: 500 }}>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Class Score (30%)</th>
                    <th>Exam Score (70%)</th>
                    <th>Total (100%)</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map(s => {
                    const data = results[s.id] || { classScore: '', examScore: '' };
                    const total = (Number(data.classScore) || 0) + (Number(data.examScore) || 0);
                    return (
                      <tr key={s.id}>
                        <td>
                          <div className="name-cell">
                            <div className="avatar-sm">{s.name?.[0]}</div>
                            <strong style={{ color: 'var(--text)', fontSize: 14 }}>{s.name}</strong>
                          </div>
                        </td>
                        <td>
                          <input
                            type="number" min="0" max="100" className="form-input"
                            style={{ width: 80, textAlign: 'center' }}
                            value={data.classScore}
                            onChange={e => setResults(prev => ({ ...prev, [s.id]: { ...data, classScore: e.target.value } }))}
                          />
                        </td>
                        <td>
                          <input
                            type="number" min="0" max="100" className="form-input"
                            style={{ width: 80, textAlign: 'center' }}
                            value={data.examScore}
                            onChange={e => setResults(prev => ({ ...prev, [s.id]: { ...data, examScore: e.target.value } }))}
                          />
                        </td>
                        <td>
                          <strong style={{ fontSize: 16, color: 'var(--primary)' }}>{total}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {saved && <div className="toast toast-success"><FiCheck /> Results saved successfully!</div>}
    </Layout>
  );
}
