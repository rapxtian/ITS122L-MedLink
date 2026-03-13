import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Users,
  Package,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ClipboardList,
  Clock } from
'lucide-react';
import logoImg from '../assets/logoo.png';
import { Role, useAuth } from '../context/AuthContext';
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  currentPage: string;
  currentRole: Role;
  navigate: (page: string) => void;
  onLogout: () => void;
}
const patientMenu = [
{
  id: 'patient-dashboard',
  label: 'Dashboard',
  icon: LayoutDashboard
},
{
  id: 'book-appointment',
  label: 'Book Appointment',
  icon: Calendar
},
{
  id: 'appointment-history',
  label: 'Appointments',
  icon: Clock
},
{
  id: 'medical-records',
  label: 'Medical Records',
  icon: FileText
},
{
  id: 'profile-settings',
  label: 'Profile Settings',
  icon: Users
}];

const doctorMenu = [
{
  id: 'doctor-dashboard',
  label: 'Dashboard',
  icon: LayoutDashboard
},
{
  id: 'manage-appointments',
  label: 'Appointments',
  icon: Calendar
},
{
  id: 'manage-medical-records',
  label: 'Medical Records',
  icon: ClipboardList
},
{
  id: 'patient-history',
  label: 'Patient History',
  icon: Users
},
{
  id: 'schedule-management',
  label: 'My Schedule',
  icon: CalendarDays
}];

const adminMenu = [
{
  id: 'admin-dashboard',
  label: 'Dashboard',
  icon: LayoutDashboard
},
{
  id: 'patient-management',
  label: 'Patients',
  icon: Users
},
{
  id: 'appointment-management',
  label: 'Appointments',
  icon: Calendar
},
{
  id: 'inventory-management',
  label: 'Inventory',
  icon: Package
},
{
  id: 'report-generation',
  label: 'Reports',
  icon: BarChart3
}];

const menuMap: Record<Role, typeof patientMenu> = {
  patient: patientMenu,
  doctor: doctorMenu,
  admin: adminMenu
};
const roleLabels: Record<Role, string> = {
  patient: 'Patient',
  doctor: 'Doctor',
  admin: 'Administrator'
};
const roleColors: Record<Role, string> = {
  patient: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  doctor: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
};
export function Sidebar({
  collapsed,
  onToggle,
  currentPage,
  currentRole,
  navigate,
  onLogout
}: SidebarProps) {
  const { user } = useAuth();
  const displayName = user?.full_name || roleLabels[currentRole];
  const menu = menuMap[currentRole];
  return (
    <div
      className={`sidebar-transition flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-full ${collapsed ? 'w-16' : 'w-64'}`}>
      
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200 dark:border-slate-700">
        {!collapsed &&
        <div className="flex items-center gap-2">
            <img src={logoImg} alt="MedLink Logo" className="w-8 h-8 rounded-lg object-cover" />
            <div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">MedLink</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-none">
                Reganion Clinic
              </div>
            </div>
          </div>
        }
        {collapsed &&
        <img src={logoImg} alt="MedLink Logo" className="w-8 h-8 rounded-lg object-cover mx-auto" />
        }
        {!collapsed &&
        <button
          onClick={onToggle}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
          
            <ChevronLeft size={16} />
          </button>
        }
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {collapsed &&
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full py-2 mb-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          
            <ChevronRight size={16} />
          </button>
        }
        <ul className="space-y-1 px-2">
          {menu.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => navigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-l-4 border-blue-500 pl-2' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200'} ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? item.label : undefined}>
                  
                  <Icon
                    size={18}
                    className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                  
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </li>);

          })}
        </ul>
      </nav>

      {/* User info + logout */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-3">
        {!collapsed &&
        <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {displayName.
            split(' ').
            map((n) => n[0]).
            join('').
            slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                {displayName}
              </div>
              <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleColors[currentRole]}`}>
              
                {roleLabels[currentRole]}
              </span>
            </div>
          </div>
        }
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${collapsed ? 'justify-center' : ''}`}>
          
          <LogOut size={16} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>);
}