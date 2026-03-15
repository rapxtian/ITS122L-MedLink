import React, { useState } from 'react';
import { AuthProvider, useAuth, Role } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { useTheme } from './context/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { BookAppointment } from './pages/patient/BookAppointment';
import { AppointmentHistory } from './pages/patient/AppointmentHistory';
import { MedicalRecords } from './pages/patient/MedicalRecords';
import { ProfileSettings } from './pages/patient/ProfileSettings';
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { ManageAppointments } from './pages/doctor/ManageAppointments';
import { ManageMedicalRecords } from './pages/doctor/ManageMedicalRecords';
import { PatientHistory } from './pages/doctor/PatientHistory';
import { ScheduleManagement } from './pages/doctor/ScheduleManagement';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { PatientManagement } from './pages/admin/PatientManagement';
import { InventoryManagement } from './pages/admin/InventoryManagement';
import { ReportGeneration } from './pages/admin/ReportGeneration';
import { AppointmentManagement } from './pages/admin/AppointmentManagement';
import { AppLayout } from './components/AppLayout';
export type { Role } from './context/AuthContext';

function AppContent() {
  const { user, isLoggedIn, loading, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState('landing');

  const navigate = (page: string) => setCurrentPage(page);

  const handleLoginSuccess = () => {
    if (!user) return;
    if (user.role === 'patient') setCurrentPage('patient-dashboard');
    else if (user.role === 'doctor') setCurrentPage('doctor-dashboard');
    else setCurrentPage('admin-dashboard');
  };

  const handleLogout = () => {
    logout();
    setCurrentPage('landing');
  };

  const roleAllowedPages: Record<Role, string[]> = {
    patient: ['patient-dashboard', 'book-appointment', 'appointment-history', 'medical-records', 'profile-settings'],
    doctor: ['doctor-dashboard', 'manage-appointments', 'manage-medical-records', 'patient-history', 'schedule-management'],
    admin: ['admin-dashboard', 'patient-management', 'inventory-management', 'report-generation', 'appointment-management'],
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    if (!['landing', 'patient-login', 'doctor-admin-login', 'register'].includes(currentPage)) {
      setCurrentPage('patient-login');
      return null;
    }

    const renderPublicPage = () => {
      if (currentPage === 'patient-login') {
        return <LoginPage navigate={navigate} onLoginSuccess={handleLoginSuccess} flow="patient" />;
      }
      if (currentPage === 'doctor-admin-login') {
        return <LoginPage navigate={navigate} onLoginSuccess={handleLoginSuccess} flow="doctor-admin" />;
      }
      if (currentPage === 'register') {
        return <RegisterPage navigate={navigate} />;
      }
      return <LandingPage navigate={navigate} />;
    };

    return (
      <div className="relative">
        <button
          onClick={toggleTheme}
          className="fixed right-4 top-4 z-50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {renderPublicPage()}
      </div>
    );
  }

  // Redirect to correct dashboard if on landing/login pages
  if (['landing', 'patient-login', 'doctor-admin-login', 'register'].includes(currentPage)) {
    if (user!.role === 'patient') setCurrentPage('patient-dashboard');
    else if (user!.role === 'doctor') setCurrentPage('doctor-dashboard');
    else setCurrentPage('admin-dashboard');
  }

  const currentRole: Role = user!.role;

  if (!roleAllowedPages[currentRole].includes(currentPage)) {
    if (currentRole === 'patient') setCurrentPage('patient-dashboard');
    else if (currentRole === 'doctor') setCurrentPage('doctor-dashboard');
    else setCurrentPage('admin-dashboard');
    return null;
  }

  const pageTitle: Record<string, string> = {
    'patient-dashboard': 'Patient Dashboard',
    'book-appointment': 'Book Appointment',
    'appointment-history': 'Appointment History',
    'medical-records': 'Medical Records',
    'doctor-dashboard': 'Doctor Dashboard',
    'manage-appointments': 'Manage Appointments',
    'manage-medical-records': 'Manage Medical Records',
    'patient-history': 'Patient History',
    'schedule-management': 'Schedule Management',
    'admin-dashboard': 'Admin Dashboard',
    'patient-management': 'Patient Management',
    'inventory-management': 'Inventory Management',
    'report-generation': 'Reports',
    'appointment-management': 'Appointment Management',
    'profile-settings': 'Profile Settings',
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'patient-dashboard': return <PatientDashboard navigate={navigate} />;
      case 'book-appointment': return <BookAppointment navigate={navigate} />;
      case 'appointment-history': return <AppointmentHistory navigate={navigate} />;
      case 'medical-records': return <MedicalRecords navigate={navigate} />;
      case 'profile-settings': return <ProfileSettings navigate={navigate} />;
      case 'doctor-dashboard': return <DoctorDashboard navigate={navigate} />;
      case 'manage-appointments': return <ManageAppointments navigate={navigate} />;
      case 'manage-medical-records': return <ManageMedicalRecords navigate={navigate} />;
      case 'patient-history': return <PatientHistory navigate={navigate} />;
      case 'schedule-management': return <ScheduleManagement navigate={navigate} />;
      case 'admin-dashboard': return <AdminDashboard navigate={navigate} />;
      case 'patient-management': return <PatientManagement navigate={navigate} />;
      case 'inventory-management': return <InventoryManagement navigate={navigate} />;
      case 'report-generation': return <ReportGeneration navigate={navigate} />;
      case 'appointment-management': return <AppointmentManagement navigate={navigate} />;
      default: return <PatientDashboard navigate={navigate} />;
    }
  };

  return (
    <AppLayout
      currentPage={currentPage}
      currentRole={currentRole}
      pageTitle={pageTitle[currentPage] || 'MedLink'}
      navigate={navigate}
      onLogout={handleLogout}
    >
      {renderPage()}
    </AppLayout>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}