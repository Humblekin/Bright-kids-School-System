import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { FiDollarSign, FiPlus, FiSearch, FiEdit2, FiTrash2, FiCheck, FiX, FiTrendingDown, FiTrendingUp, FiPieChart, FiCalendar, FiEye, FiEyeOff } from 'react-icons/fi';
import Layout from '../../components/Layout';
import { sanitize } from '../../utils/sanitize';
import { useAuth } from '../../contexts/AuthContext';

const EXPENSE_CATEGORIES = [
  'Salaries',
  'Utilities',
  'Maintenance',
  'Supplies',
  'Transportation',
  'Rent',
  'Marketing',
  'Food & Feeding',
  'Miscellaneous',
];

export default function ManageExpenses() {
  const { userData } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [showVoided, setShowVoided] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [showVoidModal, setShowVoidModal] = useState(false);

  const [form, setForm] = useState({
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [expSnap, feesSnap] = await Promise.all([
        getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc'))),
        getDocs(collection(db, 'fees')),
      ]);
      setExpenses(expSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPayments(feesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const showToastMsg = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const openAdd = () => {
    setEditingExpense(null);
    setForm({
      category: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Cash',
    });
    setShowModal(true);
  };

  const openEdit = (expense) => {
    if (expense.voided) { showToastMsg('error', 'Cannot edit a voided expense.'); return; }
    setEditingExpense(expense);
    setForm({
      category: expense.category || '',
      amount: expense.amount?.toString() || '',
      description: expense.description || '',
      date: expense.date || new Date().toISOString().split('T')[0],
      paymentMethod: expense.paymentMethod || 'Cash',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.category || !form.amount || parseFloat(form.amount) <= 0) {
      showToastMsg('error', 'Please fill in all required fields.');
      return;
    }
    setSaving(true);
    try {
      const data = {
        category: form.category,
        amount: parseFloat(form.amount),
        description: sanitize(form.description),
        date: form.date,
        paymentMethod: form.paymentMethod,
      };
      if (editingExpense) {
        await updateDoc(doc(db, 'expenses', editingExpense.id), data);
        showToastMsg('success', 'Expense updated successfully!');
      } else {
        await addDoc(collection(db, 'expenses'), { ...data, createdAt: serverTimestamp() });
        showToastMsg('success', 'Expense recorded successfully!');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      showToastMsg('error', err.message);
    }
    setSaving(false);
  };

  const openVoidModal = (expense) => {
    setVoidTarget(expense);
    setVoidReason('');
    setShowVoidModal(true);
  };

  const handleVoidExpense = async () => {
    if (!voidTarget) return;
    if (!voidReason.trim()) {
      showToastMsg('error', 'Please provide a reason for voiding this expense.');
      return;
    }
    try {
      await updateDoc(doc(db, 'expenses', voidTarget.id), {
        voided: true,
        voidedAt: serverTimestamp(),
        voidedBy: userData?.name || 'Unknown',
        voidReason: sanitize(voidReason.trim()),
      });
      setShowVoidModal(false);
      setVoidTarget(null);
      showToastMsg('success', 'Expense voided successfully. Audit trail preserved.');
      fetchData();
    } catch (err) {
      console.error(err);
      showToastMsg('error', err.message);
    }
  };

  const handlePermanentDelete = async (id, amount, category) => {
    if (!window.confirm(`Permanently delete expense of -₵${amount?.toFixed(2)} (${category})? This CANNOT be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'expenses', id));
      showToastMsg('success', 'Expense permanently deleted.');
      fetchData();
    } catch (err) {
      console.error(err);
      showToastMsg('error', err.message);
    }
  };

  const totalRevenue = payments.filter(p => !p.voided).reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalExpenses = expenses.filter(e => !e.voided).reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;

  const categoryTotals = {};
  expenses.filter(e => !e.voided).forEach(e => {
    const cat = e.category || 'Miscellaneous';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (e.amount || 0);
  });
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  const filtered = expenses.filter(e => {
    if (!showVoided && e.voided) return false;
    const matchSearch = !search || e.category?.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || e.category === categoryFilter;
    const matchDate = (!dateRange.from || e.date >= dateRange.from) && (!dateRange.to || e.date <= dateRange.to);
    return matchSearch && matchCategory && matchDate;
  });

  if (loading) return <Layout><div className="loading-spinner"><div className="spinner"></div></div></Layout>;

  return (
    <Layout>
      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon blue"><FiDollarSign /></div>
          <div className="stat-card-value" style={{ color: netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            ₵{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="stat-card-label">Revenue (After Expenses)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon red"><FiTrendingDown /></div>
          <div className="stat-card-value" style={{ color: 'var(--accent-orange)' }}>₵{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-card-label">Total Expenses</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon purple"><FiTrendingUp /></div>
          <div className="stat-card-value" style={{ color: 'var(--primary)' }}>₵{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-card-label">Gross Fees Collected</div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="search-bar">
        <div className="search-input-wrapper" style={{ flex: 1, minWidth: 200 }}>
          <FiSearch className="search-icon" />
          <input className="search-input" placeholder="Search expenses by category or description..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 'auto', minWidth: 150 }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" className="form-input" style={{ width: 'auto' }} value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} placeholder="From" />
        <input type="date" className="form-input" style={{ width: 'auto' }} value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} placeholder="To" />
        <button className="btn btn-primary" onClick={openAdd}><FiPlus /> Record Expense</button>
      </div>

      {/* Category Breakdown */}
      {Object.keys(categoryTotals).length > 0 && (
        <div className="content-card" style={{ marginBottom: 24 }}>
          <div className="content-card-header">
            <h3><FiPieChart style={{ marginRight: 8 }} /> Expense Breakdown by Category</h3>
          </div>
          <div className="content-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, total]) => {
                const pct = totalExpenses > 0 ? ((total / totalExpenses) * 100) : 0;
                const barWidth = totalExpenses > 0 ? ((total / totalExpenses) * 100) : 0;
                return (
                  <div key={cat} style={{ padding: 12, background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <strong style={{ fontSize: 13 }}>{cat}</strong>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-red)' }}>₵{total.toFixed(2)}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barWidth}%`, background: 'var(--accent-red)', borderRadius: 3, transition: 'width 0.3s ease' }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct.toFixed(1)}% of total</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="content-card">
        <div className="content-card-header">
          <h3><FiDollarSign style={{ marginRight: 8 }} /> All Expenses ({filtered.length})</h3>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setShowVoided(!showVoided)}
            style={{ fontSize: 12, padding: '4px 12px' }}
          >
            {showVoided ? <><FiEyeOff /> Hide Voided</> : <><FiEye /> Show Voided</>}
          </button>
        </div>
        <div className="content-card-body" style={{ overflowX: 'auto' }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>No Expenses Recorded</h3>
              <p>Record your first expense to start tracking school spending.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Payment Method</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} style={e.voided ? { opacity: 0.5, background: 'var(--bg)' } : {}}>
                    <td>
                      <strong style={{ color: 'var(--text)' }}>{e.date}</strong>
                      {e.voided && <span className="badge badge-absent" style={{ marginLeft: 8, fontSize: 10 }}>VOIDED</span>}
                    </td>
                    <td>
                      <span className="badge badge-admin" style={e.voided ? { textDecoration: 'line-through' } : {}}>{e.category}</span>
                    </td>
                    <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.description || '—'}
                      {e.voided && <div style={{ fontSize: 11, color: 'var(--accent-red)', marginTop: 4 }}>Voided by {e.voidedBy}: {e.voidReason}</div>}
                    </td>
                    <td style={e.voided ? { textDecoration: 'line-through' } : {}}>{e.paymentMethod || 'Cash'}</td>
                    <td>
                      <strong style={{ color: e.voided ? 'var(--text-muted)' : 'var(--accent-red)', textDecoration: e.voided ? 'line-through' : 'none' }}>
                        -₵{e.amount?.toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        {!e.voided ? (
                          <>
                            <button className="btn btn-icon btn-sm" onClick={() => openEdit(e)} title="Edit"><FiEdit2 /></button>
                            <button className="btn btn-icon btn-sm" style={{ color: 'var(--accent-orange)' }} onClick={() => openVoidModal(e)} title="Void (audit trail)"><FiX /></button>
                          </>
                        ) : (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '0 4px' }}>Voided</span>
                        )}
                        <button className="btn btn-icon btn-sm" style={{ color: 'var(--accent-red)' }} onClick={() => handlePermanentDelete(e.id, e.amount, e.category)} title="Delete permanently"><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingExpense ? 'Edit Expense' : 'Record Expense'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})} required>
                      <option value="">Select category</option>
                      {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount (₵) *</label>
                    <input type="number" step="0.01" min="0.01" className="form-input" placeholder="e.g. 500.00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select className="form-select" value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Mobile Money">Mobile Money</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows="3" placeholder="Describe the expense..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : <><FiCheck /> {editingExpense ? 'Update' : 'Record Expense'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void Expense Confirmation Modal */}
      {showVoidModal && voidTarget && (
        <div className="modal-overlay" onClick={() => setShowVoidModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Void Expense</h3>
              <button className="modal-close" onClick={() => setShowVoidModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 14 }}>
                Voiding <strong>-₵{voidTarget.amount?.toFixed(2)}</strong> expense in <strong>{voidTarget.category}</strong>.
                This will remove it from financial calculations while preserving the audit trail.
              </p>
              <div className="form-group">
                <label className="form-label">Reason for Voiding *</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="e.g. Incorrect amount, duplicate entry, refund received..."
                  value={voidReason}
                  onChange={e => setVoidReason(e.target.value)}
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowVoidModal(false)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleVoidExpense} disabled={!voidReason.trim()}>
                <FiX /> Void Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`} style={{ animation: 'slideUp 0.3s ease' }}>
          {toast.type === 'success' ? <FiCheck /> : <FiX />}
          {toast.message}
        </div>
      )}
    </Layout>
  );
}
