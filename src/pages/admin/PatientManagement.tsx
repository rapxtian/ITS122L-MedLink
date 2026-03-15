import React, { useState, useEffect, useCallback } from 'react';
import { Search, Eye, Trash2, Plus, AlertCircle } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { api } from '../../api';

interface Props {
  navigate: (page: string) => void;
}

export function PatientManagement({ navigate }: Props) {
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewPatient, setViewPatient] = useState<any | null>(null);
  const [viewDetail, setViewDetail] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    parent_name: '',
    parent_email: '',
    parent_contact: '',
    parent_address: '',
    child_name: '',
    child_dob: '',
    child_gender: 'Male',
    child_allergies: '',
    child_medical_history: '',
  });

  const fetchPatients = useCallback(() => {
    setLoading(true);
    api.admin.getPatients(search || undefined)
      .then((res) => setPatients(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchPatients, 300);
    return () => clearTimeout(t);
  }, [fetchPatients]);

  const handleView = async (p: any) => {
    setViewPatient(p);
    try {
      const res = await api.admin.getPatient(p.id || p.user_id);
      setViewDetail(res.data);
    } catch { setViewDetail(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.admin.deletePatient(deleteTarget.id || deleteTarget.user_id);
      setDeleteTarget(null);
      fetchPatients();
    } catch {} finally { setDeleting(false); }
  };

  const openAddForm = () => {
    setEditingPatient(null);
    setFormError(null);
    setForm({
      parent_name: '',
      parent_email: '',
      parent_contact: '',
      parent_address: '',
      child_name: '',
      child_dob: '',
      child_gender: 'Male',
      child_allergies: '',
      child_medical_history: '',
    });
    setShowFormModal(true);
  };

  const openEditForm = (p: any) => {
    setEditingPatient(p);
    setFormError(null);
    setForm({
      parent_name: p.parent_name || '',
      parent_email: p.parent_email || '',
      parent_contact: p.parent_contact || '',
      parent_address: p.parent_address || '',
      child_name: p.full_name || '',
      child_dob: p.date_of_birth || '',
      child_gender: p.gender || 'Male',
      child_allergies: p.known_allergies || '',
      child_medical_history: p.medical_history || '',
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!form.parent_name || !form.parent_email || !form.parent_contact || !form.child_name || !form.child_dob || !form.child_gender) {
      setFormError('Please fill all required fields.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editingPatient) {
        await api.admin.updatePatient(editingPatient.id, form);
      } else {
        await api.admin.createPatient(form);
      }
      setShowFormModal(false);
      fetchPatients();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save patient record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Patient Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">View and manage all registered patients</p>
        </div>
        <button onClick={openAddForm} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
          <Plus size={15} /> Add Patient
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by patient or parent name..."
          className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
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
                  {['Patient Name', 'Parent / Guardian', 'Age', 'Contact', 'Registered', 'Actions'].map((h) =>
                    <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {patients.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">No patients found</td></tr>
                ) : patients.map((p: any) =>
                  <tr key={p.id || p.user_id} className="hover:bg-blue-50 dark:bg-blue-900/30 transition-colors even:bg-slate-50 dark:bg-slate-900/30">
                    <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-100">{p.full_name || p.name}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{p.parent || p.parent_name || '-'}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{p.date_of_birth ? `${Math.max(0, new Date().getFullYear() - new Date(p.date_of_birth).getFullYear())} yrs` : '-'}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{p.parent_contact || p.contact || p.phone || '-'}</td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{p.registered || p.created_at?.slice(0, 10) || '-'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleView(p)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <Eye size={13} /> View
                        </button>
                        <button onClick={() => openEditForm(p)} className="flex items-center gap-1 text-xs text-green-600 hover:underline">
                          <Plus size={13} /> Edit
                        </button>
                        <button onClick={() => setDeleteTarget(p)} className="flex items-center gap-1 text-xs text-red-500 hover:underline">
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={!!viewPatient} onClose={() => { setViewPatient(null); setViewDetail(null); }} title="Patient Profile" size="md">
        {viewPatient && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Patient Name', viewDetail?.name || viewPatient.name || viewPatient.full_name],
                ['Parent / Guardian', viewDetail?.parent || viewPatient.parent || viewPatient.parent_name || '-'],
                ['Age', viewDetail?.age ? `${viewDetail.age} years old` : viewPatient.age ? `${viewPatient.age} years old` : '-'],
                ['Contact', viewDetail?.contact || viewPatient.contact || viewPatient.phone || '-'],
                ['Email', viewDetail?.email || viewPatient.email || '-'],
              ].map(([k, v]) =>
                <div key={k as string}>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">{k}</div>
                  <div className="font-medium text-slate-800 dark:text-slate-100">{v}</div>
                </div>
              )}
            </div>
            {viewDetail?.allergies && viewDetail.allergies.length > 0 && (
              <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-2">Known Allergies</div>
                <div className="flex flex-wrap gap-2">
                  {viewDetail.allergies.map((a: string, i: number) =>
                    <span key={i} className="bg-orange-100 text-orange-700 text-xs px-2.5 py-1 rounded-full">{a}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Patient" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-50 rounded-xl p-3">
            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">
              Are you sure you want to delete <strong>{deleteTarget?.name || deleteTarget?.full_name}</strong>? This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/40">
              Cancel
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={editingPatient ? 'Edit Patient' : 'Add Patient'} size="md">
        <div className="space-y-3">
          {formError && <div className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm">{formError}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input placeholder="Parent Name *" value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Parent Email *" type="email" value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Parent Contact *" value={form.parent_contact} onChange={(e) => setForm({ ...form, parent_contact: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Parent Address" value={form.parent_address} onChange={(e) => setForm({ ...form, parent_address: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Child Name *" value={form.child_name} onChange={(e) => setForm({ ...form, child_name: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm" />
            <input type="date" value={form.child_dob} onChange={(e) => setForm({ ...form, child_dob: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm" />
            <select value={form.child_gender} onChange={(e) => setForm({ ...form, child_gender: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm">
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <input placeholder="Allergies" value={form.child_allergies} onChange={(e) => setForm({ ...form, child_allergies: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm" />
          </div>
          <textarea placeholder="Medical History" value={form.child_medical_history} onChange={(e) => setForm({ ...form, child_medical_history: e.target.value })}
            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm" rows={3} />
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowFormModal(false)} className="flex-1 border border-slate-200 dark:border-slate-700 py-2.5 rounded-xl text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

