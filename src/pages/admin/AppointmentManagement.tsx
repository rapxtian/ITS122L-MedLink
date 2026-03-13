import React, { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle, X, Eye } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { api } from '../../api';

interface Props {
  navigate: (page: string) => void;
}

const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-700 dark:text-blue-300',
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700 dark:text-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const filterTabs = ['All', 'pending', 'confirmed', 'completed', 'cancelled'];

export function AppointmentManagement({ navigate }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewAppt, setViewAppt] = useState<any | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchAppointments = useCallback(() => {
    setLoading(true);
    api.admin.getAppointments({ status: filter, search: search || undefined })
      .then((res) => setAppointments(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter, search]);

  useEffect(() => {
    const t = setTimeout(fetchAppointments, 300);
    return () => clearTimeout(t);
  }, [fetchAppointments]);

  const handleStatusChange = async (id: number, status: string) => {
    setUpdating(id);
    try {
      await api.admin.updateAppointment(id, { status });
      fetchAppointments();
      if (viewAppt && (viewAppt.id === id || viewAppt.appointment_id === id)) setViewAppt(null);
    } catch {} finally { setUpdating(null); }
  };

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Appointment Management</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">View and manage all clinic appointments</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient or doctor..."
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {filterTabs.map((s) =>
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${filter === s ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}>
              {s}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                  {['Patient', 'Doctor', 'Date', 'Time', 'Status', 'Actions'].map((h) =>
                    <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {appointments.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">No appointments found</td></tr>
                ) : appointments.map((a: any) => {
                  const id = a.id || a.appointment_id;
                  const status = (a.status || '').toLowerCase();
                  return (
                    <tr key={id} className="hover:bg-blue-50 dark:bg-blue-900/30 transition-colors even:bg-slate-50 dark:bg-slate-900/30">
                      <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-100">{a.child_name || a.patient}</td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{a.doctor_name || a.doctor}</td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{a.appointment_date || a.date}</td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{a.appointment_time || a.time}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[status] || 'bg-slate-100 text-slate-700 dark:text-slate-300'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setViewAppt(a)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Eye size={13} /> View
                          </button>
                          {(status === 'pending' || status === 'upcoming') && (
                            <>
                              <button disabled={updating === id} onClick={() => handleStatusChange(id, 'confirmed')}
                                className="flex items-center gap-1 text-xs text-green-600 hover:underline disabled:opacity-50">
                                <CheckCircle size={13} /> Approve
                              </button>
                              <button disabled={updating === id} onClick={() => handleStatusChange(id, 'cancelled')}
                                className="flex items-center gap-1 text-xs text-red-500 hover:underline disabled:opacity-50">
                                <X size={13} /> Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={!!viewAppt} onClose={() => setViewAppt(null)} title="Appointment Details" size="sm">
        {viewAppt && (
          <div className="space-y-3 text-sm">
            {[
              ['Patient', viewAppt.child_name || viewAppt.patient],
              ['Doctor', viewAppt.doctor_name || viewAppt.doctor],
              ['Date', viewAppt.appointment_date || viewAppt.date],
              ['Time', viewAppt.appointment_time || viewAppt.time],
            ].map(([k, v]) =>
              <div key={k as string} className="flex justify-between py-2 border-b border-slate-50">
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
            {(viewAppt.status?.toLowerCase() === 'pending' || viewAppt.status?.toLowerCase() === 'upcoming') && (
              <div className="flex gap-3 pt-3">
                <button disabled={!!updating} onClick={() => handleStatusChange(viewAppt.id || viewAppt.appointment_id, 'confirmed')}
                  className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
                  Approve
                </button>
                <button disabled={!!updating} onClick={() => handleStatusChange(viewAppt.id || viewAppt.appointment_id, 'cancelled')}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

