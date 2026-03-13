import React, { useState, useEffect } from 'react';
import {
  Search,
  User,
  FileText,
  Pill,
  Calendar,
  ClipboardList } from 'lucide-react';
import { api } from '../../api';

interface Props {
  navigate: (page: string) => void;
}

export function PatientHistory({ navigate }: Props) {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [tab, setTab] = useState('appointments');
  const [history, setHistory] = useState<any>({});
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    api.doctor.getPatients()
      .then((res) => {
        const list = res.data || [];
        setPatients(list);
        if (list.length > 0) setSelected(list[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setHistoryLoading(true);
    api.doctor.getPatientHistory(selected.id)
      .then((res) => setHistory(res.data || {}))
      .catch(() => setHistory({}))
      .finally(() => setHistoryLoading(false));
  }, [selected?.id]);

  const filtered = patients.filter((p) =>
    (p.full_name || p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'medical', label: 'Medical History', icon: ClipboardList },
    { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
    { id: 'lab', label: 'Lab Results', icon: FileText },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const appointments = history.appointments || [];
  const medicalRecords = history.medical_records || history.medical || [];
  const prescriptions = history.prescriptions || [];
  const labResults = history.lab_results || history.lab || [];

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Patient History</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Search and review complete patient histories</p>
      </div>

      <div className="flex gap-5 h-[600px]">
        {/* Patient List */}
        <div className="w-64 flex-shrink-0 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
          <div className="p-3 border-b border-slate-100 dark:border-slate-700">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient..."
                className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {filtered.map((p) =>
            <button key={p.id} onClick={() => setSelected(p)}
              className={`w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/40 transition-colors ${selected?.id === p.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-blue-600" />
                </div>
                <div>
                  <div className={`text-sm font-medium ${selected?.id === p.id ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-100'}`}>
                    {p.full_name || p.name}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    {p.age ? `Age ${p.age}` : ''}{p.last_visit ? ` - ${p.last_visit}` : ''}
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col overflow-hidden">
          {selected && (
          <>
          {/* Patient Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User size={22} className="text-blue-600" />
            </div>
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-100">{selected.full_name || selected.name}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {selected.age ? `Age ${selected.age}` : ''}{selected.last_visit ? ` - Last visit: ${selected.last_visit}` : ''}
              </div>
              <div className="flex gap-2 mt-1">
                {selected.allergies && (
                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">
                    Allergy: {selected.allergies}
                  </span>
                )}
                {selected.condition && (
                  <span className="bg-blue-100 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">
                    {selected.condition}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-700 overflow-x-auto">
            {tabs.map((t) =>
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-all ${tab === t.id ? 'border-blue-600 text-blue-700 dark:text-blue-300' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}>
                <t.icon size={13} /> {t.label}
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {historyLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : (
            <>
            {tab === 'appointments' &&
            <div className="space-y-3 fade-in">
                {appointments.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No appointments found</p>
                ) : appointments.map((a: any, i: number) =>
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                    <div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{a.reason}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{a.appointment_date || a.date}</div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${a.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700 dark:text-blue-300'}`}>
                      {a.status}
                    </span>
                  </div>
                )}
              </div>
            }
            {tab === 'medical' &&
            <div className="space-y-4 fade-in">
                {medicalRecords.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No medical history found</p>
                ) : medicalRecords.map((h: any, i: number) =>
                <div key={i} className="border-l-4 border-blue-400 pl-4 py-1">
                    <div className="text-xs text-slate-400 dark:text-slate-500">{h.record_date || h.date}</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{h.diagnosis}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">{h.notes}</div>
                  </div>
                )}
              </div>
            }
            {tab === 'prescriptions' &&
            <div className="space-y-3 fade-in">
                {prescriptions.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No prescriptions found</p>
                ) : prescriptions.map((p: any, i: number) =>
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                    <Pill size={16} className="text-purple-500 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.medication} {p.dosage}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{p.frequency} - {p.prescribed_date || p.date}</div>
                    </div>
                  </div>
                )}
              </div>
            }
            {tab === 'lab' &&
            <div className="space-y-3 fade-in">
                {labResults.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No lab results found</p>
                ) : labResults.map((l: any, i: number) =>
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-blue-500" />
                      <div>
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{l.test_name || l.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{l.test_date || l.date}</div>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${l.result === 'Normal' || l.status === 'normal' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {l.result || l.status || 'Pending'}
                    </span>
                  </div>
                )}
              </div>
            }
            </>
            )}
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}

