import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  FileText,
  Heart,
  ArrowRight,
  Clock,
  Star,
} from 'lucide-react';
import { StatsCard } from '../../components/StatsCard';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

interface Props {
  navigate: (page: string) => void;
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  'in progress': 'bg-blue-100 text-blue-700 dark:text-blue-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:text-blue-300',
  upcoming: 'bg-slate-100 text-slate-600 dark:text-slate-300',
  confirmed: 'bg-slate-100 text-slate-600 dark:text-slate-300',
  pending: 'bg-yellow-100 text-yellow-700',
};

const navCards = [
  { title: 'Manage Appointments', desc: 'View and manage patient appointments', icon: Calendar, page: 'manage-appointments', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' },
  { title: 'Manage Medical Records', desc: 'Add diagnoses and treatment notes', icon: FileText, page: 'manage-medical-records', color: 'bg-green-50 text-green-600' },
  { title: 'View Patient History', desc: 'Search and review patient histories', icon: Users, page: 'patient-history', color: 'bg-purple-50 text-purple-600' },
  { title: 'Schedule Management', desc: 'Manage your weekly availability', icon: Clock, page: 'schedule-management', color: 'bg-orange-50 text-orange-600' },
];

export function DoctorDashboard({ navigate }: Props) {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>({});
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);

  useEffect(() => {
    api.doctor.dashboard()
      .then((res) => {
        setStats(res.data?.stats || {});
        setSchedule(res.data?.today_schedule || res.data?.todaySchedule || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    api.doctor.getRatings()
      .then((res) => {
        setRatings(res.data?.ratings || []);
        setAvgRating(res.data?.average_rating || 0);
        setTotalRatings(res.data?.total_ratings || 0);
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Good morning, {user?.full_name || 'Doctor'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Here's your schedule and patient overview for today.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Today's Appointments" value={stats.today_appointments ?? '0'} subtitle={`${stats.completed_today ?? 0} completed`} icon={Calendar} color="blue" />
        <StatsCard title="Upcoming Patients" value={stats.upcoming_patients ?? '0'} subtitle="This afternoon" icon={Users} color="green" />
        <StatsCard title="Pending Lab Reviews" value={stats.pending_labs ?? '0'} subtitle="Awaiting review" icon={FileText} color="orange" />
        <StatsCard title="Total Patients" value={stats.total_patients ?? '0'} subtitle="Under your care" icon={Heart} color="purple" />
      </div>

      {/* Navigation Cards */}
      <div>
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-3">Quick Navigation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {navCards.map((c) =>
          <button key={c.title} onClick={() => navigate(c.page)}
            className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 text-left hover:shadow-md hover:border-blue-200 transition-all group">
              <div className={`w-11 h-11 rounded-xl ${c.color} flex items-center justify-center mb-3`}>
                <c.icon size={20} />
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm group-hover:text-blue-700 dark:text-blue-300 transition-colors">{c.title}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{c.desc}</div>
              <div className="flex items-center gap-1 text-xs text-blue-500 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ArrowRight size={12} />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Today's Schedule</h3>
          <button onClick={() => navigate('manage-appointments')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            View all <ArrowRight size={12} />
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {schedule.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">No appointments today</div>
          ) : schedule.map((s: any, i: number) =>
          <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 w-20">{s.appointment_time || s.time}</div>
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.child_name || s.patient}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{s.reason}</div>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[s.status?.toLowerCase()] || 'bg-slate-100 text-slate-600 dark:text-slate-300'}`}>
                {s.status}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Patient Feedback */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Patient Feedback</h3>
            {totalRatings > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={14} className={s <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'} />
                  ))}
                </div>
                <span className="text-slate-500 dark:text-slate-400 text-xs">{avgRating}/5 ({totalRatings} reviews)</span>
              </div>
            )}
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          {ratings.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">No patient ratings yet</div>
          ) : ratings.slice(0, 5).map((r: any) => (
            <div key={r.id} className="px-5 py-3.5">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.patient_name}</div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={12} className={s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'} />
                  ))}
                </div>
              </div>
              {r.comment && <p className="text-xs text-slate-500 dark:text-slate-400">{r.comment}</p>}
              <div className="text-[10px] text-slate-400 mt-1">{new Date(r.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
