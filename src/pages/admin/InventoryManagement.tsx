import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  AlertTriangle,
  Package,
  AlertCircle } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { StatsCard } from '../../components/StatsCard';
import { api } from '../../api';

interface Props {
  navigate: (page: string) => void;
}

const statusColors: Record<string, string> = {
  'in stock': 'bg-green-100 text-green-700',
  'low stock': 'bg-orange-100 text-orange-700',
  'out of stock': 'bg-red-100 text-red-700',
};

function getStatus(item: any) {
  if (item.status) return item.status;
  const qty = item.quantity ?? item.qty ?? 0;
  const reorder = item.reorder_level ?? item.reorder ?? 0;
  if (qty === 0) return 'Out of Stock';
  if (qty <= reorder) return 'Low Stock';
  return 'In Stock';
}

export function InventoryManagement({ navigate }: Props) {
  const [inventory, setInventory] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', supplier: '', quantity: '', reorder_level: '' });

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.admin.getInventory().then((res) => setInventory(res.data || [])),
      api.admin.getInventoryTransactions().then((res) => setTransactions(res.data || [])).catch(() => {}),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await api.admin.addInventoryItem({
        name: form.name,
        category: form.category,
        supplier: form.supplier,
        quantity: parseInt(form.quantity) || 0,
        reorder_level: parseInt(form.reorder_level) || 0,
      });
      setShowAdd(false);
      setForm({ name: '', category: '', supplier: '', quantity: '', reorder_level: '' });
      fetchData();
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await api.admin.deleteInventoryItem(deleteItem.id || deleteItem.item_id);
      setDeleteItem(null);
      fetchData();
    } catch {} finally { setDeleting(false); }
  };

  const totalItems = inventory.length;
  const lowStock = inventory.filter((i) => getStatus(i).toLowerCase() === 'low stock').length;
  const outOfStock = inventory.filter((i) => getStatus(i).toLowerCase() === 'out of stock').length;

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
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Inventory Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track and manage clinic supplies</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
          <Plus size={15} /> Add Item
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatsCard title="Total Items" value={String(totalItems)} subtitle="In inventory" icon={Package} color="blue" />
        <StatsCard title="Low Stock" value={String(lowStock)} subtitle="Below reorder level" icon={AlertTriangle} color="orange" />
        <StatsCard title="Out of Stock" value={String(outOfStock)} subtitle="Needs reorder" icon={AlertCircle} color="red" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                {['Item Name', 'Category', 'Quantity', 'Reorder Level', 'Supplier', 'Status', 'Actions'].map((h) =>
                  <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {inventory.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">No inventory items</td></tr>
              ) : inventory.map((item: any) => {
                const status = getStatus(item);
                const qty = item.quantity ?? item.qty ?? 0;
                const reorder = item.reorder_level ?? item.reorder ?? 0;
                return (
                  <tr key={item.id || item.item_id}
                    className={`hover:bg-blue-50 dark:bg-blue-900/30 transition-colors ${status.toLowerCase() === 'low stock' ? 'bg-orange-50/30' : status.toLowerCase() === 'out of stock' ? 'bg-red-50/30' : 'even:bg-slate-50 dark:bg-slate-900/30'}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {status.toLowerCase() !== 'in stock' &&
                          <AlertTriangle size={13} className={status.toLowerCase() === 'out of stock' ? 'text-red-500' : 'text-orange-500'} />
                        }
                        <span className="font-medium text-slate-800 dark:text-slate-100">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{item.category || '-'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`font-semibold ${qty <= reorder ? 'text-orange-600' : 'text-slate-800 dark:text-slate-100'}`}>{qty}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{reorder}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{item.supplier || '-'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[status.toLowerCase()] || 'bg-slate-100 text-slate-700 dark:text-slate-300'}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => setDeleteItem(item)} className="flex items-center gap-1 text-xs text-red-500 hover:underline">
                        <Trash2 size={13} /> Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                {['Item', 'Type', 'Quantity', 'Date'].map((h) =>
                  <th key={h} className="text-left px-4 py-2.5 font-medium">{h}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">No transactions</td></tr>
              ) : transactions.map((t: any, i: number) =>
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/50">
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{t.item || t.item_name || t.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(t.type || '').toLowerCase() === 'added' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700 dark:text-blue-300'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{t.qty || t.quantity}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{t.date || t.created_at}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Inventory Item" size="md">
        <div className="space-y-4">
          {[
            { label: 'Item Name', key: 'name', placeholder: 'e.g., Amoxicillin 250mg' },
            { label: 'Category', key: 'category', placeholder: 'e.g., Antibiotic' },
            { label: 'Supplier', key: 'supplier', placeholder: 'e.g., PharmaCorp' },
          ].map((f) =>
            <div key={f.key}>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">{f.label}</label>
              <input type="text" placeholder={f.placeholder}
                value={(form as any)[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Quantity</label>
              <input type="number" placeholder="0" value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Reorder Level</label>
              <input type="number" placeholder="0" value={form.reorder_level}
                onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowAdd(false)} className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/40">
              Cancel
            </button>
            <button onClick={handleAdd} disabled={saving || !form.name}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Delete Item" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-50 rounded-xl p-3">
            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">
              Delete <strong>{deleteItem?.name}</strong>? This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeleteItem(null)} className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/40">
              Cancel
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

