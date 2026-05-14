import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { FiDollarSign, FiPlus, FiSearch, FiCheck, FiX, FiFilter } from 'react-icons/fi';
import Layout from '../../components/Layout';

const FEE_TYPES = [
  { key: 'school', label: 'School Fees', color: 'blue' },
  { key: 'feeding', label: 'Feeding Fees', color: 'green' },
  { key: 'other', label: 'Other Fees', color: 'purple' },
];

const TERMS = [
  { key: 'first', label: 'First Term' },
  { key: 'second', label: 'Second Term' },
  { key: 'third', label: 'Third Term' },
];

export default function ManageFees() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [feeTypeFilter, setFeeTypeFilter] = useState('school');
  const [termFilter, setTermFilter] = useState('first');
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [otherFeeLabel, setOtherFeeLabel] = useState('');
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], note: '', term: 'first' });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [studSnap, classSnap, paymentsSnap] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'classes')),
        getDocs(query(collection(db, 'fees'), orderBy('date', 'desc'))),
      ]);
      setStudents(studSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setClasses(classSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPayments(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  const openPaymentModal = (student) => {
    setSelectedStudent(student);
    setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], note: '', term: 'first' });
    setOtherFeeLabel('');
    setShowModal(true);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'fees'), {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        classId: selectedStudent.classId,
        feeType: feeTypeFilter,
        feeSubType: feeTypeFilter === 'other' ? otherFeeLabel : '',
        term: paymentForm.term,
        amount: parseFloat(paymentForm.amount),
        date: paymentForm.date,
        note: paymentForm.note,
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      setToast({ type: 'success', message: `₵${paymentForm.amount} recorded for ${selectedStudent.name}` });
      fetchData();
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message });
    }
    setSaving(false);
  };

  const getStudentPayments = (studentId) => {
    return payments.filter(p => p.studentId === studentId && p.feeType === feeTypeFilter && p.term === termFilter);
  };

  const getTotalPaid = (studentId) => {
    return getStudentPayments(studentId).reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  const getClassName = (classId) => classes.find(c => c.id === classId)?.name || '—';

  const filteredStudents = students.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId?.toLowerCase().includes(search.toLowerCase());
    const matchClass = !classFilter || s.classId === classFilter;
    return matchSearch && matchClass;
  });

  if (loading) return <Layout><div className="loading-spinner"><div className="spinner"></div></div></Layout>;

  return (
    <Layout>
      <div className="search-bar">
        <div className="search-input-wrapper">
          <FiSearch className="search-icon" />
          <input className="search-input" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 'auto', minWidth: 150 }} value={classFilter} onChange={e => setClassFilter(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

        <div className="content-card">
          <div className="content-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h3><FiDollarSign style={{ marginRight: 8 }} />Fee Management</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                {FEE_TYPES.map(ft => (
                  <button
                    key={ft.key}
                    className={`btn btn-sm ${feeTypeFilter === ft.key ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFeeTypeFilter(ft.key)}
                  >
                    {ft.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {TERMS.map(t => (
                <button
                  key={t.key}
                  className={`btn btn-sm ${termFilter === t.key ? 'btn-success' : 'btn-secondary'}`}
                  onClick={() => setTermFilter(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        <div className="content-card-body" style={{ overflowX: 'auto' }}>
          {filteredStudents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💰</div>
              <h3>No Students Found</h3>
              <p>Add students first to manage their fees.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Student ID</th>
                  <th>Total Paid</th>
                  <th>Last Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(s => {
                  const studentPayments = getStudentPayments(s.id);
                  const totalPaid = studentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                  const lastPayment = studentPayments.length > 0 ? studentPayments[0] : null;
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="name-cell">
                          <div className="avatar-sm">{s.name?.[0]}</div>
                          <strong style={{ color: 'var(--text)' }}>{s.name}</strong>
                        </div>
                      </td>
                      <td><span className="badge badge-student">{getClassName(s.classId)}</span></td>
                      <td>{s.studentId || '—'}</td>
                      <td>
                        <strong style={{ color: totalPaid > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          ₵{totalPaid.toFixed(2)}
                        </strong>
                      </td>
                      <td>
                        {lastPayment ? (
                          <span style={{ fontSize: 13 }}>
                            ₵{lastPayment.amount.toFixed(2)} on {lastPayment.date}
                            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>{TERMS.find(t => t.key === lastPayment.term)?.label}</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No payments</span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => openPaymentModal(s)}>
                          <FiPlus /> Record Payment
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedStudent && (
        <div className="content-card">
          <div className="content-card-header">
            <h3>Payment History — {selectedStudent.name}</h3>
          </div>
          <div className="content-card-body" style={{ overflowX: 'auto' }}>
            {getStudentPayments(selectedStudent.id).length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <h3>No Payments Recorded</h3>
                <p>Record the first payment for this student.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>Fee Type</th><th>Term</th><th>Amount</th><th>Note</th></tr>
                </thead>
                <tbody>
                  {getStudentPayments(selectedStudent.id).map(p => (
                    <tr key={p.id}>
                      <td>{p.date}</td>
                      <td>
                        <span className={`badge badge-${p.feeType === 'school' ? 'admin' : p.feeType === 'feeding' ? 'student' : 'teacher'}`}>
                          {FEE_TYPES.find(f => f.key === p.feeType)?.label || p.feeType}
                        </span>
                        {p.feeSubType && <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.feeSubType}</span>}
                      </td>
                      <td><span className="badge badge-present">{TERMS.find(t => t.key === p.term)?.label || p.term}</span></td>
                      <td><strong>₵{p.amount?.toFixed(2)}</strong></td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'right', fontWeight: 700 }}>Total:</td>
                    <td colSpan="2"><strong style={{ color: 'var(--accent-green)' }}>₵{getTotalPaid(selectedStudent.id).toFixed(2)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Payment — {selectedStudent?.name}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handlePayment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Fee Type</label>
                  <input className="form-input" value={FEE_TYPES.find(f => f.key === feeTypeFilter)?.label} disabled />
                </div>
                {feeTypeFilter === 'other' && (
                  <div className="form-group">
                    <label className="form-label">Custom Fee Name</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Library Fee, Sports Fee, etc."
                      value={otherFeeLabel}
                      onChange={e => setOtherFeeLabel(e.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Amount (₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-input"
                    placeholder="e.g. 150.00"
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={paymentForm.date}
                    onChange={e => setPaymentForm({...paymentForm, date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Term</label>
                  <select
                    className="form-select"
                    value={paymentForm.term}
                    onChange={e => setPaymentForm({...paymentForm, term: e.target.value})}
                    required
                  >
                    {TERMS.map(t => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Note (Optional)</label>
                  <input
                    className="form-input"
                    placeholder="e.g. First term payment"
                    value={paymentForm.note}
                    onChange={e => setPaymentForm({...paymentForm, note: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : <><FiCheck /> Record Payment</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? <FiCheck /> : <FiX />}
          {toast.message}
        </div>
      )}
    </Layout>
  );
}
