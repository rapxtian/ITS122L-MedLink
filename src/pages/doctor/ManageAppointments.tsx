import React, { useState, useEffect } from 'react';
import { Eye, CheckCircle, X } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { api } from '../../api';

interface Props {
  navigate: (page: string) => void;
}

const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-700 dark:text-blue-300',
  confirmed: 'bg-blue-100 text-blue-700 dark:text-blue-300',
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export function ManageAppointments({ navigate }: Props) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [viewAppt, setViewAppt] = useState<any | null>(null);

  const fetchAppointments = async () => {
    try {
      const res = await api.doctor.getAppointments();
      setAppointments(res.data || []);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, []);

  const filtered = appointments.filter((a) =>
    tab === 'upcoming'
      ? ['upcoming', 'confirmed', 'pending', 'in_progress'].includes(a.status?.toLowerCase())
      : ['completed', 'cancelled'].includes(a.status?.toLowerCase())
  );

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await api.doctor.updateAppointment(id, { status });
      fetchAppointments();
    } catch { }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Manage Appointments</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">View and manage your patient appointments</p>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(['upcoming', 'completed'] as const).map((t) =>
        <button key={t} onClick={() => setTab(t)}
          className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${tab === t ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}>
            {t}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                {['Patient Name', 'Date', 'Time', 'Reason', 'Status', 'Actions'].map((h) =>
                <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">No appointments found</td></tr>
              ) : filtered.map((a) =>
              <tr key={a.id} className="hover:bg-blue-50 dark:bg-blue-900/30 transition-colors even:bg-slate-50 dark:bg-slate-900/30">
                  <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-100">{a.child_name || a.patient}</td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{a.appointment_date}</td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{a.appointment_time}</td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{a.reason}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[a.status?.toLowerCase()] || 'bg-slate-100 text-slate-700 dark:text-slate-300'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setViewAppt(a)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <Eye size={13} /> View
                      </button>
                      {['upcoming', 'confirmed', 'pending'].includes(a.status?.toLowerCase()) &&
                    <>
                          <button onClick={() => handleStatusChange(a.id, 'completed')} className="flex items-center gap-1 text-xs text-green-600 hover:underline">
                            <CheckCircle size={13} /> Complete
                          </button>
                          <button onClick={() => handleStatusChange(a.id, 'cancelled')} className="flex items-center gap-1 text-xs text-red-500 hover:underline">
                            <X size={13} /> Cancel
                          </button>
                        </>
                    }
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!viewAppt} onClose={() => setViewAppt(null)} title="Appointment Details" size="sm">
        {viewAppt &&
        <div className="space-y-3 text-sm">
            {[
          ['Patient', viewAppt.child_name || viewAppt.patient],
          ['Date', viewAppt.appointment_date],
          ['Time', viewAppt.appointment_time],
          ['Reason', viewAppt.reason]].map(([k, v]) =>
          <div key={k} className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500 dark:text-slate-400">{k}</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{v}</span>
              </div>
          )}
            <div className="flex justify-between py-2">
              <span className="text-slate-500 dark:text-slate-400">Status</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[viewAppt.status?.toLowerCase()] || 'bg-slate-100 text-slate-700 dark:text-slate-300'}`}>
                {viewAppt.status}
              </span>
            </div>
          </div>
        }
      </Modal>
    </div>
  );
}

