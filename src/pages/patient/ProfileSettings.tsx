import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';
import { User, Mail, Phone, MapPin, Shield, Plus, Pencil, Trash2, AlertTriangle, Heart, X, Save, Users } from 'lucide-react';

interface ProfileSettingsProps {
  navigate: (page: string) => void;
}

interface EmergencyContact {
  id: number;
  contact_name: string;
  relationship: string;
  contact_number: string;
}

interface Child {
  id: number;
  full_name: string;
  date_of_birth: string;
  gender: string;
  known_allergies: string;
  medical_history: string;
}

export function ProfileSettings({ navigate }: ProfileSettingsProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Profile form
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');

  // Emergency contact modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [contactForm, setContactForm] = useState({ contact_name: '', relationship: '', contact_number: '' });

  // Child edit modal
  const [showChildModal, setShowChildModal] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [childForm, setChildForm] = useState({ known_allergies: '', medical_history: '' });

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.patient.getProfile();
      const data = res.data;
      setProfile(data);
      setFullName(data.full_name || '');
      setContactNumber(data.contact_number || '');
      setAddress(data.address || '');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const profilePhotoSrc = profile?.profile_photo
    ? `/backend/uploads/${profile.profile_photo}`
    : null;

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingPhoto(true);
    try {
      await api.patient.uploadProfilePhoto(formData);
      showMsg('success', 'Profile photo uploaded successfully');
      await loadProfile();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to upload profile photo');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  // ===== Profile Update =====
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patient.updateProfile({ full_name: fullName, contact_number: contactNumber, address });
      showMsg('success', 'Profile updated successfully');
      loadProfile();
    } catch (err: any) {
      showMsg('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  // ===== Emergency Contacts =====
  const openAddContact = () => {
    setEditingContact(null);
    setContactForm({ contact_name: '', relationship: '', contact_number: '' });
    setShowContactModal(true);
  };

  const openEditContact = (c: EmergencyContact) => {
    setEditingContact(c);
    setContactForm({ contact_name: c.contact_name, relationship: c.relationship, contact_number: c.contact_number });
    setShowContactModal(true);
  };

  const handleContactSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingContact) {
        await api.patient.updateEmergencyContact(editingContact.id, contactForm);
        showMsg('success', 'Emergency contact updated');
      } else {
        await api.patient.addEmergencyContact(contactForm);
        showMsg('success', 'Emergency contact added');
      }
      setShowContactModal(false);
      loadProfile();
    } catch (err: any) {
      showMsg('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleContactDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this emergency contact?')) return;
    try {
      await api.patient.deleteEmergencyContact(id);
      showMsg('success', 'Emergency contact deleted');
      loadProfile();
    } catch (err: any) {
      showMsg('error', err.message);
    }
  };

  // ===== Child Update =====
  const openEditChild = (child: Child) => {
    setEditingChild(child);
    setChildForm({ known_allergies: child.known_allergies || '', medical_history: child.medical_history || '' });
    setShowChildModal(true);
  };

  const handleChildSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChild) return;
    setSaving(true);
    try {
      await api.patient.updateChild({ child_id: editingChild.id, ...childForm });
      showMsg('success', 'Child information updated');
      setShowChildModal(false);
      loadProfile();
    } catch (err: any) {
      showMsg('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Profile Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your personal information, children details, and emergency contacts.</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Personal Information */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <User size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Personal Information</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Update your account details</p>
          </div>
        </div>

        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center">
              {profilePhotoSrc ? (
                <img src={profilePhotoSrc} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={24} className="text-slate-400" />
              )}
            </div>
            <div>
              <label className="inline-flex items-center px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                {uploadingPhoto ? 'Uploading...' : 'Upload Profile Photo'}
                <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleProfilePhotoUpload} disabled={uploadingPhoto} />
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">JPG or PNG, max 5MB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                <User size={14} className="inline mr-1" /> Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                <Mail size={14} className="inline mr-1" /> Email
              </label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                <Phone size={14} className="inline mr-1" /> Contact Number
              </label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                <MapPin size={14} className="inline mr-1" /> Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Children Information */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
            <Heart size={20} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Children</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage allergies and chronic conditions</p>
          </div>
        </div>

        {profile?.children?.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">No children registered.</p>
        )}

        <div className="space-y-3">
          {profile?.children?.map((child: Child) => (
            <div key={child.id} className="flex items-start justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-800 dark:text-slate-100">{child.full_name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {child.gender} • Born {new Date(child.date_of_birth).toLocaleDateString()}
                </div>
                {child.known_allergies && (
                  <div className="mt-2 text-xs">
                    <span className="font-medium text-orange-600 dark:text-orange-400">Allergies:</span>{' '}
                    <span className="text-slate-600 dark:text-slate-300">{child.known_allergies}</span>
                  </div>
                )}
                {child.medical_history && (
                  <div className="mt-1 text-xs">
                    <span className="font-medium text-blue-600 dark:text-blue-400">Conditions:</span>{' '}
                    <span className="text-slate-600 dark:text-slate-300">{child.medical_history}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => openEditChild(child)}
                className="ml-3 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-blue-600 transition-colors"
                title="Edit"
              >
                <Pencil size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <Shield size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Emergency Contacts</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">People to contact in case of emergencies</p>
            </div>
          </div>
          <button
            onClick={openAddContact}
            className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5"
          >
            <Plus size={16} /> Add Contact
          </button>
        </div>

        {profile?.emergency_contacts?.length === 0 && (
          <div className="text-center py-8">
            <AlertTriangle size={32} className="mx-auto text-amber-400 mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No emergency contacts added yet.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">It's important to have at least one emergency contact.</p>
          </div>
        )}

        <div className="space-y-3">
          {profile?.emergency_contacts?.map((contact: EmergencyContact) => (
            <div key={contact.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-800 dark:text-slate-100">{contact.contact_name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{contact.relationship}</div>
                <div className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 flex items-center gap-1">
                  <Phone size={12} /> {contact.contact_number}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-3">
                <button
                  onClick={() => openEditContact(contact)}
                  className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-blue-600 transition-colors"
                  title="Edit"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleContactDelete(contact.id)}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {editingContact ? 'Edit' : 'Add'} Emergency Contact
              </h3>
              <button onClick={() => setShowContactModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleContactSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={contactForm.contact_name}
                  onChange={(e) => setContactForm({ ...contactForm, contact_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Relationship *</label>
                <input
                  type="text"
                  required
                  value={contactForm.relationship}
                  onChange={(e) => setContactForm({ ...contactForm, relationship: e.target.value })}
                  placeholder="e.g. Spouse, Parent, Sibling"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Number *</label>
                <input
                  type="text"
                  required
                  value={contactForm.contact_number}
                  onChange={(e) => setContactForm({ ...contactForm, contact_number: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? 'Saving...' : editingContact ? 'Update' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Child Edit Modal */}
      {showChildModal && editingChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Edit {editingChild.full_name}
              </h3>
              <button onClick={() => setShowChildModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleChildSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Known Allergies</label>
                <textarea
                  value={childForm.known_allergies}
                  onChange={(e) => setChildForm({ ...childForm, known_allergies: e.target.value })}
                  rows={3}
                  placeholder="e.g. Peanuts, Penicillin, Latex"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chronic Conditions / Medical History</label>
                <textarea
                  value={childForm.medical_history}
                  onChange={(e) => setChildForm({ ...childForm, medical_history: e.target.value })}
                  rows={3}
                  placeholder="e.g. Asthma, Diabetes, Heart condition"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChildModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
