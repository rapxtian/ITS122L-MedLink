import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { api } from '../../api';

interface Props {
  navigate: (page: string) => void;
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hours = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];

type SlotMap = Record<string, { id?: number; patient?: string; type: 'booked' | 'available' | 'blocked' }>;

export function ScheduleManagement({ navigate }: Props) {
  const [slots, setSlots] = useState<SlotMap>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newDay, setNewDay] = useState('Monday');
  const [newTime, setNewTime] = useState('9:00 AM');

  const fetchSchedule = async () => {
    try {
      const res = await api.doctor.getSchedule();
      const data = res.data || [];
      const mapped: SlotMap = {};
      data.forEach((s: any) => {
        const key = `${s.day_of_week}-${s.time_slot}`;
        mapped[key] = {
          id: s.id,
          patient: s.patient_name || s.child_name,
          type: s.status === 'booked' ? 'booked' : s.status === 'blocked' ? 'blocked' : 'available',
        };
      });
      setSlots(mapped);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchSchedule(); }, []);

  const handleAdd = async () => {
    const key = `${newDay}-${newTime}`;
    if (slots[key]) { setShowAdd(false); return; }
    try {
      await api.doctor.addSlot({ day_of_week: newDay, time_slot: newTime });
      await fetchSchedule();
    } catch {
      // Fallback: add locally
      setSlots((prev) => ({ ...prev, [key]: { type: 'available' } }));
    }
    setShowAdd(false);
  };

  const handleRemove = async (key: string) => {
    const slot = slots[key];
    if (slot?.id) {
      try {
        await api.doctor.removeSlot(slot.id);
        await fetchSchedule();
        return;
      } catch { }
    }
    setSlots((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });
  };

  const slotColors = {
    booked: 'bg-green-100 border border-green-200 text-green-800',
    available: 'bg-blue-100 border border-blue-200 text-blue-800',
    blocked: 'bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400',
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Schedule Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your weekly availability</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
          <Plus size={15} /> Add Time Slot
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-slate-600 dark:text-slate-300">
        {[{ label: 'Available', color: 'bg-blue-200' }, { label: 'Booked', color: 'bg-green-200' }, { label: 'Blocked', color: 'bg-slate-200' }].map((l) =>
        <span key={l.label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${l.color}`} /> {l.label}
          </span>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 w-24">Time</th>
                {days.map((d) =>
                <th key={d} className="text-center px-3 py-3 font-semibold text-slate-700 dark:text-slate-300">{d}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {hours.map((hour) =>
              <tr key={hour} className="hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/50">
                  <td className="px-4 py-2.5 text-slate-400 dark:text-slate-500 font-medium">{hour}</td>
                  {days.map((day) => {
                  const key = `${day}-${hour}`;
                  const slot = slots[key];
                  return (
                    <td key={day} className="px-2 py-2 text-center">
                        {slot ?
                      <div className={`rounded-lg px-2 py-1.5 text-xs relative group ${slotColors[slot.type]}`}>
                            {slot.patient ?
                        <div className="font-medium truncate max-w-20">{slot.patient}</div> :
                        <div className="text-xs capitalize">{slot.type}</div>
                        }
                            {slot.type !== 'booked' &&
                        <button onClick={() => handleRemove(key)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center hidden group-hover:flex">
                                <Trash2 size={8} />
                              </button>
                        }
                          </div> :
                      <div className="h-7 rounded-lg border border-dashed border-slate-200 dark:border-slate-700" />
                      }
                      </td>);
                })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Time Slot" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Day</label>
            <select value={newDay} onChange={(e) => setNewDay(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              {days.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Time</label>
            <select value={newTime} onChange={(e) => setNewTime(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              {hours.map((h) => <option key={h}>{h}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowAdd(false)}
              className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/40">
              Cancel
            </button>
            <button onClick={handleAdd}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700">
              Add Slot
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

