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
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ item_name: '', category: '', supplier: '', quantity: '', reorder_level: '' });

  const resetForm = () => {
    setEditItem(null);
    setFormError('');
    setForm({ item_name: '', category: '', supplier: '', quantity: '', reorder_level: '' });
  };

  const closeModal = () => {
    setShowAdd(false);
    resetForm();
  };

  const openAdd = () => {
    resetForm();
    setShowAdd(true);
  };

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.admin.getInventory().then((res) => setInventory(res.data || [])),
      api.admin.getInventoryTransactions().then((res) => setTransactions(res.data || [])).catch(() => {}),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!form.item_name || !form.category || !form.supplier) return;
    setSaving(true);
    setFormError('');
    try {
      await api.admin.addInventoryItem({
        item_name: form.item_name,
        category: form.category,
        supplier: form.supplier,
        quantity: parseInt(form.quantity) || 0,
        reorder_level: parseInt(form.reorder_level) || 0,
      });
      closeModal();
      fetchData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to add item.');
    } finally { setSaving(false); }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      item_name: item.item_name || item.name || '',
      category: item.category || '',
      supplier: item.supplier || '',
      quantity: String(item.quantity ?? item.qty ?? 0),
      reorder_level: String(item.reorder_level ?? item.reorder ?? 0),
    });
    setShowAdd(true);
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    setSaving(true);
    setFormError('');
    try {
      await api.admin.updateInventoryItem(editItem.id || editItem.item_id, {
        item_name: form.item_name,
        category: form.category,
        supplier: form.supplier,
        quantity: parseInt(form.quantity) || 0,
        reorder_level: parseInt(form.reorder_level) || 0,
      });
      closeModal();
      fetchData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update item.');
    } finally { setSaving(false); }
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
        <button onClick={openAdd}
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
                        <span className="font-medium text-slate-800 dark:text-slate-100">{item.item_name || item.name}</span>
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
                      <button onClick={() => openEdit(item)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline ml-3">
                        <Plus size={13} /> Edit
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
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{t.item_name || t.item || t.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${((t.transaction_type || t.type || '').toLowerCase() === 'added' || (t.transaction_type || t.type || '').toLowerCase() === 'in') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700 dark:text-blue-300'}`}>
                      {t.transaction_type || t.type || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{t.quantity ?? t.qty ?? 0}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{t.transaction_date || t.date || t.created_at || '-'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={closeModal} title={editItem ? 'Edit Inventory Item' : 'Add Inventory Item'} size="md">
        <div className="space-y-4">
          {formError && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-lg">{formError}</div>
          )}
          {[
            { label: 'Item Name', key: 'item_name', placeholder: 'e.g., Amoxicillin 250mg' },
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
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800"
            >
              <option value="">-- Select category --</option>
              {['Antibiotic', 'Analgesic', 'Supplement', 'Electrolyte', 'Immunological', 'Equipment'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
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
            <button onClick={closeModal} className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/40">
              Cancel
            </button>
            <button onClick={editItem ? handleUpdate : handleAdd} disabled={saving || !form.item_name || !form.category || !form.supplier}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {saving ? (editItem ? 'Updating...' : 'Adding...') : (editItem ? 'Update Item' : 'Add Item')}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Delete Item" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-50 rounded-xl p-3">
            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">
              Delete <strong>{deleteItem?.item_name || deleteItem?.name}</strong>? This cannot be undone.
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

