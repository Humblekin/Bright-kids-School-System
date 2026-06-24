import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { FiDollarSign, FiTrendingDown, FiTrendingUp, FiBell, FiArrowRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';

export default function AccountantDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ revenue: 0, expenses: 0, net: 0 });
  const [recentPayments, setRecentPayments] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const [studentsSnap, feesSnap, expensesSnap] = await Promise.all([
          getDocs(collection(db, 'students')),
          getDocs(query(collection(db, 'fees'), orderBy('date', 'desc'), limit(10))),
          getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc'), limit(10))),
        ]);

        const existingStudentIds = new Set(studentsSnap.docs.map(d => d.id));
        const totalRevenue = feesSnap.docs.reduce((sum, d) => {
          if (d.data().voided) return sum;
          if (!existingStudentIds.has(d.data().studentId)) return sum;
          return sum + (d.data().amount || 0);
        }, 0);
        const totalExpenses = expensesSnap.docs.reduce((sum, d) => sum + (d.data().voided ? 0 : (d.data().amount || 0)), 0);
        const allFees = await getDocs(query(collection(db, 'fees'), orderBy('date', 'desc'), limit(5)));
        const allExps = await getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc'), limit(5)));

        setStats({ revenue: totalRevenue, expenses: totalExpenses, net: totalRevenue - totalExpenses });
        setRecentPayments(allFees.docs.filter(d => !d.data().voided).map(d => ({ id: d.id, ...d.data() })));
        setRecentExpenses(allExps.docs.filter(d => !d.data().voided).map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error(err); }
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) return <Layout><div className="loading-spinner"><div className="spinner"></div></div></Layout>;

  return (
    <Layout>
      <div style={{ marginBottom: 24, padding: '24px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: 'var(--radius-lg)', color: '#fff' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Financial Dashboard</h2>
        <p style={{ opacity: 0.8, fontSize: 14 }}>Overview of school revenue, expenses, and recent transactions.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon green"><FiDollarSign /></div>
          <div className="stat-card-value" style={{ color: 'var(--accent-green)' }}>₵{stats.revenue.toFixed(2)}</div>
          <div className="stat-card-label">Total Collected Fees</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--accent-orange-light)', color: 'var(--accent-orange)' }}><FiTrendingDown /></div>
          <div className="stat-card-value" style={{ color: 'var(--accent-orange)' }}>₵{stats.expenses.toFixed(2)}</div>
          <div className="stat-card-label">Total Expenses</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon blue"><FiTrendingUp /></div>
          <div className="stat-card-value" style={{ color: stats.net >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>₵{stats.net.toFixed(2)}</div>
          <div className="stat-card-label">Net Revenue</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="content-card">
          <div className="content-card-header">
            <h3><FiDollarSign style={{ marginRight: 8 }} /> Recent Payments</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/accountant/fees')}>
              View All <FiArrowRight />
            </button>
          </div>
          <div className="content-card-body">
            {recentPayments.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">💰</div><h3>No Recent Payments</h3></div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>Amount</th><th>Type</th></tr>
                </thead>
                <tbody>
                  {recentPayments.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontSize: 13 }}>{p.date}</td>
                      <td><strong style={{ color: 'var(--accent-green)' }}>₵{p.amount?.toFixed(2)}</strong></td>
                      <td><span className="badge badge-student">{p.feeType === 'school' ? 'School Fees' : p.feeType === 'feeding' ? 'Feeding' : p.feeSubType || 'Other'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="content-card">
          <div className="content-card-header">
            <h3><FiTrendingDown style={{ marginRight: 8 }} /> Recent Expenses</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/accountant/expenses')}>
              View All <FiArrowRight />
            </button>
          </div>
          <div className="content-card-body">
            {recentExpenses.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">📋</div><h3>No Recent Expenses</h3></div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>Category</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {recentExpenses.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontSize: 13 }}>{e.date}</td>
                      <td><span className="badge badge-admin">{e.category}</span></td>
                      <td><strong style={{ color: 'var(--accent-red)' }}>-₵{e.amount?.toFixed(2)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
