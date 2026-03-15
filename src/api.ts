const API_BASE = (import.meta as any).env?.VITE_API_URL || '/backend';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Request failed');
  return data;
}

async function uploadRequest(path: string, formData: FormData): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Request failed');
  return data;
}

async function downloadRequest(path: string): Promise<Blob> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    let message = 'Download failed';
    try {
      const data = await res.json();
      message = data.message || data.error || message;
    } catch {
      // Ignore JSON parsing errors for non-JSON download responses.
    }
    throw new Error(message);
  }

  return res.blob();
}

// ===== AUTH =====
export const api = {
  auth: {
    login: (email: string, password: string, role?: string) =>
      request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password, role }) }),
    register: (data: any) =>
      request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request('/api/auth/me'),
  },

  // ===== PATIENT =====
  patient: {
    dashboard: () => request('/api/patient/dashboard'),
    getChildren: () => request('/api/patient/children'),
    addChild: (data: any) =>
      request('/api/patient/children', { method: 'POST', body: JSON.stringify(data) }),
    updateChild: (data: any) =>
      request('/api/patient/children', { method: 'PUT', body: JSON.stringify(data) }),
    getMedicalRecords: (childId?: number) =>
      request(`/api/patient/medical-records${childId ? `?child_id=${childId}` : ''}`),
    getPrescriptions: (childId?: number, status?: string) => {
      const params = new URLSearchParams();
      if (childId) params.set('child_id', String(childId));
      if (status) params.set('status', status);
      const qs = params.toString();
      return request(`/api/patient/prescriptions${qs ? `?${qs}` : ''}`);
    },
    getLabResults: (childId?: number) =>
      request(`/api/patient/lab-results${childId ? `?child_id=${childId}` : ''}`),
    downloadLabResult: (labResultId: number) =>
      downloadRequest(`/api/patient/lab-results/download/${labResultId}`),
    getNotifications: () => request('/api/patient/notifications'),
    markNotificationRead: (id: number) =>
      request(`/api/patient/notifications/read/${id}`, { method: 'PUT' }),
    markAllNotificationsRead: () =>
      request('/api/patient/notifications/read-all', { method: 'PUT' }),
    getProfile: () => request('/api/patient/profile'),
    updateProfile: (data: any) =>
      request('/api/patient/profile', { method: 'PUT', body: JSON.stringify(data) }),
    uploadProfilePhoto: (formData: FormData) =>
      uploadRequest('/api/patient/profile-photo', formData),
    getEmergencyContacts: () => request('/api/patient/emergency-contacts'),
    addEmergencyContact: (data: any) =>
      request('/api/patient/emergency-contacts', { method: 'POST', body: JSON.stringify(data) }),
    updateEmergencyContact: (id: number, data: any) =>
      request(`/api/patient/emergency-contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteEmergencyContact: (id: number) =>
      request(`/api/patient/emergency-contacts/${id}`, { method: 'DELETE' }),
    checkReminders: () =>
      request('/api/patient/check-reminders', { method: 'POST' }),
  },

  // ===== APPOINTMENTS =====
  appointments: {
    getAll: () => request('/api/appointments'),
    getByPatient: (patientId: number) => request(`/api/appointments/patient/${patientId}`),
    getAvailableSlots: (doctorId: number, date: string) =>
      request(`/api/appointments/available-slots?doctor_id=${doctorId}&date=${date}`),
    book: (data: any) =>
      request('/api/appointments/book', { method: 'POST', body: JSON.stringify(data) }),
    cancel: (id: number, reason?: string) =>
      request(`/api/appointments/${id}/cancel`, { method: 'PUT', body: JSON.stringify({ reason }) }),
    updateStatus: (id: number, status: string) =>
      request(`/api/appointments/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  },

  // ===== DOCTOR =====
  doctor: {
    dashboard: () => request('/api/doctor/dashboard'),
    getAppointments: (status?: string) => {
      const qs = status ? `?status=${status}` : '';
      return request(`/api/doctor/appointments${qs}`);
    },
    updateAppointment: (id: number, data: any) =>
      request(`/api/doctor/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getSchedule: () => request('/api/doctor/schedule'),
    updateSchedule: (data: any) =>
      request('/api/doctor/schedule', { method: 'PUT', body: JSON.stringify(data) }),
    addSlot: (data: any) =>
      request('/api/doctor/schedule', { method: 'POST', body: JSON.stringify(data) }),
    removeSlot: (id: number) =>
      request(`/api/doctor/schedule/${id}`, { method: 'DELETE' }),
    getPatients: () => request('/api/doctor/patients'),
    getPatientHistory: (childId: number) => request(`/api/doctor/patient-history/${childId}`),
    getMedicalRecords: () => request('/api/doctor/medical-records'),
    addMedicalRecord: (data: any) =>
      request('/api/doctor/medical-records', { method: 'POST', body: JSON.stringify(data) }),
    uploadLabResult: (formData: FormData) =>
      uploadRequest('/api/doctor/lab-results', formData),
    getRatings: () => request('/api/doctor/ratings'),
  },

  // ===== ADMIN =====
  admin: {
    dashboard: () => request('/api/admin/dashboard'),
    getPatients: (search?: string) => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      return request(`/api/admin/patients${qs}`);
    },
    getPatient: (id: number) => request(`/api/admin/patients/${id}`),
    createPatient: (data: any) =>
      request('/api/admin/patients', { method: 'POST', body: JSON.stringify(data) }),
    updatePatient: (id: number, data: any) =>
      request(`/api/admin/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePatient: (id: number) =>
      request(`/api/admin/patients/${id}`, { method: 'DELETE' }),
    getAppointments: (params?: { status?: string; search?: string }) => {
      const qs = new URLSearchParams();
      if (params?.status && params.status !== 'All') qs.set('status', params.status);
      if (params?.search) qs.set('search', params.search);
      const s = qs.toString();
      return request(`/api/admin/appointments${s ? `?${s}` : ''}`);
    },
    updateAppointment: (id: number, data: any) =>
      request(`/api/admin/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getInventory: (search?: string) => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      return request(`/api/admin/inventory${qs}`);
    },
    addInventoryItem: (data: any) =>
      request('/api/admin/inventory', { method: 'POST', body: JSON.stringify(data) }),
    updateInventoryItem: (id: number, data: any) =>
      request(`/api/admin/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteInventoryItem: (id: number) =>
      request(`/api/admin/inventory/${id}`, { method: 'DELETE' }),
    getInventoryTransactions: () => request('/api/admin/inventory/transactions'),
    getAppointmentReports: () => request('/api/admin/reports/appointments'),
    getInventoryReports: () => request('/api/admin/reports/inventory'),
    getDoctorReports: () => request('/api/admin/reports/doctors'),
    getDoctors: () => request('/api/admin/doctors'),
    getActivityLog: () => request('/api/admin/activity'),
  },

  // ===== PUBLIC =====
  public: {
    getDoctors: () => request('/api/doctors'),
  },

  // ===== NOTIFICATIONS =====
  notifications: {
    getAll: () => request('/api/notifications'),
    markRead: (id: number) =>
      request(`/api/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () =>
      request('/api/notifications/read-all', { method: 'PUT' }),
  },

  // ===== RATINGS =====
  ratings: {
    submit: (data: any) =>
      request('/api/ratings', { method: 'POST', body: JSON.stringify(data) }),
    getForAppointment: (appointmentId: number) =>
      request(`/api/ratings?appointment_id=${appointmentId}`),
  },
};
