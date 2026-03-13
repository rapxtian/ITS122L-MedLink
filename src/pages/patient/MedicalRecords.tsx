import React, { useState, useEffect } from 'react';
import { Download, FileText, Pill, Clock } from 'lucide-react';
import { api } from '../../api';

interface Props {
  navigate: (page: string) => void;
}

export function MedicalRecords({ navigate }: Props) {
  const [children, setChildren] = useState<any[]>([]);
  const [activeChild, setActiveChild] = useState('');
  const [activeTab, setActiveTab] = useState('lab');
  const [labResults, setLabResults] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.patient.getChildren().then((res) => {
      const list = res.data || [];
      setChildren(list);
      if (list.length > 0) setActiveChild(String(list[0].id));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeChild) return;
    const childId = Number(activeChild);
    Promise.all([
      api.patient.getMedicalRecords(childId).then(r => setHistory(r.data || [])).catch(() => setHistory([])),
      api.patient.getPrescriptions(childId).then(r => setPrescriptions(r.data || [])).catch(() => setPrescriptions([])),
      api.patient.getLabResults(childId).then(r => setLabResults(r.data || [])).catch(() => setLabResults([])),
    ]);
  }, [activeChild]);

  const tabs = [
    { id: 'lab', label: 'Lab Results', icon: FileText },
    { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
    { id: 'history', label: 'Medical History', icon: Clock },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Medical Records</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          View health records for your children
        </p>
      </div>

      {/* Child selector */}
      <div className="flex gap-2">
        {children.map((child) =>
        <button
          key={child.id}
          onClick={() => setActiveChild(String(child.id))}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${String(child.id) === activeChild ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}>
            {child.full_name}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
        {/* Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-700">
          {tabs.map((tab) =>
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all ${activeTab === tab.id ? 'border-blue-600 text-blue-700 dark:text-blue-300' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}>
              <tab.icon size={15} /> {tab.label}
            </button>
          )}
        </div>

        <div className="p-5">
          {/* Lab Results */}
          {activeTab === 'lab' &&
          <div className="overflow-x-auto fade-in">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                    {['File Name', 'Date', 'Ordered By', 'Type', 'Action'].map((h) =>
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {labResults.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">No lab results found</td></tr>
                  ) : labResults.map((r, i) =>
                <tr key={i} className="hover:bg-blue-50 dark:bg-blue-900/30 transition-colors">
                      <td className="px-4 py-3.5 flex items-center gap-2">
                        <FileText size={15} className="text-blue-500" />
                        <span className="font-medium text-slate-800 dark:text-slate-100">{r.test_name || r.name}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{r.test_date || r.date}</td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{r.doctor_name || r.doctor}</td>
                      <td className="px-4 py-3.5">
                        <span className="bg-slate-100 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded">{r.file_type || 'PDF'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <Download size={13} /> Download
                        </button>
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>
          }

          {/* Prescriptions */}
          {activeTab === 'prescriptions' &&
          <div className="overflow-x-auto fade-in">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                    {['Medication', 'Dosage', 'Frequency', 'Issued By', 'Date', 'Status'].map((h) =>
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {prescriptions.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">No prescriptions found</td></tr>
                  ) : prescriptions.map((p, i) =>
                <tr key={i} className="hover:bg-blue-50 dark:bg-blue-900/30 transition-colors even:bg-slate-50 dark:bg-slate-900/30">
                      <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-100">{p.medication}</td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{p.dosage}</td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{p.frequency}</td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{p.doctor_name || p.issuedBy}</td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{p.prescribed_date || p.date}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${(p.status || '').toLowerCase() === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500 dark:text-slate-400'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>
          }

          {/* Medical History Timeline */}
          {activeTab === 'history' &&
          <div className="space-y-0 fade-in">
              {history.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">No medical history found</p>
              ) : history.map((h, i) =>
            <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-50 dark:bg-blue-900/200 border-2 border-blue-200 mt-1 flex-shrink-0" />
                    {i < history.length - 1 &&
                <div className="w-px flex-1 bg-slate-200 my-1" />
                }
                  </div>
                  <div className="pb-6">
                    <div className="text-xs text-slate-400 dark:text-slate-500 mb-1">{h.record_date || h.date}</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{h.diagnosis}</div>
                    <div className="text-xs text-blue-600 mb-1">{h.doctor_name || h.doctor}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 rounded-lg p-3 mt-2">{h.notes}</div>
                  </div>
                </div>
            )}
            </div>
          }
        </div>
      </div>
    </div>
  );
}

