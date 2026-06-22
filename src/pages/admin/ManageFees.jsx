import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, query, orderBy, serverTimestamp, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { FiDollarSign, FiPlus, FiSearch, FiCheck, FiX, FiSettings, FiActivity, FiUser, FiCalendar, FiArrowRight, FiTrash2 } from 'react-icons/fi';
import Layout from '../../components/Layout';
import { sanitize, sortClasses } from '../../utils/sanitize';

const ACADEMIC_MONTHS = [
  { name: 'January', index: 1 },
  { name: 'February', index: 2 },
  { name: 'March', index: 3 },
  { name: 'April', index: 4 },
  { name: 'May', index: 5 },
  { name: 'June', index: 6 },
  { name: 'July', index: 7 },
  { name: 'August', index: 8 },
  { name: 'September', index: 9 },
  { name: 'October', index: 10 },
  { name: 'November', index: 11 },
  { name: 'December', index: 12 },
];

const isMonthDue = (monthName) => {
  const now = new Date();
  const currentMonthNum = now.getMonth() + 1; // 1-indexed: 1 = Jan, 12 = Dec
  const target = ACADEMIC_MONTHS.find(m => m.name === monthName);
  if (!target) return false;
  if (currentMonthNum === 8) return true; // August (holiday) means all academic months are due

  const getAcademicOrder = (monthIndex) => monthIndex >= 9 ? monthIndex - 8 : monthIndex + 4;
  const targetOrder = getAcademicOrder(target.index);
  const currentOrder = getAcademicOrder(currentMonthNum);

  return targetOrder <= currentOrder;
};

export default function ManageFees() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [feeSettings, setFeeSettings] = useState({
    defaultSchoolFee: 150,
    defaultFeedingFee: 50,
    classSchoolFees: {},
    classFeedingFees: {},
  });
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [feeTypeFilter, setFeeTypeFilter] = useState('school'); // 'school', 'feeding', 'other'
  
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  
  const [otherFeeLabel, setOtherFeeLabel] = useState('');
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], note: '', paymentMethod: 'Cash' });
  
  const [settingsForm, setSettingsForm] = useState({
    defaultSchoolFee: '150',
    defaultFeedingFee: '50',
    classSchoolFees: {},
    classFeedingFees: {},
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [studSnap, classSnap, paymentsSnap, settingsSnap] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'classes')),
        getDocs(query(collection(db, 'fees'), orderBy('date', 'desc'))),
        getDoc(doc(db, 'settings', 'fees')),
      ]);

      const loadedClasses = sortClasses(classSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setStudents(studSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setClasses(loadedClasses);
      setPayments(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        const config = {
          defaultSchoolFee: data.defaultSchoolFee || 150,
          defaultFeedingFee: data.defaultFeedingFee || 50,
          classSchoolFees: data.classSchoolFees || {},
          classFeedingFees: data.classFeedingFees || {},
        };
        setFeeSettings(config);
        
        // Initialize settings form
        const initialClassSchool = {};
        const initialClassFeeding = {};
        loadedClasses.forEach(c => {
          initialClassSchool[c.id] = config.classSchoolFees[c.id]?.toString() || '';
          initialClassFeeding[c.id] = config.classFeedingFees[c.id]?.toString() || '';
        });
        
        setSettingsForm({
          defaultSchoolFee: config.defaultSchoolFee.toString(),
          defaultFeedingFee: config.defaultFeedingFee.toString(),
          classSchoolFees: initialClassSchool,
          classFeedingFees: initialClassFeeding,
        });
      } else {
        const initialClassSchool = {};
        const initialClassFeeding = {};
        loadedClasses.forEach(c => {
          initialClassSchool[c.id] = '';
          initialClassFeeding[c.id] = '';
        });
        setSettingsForm(prev => ({
          ...prev,
          classSchoolFees: initialClassSchool,
          classFeedingFees: initialClassFeeding,
        }));
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const showToastMsg = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const classSchool = {};
      const classFeeding = {};
      Object.keys(settingsForm.classSchoolFees).forEach(cid => {
        if (settingsForm.classSchoolFees[cid]) classSchool[cid] = parseFloat(settingsForm.classSchoolFees[cid]);
      });
      Object.keys(settingsForm.classFeedingFees).forEach(cid => {
        if (settingsForm.classFeedingFees[cid]) classFeeding[cid] = parseFloat(settingsForm.classFeedingFees[cid]);
      });

      const updated = {
        defaultSchoolFee: parseFloat(settingsForm.defaultSchoolFee) || 150,
        defaultFeedingFee: parseFloat(settingsForm.defaultFeedingFee) || 50,
        classSchoolFees: classSchool,
        classFeedingFees: classFeeding,
      };

      await setDoc(doc(db, 'settings', 'fees'), updated);
      setFeeSettings(updated);
      setShowSettings(false);
      showToastMsg('success', 'Fee configurations updated successfully!');
      fetchData();
    } catch (err) {
      console.error(err);
      showToastMsg('error', err.message);
    }
    setSaving(false);
  };

  const getMonthlyRate = (student, type) => {
    const classId = student.classId;
    if (type === 'school') {
      return feeSettings.classSchoolFees[classId] || feeSettings.defaultSchoolFee;
    } else {
      return feeSettings.classFeedingFees[classId] || feeSettings.defaultFeedingFee;
    }
  };

  const getStudentLedger = (student, type) => {
    const allStudentPayments = payments.filter(p => p.studentId === student.id && p.feeType === type);
    const monthlyRate = getMonthlyRate(student, type);

    const ledger = ACADEMIC_MONTHS.map(month => {
      // Filter payments specifically recorded for this month
      // Legacy fallback: if a payment has no month, map it to September so past records are preserved
      const monthPayments = allStudentPayments.filter(p => {
        if (p.month) {
          return p.month === month.name;
        } else {
          return month.name === 'September';
        }
      });
      
      const paidForThisMonth = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const balance = Math.max(0, monthlyRate - paidForThisMonth);
      const due = isMonthDue(month.name);
      
      let status = 'upcoming';
      if (balance <= 0) {
        status = 'paid';
      } else if (paidForThisMonth > 0) {
        status = 'partial';
      } else if (due) {
        status = 'owes';
      }

      return {
        monthName: month.name,
        rate: monthlyRate,
        paid: paidForThisMonth,
        balance,
        status,
        isDue: due
      };
    });

    const totalPaid = allStudentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalOwed = ledger
      .filter(item => item.isDue)
      .reduce((sum, item) => sum + item.balance, 0);

    const paidMonths = ledger.filter(item => item.status === 'paid').map(item => item.monthName);
    const owedMonths = ledger.filter(item => item.status === 'owes' || item.status === 'partial').map(item => item.monthName);

    return {
      ledger,
      totalPaid,
      totalOwed,
      paidMonths,
      owedMonths,
      paymentsHistory: allStudentPayments
    };
  };

  const getCurrentAcademicMonthName = () => {
    const now = new Date();
    const currentMonthNum = now.getMonth() + 1; // 1-indexed
    const found = ACADEMIC_MONTHS.find(m => m.index === currentMonthNum);
    return found ? found.name : 'September';
  };

  const openPaymentModal = (student) => {
    setSelectedStudent(student);
    setPaymentForm({ 
      amount: '', 
      date: new Date().toISOString().split('T')[0], 
      note: '',
      paymentMethod: 'Cash',
      month: getCurrentAcademicMonthName()
    });
    setOtherFeeLabel('');
    setShowModal(true);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) return;
    const feeSubType = feeTypeFilter === 'other' ? sanitize(otherFeeLabel) : '';
    if (feeTypeFilter === 'other' && !feeSubType) {
      showToastMsg('error', 'Please enter custom fee label.');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'fees'), {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        classId: selectedStudent.classId,
        feeType: feeTypeFilter,
        feeSubType,
        month: feeTypeFilter === 'other' ? '' : paymentForm.month,
        paymentMethod: paymentForm.paymentMethod,
        amount: parseFloat(paymentForm.amount),
        date: paymentForm.date,
        note: sanitize(paymentForm.note),
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      showToastMsg('success', `₵${parseFloat(paymentForm.amount).toFixed(2)} recorded for ${selectedStudent.name}`);
      fetchData();
    } catch (err) {
      console.error(err);
      showToastMsg('error', err.message);
    }
    setSaving(false);
  };

  const handleDeletePayment = async (paymentId, amount, studentName) => {
    if (!window.confirm(`Are you sure you want to delete this payment of ₵${amount.toFixed(2)} for ${studentName}? This action cannot be undone.`)) {
      return;
    }
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'fees', paymentId));
      showToastMsg('success', 'Payment deleted successfully!');
      fetchData();
    } catch (err) {
      console.error(err);
      showToastMsg('error', err.message);
    }
    setSaving(false);
  };

  const getClassName = (classId) => classes.find(c => c.id === classId)?.name || '—';

  const filteredStudents = students.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId?.toLowerCase().includes(search.toLowerCase());
    const matchClass = !classFilter || s.classId === classFilter;
    return matchSearch && matchClass;
  });

  // Calculate high level KPIs
  const totalStudents = students.length;
  const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalUnpaid = students.reduce((sum, s) => {
    if (feeTypeFilter === 'other') return sum;
    const info = getStudentLedger(s, feeTypeFilter);
    return sum + info.totalOwed;
  }, 0);

  if (loading) return <Layout><div className="loading-spinner"><div className="spinner"></div></div></Layout>;

  return (
    <Layout>
      {/* KPI Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-card-icon blue"><FiUser /></div>
          <div className="stat-card-value">{totalStudents}</div>
          <div className="stat-card-label">Total Enrolled Students</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><FiCheck /></div>
          <div className="stat-card-value">₵{totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-card-label">Total Collected Fees</div>
        </div>
        {feeTypeFilter !== 'other' && (
          <div className="stat-card">
            <div className="stat-card-icon orange"><FiDollarSign /></div>
            <div className="stat-card-value" style={{ color: totalUnpaid > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
              ₵{totalUnpaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="stat-card-label">Total Unpaid ({feeTypeFilter === 'school' ? 'School Fees' : 'Feeding Fees'})</div>
          </div>
        )}
      </div>

      {/* Control Actions & Configurations */}
      <div className="search-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div className="search-input-wrapper" style={{ flex: 1, minWidth: 200 }}>
          <FiSearch className="search-icon" />
          <input className="search-input" placeholder="Search students by name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 'auto', minWidth: 160 }} value={classFilter} onChange={e => setClassFilter(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={() => setShowSettings(!showSettings)}>
          <FiSettings /> {showSettings ? 'Hide Rates' : 'Configure Monthly Rates'}
        </button>
      </div>

      {/* Dynamic Settings Form */}
      {showSettings && (
        <div className="content-card" style={{ border: '2px solid var(--primary)', animation: 'slideUp 0.3s ease' }}>
          <div className="content-card-header">
            <h3><FiSettings style={{ marginRight: 8 }} /> Configure Monthly Fee Rates (GHC)</h3>
          </div>
          <form onSubmit={saveSettings}>
            <div className="content-card-body">
              <h4 style={{ marginBottom: 12, color: 'var(--primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>Global Default Rates</h4>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div className="form-group">
                  <label className="form-label">Default School Fees / Month</label>
                  <input type="number" className="form-input" value={settingsForm.defaultSchoolFee} onChange={e => setSettingsForm({ ...settingsForm, defaultSchoolFee: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Default Feeding Fees / Month</label>
                  <input type="number" className="form-input" value={settingsForm.defaultFeedingFee} onChange={e => setSettingsForm({ ...settingsForm, defaultFeedingFee: e.target.value })} required />
                </div>
              </div>

              <h4 style={{ marginBottom: 12, color: 'var(--primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>Class-Specific Overrides (Optional)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                {classes.map(c => (
                  <div key={c.id} style={{ padding: 12, border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', background: 'var(--bg)' }}>
                    <strong style={{ display: 'block', marginBottom: 8, color: 'var(--text)' }}>{c.name}</strong>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>School (₵)</label>
                        <input
                          type="number"
                          placeholder={feeSettings.defaultSchoolFee.toString()}
                          className="form-input"
                          style={{ padding: '6px 8px', fontSize: 12 }}
                          value={settingsForm.classSchoolFees[c.id] || ''}
                          onChange={e => setSettingsForm({
                            ...settingsForm,
                            classSchoolFees: { ...settingsForm.classSchoolFees, [c.id]: e.target.value }
                          })}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>Feeding (₵)</label>
                        <input
                          type="number"
                          placeholder={feeSettings.defaultFeedingFee.toString()}
                          className="form-input"
                          style={{ padding: '6px 8px', fontSize: 12 }}
                          value={settingsForm.classFeedingFees[c.id] || ''}
                          onChange={e => setSettingsForm({
                            ...settingsForm,
                            classFeedingFees: { ...settingsForm.classFeedingFees, [c.id]: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="content-card-body" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border-light)', marginTop: 0 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowSettings(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : <><FiCheck /> Save Rates</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Panel */}
      <div className="content-card">
        <div className="content-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3><FiDollarSign style={{ marginRight: 8 }} /> Student Fees Ledger</h3>
            <div style={{ display: 'flex', gap: 4, background: 'var(--primary-50)', padding: 4, borderRadius: 'var(--radius)' }}>
              <button
                className={`btn btn-sm ${feeTypeFilter === 'school' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', border: 'none', background: feeTypeFilter === 'school' ? 'var(--primary)' : 'transparent', color: feeTypeFilter === 'school' ? '#fff' : 'var(--text-secondary)' }}
                onClick={() => { setFeeTypeFilter('school'); setSelectedStudent(null); }}
              >
                🎓 School Fees
              </button>
              <button
                className={`btn btn-sm ${feeTypeFilter === 'feeding' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', border: 'none', background: feeTypeFilter === 'feeding' ? 'var(--primary)' : 'transparent', color: feeTypeFilter === 'feeding' ? '#fff' : 'var(--text-secondary)' }}
                onClick={() => { setFeeTypeFilter('feeding'); setSelectedStudent(null); }}
              >
                🍽️ Feeding Fees
              </button>
              <button
                className={`btn btn-sm ${feeTypeFilter === 'other' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', border: 'none', background: feeTypeFilter === 'other' ? 'var(--primary)' : 'transparent', color: feeTypeFilter === 'other' ? '#fff' : 'var(--text-secondary)' }}
                onClick={() => { setFeeTypeFilter('other'); setSelectedStudent(null); }}
              >
                ➕ Other Fees
              </button>
            </div>
          </div>
        </div>

        <div className="content-card-body" style={{ overflowX: 'auto' }}>
          {filteredStudents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💰</div>
              <h3>No Students Match Search Criteria</h3>
              <p>Try filtering by another class or student name.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Student ID</th>
                  {feeTypeFilter !== 'other' ? (
                    <>
                      <th>Monthly Rate</th>
                      <th>Total Paid</th>
                      <th>Total Owed</th>
                      <th>Payment Status</th>
                    </>
                  ) : (
                    <>
                      <th>Total Paid</th>
                      <th>Recordings Count</th>
                    </>
                  )}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(s => {
                  const rate = getMonthlyRate(s, feeTypeFilter);
                  const info = feeTypeFilter !== 'other' ? getStudentLedger(s, feeTypeFilter) : null;
                  
                  const otherPayments = feeTypeFilter === 'other' ? payments.filter(p => p.studentId === s.id && p.feeType === 'other') : [];
                  const otherPaid = otherPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

                  return (
                    <tr key={s.id} 
                        style={{ cursor: 'pointer', background: selectedStudent?.id === s.id ? 'var(--primary-50)' : 'transparent' }}
                        onClick={() => setSelectedStudent(s)}
                    >
                      <td>
                        <div className="name-cell">
                          <div className="avatar-sm" style={{ background: selectedStudent?.id === s.id ? 'var(--primary)' : 'var(--primary-100)', color: selectedStudent?.id === s.id ? '#fff' : 'var(--primary-dark)' }}>{s.name?.[0]}</div>
                          <div>
                            <strong style={{ color: 'var(--text)' }}>{s.name}</strong>
                            {selectedStudent?.id === s.id && <span style={{ display: 'block', fontSize: 10, color: 'var(--primary)' }}>Active Select</span>}
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-student">{getClassName(s.classId)}</span></td>
                      <td><code>{s.studentId || '—'}</code></td>
                      
                      {feeTypeFilter !== 'other' ? (
                        <>
                          <td><strong>₵{rate.toFixed(2)}</strong></td>
                          <td><strong style={{ color: 'var(--accent-green)' }}>₵{info.totalPaid.toFixed(2)}</strong></td>
                          <td>
                            <strong style={{ color: info.totalOwed > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                              ₵{info.totalOwed.toFixed(2)}
                            </strong>
                          </td>
                          <td>
                            {info.totalOwed <= 0 ? (
                              <span className="badge badge-present">✅ Fully Paid</span>
                            ) : info.totalPaid > 0 ? (
                              <span className="badge badge-teacher">⚠️ Partially Paid</span>
                            ) : (
                              <span className="badge badge-absent">❌ Unpaid</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td><strong style={{ color: 'var(--accent-green)' }}>₵{otherPaid.toFixed(2)}</strong></td>
                          <td><span className="badge badge-teacher">{otherPayments.length} records</span></td>
                        </>
                      )}
                      
                      <td>
                        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                          <button className="btn btn-primary btn-sm" onClick={() => openPaymentModal(s)}>
                            <FiPlus /> Record Payment
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedStudent(s)}>
                            Details <FiArrowRight />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Individual Student Detail / Monthly Ledger Card */}
      {selectedStudent && (
        <div className="content-card" style={{ borderLeft: '4px solid var(--primary)', animation: 'slideUp 0.3s ease' }}>
          <div className="content-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--primary)', fontWeight: 700 }}>Student Ledger Analysis</span>
              <h3 style={{ marginTop: 4 }}><FiUser style={{ marginRight: 6 }} /> {selectedStudent.name} ({getClassName(selectedStudent.classId)})</h3>
            </div>
            <button className="btn btn-icon btn-sm" onClick={() => setSelectedStudent(null)}><FiX /></button>
          </div>
          
          <div className="content-card-body">
            {feeTypeFilter !== 'other' ? (() => {
              const info = getStudentLedger(selectedStudent, feeTypeFilter);
              return (
                <>
                  {/* Monthly Ledger Visualization */}
                  <h4 style={{ marginBottom: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FiCalendar /> Academic Monthly Breakdown ({feeTypeFilter === 'school' ? 'School Fees' : 'Feeding Fees'})
                  </h4>
                  
                  <div className="table-responsive" style={{ marginBottom: 24, borderRadius: 'var(--radius)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-light)', borderBottom: '2px solid var(--border-light)' }}>
                          <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: 'var(--text)' }}>Billing Month</th>
                          <th style={{ padding: 12, textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>Required Fee</th>
                          <th style={{ padding: 12, textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>Amount Paid</th>
                          <th style={{ padding: 12, textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>Remaining Unpaid</th>
                          <th style={{ padding: 12, textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {info.ledger.map(item => {
                          let rowBg = '#ffffff';
                          let statusBg = 'var(--bg)';
                          let statusBorder = '1px solid var(--border-light)';
                          let statusColor = 'var(--text-muted)';
                          let statusLabel = 'Upcoming';

                          if (item.status === 'paid') {
                            rowBg = 'rgba(34, 197, 94, 0.02)';
                            statusBg = 'rgba(34, 197, 94, 0.08)';
                            statusBorder = '1px solid var(--accent-green)';
                            statusColor = 'var(--accent-green)';
                            statusLabel = 'Fully Paid ✅';
                          } else if (item.status === 'partial') {
                            rowBg = 'rgba(249, 115, 22, 0.02)';
                            statusBg = 'rgba(249, 115, 22, 0.08)';
                            statusBorder = '1px solid var(--accent-orange)';
                            statusColor = 'var(--accent-orange)';
                            statusLabel = 'Partially Paid ⚠️';
                          } else if (item.status === 'owes') {
                            rowBg = 'rgba(239, 68, 68, 0.02)';
                            statusBg = 'rgba(239, 68, 68, 0.08)';
                            statusBorder = '1px solid var(--accent-red)';
                            statusColor = 'var(--accent-red)';
                            statusLabel = 'Unpaid ❌';
                          }

                          return (
                            <tr key={item.monthName} style={{ background: rowBg, borderBottom: '1px solid var(--border-light)' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)' }}>{item.monthName}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>₵{item.rate.toFixed(2)}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-green)' }}>₵{item.paid.toFixed(2)}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: item.balance > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                                ₵{item.balance.toFixed(2)}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <span style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: statusColor,
                                  background: statusBg,
                                  border: statusBorder,
                                  padding: '4px 10px',
                                  borderRadius: 12,
                                  display: 'inline-block'
                                }}>
                                  {statusLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Ledger Overview */}
                  {(() => {
                    const totalExpected = info.ledger.filter(item => item.isDue).reduce((sum, item) => sum + item.rate, 0);
                    return (
                      <div className="stats-grid" style={{ marginBottom: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                        <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Months Fully Paid</span>
                          <strong style={{ display: 'block', fontSize: 14, color: 'var(--accent-green)', marginTop: 4, maxHeight: 40, overflowY: 'auto' }}>
                            {info.paidMonths.length === 0 ? 'None' : info.paidMonths.join(', ')}
                          </strong>
                        </div>
                        <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Months Owed (Unpaid)</span>
                          <strong style={{ display: 'block', fontSize: 14, color: 'var(--accent-red)', marginTop: 4, maxHeight: 40, overflowY: 'auto' }}>
                            {info.owedMonths.length === 0 ? 'None' : info.owedMonths.join(', ')}
                          </strong>
                        </div>
                        <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cumulative Fees Due</span>
                          <strong style={{ display: 'block', fontSize: 20, color: 'var(--primary)', marginTop: 4 }}>₵{totalExpected.toFixed(2)}</strong>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Up to current month</span>
                        </div>
                        <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Money Received</span>
                          <strong style={{ display: 'block', fontSize: 20, color: 'var(--accent-green)', marginTop: 4 }}>₵{info.totalPaid.toFixed(2)}</strong>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Total paid to date</span>
                        </div>
                        <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Unpaid</span>
                          <strong style={{ display: 'block', fontSize: 20, color: 'var(--accent-red)', marginTop: 4 }}>₵{info.totalOwed.toFixed(2)}</strong>
                          <span style={{ fontSize: 9, color: 'var(--accent-red)', fontWeight: 600 }}>Unpaid</span>
                        </div>
                      </div>
                    );
                  })()}
                </>
              );
            })() : (() => {
              const otherPayments = payments.filter(p => p.studentId === selectedStudent.id && p.feeType === 'other');
              const otherPaid = otherPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
              return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)', marginBottom: 20 }}>
                  <strong>Other Fees Ledger (Custom one-offs)</strong>
                  <strong style={{ fontSize: 18, color: 'var(--accent-green)' }}>Total Received: ₵{otherPaid.toFixed(2)}</strong>
                </div>
              );
            })()}

            {/* General Ledger Ledger Transactions logs */}
            <h4 style={{ marginBottom: 12, color: 'var(--text)' }}><FiActivity /> Payment Transactions History</h4>
            {payments.filter(p => p.studentId === selectedStudent.id && p.feeType === feeTypeFilter).length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <div className="empty-state-icon">📋</div>
                <h3>No Payments Stored</h3>
                <p>Record a payment above to build up transaction ledger records.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Date Received</th><th>Payment Method</th><th>Amount Credited</th><th>Admin Memo Note</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
                </thead>
                <tbody>
                  {payments.filter(p => p.studentId === selectedStudent.id && p.feeType === feeTypeFilter).map(p => (
                    <tr key={p.id}>
                      <td><strong style={{ color: 'var(--text)' }}>{p.date}</strong></td>
                      <td>
                        <span className={`badge badge-${p.feeType === 'school' ? 'admin' : p.feeType === 'feeding' ? 'student' : 'teacher'}`}>
                          {p.feeType === 'school' ? '🏫 School Fees' : p.feeType === 'feeding' ? '🍽️ Feeding Fees' : `➕ Other: ${p.feeSubType}`}
                        </span>
                        {p.paymentMethod && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.paymentMethod}</div>}
                      </td>
                      <td><strong style={{ color: 'var(--accent-green)' }}>₵{p.amount.toFixed(2)}</strong></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{p.note || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-icon btn-sm"
                          style={{ color: 'var(--accent-red)', padding: 6 }}
                          onClick={() => handleDeletePayment(p.id, p.amount, selectedStudent.name)}
                          disabled={saving}
                          title="Delete Payment Record"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Record Payment Dialog Modal */}
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
                  <input className="form-input" style={{ textTransform: 'capitalize' }} value={`${feeTypeFilter} fees`} disabled />
                </div>
                {feeTypeFilter === 'other' && (
                  <div className="form-group">
                    <label className="form-label">Custom Fee Label Name</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Sports Fee, Uniform Fee, Library Fee..."
                      value={otherFeeLabel}
                      onChange={e => setOtherFeeLabel(e.target.value)}
                      required
                    />
                  </div>
                )}
                {feeTypeFilter !== 'other' && (
                  <div className="form-group">
                    <label className="form-label">For Month</label>
                    <select
                      className="form-select"
                      value={paymentForm.month}
                      onChange={e => setPaymentForm({...paymentForm, month: e.target.value})}
                      required
                    >
                      {ACADEMIC_MONTHS.map(m => (
                        <option key={m.name} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {feeTypeFilter !== 'other' && (
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select className="form-select" value={paymentForm.paymentMethod} onChange={e => setPaymentForm({...paymentForm, paymentMethod: e.target.value})}>
                      <option value="Cash">Cash</option>
                      <option value="Mobile Money">Mobile Money</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Amount Paid (₵ GHC)</label>
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
                  <label className="form-label">Date Credited</label>
                  <input
                    type="date"
                    className="form-input"
                    value={paymentForm.date}
                    onChange={e => setPaymentForm({...paymentForm, date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Admin Note (Optional Memo)</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Cash payment received by administrator"
                    value={paymentForm.note}
                    onChange={e => setPaymentForm({...paymentForm, note: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Recording...' : <><FiCheck /> Record Payment</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Success/Error Notification Toasts */}
      {toast && (
        <div className={`toast toast-${toast.type}`} style={{ animation: 'slideUp 0.3s ease' }}>
          {toast.type === 'success' ? <FiCheck /> : <FiX />}
          {toast.message}
        </div>
      )}
    </Layout>
  );
}
