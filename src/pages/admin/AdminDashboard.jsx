import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { FiUsers, FiUser, FiLayers, FiBook, FiBell, FiTrendingUp, FiDollarSign, FiTrendingDown } from 'react-icons/fi';
import Layout from '../../components/Layout';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0, subjects: 0, revenue: 0, expenses: 0 });
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [studentsSnap, teachersSnap, classesSnap, subjectsSnap, feesSnap, expensesSnap] = await Promise.all([
          getDocs(collection(db, 'students')),
          getDocs(collection(db, 'teachers')),
          getDocs(collection(db, 'classes')),
          getDocs(collection(db, 'subjects')),
          getDocs(collection(db, 'fees')),
          getDocs(collection(db, 'expenses')),
        ]);
        const totalRevenue = feesSnap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);
        const totalExpenses = expensesSnap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);
        setStats({
          students: studentsSnap.size,
          teachers: teachersSnap.size,
          classes: classesSnap.size,
          subjects: subjectsSnap.size,
          revenue: totalRevenue,
          expenses: totalExpenses,
        });

        const annSnap = await getDocs(query(collection(db, 'announcements'), orderBy('date', 'desc'), limit(5)));
        setAnnouncements(annSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
      setLoading(false);
    }
    fetchStats();
  }, []);

  if (loading) {
    return <Layout><div className="loading-spinner"><div className="spinner"></div></div></Layout>;
  }

  return (
    <Layout>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon blue"><FiUsers /></div>
          <div className="stat-card-value">{stats.students}</div>
          <div className="stat-card-label">Total Students</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><FiUser /></div>
          <div className="stat-card-value">{stats.teachers}</div>
          <div className="stat-card-label">Total Teachers</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon orange"><FiLayers /></div>
          <div className="stat-card-value">{stats.classes}</div>
          <div className="stat-card-label">Total Classes</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon purple"><FiBook /></div>
          <div className="stat-card-value">{stats.subjects}</div>
          <div className="stat-card-label">Total Subjects</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon red"><FiDollarSign /></div>
          <div className="stat-card-value" style={{ color: (stats.revenue - stats.expenses) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            ₵{(stats.revenue - stats.expenses).toFixed(2)}
          </div>
          <div className="stat-card-label">Revenue (After Expenses)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--accent-orange-light)', color: 'var(--accent-orange)' }}><FiTrendingDown /></div>
          <div className="stat-card-value" style={{ color: 'var(--accent-orange)' }}>₵{stats.expenses.toFixed(2)}</div>
          <div className="stat-card-label">Total Expenses</div>
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <h3><FiBell style={{ marginRight: 8 }} /> Recent Announcements</h3>
        </div>
        <div className="content-card-body">
          {announcements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📢</div>
              <h3>No Announcements Yet</h3>
              <p>Create your first announcement to notify students and teachers.</p>
            </div>
          ) : (
            announcements.map(a => (
              <div key={a.id} className="announcement-card-modern">
                <div className="announcement-header-modern">
                  <div className="announcement-title-modern">{a.title}</div>
                  <span className="announcement-date-modern">{a.date}</span>
                </div>
                <p className="announcement-body-modern">{a.message}</p>
                {a.target && a.target !== 'all' && (
                  <div className="announcement-footer-modern">
                    <span className="badge badge-teacher">{a.target}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <h3><FiTrendingUp style={{ marginRight: 8 }} /> Quick Overview</h3>
        </div>
        <div className="content-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div style={{ padding: 20, background: 'var(--primary-50)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎓</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Academic Management</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Manage classes, subjects & results</p>
            </div>
            <div style={{ padding: 20, background: 'var(--accent-green-light)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Attendance Tracking</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Monitor daily attendance records</p>
            </div>
            <div style={{ padding: 20, background: 'var(--accent-orange-light)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Result Processing</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Enter & manage exam results</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
