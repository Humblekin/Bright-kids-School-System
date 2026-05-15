import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Profile from './pages/shared/Profile';
import Announcements from './pages/shared/Announcements';
import EnterResults from './pages/shared/EnterResults';

import AdminDashboard from './pages/admin/AdminDashboard';
import ManageStudents from './pages/admin/ManageStudents';
import ManageTeachers from './pages/admin/ManageTeachers';
import ManageClasses from './pages/admin/ManageClasses';
import ManageSubjects from './pages/admin/ManageSubjects';
import ManageFees from './pages/admin/ManageFees';
import SchoolSettings from './pages/admin/SchoolSettings';
import ReportCards from './pages/admin/ReportCards';

import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TakeAttendance from './pages/teacher/TakeAttendance';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><ManageStudents /></ProtectedRoute>} />
          <Route path="/admin/teachers" element={<ProtectedRoute allowedRoles={['admin']}><ManageTeachers /></ProtectedRoute>} />
          <Route path="/admin/classes" element={<ProtectedRoute allowedRoles={['admin']}><ManageClasses /></ProtectedRoute>} />
          <Route path="/admin/subjects" element={<ProtectedRoute allowedRoles={['admin']}><ManageSubjects /></ProtectedRoute>} />
          <Route path="/admin/results" element={<ProtectedRoute allowedRoles={['admin']}><EnterResults /></ProtectedRoute>} />
          <Route path="/admin/announcements" element={<ProtectedRoute allowedRoles={['admin']}><Announcements /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><ReportCards /></ProtectedRoute>} />
          <Route path="/admin/fees" element={<ProtectedRoute allowedRoles={['admin']}><ManageFees /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><SchoolSettings /></ProtectedRoute>} />
          <Route path="/admin/profile" element={<ProtectedRoute allowedRoles={['admin']}><Profile /></ProtectedRoute>} />

          {/* Teacher Routes */}
          <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/teacher/attendance" element={<ProtectedRoute allowedRoles={['teacher']}><TakeAttendance /></ProtectedRoute>} />
          <Route path="/teacher/results" element={<ProtectedRoute allowedRoles={['teacher']}><EnterResults /></ProtectedRoute>} />
          <Route path="/teacher/announcements" element={<ProtectedRoute allowedRoles={['teacher']}><Announcements /></ProtectedRoute>} />
          <Route path="/teacher/profile" element={<ProtectedRoute allowedRoles={['teacher']}><Profile /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
