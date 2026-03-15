import React, { useState, useEffect } from 'react';
import { Search, Eye, X, AlertCircle, Star, Bell } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

interface Props {
  navigate: (page: string) => void;
}

const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-700 dark:text-blue-300',
  confirmed: 'bg-blue-100 text-blue-700 dark:text-blue-300',
  'in progress': 'bg-orange-100 text-orange-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700'
};

export function AppointmentHistory({ navigate }: Props) {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [viewAppt, setViewAppt] = useState<any | null>(null);
  const [cancelAppt, setCancelAppt] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Rating state
  const [ratingAppt, setRatingAppt] = useState<any | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratedAppointments, setRatedAppointments] = useState<Set<number>>(new Set());
  const [reminderSent, setReminderSent] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);

  const fetchAppointments = async () => {
    if (!user?.id) {
      setAppointments([]);
      setLoading(false);
      return;
    }
    try {
      const res = await api.appointments.getByPatient(user.id);
      setAppointments(res.data || []);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, []);
  const normalizeStatus = (status: string | undefined) => (status || '').trim().toLowerCase();

  const filtered = appointments.filter((a) => {
    const status = normalizeStatus(a.status);
    let matchesFilter = false;
    if (filter === 'All') {
      matchesFilter = true;
    } else if (filter === 'In Progress') {
      matchesFilter = status === 'in progress' || status === 'in_progress';
    } else {
      matchesFilter = status === filter.toLowerCase();
    }
    const matchesSearch =
      (a.doctor_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.child_name || '').toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleCancel = async () => {
    if (!cancelAppt) return;
    setCancelling(true);
    try {
      await api.appointments.cancel(cancelAppt.id, cancelReason);
      setCancelAppt(null);
      setCancelReason('');
      fetchAppointments();
    } catch { }
    setCancelling(false);
  };

  const openRating = (appt: any) => {
    setRatingAppt(appt);
    setRatingValue(0);
    setRatingHover(0);
    setRatingComment('');
  };

  const handleSendReminders = async () => {
    setReminderSending(true);
    try {
      await api.patient.checkReminders();
      setReminderSent(true);
      setTimeout(() => setReminderSent(false), 3000);
    } catch { }
    setReminderSending(false);
  };

  const handleRatingSubmit = async () => {
    if (!ratingAppt || !ratingValue) return;
    setSubmittingRating(true);
    try {
      await api.ratings.submit({ appointment_id: ratingAppt.id, rating: ratingValue, comment: ratingComment });
      setRatedAppointments((prev) => new Set(prev).add(ratingAppt.id));
      setRatingAppt(null);
    } catch { }
    setSubmittingRating(false);
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
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Appointment History
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            View and manage all your appointments
          </p>
        </div>
        <button
          onClick={handleSendReminders}
          disabled={reminderSending || reminderSent}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${reminderSent ? 'bg-green-100 text-green-700' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100'} disabled:opacity-60`}
        >
          <Bell size={14} />
          {reminderSending ? 'Sending...' : reminderSent ? 'Reminders Sent!' : 'Send Reminders'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by doctor or child..."
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
          
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {['All', 'Upcoming', 'In Progress', 'Completed', 'Cancelled'].map((s) =>
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter === s ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}>
            
              {s}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                {[
                'Date',
                'Time',
                'Doctor',
                'Child',
                'Reason',
                'Status',
                'Actions'].
                map((h) =>
                <th key={h} className="text-left px-5 py-3 font-medium">
                    {h}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400 dark:text-slate-500">
                    No appointments found for the current search or filter.
                  </td>
                </tr>
              )}
              {filtered.map((a) =>
              <tr
                key={a.id}
                className="hover:bg-blue-50 dark:bg-blue-900/30 transition-colors even:bg-slate-50 dark:bg-slate-900/30">
                  <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-100">
                    {a.appointment_date}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{a.appointment_time}</td>
                  <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{a.doctor_name}</td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{a.child_name}</td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{a.reason}</td>
                  <td className="px-5 py-3.5">
                    <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[a.status] || 'bg-slate-100 text-slate-700 dark:text-slate-300'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                      onClick={() => setViewAppt(a)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <Eye size={13} /> View
                      </button>
                      {(a.status === 'upcoming' || a.status === 'confirmed' || a.status === 'pending' || a.status === 'Upcoming') &&
                    <button
                      onClick={() => setCancelAppt(a)}
                      className="flex items-center gap-1 text-xs text-red-500 hover:underline">
                          <X size={13} /> Cancel
                        </button>
                    }
                    {(a.status === 'Completed' || a.status === 'completed') && !ratedAppointments.has(a.id) &&
                      <button
                        onClick={() => openRating(a)}
                        className="flex items-center gap-1 text-xs text-amber-600 hover:underline">
                        <Star size={13} /> Rate
                      </button>
                    }
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      <Modal
        isOpen={!!viewAppt}
        onClose={() => setViewAppt(null)}
        title="Appointment Details"
        size="sm">
        
        {viewAppt &&
        <div className="space-y-3 text-sm">
            {[
          ['Date', viewAppt.appointment_date],
          ['Time', viewAppt.appointment_time],
          ['Doctor', viewAppt.doctor_name],
          ['Child', viewAppt.child_name],
          ['Reason', viewAppt.reason]].
          map(([k, v]) =>
          <div
            key={k}
            className="flex justify-between py-2 border-b border-slate-50">
            
                <span className="text-slate-500 dark:text-slate-400">{k}</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{v || '—'}</span>
              </div>
          )}
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500 dark:text-slate-400">Status</span>
              <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[viewAppt.status] || 'bg-slate-100 text-slate-700 dark:text-slate-300'}`}>
              
                {viewAppt.status}
              </span>
            </div>
            {viewAppt.notes && (
              <div className="py-2 border-b border-slate-50">
                <span className="text-slate-500 dark:text-slate-400 block mb-1">Medical Notes</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{viewAppt.notes}</span>
              </div>
            )}
            {viewAppt.cancellation_reason && (
              <div className="py-2">
                <span className="text-slate-500 dark:text-slate-400 block mb-1">Cancellation Reason</span>
                <span className="font-medium text-red-600 dark:text-red-400">{viewAppt.cancellation_reason}</span>
              </div>
            )}
          </div>
        }
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={!!cancelAppt}
        onClose={() => setCancelAppt(null)}
        title="Cancel Appointment"
        size="sm">
        
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-50 rounded-xl p-3">
            <AlertCircle
              size={16}
              className="text-red-500 mt-0.5 flex-shrink-0" />
            
            <p className="text-sm text-red-700">
              Are you sure you want to cancel this appointment? This action
              cannot be undone.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
              Reason for Cancellation <span className="text-slate-400 text-xs">(optional)</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="Please provide a reason..."
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" />
            
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setCancelAppt(null)}
              className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/40 transition-colors">
              
              Keep Appointment
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50">
              {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Rating Modal */}
      <Modal
        isOpen={!!ratingAppt}
        onClose={() => setRatingAppt(null)}
        title="Rate Your Experience"
        size="sm">
        {ratingAppt && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">How was your experience with <strong>{ratingAppt.doctor_name}</strong>?</p>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRatingValue(star)}
                    onMouseEnter={() => setRatingHover(star)}
                    onMouseLeave={() => setRatingHover(0)}
                    className="p-1 transition-transform hover:scale-110">
                    <Star
                      size={28}
                      className={`transition-colors ${
                        star <= (ratingHover || ratingValue)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {ratingValue > 0 && (
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][ratingValue]}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Comment (optional)</label>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                rows={3}
                placeholder="Share your experience..."
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRatingAppt(null)}
                className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleRatingSubmit}
                disabled={!ratingValue || submittingRating}
                className="flex-1 bg-amber-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50">
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>);

}

