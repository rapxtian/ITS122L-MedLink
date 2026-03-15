import React, { useState, useEffect, useRef } from 'react';
import { Search, Save, Plus, Upload } from 'lucide-react';
import { api } from '../../api';

interface Props {
  navigate: (page: string) => void;
}

export function ManageMedicalRecords({ navigate }: Props) {
  const [patients, setPatients] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [prescriptions, setPrescriptions] = useState<Array<{ medication_name: string; dosage: string; frequency: string }>>([]);

  // Lab upload state
  const [labFile, setLabFile] = useState<File | null>(null);
  const [labPatient, setLabPatient] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      api.doctor.getPatients().then((res) => {
        const list = res.data || [];
        setPatients(list);
        if (list.length > 0) setSelectedPatient(String(list[0].id));
      }),
      api.doctor.getMedicalRecords().then((res) => setRecords(res.data || [])),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!selectedPatient || !diagnosis || !treatment) {
      setFormError('Patient, diagnosis, and treatment are required.');
      return;
    }

    const hasIncompletePrescription = prescriptions.some((rx) =>
      (rx.medication_name || rx.dosage || rx.frequency) && (!rx.medication_name || !rx.dosage || !rx.frequency)
    );
    if (hasIncompletePrescription) {
      setFormError('Complete all prescription fields or remove incomplete rows.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await api.doctor.addMedicalRecord({
        child_id: Number(selectedPatient),
        diagnosis,
        treatment,
        notes,
        prescriptions: prescriptions.filter((rx) => rx.medication_name && rx.dosage && rx.frequency),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setDiagnosis('');
      setTreatment('');
      setNotes('');
      setPrescriptions([]);
      // Refresh records
      const res = await api.doctor.getMedicalRecords();
      setRecords(res.data || []);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save medical record');
    }
    setSaving(false);
  };

  const handleLabUpload = async () => {
    if (!labFile || !labPatient) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', labFile);
      formData.append('child_id', labPatient);
      formData.append('result_date', new Date().toISOString().slice(0, 10));
      await api.doctor.uploadLabResult(formData);
      setUploadMsg('Lab result uploaded successfully!');
      setLabFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setTimeout(() => setUploadMsg(null), 3000);
    } catch (err: any) {
      setUploadMsg('Upload failed: ' + (err.message || 'Unknown error'));
      setTimeout(() => setUploadMsg(null), 3000);
    }
    setUploading(false);
  };

  const filteredRecords = records.filter((r) =>
    (r.child_name || r.patient || '').toLowerCase().includes(search.toLowerCase())
  );

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
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Manage Medical Records</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Add diagnoses and treatment notes for patients</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patient by name..."
          className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
      </div>

      {/* Add Record Form */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Plus size={16} className="text-blue-600" /> Add Medical Record
        </h3>
        <div className="space-y-4">
          {formError && (
            <div className="px-3 py-2.5 rounded-lg text-sm bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {formError}
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Patient</label>
            <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="">-- Select patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name || p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Diagnosis</label>
            <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Enter diagnosis..."
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Treatment</label>
            <input value={treatment} onChange={(e) => setTreatment(e.target.value)}
              placeholder="Prescribed treatment..."
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Additional notes..."
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Prescriptions (optional)</label>
              <button
                onClick={() => setPrescriptions((prev) => [...prev, { medication_name: '', dosage: '', frequency: '' }])}
                className="text-xs px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                Add Prescription
              </button>
            </div>
            {prescriptions.map((rx, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  value={rx.medication_name}
                  onChange={(e) => setPrescriptions((prev) => prev.map((p, i) => i === index ? { ...p, medication_name: e.target.value } : p))}
                  placeholder="Medication"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <input
                  value={rx.dosage}
                  onChange={(e) => setPrescriptions((prev) => prev.map((p, i) => i === index ? { ...p, dosage: e.target.value } : p))}
                  placeholder="Dosage"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <div className="flex gap-2">
                  <input
                    value={rx.frequency}
                    onChange={(e) => setPrescriptions((prev) => prev.map((p, i) => i === index ? { ...p, frequency: e.target.value } : p))}
                    placeholder="Frequency"
                    className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <button
                    onClick={() => setPrescriptions((prev) => prev.filter((_, i) => i !== index))}
                    className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-xs"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleSave} disabled={saving || !selectedPatient || !diagnosis || !treatment}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            <Save size={15} /> {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Record'}
          </button>
        </div>
      </div>

      {/* Upload Lab Result */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Upload size={16} className="text-green-600" /> Upload Lab Result
        </h3>
        {uploadMsg && (
          <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${uploadMsg.includes('failed') ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
            {uploadMsg}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Patient</label>
            <select value={labPatient} onChange={(e) => setLabPatient(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="">-- Select patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name || p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">File (PDF, JPG, PNG — max 10MB)</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setLabFile(e.target.files?.[0] || null)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
            />
          </div>
          <button onClick={handleLabUpload} disabled={uploading || !labFile || !labPatient}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50">
            <Upload size={15} /> {uploading ? 'Uploading...' : 'Upload Lab Result'}
          </button>
        </div>
      </div>

      {/* Records Timeline */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-5">Recent Records</h3>
        <div className="space-y-0">
          {filteredRecords.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No records found</p>
          ) : filteredRecords.map((r, i) =>
          <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-blue-50 dark:bg-blue-900/200 border-2 border-blue-200 mt-1 flex-shrink-0" />
                {i < filteredRecords.length - 1 &&
              <div className="w-px flex-1 bg-slate-200 my-1" />
              }
              </div>
              <div className="pb-5">
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">{r.record_date || r.date}</div>
                <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{r.child_name || r.patient}</div>
                <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">{r.diagnosis}</div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">Treatment: {r.treatment}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg p-2 mt-2">{r.notes}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

