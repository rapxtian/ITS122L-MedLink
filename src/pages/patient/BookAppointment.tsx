import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, ChevronDown } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { api } from '../../api';
interface Props {
  navigate: (page: string) => void;
}
export function BookAppointment({ navigate }: Props) {
  const [children, setChildren] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedChild, setSelectedChild] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [reason, setReason] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.patient.getChildren().then((res) => setChildren(res.data || [])).catch(() => {});
    api.public.getDoctors().then((res) => setDoctors(res.data || [])).catch(() => {
      setError('Unable to load doctor list. Please try again shortly.');
    });
  }, []);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      api.appointments.getAvailableSlots(Number(selectedDoctor), selectedDate)
        .then((res) => setTimeSlots(res.data || []))
        .catch(() => setTimeSlots([]));
    } else {
      setTimeSlots([]);
    }
    setSelectedTime('');
  }, [selectedDoctor, selectedDate]);

  const handleSubmit = async () => {
    if (!selectedTime || !selectedChild || !selectedDoctor || !selectedDate) return;
    setBooking(true);
    setError('');
    try {
      await api.appointments.book({
        child_id: Number(selectedChild),
        doctor_id: Number(selectedDoctor),
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        reason,
      });
      setShowConfirm(true);
    } catch (e: any) {
      setError(e.message || 'Failed to book appointment');
    } finally {
      setBooking(false);
    }
  };

  const selectedChildName = children.find((c) => String(c.id) === selectedChild)?.full_name || '';
  const selectedDoctorName = doctors.find((d) => String(d.id) === selectedDoctor)?.full_name || '';

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Book an Appointment</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Schedule a visit with one of our pediatric doctors</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 space-y-5">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{error}</div>
        )}

        {/* Child */}
        <div>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">Select Child</label>
          <div className="relative">
            <select value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white dark:bg-slate-800">
              <option value="">-- Select a child --</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Doctor */}
        <div>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">Select Doctor</label>
          <div className="relative">
            <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white dark:bg-slate-800">
              <option value="">-- Select a doctor --</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.full_name}{d.specialization ? ` - ${d.specialization}` : ''}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">Preferred Date</label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
        </div>

        {/* Time Slots */}
        <div>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">Available Time Slots</label>
          <div className="flex items-center gap-4 mb-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300 inline-block" /> Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-100 border border-slate-200 dark:border-slate-700 inline-block" /> Unavailable
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" /> Selected
            </span>
          </div>
          {!selectedDoctor || !selectedDate ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">Select a doctor and date to see available slots</p>
          ) : timeSlots.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">No available slots for this date</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map((slot: any) => (
              <button
                key={slot.time_slot}
                disabled={slot.status !== 'available'}
                onClick={() => setSelectedTime(slot.time_slot)}
                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${slot.status !== 'available' ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-300 border-slate-100 dark:border-slate-700 cursor-not-allowed' : selectedTime === slot.time_slot ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800 hover:bg-blue-100'}`}>
                {slot.time_slot}
              </button>
              ))}
            </div>
          )}
        </div>

        {/* Reason */}
        <div>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">Reason for Visit</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
            placeholder="Describe the reason for this appointment..."
            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" />
        </div>

        <button onClick={handleSubmit} disabled={booking || !selectedTime || !selectedChild || !selectedDoctor}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          {booking ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Booking...</>
          ) : (
            <><Calendar size={16} /> Book Appointment</>
          )}
        </button>
      </div>

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Appointment Confirmed!" size="sm">
        <div className="text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-600" />
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">Your appointment has been successfully booked.</p>
          <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 text-left space-y-2 text-sm mb-5">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Child:</span>
              <span className="font-medium text-slate-800 dark:text-slate-100">{selectedChildName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Doctor:</span>
              <span className="font-medium text-slate-800 dark:text-slate-100">{selectedDoctorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Date:</span>
              <span className="font-medium text-slate-800 dark:text-slate-100">{selectedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Time:</span>
              <span className="font-medium text-slate-800 dark:text-slate-100">{selectedTime}</span>
            </div>
          </div>
          <button onClick={() => { setShowConfirm(false); navigate('appointment-history'); }}
            className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 transition-colors">
            Done
          </button>
        </div>
      </Modal>
    </div>
  );
}

