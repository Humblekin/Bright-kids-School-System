import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { FiPrinter } from 'react-icons/fi';
import Layout from '../../components/Layout';
import { sortClasses } from '../../utils/sanitize';

export default function ReportCards() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [allResults, setAllResults] = useState([]);
  const [school, setSchool] = useState({ schoolName: 'BRIGHT KIDS SCHOOL COMPLEX', academicYear: '2025/2026', badgeUrl: '' });
  const [loading, setLoading] = useState(true);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');

  useEffect(() => {
    async function fetchData() {
      try {
        const [cSnap, sSnap, stSnap, rSnap, schoolSnap] = await Promise.all([
          getDocs(collection(db, 'classes')),
          getDocs(collection(db, 'subjects')),
          getDocs(collection(db, 'students')),
          getDocs(collection(db, 'results')),
          getDoc(doc(db, 'settings', 'school'))
        ]);
        setClasses(sortClasses(cSnap.docs.map(d => ({ id: d.id, ...d.data() }))));
        setSubjects(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setStudents(stSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setAllResults(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        if (schoolSnap.exists()) {
          setSchool({ schoolName: schoolSnap.data().schoolName || 'BRIGHT KIDS SCHOOL COMPLEX', academicYear: schoolSnap.data().academicYear || '2025/2026', badgeUrl: schoolSnap.data().badgeUrl || '' });
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    }
    fetchData();
  }, []);

  const classStudents = students.filter(s => s.classId === selectedClass);
  const getSubjectName = (id) => subjects.find(s => s.id === id)?.name || id;

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <Layout><div className="loading-spinner"><div className="spinner"></div></div></Layout>;

  return (
    <Layout>
      <style>{`
        @media print {
          .sidebar, .top-bar, .search-bar, .print-hide { display: none !important; }
          .main-content { margin-left: 0 !important; }
          .page-content { padding: 0 !important; background: white !important; }
          .report-card { page-break-after: always; box-shadow: none !important; border: 1px solid #ccc !important; margin: 0 !important; margin-bottom: 20px !important; }
          body { background: white; }
        }
      `}</style>

      <div className="search-bar print-hide">
        <div className="form-group" style={{ margin: 0, display: 'flex', gap: 12 }}>
          <select className="form-select" style={{ width: 200 }} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">Select a Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="form-select" style={{ width: 150 }} value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Term 3</option>
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={handlePrint} disabled={!selectedClass || classStudents.length === 0}>
          <FiPrinter /> Print Report Cards
        </button>
      </div>

      {!selectedClass ? (
        <div className="content-card print-hide">
          <div className="content-card-body">
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>Select a Class</h3>
              <p>Choose a class and term to generate report cards.</p>
            </div>
          </div>
        </div>
      ) : classStudents.length === 0 ? (
        <div className="content-card print-hide">
          <div className="content-card-body">
            <div className="empty-state">
              <div className="empty-state-icon">👨‍🎓</div>
              <h3>No Students Found</h3>
              <p>There are no students assigned to this class yet.</p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {classStudents.map(student => {
            const studentResults = allResults.filter(r => r.studentId === student.id && r.term === selectedTerm);
            let overallTotal = 0;
            let subjectCount = 0;

            return (
              <div key={student.id} className="content-card report-card">
                <div style={{ padding: '30px 40px', borderBottom: '2px solid var(--primary)', textAlign: 'center' }}>
                  {school.badgeUrl && (
                    <img src={school.badgeUrl} alt="School Badge" style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 12 }} />
                  )}
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-dark)', marginBottom: 4 }}>{school.schoolName}</h1>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>STUDENT REPORT CARD</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Academic Year: {school.academicYear} | Term: {selectedTerm}</p>
                </div>
                
                <div className="content-card-body" style={{ padding: '30px 40px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30, paddingBottom: 20, borderBottom: '1px solid var(--border-light)' }}>
                    <div>
                      <div style={{ marginBottom: 8 }}><span style={{ color: 'var(--text-muted)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Name:</span> <strong style={{ fontSize: 16 }}>{student.name}</strong></div>
                      <div style={{ marginBottom: 8 }}><span style={{ color: 'var(--text-muted)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Student ID:</span> <strong style={{ fontSize: 16 }}>{student.studentId || 'N/A'}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Class:</span> <strong style={{ fontSize: 16 }}>{classes.find(c => c.id === selectedClass)?.name}</strong></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ marginBottom: 8 }}><span style={{ color: 'var(--text-muted)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Gender:</span> <strong style={{ fontSize: 16 }}>{student.gender || 'N/A'}</strong></div>
                      <div style={{ marginBottom: 8 }}><span style={{ color: 'var(--text-muted)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Date of Birth:</span> <strong style={{ fontSize: 16 }}>{student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A'}</strong></div>
                    </div>
                  </div>

                  <table className="data-table" style={{ border: '1px solid var(--border)' }}>
                    <thead style={{ background: 'var(--bg)' }}>
                      <tr>
                        <th style={{ borderBottom: '2px solid var(--border)' }}>Subject</th>
                        <th style={{ borderBottom: '2px solid var(--border)' }}>Class Score</th>
                        <th style={{ borderBottom: '2px solid var(--border)' }}>Exam Score</th>
                        <th style={{ borderBottom: '2px solid var(--border)' }}>Total</th>
                        <th style={{ borderBottom: '2px solid var(--border)' }}>Grade</th>
                        <th style={{ borderBottom: '2px solid var(--border)' }}>Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentResults.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: 20 }}>No results entered for this term.</td></tr>
                      ) : (
                        studentResults.map(r => {
                          const classScore = Number(r.classScore) || 0;
                          const examScore = Number(r.examScore) || 0;
                          const total = classScore + examScore;
                          
                          overallTotal += total;
                          subjectCount++;

                          let grade = 'F9';
                          let remark = 'Fail';
                          if (total >= 80) { grade = 'A1'; remark = 'Excellent'; }
                          else if (total >= 75) { grade = 'B2'; remark = 'Very Good'; }
                          else if (total >= 70) { grade = 'B3'; remark = 'Good'; }
                          else if (total >= 65) { grade = 'C4'; remark = 'Credit'; }
                          else if (total >= 60) { grade = 'C5'; remark = 'Credit'; }
                          else if (total >= 55) { grade = 'C6'; remark = 'Credit'; }
                          else if (total >= 50) { grade = 'D7'; remark = 'Pass'; }
                          else if (total >= 45) { grade = 'E8'; remark = 'Weak Pass'; }

                          return (
                            <tr key={r.id}>
                              <td style={{ fontWeight: 600 }}>{getSubjectName(r.subject)}</td>
                              <td>{classScore}</td>
                              <td>{examScore}</td>
                              <td><strong>{total}</strong></td>
                              <td><strong>{grade}</strong></td>
                              <td style={{ color: 'var(--text-secondary)' }}>{remark}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  <div style={{ marginTop: 30, display: 'flex', justifyContent: 'space-between', padding: 20, background: 'var(--primary-50)', borderRadius: 'var(--radius)' }}>
                    <div><span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Overall Total Score:</span> <strong style={{ fontSize: 18 }}>{overallTotal}</strong></div>
                    <div><span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Average:</span> <strong style={{ fontSize: 18, color: (subjectCount ? (overallTotal / subjectCount) : 0) >= 50 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{subjectCount ? Math.round(overallTotal / subjectCount) : 0}%</strong></div>
                  </div>

                  <div style={{ marginTop: 50, display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ width: 200, borderTop: '1px solid var(--border)', paddingTop: 8, textAlign: 'center', fontSize: 13 }}>Class Teacher's Signature</div>
                    <div style={{ width: 200, borderTop: '1px solid var(--border)', paddingTop: 8, textAlign: 'center', fontSize: 13 }}>Headmaster's Signature</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
