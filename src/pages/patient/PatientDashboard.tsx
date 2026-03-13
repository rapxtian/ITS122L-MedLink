import React, { useEffect, useState } from 'react';
import {
  Calendar,
  FileText,
  Clock,
  Bell,
  CheckCircle,
  Pill,
  ArrowRight,
  User } from
'lucide-react';
import { StatsCard } from '../../components/StatsCard';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
interface Props {
  navigate: (page: string) => void;
}

const statusColors: Record<string, string> = {
  Upcoming: 'bg-blue-100 text-blue-700 dark:text-blue-300',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700'
};

export function PatientDashboard({ navigate }: Props) {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.patient.dashboard()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Trigger reminder check for tomorrow's appointments
    api.patient.checkReminders().catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats || {};
  const upcomingAppointments = data?.upcoming_appointments || [];
  const children = data?.children || [];

  const nextAppt = upcomingAppointments[0];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Welcome, {user?.full_name || 'Patient'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Here's what's happening with your children today.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Next Appointment"
          value={nextAppt ? new Date(nextAppt.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'None'}
          subtitle={nextAppt ? `${nextAppt.appointment_time} - ${nextAppt.doctor_name}` : 'No upcoming'}
          icon={Calendar}
          color="blue" />
        <StatsCard
          title="Total Appointments"
          value={String(stats.total || 0)}
          subtitle="All time"
          icon={CheckCircle}
          color="green" />
        <StatsCard
          title="Notifications"
          value={String(data?.unread_notifications || 0)}
          subtitle="Unread"
          icon={Bell}
          color="orange" />
        <StatsCard
          title="Active Prescriptions"
          value={String(data?.active_prescriptions?.length || 0)}
          subtitle="Current medications"
          icon={Pill}
          color="purple" />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
          { title: 'Book Appointment', desc: 'Schedule a visit with a doctor', icon: Calendar, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600', page: 'book-appointment' },
          { title: 'Medical Records', desc: 'View lab results & prescriptions', icon: FileText, color: 'bg-green-50 text-green-600', page: 'medical-records' },
          { title: 'Appointment History', desc: 'View past & upcoming visits', icon: Clock, color: 'bg-purple-50 text-purple-600', page: 'appointment-history' },
          ].map((a) => (
          <button
            key={a.title}
            onClick={() => navigate(a.page)}
            className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 text-left hover:shadow-md hover:border-blue-200 transition-all group">
              <div className={`w-11 h-11 rounded-xl ${a.color} flex items-center justify-center mb-3`}>
                <a.icon size={20} />
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:text-blue-300 transition-colors">{a.title}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{a.desc}</div>
              <div className="flex items-center gap-1 text-xs text-blue-500 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ArrowRight size={12} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming Appointments Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Upcoming Appointments</h3>
          <button onClick={() => navigate('appointment-history')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            View all <ArrowRight size={12} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-medium">Date</th>
                <th className="text-left px-5 py-3 font-medium">Time</th>
                <th className="text-left px-5 py-3 font-medium">Doctor</th>
                <th className="text-left px-5 py-3 font-medium">Child</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {upcomingAppointments.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400 dark:text-slate-500">No upcoming appointments</td></tr>
              )}
              {upcomingAppointments.map((a: any, i: number) => (
              <tr key={i} className="hover:bg-blue-50 dark:bg-blue-900/30 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-100">{new Date(a.appointment_date).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{a.appointment_time}</td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{a.doctor_name}</td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{a.child_name}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[a.status] || 'bg-slate-100 text-slate-600 dark:text-slate-300'}`}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Children */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">My Children</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {children.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500">No children registered yet.</p>}
          {children.map((c: any) => (
          <div key={c.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User size={18} className="text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-slate-800 dark:text-slate-100 text-sm">{c.full_name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{c.gender} - DOB: {new Date(c.date_of_birth).toLocaleDateString()}</div>
                {c.known_allergies && <div className="text-xs text-orange-600 mt-0.5">Allergy: {c.known_allergies}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

