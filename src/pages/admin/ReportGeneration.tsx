import React, { useState, useEffect } from 'react';
import { Download, FileText } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../../api';

interface Props {
  navigate: (page: string) => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

export function ReportGeneration({ navigate }: Props) {
  const [tab, setTab] = useState('appointments');
  const [loading, setLoading] = useState(true);
  const [appointmentData, setAppointmentData] = useState<any[]>([]);
  const [doctorData, setDoctorData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [apptStats, setApptStats] = useState<any>({});

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.admin.getAppointmentReports().then((res) => {
        const d = res.data || {};
        setAppointmentData((d.monthly || []).map((m: any) => ({ month: m.month_label?.trim?.() || m.month, count: Number(m.total || 0) })));
        setApptStats(d.stats || d);
      }).catch(() => {}),
      api.admin.getDoctorReports().then((res) => {
        setDoctorData((res.data || []).map((row: any) => ({ name: row.full_name, visits: Number(row.total_appointments || 0) })));
      }).catch(() => {}),
      api.admin.getInventoryReports().then((res) => {
        const d = res.data || {};
        setInventoryData((d.by_category || []).map((row: any) => ({ name: row.category, value: Number(row.total_quantity || 0) })));
        setLowStockItems(d.low_stock || []);
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

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
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Reports</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Analytics and data exports</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/40 transition-colors">
            <Download size={14} /> PDF
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/40 transition-colors">
            <FileText size={14} /> CSV
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {[
          { id: 'appointments', label: 'Appointment Reports' },
          { id: 'inventory', label: 'Inventory Reports' },
        ].map((t) =>
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.id ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}>
            {t.label}
          </button>
        )}
      </div>

      {tab === 'appointments' && (
        <div className="space-y-5 fade-in">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'This Month', value: apptStats.this_month ?? apptStats.thisMonth ?? '0', change: apptStats.change },
              { label: 'Last Month', value: apptStats.last_month ?? apptStats.lastMonth ?? '0', change: '' },
              { label: 'Total This Year', value: apptStats.total_year ?? apptStats.totalYear ?? '0', change: '' },
            ].map((s) =>
              <div key={s.label} className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="text-sm text-slate-500 dark:text-slate-400">{s.label}</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{s.value}</div>
                {s.change && <div className="text-xs text-green-600 mt-1 font-medium">{s.change} vs last month</div>}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Monthly Appointments</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={appointmentData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Most Visited Doctors</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={doctorData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="visits" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="space-y-5 fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Inventory by Category</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={inventoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false} fontSize={11}>
                    {inventoryData.map((_: any, i: number) =>
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    )}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Low Stock Items</h3>
              <div className="space-y-3">
                {lowStockItems.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No low stock items</p>
                ) : lowStockItems.map((item: any, i: number) => {
                  const qty = item.quantity ?? item.qty ?? 0;
                  const reorder = item.reorder_level ?? item.reorder ?? 1;
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.item_name || item.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Reorder at: {reorder}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${qty === 0 ? 'text-red-600' : 'text-orange-600'}`}>{qty}</div>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1">
                          <div className={`h-1.5 rounded-full ${qty === 0 ? 'bg-red-500' : 'bg-orange-500'}`}
                            style={{ width: `${Math.min((qty / reorder) * 100, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

