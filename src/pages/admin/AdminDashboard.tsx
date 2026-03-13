import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Clock } from 'lucide-react';
import { StatsCard } from '../../components/StatsCard';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

interface Props {
  navigate: (page: string) => void;
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  upcoming: 'bg-blue-100 text-blue-700 dark:text-blue-300',
  confirmed: 'bg-blue-100 text-blue-700 dark:text-blue-300',
  pending: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
};

const quickActions = [
  { title: 'Manage Doctors', icon: UserCheck, page: 'patient-management', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' },
  { title: 'Manage Patients', icon: Users, page: 'patient-management', color: 'bg-green-50 text-green-600' },
  { title: 'View Reports', icon: ArrowRight, page: 'report-generation', color: 'bg-purple-50 text-purple-600' },
  { title: 'Check Inventory', icon: AlertTriangle, page: 'inventory-management', color: 'bg-orange-50 text-orange-600' },
];

const activityColors: Record<string, string> = {
  create: 'bg-green-100 text-green-600',
  update: 'bg-blue-100 text-blue-600',
  delete: 'bg-red-100 text-red-600',
};

export function AdminDashboard({ navigate }: Props) {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>({});
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.admin.dashboard().then((res) => {
        setStats(res.data?.stats || {});
        setRecentAppointments(res.data?.recent_appointments || res.data?.recentAppointments || []);
      }),
      api.admin.getActivityLog().then((res) => setRecentActivity(res.data || [])).catch(() => {}),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Good morning, {user?.full_name || 'Admin'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Here's the clinic overview for today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Patients" value={stats.total_patients ?? '0'} subtitle={`+${stats.new_patients_month ?? 0} this month`} icon={Users} color="blue" />
        <StatsCard title="Total Doctors" value={stats.total_doctors ?? '0'} subtitle="All active" icon={UserCheck} color="green" />
        <StatsCard title="Today's Appointments" value={stats.today_appointments ?? '0'} subtitle={`${stats.completed_today ?? 0} completed`} icon={Calendar} color="orange" />
        <StatsCard title="Low Stock Alerts" value={stats.low_stock ?? '0'} subtitle="Needs attention" icon={AlertTriangle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Appointments */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Today's Appointments</h3>
            <button onClick={() => navigate('appointment-management')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                  {['Patient', 'Doctor', 'Time', 'Status'].map((h) =>
                  <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentAppointments.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-6 text-center text-sm text-slate-400 dark:text-slate-500">No appointments today</td></tr>
                ) : recentAppointments.map((a: any, i: number) =>
                <tr key={i} className="hover:bg-blue-50 dark:bg-blue-900/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-100">{a.child_name || a.patient}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{a.doctor_name || a.doctor}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{a.appointment_time || a.time}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[a.status?.toLowerCase()] || 'bg-slate-100 text-slate-700 dark:text-slate-300'}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a) =>
            <button key={a.title} onClick={() => navigate(a.page)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 border border-transparent transition-all">
                <div className={`w-9 h-9 rounded-xl ${a.color} flex items-center justify-center`}>
                  <a.icon size={16} />
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center leading-tight">{a.title}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No recent activity</p>
          ) : recentActivity.map((a: any, i: number) =>
          <div key={i} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full ${activityColors[a.type] || 'bg-blue-100 text-blue-600'} flex items-center justify-center flex-shrink-0`}>
                <Clock size={12} />
              </div>
              <div className="flex-1">
                <span className="text-sm text-slate-800 dark:text-slate-100">{a.action}</span>
                {a.user && <><span className="text-sm text-slate-500 dark:text-slate-400"> by </span><span className="text-sm font-medium text-slate-700 dark:text-slate-300">{a.user}</span></>}
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">{a.time || a.created_at}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

