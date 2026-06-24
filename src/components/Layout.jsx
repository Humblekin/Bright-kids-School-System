import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiHome, FiUsers, FiBook, FiCalendar, FiClipboard, FiLayers, FiBell, FiUser, FiLogOut, FiMenu, FiX, FiAward, FiMessageSquare, FiDollarSign, FiSettings, FiClock } from 'react-icons/fi';

const adminNav = [
  { section: 'Main', items: [
    { to: '/admin', icon: <FiHome />, label: 'Dashboard' },
  ]},
  { section: 'Management', items: [
    { to: '/admin/students', icon: <FiUsers />, label: 'Students' },
    { to: '/admin/teachers', icon: <FiUser />, label: 'Teachers' },
    { to: '/admin/classes', icon: <FiLayers />, label: 'Classes' },
    { to: '/admin/subjects', icon: <FiBook />, label: 'Subjects' },
  ]},
  { section: 'Activities', items: [
    { to: '/admin/results', icon: <FiAward />, label: 'Results' },
    { to: '/admin/attendance', icon: <FiCalendar />, label: 'Attendance History' },
    { to: '/admin/announcements', icon: <FiBell />, label: 'Announcements' },
    { to: '/admin/reports', icon: <FiClipboard />, label: 'Report Cards' },
    { to: '/admin/fees', icon: <FiDollarSign />, label: 'Manage Fees' },
    { to: '/admin/sms', icon: <FiMessageSquare />, label: 'Send SMS' },
    { to: '/admin/expenses', icon: <FiDollarSign />, label: 'Expenses' },
  ]},
  { section: 'System', items: [
    { to: '/admin/users', icon: <FiUsers />, label: 'User Roles' },
    { to: '/admin/settings', icon: <FiSettings />, label: 'School Settings' },
  ]},
];

const teacherNav = [
  { section: 'Main', items: [
    { to: '/teacher', icon: <FiHome />, label: 'Dashboard' },
  ]},
  { section: 'Activities', items: [
    { to: '/teacher/attendance', icon: <FiCalendar />, label: 'Take Attendance' },
    { to: '/teacher/attendance-history', icon: <FiClock />, label: 'Attendance History' },
    { to: '/teacher/results', icon: <FiClipboard />, label: 'Results' },
    { to: '/teacher/announcements', icon: <FiBell />, label: 'Announcements' },
  ]},
];

const accountantNav = [
  { section: 'Main', items: [
    { to: '/accountant', icon: <FiHome />, label: 'Dashboard' },
  ]},
  { section: 'Finance', items: [
    { to: '/accountant/fees', icon: <FiDollarSign />, label: 'Manage Fees' },
    { to: '/accountant/expenses', icon: <FiDollarSign />, label: 'Expenses' },
    { to: '/accountant/sms', icon: <FiMessageSquare />, label: 'Send SMS' },
  ]},
  { section: 'General', items: [
    { to: '/accountant/announcements', icon: <FiBell />, label: 'Announcements' },
  ]},
];

export default function Layout({ children }) {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = userData?.role || 'admin';
  const navConfig = role === 'admin' ? adminNav : role === 'accountant' ? accountantNav : teacherNav;
  const initials = userData?.name ? userData.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const pageTitle = () => {
    const path = window.location.pathname;
    const segment = path.split('/').pop();
    if (segment === role) return 'Dashboard';
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">BK</div>
          <div className="sidebar-brand">
            <h2>Bright Kids</h2>
            <span>School System</span>
          </div>
          <button className="modal-close" onClick={() => setSidebarOpen(false)} style={{ display: 'none', marginLeft: 'auto' }}>
            <FiX />
          </button>
        </div>
        <nav className="sidebar-nav">
          {navConfig.map((section, i) => (
            <div className="nav-section" key={i}>
              <div className="nav-section-title">{section.section}</div>
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === `/${role}`}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <NavLink to={`/${role}/profile`} className="sidebar-user" onClick={() => setSidebarOpen(false)}>
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="name">{userData?.name || 'User'}</div>
              <div className="role">{role}</div>
            </div>
          </NavLink>
        </div>
      </aside>

      <div className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
              <FiMenu />
            </button>
            <h1>{pageTitle()}</h1>
          </div>
          <div className="top-bar-right">
            <button className="btn btn-icon" title="Profile" onClick={() => navigate(`/${role}/profile`)}>
              <FiUser />
            </button>
            <button className="btn btn-icon" title="Logout" onClick={handleLogout}>
              <FiLogOut />
            </button>
          </div>
        </header>
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
